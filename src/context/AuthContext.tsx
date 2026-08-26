import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  currency: 'INR' | 'USD';
  setCurrency: (c: 'INR' | 'USD') => void;
  formatMoney: (amountInInr: number) => string;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  quickLoginDemo: (type: 'admin' | 'customer') => Promise<void>;
  refreshUser: () => Promise<void>;
  updateLocalBalance: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const usdRate = 86.5;

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch {
      setUser(null);
      localStorage.removeItem('smm_auth_token');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refreshUser();
      setLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    localStorage.setItem('smm_auth_token', res.token);
    setUser(res.user);
  };

  const register = async (name: string, email: string, pass: string, phone?: string) => {
    const res = await api.register({ name, email, password: pass, phone });
    localStorage.setItem('smm_auth_token', res.token);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    localStorage.removeItem('smm_auth_token');
    setUser(null);
  };

  const quickLoginDemo = async (type: 'admin' | 'customer') => {
    if (type === 'admin') {
      await login('kritanchettri32@gmail.com', 'Admin@12345');
    } else {
      await login('customer@example.com', 'User@12345');
    }
  };

  const updateLocalBalance = (newBalance: number) => {
    if (user) {
      setUser({ ...user, balance: newBalance });
    }
  };

  const formatMoney = (amountInInr: number): string => {
    if (currency === 'USD') {
      const usd = amountInInr / usdRate;
      return `$${usd.toFixed(2)}`;
    }
    return `₹${amountInInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        currency,
        setCurrency,
        formatMoney,
        login,
        register,
        logout,
        quickLoginDemo,
        refreshUser,
        updateLocalBalance
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
