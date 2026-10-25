import { useState, useEffect } from 'react';
import { logoutUser } from '../api/auth';
import AuthContext from './authContextValue';
import {
  clearAuth,
  getAuthRole,
  getAuthStorageKeys,
  migrateLegacyAuth,
  readAuth,
  saveAuth
} from './authStorage';

const authRole = getAuthRole();

migrateLegacyAuth();

export const AuthProvider = ({ children }) => {
  const [{ user, token }, setAuth] = useState(() => readAuth(authRole));

  const [sessionLoading] = useState(false);

  const login = (userData, tokenData) => {
    const activeUser = userData || null;
    const role = activeUser?.role === 'admin' ? 'admin' : 'client';
    saveAuth(role, activeUser, tokenData);
    setAuth({ user: activeUser, token: tokenData || null });
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearAuth(authRole);
      setAuth({ user: null, token: null });
    }
  };

  useEffect(() => {
    const keys = getAuthStorageKeys(authRole);
    const handleStorageChange = (event) => {
      if (event.key === keys.user || event.key === keys.token || event.key === null) {
        setAuth(readAuth(authRole));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token && user.role === authRole,
        sessionLoading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
