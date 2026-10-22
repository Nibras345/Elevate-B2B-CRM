import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, TenantSettings, Role } from '../types';

export interface RegisterParams {
  name: string;
  email: string;
  password?: string;
  companyName: string;
  role?: Role;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  user: UserProfile;
  tenantSettings: TenantSettings;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (email?: string, password?: string, role?: Role) => Promise<AuthResponse>;
  register: (params: RegisterParams) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  switchRole: (newRole: Role) => void;
  updateProfile: (data: Partial<UserProfile>) => void;
  updateTenant: (data: Partial<TenantSettings>) => void;
}

const DEFAULT_USER: UserProfile = {
  id: 'usr_init',
  name: 'Sarah Connor',
  email: 'sarah.admin@apexcorp.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'Company Admin',
  companyName: 'Apex Global Dynamics',
  tenantId: 'TNT-APEX-2077',
  department: 'Executive Management',
  joinedDate: 'Oct 2026',
};

const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  companyName: 'Apex Global Dynamics',
  tenantId: 'TNT-APEX-2077',
  logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
  currency: 'USD ($)',
  fiscalYear: 'Jan - Dec',
  defaultTaxRate: 10,
  invoiceTerms: 'Net 30 Days',
  address: '100 Montgomery St, Suite 1800, San Francisco, CA 94104',
  website: 'https://apexcorp.com',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('nexcrm_jwt_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('nexcrm_user');
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });

  const [tenantSettings, setTenantSettings] = useState<TenantSettings>(() => {
    const saved = localStorage.getItem('nexcrm_tenant');
    return saved ? JSON.parse(saved) : DEFAULT_TENANT_SETTINGS;
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
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });
        const data = await res.json();

        if (res.ok && data.success && data.user) {
          const u = data.user;
          const userProfile: UserProfile = {
            id: u._id || u.id,
            name: u.fullName || u.name,
            fullName: u.fullName || u.name,
            email: u.email,
            avatar: u.profilePicture || u.avatar || DEFAULT_USER.avatar,
            profilePicture: u.profilePicture || u.avatar || DEFAULT_USER.avatar,
            phone: u.phone || '',
            role: u.role,
            companyName: u.companyName || (data.tenant ? data.tenant.name : 'Enterprise Workspace'),
            tenantId: u.tenantId,
            department: u.department || 'Executive Management',
            joinedDate: 'Active Member',
          };

          setUser(userProfile);

          if (data.tenant) {
            setTenantSettings({
              companyName: data.tenant.name,
              tenantId: data.tenant.tenantId,
              logoUrl: data.tenant.logoUrl || DEFAULT_TENANT_SETTINGS.logoUrl,
              currency: data.tenant.currency || 'USD ($)',
              fiscalYear: data.tenant.fiscalYear || 'Jan - Dec',
              defaultTaxRate: data.tenant.defaultTaxRate ?? 10,
              invoiceTerms: data.tenant.invoiceTerms || 'Net 30 Days',
              address: data.tenant.address || '',
              website: data.tenant.website || '',
            });
          }
          setIsAuthenticated(true);
        } else {
          // Token invalid or expired
          localStorage.removeItem('nexcrm_jwt_token');
          setToken(null);
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
    localStorage.setItem('nexcrm_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('nexcrm_tenant', JSON.stringify(tenantSettings));
  }, [tenantSettings]);

  const login = async (email?: string, password?: string, _role?: Role): Promise<AuthResponse> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
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
        avatar: u.profilePicture || u.avatar || DEFAULT_USER.avatar,
        profilePicture: u.profilePicture || u.avatar || DEFAULT_USER.avatar,
        phone: u.phone || '',
        role: u.role,
        companyName: u.companyName || t?.name || 'Enterprise Workspace',
        tenantId: u.tenantId,
        department: u.department || 'Executive Management',
        joinedDate: 'Active Member',
      };

      const tenantInfo: TenantSettings = {
        companyName: t?.name || userProfile.companyName,
        tenantId: t?.tenantId || userProfile.tenantId,
        logoUrl: t?.logoUrl || DEFAULT_TENANT_SETTINGS.logoUrl,
        currency: t?.currency || 'USD ($)',
        fiscalYear: t?.fiscalYear || 'Jan - Dec',
        defaultTaxRate: t?.defaultTaxRate ?? 10,
        invoiceTerms: t?.invoiceTerms || 'Net 30 Days',
        address: t?.address || '',
        website: t?.website || '',
      };

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
        message: err.message || 'Network error connecting to backend API.',
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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          companyName,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
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
        avatar: u.avatar || DEFAULT_USER.avatar,
        role: u.role,
        companyName: u.companyName || t?.name || companyName,
        tenantId: u.tenantId,
        department: u.department || 'Executive Management',
        joinedDate: 'Just now',
      };

      const tenantInfo: TenantSettings = {
        companyName: t?.name || companyName,
        tenantId: t?.tenantId || u.tenantId,
        logoUrl: t?.logoUrl || DEFAULT_TENANT_SETTINGS.logoUrl,
        currency: t?.currency || 'USD ($)',
        fiscalYear: t?.fiscalYear || 'Jan - Dec',
        defaultTaxRate: t?.defaultTaxRate ?? 10,
        invoiceTerms: t?.invoiceTerms || 'Net 30 Days',
        address: t?.address || '',
        website: t?.website || '',
      };

      setUser(userProfile);
      setTenantSettings(tenantInfo);
      setIsAuthenticated(true);

      return {
        success: true,
        message: data.message || 'Workspace registered successfully.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Network error connecting to backend API.',
      };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem('nexcrm_jwt_token');
    setToken(null);
    setIsAuthenticated(false);
  };

  const switchRole = (newRole: Role) => {
    setUser(prev => ({
      ...prev,
      role: newRole,
    }));
  };

  const updateProfile = (data: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...data }));
  };

  const updateTenant = (data: Partial<TenantSettings>) => {
    setTenantSettings(prev => ({ ...prev, ...data }));
    if (data.companyName) {
      setUser(prev => ({ ...prev, companyName: data.companyName! }));
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
        switchRole,
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
