import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    const userInfo = {
      id: userData.id,
      name: userData.name,
      role: userData.role,
      businessUnits: userData.businessUnits || [],
      office: userData.office || null
    };
    localStorage.setItem('user', JSON.stringify(userInfo));
    setUser(userInfo);
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const hasPermission = (requiredRole) => {
    if (!user) return false;
    
    switch (requiredRole) {
      case 'super_admin':
        return user.role === 'super_admin';
      case 'admin':
        return ['super_admin', 'admin'].includes(user.role);
      case 'manager':
        return ['super_admin', 'admin', 'manager'].includes(user.role);
      default:
        return false;
    }
  };

  const canManageUsers = () => {
    return user?.role === 'super_admin';
  };

  const canAccessBusinessUnit = (businessUnit) => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'admin') return true;
    return user.businessUnits?.includes(businessUnit);
  };

  const canManageOffice = (office) => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'admin') return true;
    return user.office === office;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      hasPermission,
      canManageUsers,
      canAccessBusinessUnit,
      canManageOffice
    }}>
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