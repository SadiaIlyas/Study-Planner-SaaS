import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Tenant, UserRole } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface TenantContextType {
  activeTenant: Tenant | null;
  tenants: Tenant[];
  userRole: UserRole;
  isOwner: boolean;
  isLoading: boolean;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenants: () => Promise<void>;
  createWorkspace: (name: string, type: 'individual' | 'study_group') => Promise<void>;
  inviteMember: (email: string, name?: string, role?: string) => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('owner');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshTenants = useCallback(async () => {
    if (!user) {
      setActiveTenant(null);
      setTenants([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.listUserTenants();
      const list = res.tenants || [];
      setTenants(list);

      // Determine active tenant
      const savedTenantId = api.getCurrentTenantId();
      let current = list.find(t => t.tenantId === savedTenantId);

      if (!current && list.length > 0) {
        current = list[0];
      }

      if (current) {
        setActiveTenant(current);
        api.setCurrentTenantId(current.tenantId);
        // Determine role
        const isOwner = current.ownerId === user.userId || current.ownerEmail === user.email;
        if (isOwner) {
          setUserRole('owner');
        } else {
          const member = current.members?.find(m => m.userId === user.userId || m.email === user.email);
          setUserRole(member ? member.role : 'member');
        }
      }
    } catch (err) {
      console.error('Failed to load tenants:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshTenants();
  }, [refreshTenants]);

  const switchTenant = async (tenantId: string) => {
    setIsLoading(true);
    try {
      api.setCurrentTenantId(tenantId);
      const target = tenants.find(t => t.tenantId === tenantId);
      if (target && user) {
        setActiveTenant(target);
        const isOwner = target.ownerId === user.userId || target.ownerEmail === user.email;
        if (isOwner) {
          setUserRole('owner');
        } else {
          const member = target.members?.find(m => m.userId === user.userId || m.email === user.email);
          setUserRole(member ? member.role : 'member');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createWorkspace = async (name: string, type: 'individual' | 'study_group') => {
    const res = await api.createTenant({ tenantName: name, tenantType: type });
    await refreshTenants();
    await switchTenant(res.tenant.tenantId);
  };

  const inviteMember = async (email: string, name?: string, role: string = 'member') => {
    await api.inviteMember({ email, name, role });
    await refreshTenants();
  };

  return (
    <TenantContext.Provider
      value={{
        activeTenant,
        tenants,
        userRole,
        isOwner: userRole === 'owner',
        isLoading,
        switchTenant,
        refreshTenants,
        createWorkspace,
        inviteMember,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
