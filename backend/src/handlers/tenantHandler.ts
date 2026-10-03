import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/tenantAuth';
import { DynamoService } from '../services/dynamoService';
import { Tenant, TenantMember } from '../types';

export const TenantHandler = {
  // List all tenants accessible to the logged in user
  async listUserTenants(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const mappings = await DynamoService.getUserTenants(userId);
      const tenants: Tenant[] = [];

      for (const m of mappings) {
        const item = await DynamoService.getItem(`TENANT#${m.tenantId}`, 'METADATA');
        if (item) {
          tenants.push(item as unknown as Tenant);
        }
      }

      // If nothing mapped, return current tenant
      if (tenants.length === 0 && req.tenant) {
        tenants.push(req.tenant);
      }

      return res.status(200).json({ tenants });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Get active tenant details
  async getCurrentTenant(req: AuthenticatedRequest, res: Response) {
    return res.status(200).json({
      tenant: req.tenant,
      role: req.user!.role,
    });
  },

  // Update tenant settings (Owner only)
  async updateCurrentTenant(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.user!.role !== 'owner') {
        return res.status(403).json({ error: 'Only tenant owners can modify tenant settings.' });
      }

      const { tenantName } = req.body;
      const tenant = req.tenant!;
      tenant.tenantName = tenantName || tenant.tenantName;
      tenant.updatedAt = new Date().toISOString();

      await DynamoService.putItem({
        PK: `TENANT#${tenant.tenantId}`,
        SK: 'METADATA',
        type: 'tenant',
        ...tenant,
      });

      return res.status(200).json({
        message: 'Tenant settings updated',
        tenant,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Invite member to study group (Owner only)
  async inviteMember(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.user!.role !== 'owner') {
        return res.status(403).json({ error: 'Only tenant owners can invite new members.' });
      }

      const { email, name, role = 'member' } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Member email is required.' });
      }

      const tenant = req.tenant!;

      if (tenant.tenantType !== 'study_group') {
        return res.status(400).json({
          error: 'Only study group tenants can have multiple members. Upgrade or create a study group.',
        });
      }

      // Check if already member
      if (tenant.members.some(m => m.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ error: 'User is already a member of this study group.' });
      }

      const newMember: TenantMember = {
        userId: `user_invited_${Date.now()}`,
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        role: role as any,
        joinedAt: new Date().toISOString(),
      };

      tenant.members.push(newMember);
      tenant.updatedAt = new Date().toISOString();

      // Save tenant
      await DynamoService.putItem({
        PK: `TENANT#${tenant.tenantId}`,
        SK: 'METADATA',
        type: 'tenant',
        ...tenant,
      });

      // Save GSI1 mapping
      await DynamoService.putItem({
        PK: `USER#${newMember.userId}`,
        SK: `TENANT#${tenant.tenantId}`,
        GSI1PK: `USER#${newMember.userId}`,
        GSI1SK: `TENANT#${tenant.tenantId}`,
        type: 'user_tenant_membership',
        userId: newMember.userId,
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        role: newMember.role,
      });

      return res.status(200).json({
        message: `Member ${newMember.email} added to study group.`,
        member: newMember,
        tenant,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Create a new tenant (e.g. create a Study Group)
  async createTenant(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantName, tenantType = 'study_group' } = req.body;
      if (!tenantName) {
        return res.status(400).json({ error: 'Tenant name is required.' });
      }

      const tenantId = `tenant_${Date.now()}`;
      const now = new Date().toISOString();
      const userId = req.user!.userId;
      const userEmail = req.user!.email;
      const userName = req.user!.name;

      const newTenant: Tenant = {
        tenantId,
        tenantName,
        tenantType: tenantType as any,
        ownerId: userId,
        ownerEmail: userEmail,
        members: [
          {
            userId,
            email: userEmail,
            name: userName,
            role: 'owner',
            joinedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      // Save tenant metadata
      await DynamoService.putItem({
        PK: `TENANT#${tenantId}`,
        SK: 'METADATA',
        type: 'tenant',
        ...newTenant,
      });

      // Map to user
      await DynamoService.putItem({
        PK: `USER#${userId}`,
        SK: `TENANT#${tenantId}`,
        GSI1PK: `USER#${userId}`,
        GSI1SK: `TENANT#${tenantId}`,
        type: 'user_tenant_membership',
        userId,
        tenantId,
        tenantName,
        role: 'owner',
      });

      return res.status(201).json({
        message: 'New workspace created successfully.',
        tenant: newTenant,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  },
};
