import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { UserProfile, TenantSettings, Role } from '../types';

export interface RegisterParams {
  name: string;
  email: string;
  password?: string;
  companyName?: string | null;
  role?: Role;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  tenantSettings: TenantSettings | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (email?: string, password?: string, role?: Role) => Promise<AuthResponse>;
  register: (params: RegisterParams) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => void;
  updateTenant: (data: Partial<TenantSettings>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('nexcrm_jwt_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('nexcrm_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(() => {
    const saved = localStorage.getItem('nexcrm_tenant');
    return saved ? JSON.parse(saved) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('nexcrm_jwt_token'));
  });

  // Verify JWT Token with Backend on Mount
  useEffect(() => {
    const verifyToken = async () => {
      const savedToken = localStorage.getItem('nexcrm_jwt_token');
      if (!savedToken) {
        setIsLoading(false);
        setIsAuthenticated(false);
        setUser(null);
        setTenantSettings(null);
        localStorage.removeItem('nexcrm_user');
        localStorage.removeItem('nexcrm_tenant');
        return;
      }

      try {
        const res = await axios.get('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });
        const data = res.data;

        if (res.status === 200 && data.success && data.user) {
          const u = data.user;
          const userProfile: UserProfile = {
            id: u._id || u.id,
            name: u.fullName || u.name,
            fullName: u.fullName || u.name,
            email: u.email,
            avatar: u.profilePicture || u.avatar || '',
            profilePicture: u.profilePicture || u.avatar || '',
            phone: u.phone || '',
            role: u.role,
            companyName: u.companyName || (data.tenant ? data.tenant.name : ''),
            tenantId: u.tenantId || '',
            department: u.department || '',
            joinedDate: 'Active Member',
          };

          setUser(userProfile);

          if (data.tenant) {
            setTenantSettings({
              companyName: data.tenant.name,
              tenantId: data.tenant.tenantId,
              logoUrl: data.tenant.logoUrl || '',
              currency: data.tenant.currency || 'USD ($)',
              fiscalYear: data.tenant.fiscalYear || 'Jan - Dec',
              defaultTaxRate: data.tenant.defaultTaxRate ?? 10,
              invoiceTerms: data.tenant.invoiceTerms || 'Net 30 Days',
              address: data.tenant.address || '',
              website: data.tenant.website || '',
            });
          } else {
            setTenantSettings(null);
          }
          setIsAuthenticated(true);
        } else {
          // Token invalid or expired
          localStorage.removeItem('nexcrm_jwt_token');
          localStorage.removeItem('nexcrm_user');
          localStorage.removeItem('nexcrm_tenant');
          setToken(null);
          setUser(null);
          setTenantSettings(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.warn('Backend authentication check failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  // Sync state to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('nexcrm_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('nexcrm_user');
    }
  }, [user]);

  useEffect(() => {
    if (tenantSettings) {
      localStorage.setItem('nexcrm_tenant', JSON.stringify(tenantSettings));
    } else {
      localStorage.removeItem('nexcrm_tenant');
    }
  }, [tenantSettings]);

  const login = async (email?: string, password?: string, _role?: Role): Promise<AuthResponse> => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      const data = res.data;

      if (!data.success) {
        return {
          success: false,
          message: data.message || 'Login failed. Please check your credentials.',
        };
      }

      const jwtToken = data.token;
      localStorage.setItem('nexcrm_jwt_token', jwtToken);
      setToken(jwtToken);

      const u = data.user;
      const t = data.tenant;

      const userProfile: UserProfile = {
        id: u.id || u._id,
        name: u.fullName || u.name,
        fullName: u.fullName || u.name,
        email: u.email,
        avatar: u.profilePicture || u.avatar || '',
        profilePicture: u.profilePicture || u.avatar || '',
        phone: u.phone || '',
        role: u.role,
        companyName: u.companyName || t?.name || '',
        tenantId: u.tenantId || '',
        department: u.department || '',
        joinedDate: 'Active Member',
      };

      const tenantInfo: TenantSettings | null = t
        ? {
            companyName: t.name || userProfile.companyName,
            tenantId: t.tenantId || userProfile.tenantId,
            logoUrl: t.logoUrl || '',
            currency: t.currency || 'USD ($)',
            fiscalYear: t.fiscalYear || 'Jan - Dec',
            defaultTaxRate: t.defaultTaxRate ?? 10,
            invoiceTerms: t.invoiceTerms || 'Net 30 Days',
            address: t.address || '',
            website: t.website || '',
          }
        : null;

      setUser(userProfile);
      setTenantSettings(tenantInfo);
      setIsAuthenticated(true);

      return {
        success: true,
        message: data.message || 'Signed in successfully.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || 'Network error connecting to backend API.',
      };
    }
  };

  const register = async ({
    name,
    email,
    password,
    companyName,
    role = 'Company Admin',
  }: RegisterParams): Promise<AuthResponse> => {
    try {
      const payload: Record<string, any> = {
        name,
        email,
        password,
        role,
      };

      // Strict role-based payload: companyName ONLY for Company Admin
      if (role === 'Company Admin') {
        payload.companyName = companyName ? companyName.trim() : '';
      } else {
        payload.companyName = null;
      }

      const response = await axios.post('/api/auth/register', payload);
      const data = response.data;

      if (!data.success) {
        return {
          success: false,
          message: data.message || 'Registration failed.',
        };
      }

      const jwtToken = data.token;
      localStorage.setItem('nexcrm_jwt_token', jwtToken);
      setToken(jwtToken);

      const u = data.user;
      const t = data.tenant;

      const userProfile: UserProfile = {
        id: u.id || u._id,
        name: u.name,
        email: u.email,
        avatar: u.avatar || '',
        role: u.role,
        companyName: u.companyName || t?.name || (role === 'Company Admin' ? companyName || '' : ''),
        tenantId: u.tenantId || '',
        department: u.department || '',
        joinedDate: 'Just now',
      };

      const tenantInfo: TenantSettings | null = t
        ? {
            companyName: t.name || (role === 'Company Admin' ? companyName || '' : ''),
            tenantId: t.tenantId || u.tenantId || '',
            logoUrl: t.logoUrl || '',
            currency: t.currency || 'USD ($)',
            fiscalYear: t.fiscalYear || 'Jan - Dec',
            defaultTaxRate: t.defaultTaxRate ?? 10,
            invoiceTerms: t.invoiceTerms || 'Net 30 Days',
            address: t.address || '',
            website: t.website || '',
          }
        : null;

      setUser(userProfile);
      setTenantSettings(tenantInfo);
      setIsAuthenticated(true);

      return {
        success: true,
        message: data.message || (role === 'Company Admin' ? 'Workspace registered successfully.' : 'Employee account created successfully.'),
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || 'Network error connecting to backend API.',
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem('nexcrm_jwt_token');
    localStorage.removeItem('nexcrm_user');
    localStorage.removeItem('nexcrm_tenant');
    setToken(null);
    setUser(null);
    setTenantSettings(null);
    setIsAuthenticated(false);
  };

  const updateProfile = (data: Partial<UserProfile>) => {
    setUser(prev => (prev ? { ...prev, ...data } : null));
  };

  const updateTenant = (data: Partial<TenantSettings>) => {
    setTenantSettings(prev => (prev ? { ...prev, ...data } : null));
    if (data.companyName) {
      setUser(prev => (prev ? { ...prev, companyName: data.companyName! } : null));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenantSettings,
        isAuthenticated,
        isLoading,
        token,
        login,
        register,
        logout,
        updateProfile,
        updateTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
