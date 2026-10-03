import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signup: (payload: any) => Promise<void>;
  logout: () => void;
  updateProfile: (payload: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('studyflow_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (token) {
          api.setToken(token);
          const res = await api.getProfile();
          setUser(res.user);
        } else {
          // Auto-login with Demo student Ahmad for instant seamless experience
          await login('ahmad@example.com');
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
        // Fallback to Ahmad demo login
        try {
          await login('ahmad@example.com');
        } catch {
          setUser(null);
          setToken(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string = 'StudyFlowDemo123!') => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      setUser(res.user);
      setToken(res.token);
      api.setToken(res.token);
      if (res.activeTenant) {
        api.setCurrentTenantId(res.activeTenant.tenantId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (payload: any) => {
    setIsLoading(true);
    try {
      const res = await api.signup(payload);
      setUser(res.user);
      setToken(res.token);
      api.setToken(res.token);
      if (res.activeTenant) {
        api.setCurrentTenantId(res.activeTenant.tenantId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    api.setToken(null);
    api.setCurrentTenantId(null);
    localStorage.removeItem('studyflow_token');
    localStorage.removeItem('studyflow_tenant_id');
  };

  const updateProfile = async (payload: Partial<UserProfile>) => {
    const res = await api.updateProfile(payload);
    setUser(res.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
