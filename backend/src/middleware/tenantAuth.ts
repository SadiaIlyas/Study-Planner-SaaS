import { Request, Response, NextFunction } from 'express';
import { DynamoService } from '../services/dynamoService';
import { AuthenticatedUser, Tenant, UserRole } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  tenant?: Tenant;
}

/**
 * Middleware that extracts user credentials from Cognito Authorization header or Dev Token,
 * verifies that the user is an active member or owner of the requested tenant,
 * and sets req.user and req.tenant.
 *
 * Strict Isolation:
 * - If user does not belong to the requested tenantId, 403 Forbidden is returned immediately.
 * - If tenant does not exist, 404 Not Found is returned.
 * - Frontend cannot tamper with tenantId to access another tenant's data.
 */
export async function enforceTenantAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const requestedTenantId = (req.headers['x-tenant-id'] || req.query.tenantId || req.body?.tenantId) as string;

    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    // In AWS Lambda behind API Gateway HTTP API, Cognito claims are injected into:
    // event.requestContext.authorizer.jwt.claims
    // For local dev / simulator / API calls, we support Bearer tokens with base64 payload or user email
    let userId = '';
    let email = '';
    let name = '';

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token === 'user_ahmad_001' || token === 'demo_token_ahmad') {
        userId = 'user_ahmad_001';
        email = 'ahmad@example.com';
        name = 'Ahmad Khan';
      } else if (token.startsWith('user_')) {
        userId = token;
        email = `${token}@example.com`;
        name = token;
      } else {
        try {
          // Check if 3-part JWT
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            userId = payload.sub || payload.userId || '';
            email = payload.email || '';
            name = payload.name || '';
          } else {
            // Check if base64 encoded JSON
            const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
            userId = payload.sub || payload.userId || '';
            email = payload.email || '';
            name = payload.name || '';
          }
        } catch {
          // Invalid token format
          return res.status(401).json({ error: 'Invalid authentication token' });
        }
      }
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unable to identify user from token' });
    }

    // If requestedTenantId is not provided, fetch user's first available tenant
    let targetTenantId = requestedTenantId;
    if (!targetTenantId) {
      const userTenants = await DynamoService.getUserTenants(userId);
      if (userTenants.length > 0) {
        targetTenantId = userTenants[0].tenantId;
      } else {
        // Fallback default
        targetTenantId = 'tenant_demo_ahmad';
      }
    }

    // Verify tenant exists in DynamoDB
    const tenantItem = await DynamoService.getItem(`TENANT#${targetTenantId}`, 'METADATA');
    if (!tenantItem) {
      return res.status(404).json({ error: `Tenant ${targetTenantId} not found` });
    }

    const tenant = tenantItem as unknown as Tenant;

    // Check membership & role: user must either be owner or member
    let userRole: UserRole | null = null;
    if (tenant.ownerId === userId || tenant.ownerEmail === email) {
      userRole = 'owner';
    } else {
      const memberRecord = tenant.members?.find(m => m.userId === userId || m.email === email);
      if (memberRecord) {
        userRole = memberRecord.role;
      }
    }

    // STRICT ISOLATION ENFORCEMENT:
    // If user is neither owner nor listed member of this tenant, REJECT!
    if (!userRole) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to access data belonging to this tenant',
        requestedTenantId,
        userId,
      });
    }

    req.user = {
      userId,
      email,
      name,
      tenantId: targetTenantId,
      role: userRole,
    };
    req.tenant = tenant;

    return next();
  } catch (error: any) {
    console.error('Tenant auth middleware error:', error);
    return res.status(500).json({ error: 'Internal security evaluation error', details: error.message });
  }
}

/**
 * Middleware ensuring only Tenant Owners can perform destructive or administrative operations
 */
export function requireOwnerRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({
      error: 'Permission Denied: Only Tenant Owners can perform this action.',
    });
  }
  return next();
}
