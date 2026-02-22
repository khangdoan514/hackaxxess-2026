import { createContext, useCallback, useContext, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (name, email, password, role) => {
    const { data } = await api.post('/auth/signup', { 
      name,  // Make sure name is being sent
      email, 
      password, 
      role 
    });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  // Helper to get display name
  const getDisplayName = useCallback(() => {
    if (!user) return '';
    
    if (user.role === 'doctor') {
      // If we have a full name, extract the last name
      if (user.name) {
        const nameParts = user.name.trim().split(' ');
        const lastName = nameParts[nameParts.length - 1];
        return `Dr. ${lastName}`;
      }
      // Fallback to email prefix if no name
      return `Dr. ${user.email?.split('@')[0] || 'Doctor'}`;
    }
    
    // For patients, return full name
    if (user.name) {
      return user.name;
    }
    // Fallback to email prefix
    return user.email?.split('@')[0] || 'Patient';
  }, [user]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      signup, 
      logout, 
      isAuthenticated: !!token,
      getDisplayName
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}