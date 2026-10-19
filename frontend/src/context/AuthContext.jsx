import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const DEFAULT_USER = {
  id: 'usr_001',
  name: 'Alex Morgan',
  email: 'alex.morgan@apexhorizon.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'Company Admin', // 'Company Admin' or 'Employee'
  companyName: 'Apex Horizon Technologies',
  tenantId: 'TNT-APEX-8921',
  department: 'Executive Sales & Operations',
  joinedDate: 'Jan 2024',
};

const DEFAULT_TENANT_SETTINGS = {
  companyName: 'Apex Horizon Technologies',
  tenantId: 'TNT-APEX-8921',
  logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
  currency: 'USD ($)',
  fiscalYear: 'Jan - Dec',
  defaultTaxRate: 10,
  invoiceTerms: 'Net 30 Days',
  address: '100 Montgomery St, Suite 1800, San Francisco, CA 94104',
  website: 'https://apexhorizon.com',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nexcrm_user');
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });

  const [tenantSettings, setTenantSettings] = useState(() => {
    const saved = localStorage.getItem('nexcrm_tenant');
    return saved ? JSON.parse(saved) : DEFAULT_TENANT_SETTINGS;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem('nexcrm_auth');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('nexcrm_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('nexcrm_tenant', JSON.stringify(tenantSettings));
  }, [tenantSettings]);

  useEffect(() => {
    localStorage.setItem('nexcrm_auth', JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);

  const login = (email, password, role = 'Company Admin') => {
    const updatedUser = {
      ...user,
      email: email || user.email,
      name: email ? email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()) : user.name,
      role: role || user.role,
    };
    setUser(updatedUser);
    setIsAuthenticated(true);
    return { success: true };
  };

  const register = ({ name, email, password, companyName, role = 'Company Admin' }) => {
    const generatedTenantId = `TNT-${companyName.trim().substring(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newUser = {
      id: `usr_${Date.now()}`,
      name,
      email,
      avatar: `https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80`,
      role,
      companyName,
      tenantId: generatedTenantId,
      department: role === 'Company Admin' ? 'Executive Management' : 'Sales Pipeline',
      joinedDate: 'Just now',
    };

    const newTenant = {
      ...tenantSettings,
      companyName,
      tenantId: generatedTenantId,
    };

    setUser(newUser);
    setTenantSettings(newTenant);
    setIsAuthenticated(true);
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const switchRole = (newRole) => {
    setUser(prev => ({
      ...prev,
      role: newRole,
    }));
  };

  const updateProfile = (data) => {
    setUser(prev => ({ ...prev, ...data }));
  };

  const updateTenant = (data) => {
    setTenantSettings(prev => ({ ...prev, ...data }));
    if (data.companyName) {
      setUser(prev => ({ ...prev, companyName: data.companyName }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenantSettings,
        isAuthenticated,
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
