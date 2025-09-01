import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginRequest } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      checkAuth();
    } else {
      setIsLoading(false);
    }
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authService.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        throw new Error('認証に失敗しました');
      }
    } catch (error) {
      console.error('認証チェックエラー:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest) => {
    try {
      console.log('🔐 AuthContext: ログイン開始', credentials);
      setIsLoading(true);
      console.log('🔐 AuthContext: authService.loginを呼び出し中...');
      console.log('🔐 AuthContext: authServiceの内容:', authService);
      const response = await authService.login(credentials);
      console.log('🔐 AuthContext: authService.loginのレスポンス:', response);

      if (response.success && response.data) {
        const { user, token } = response.data;
        localStorage.setItem('token', token);
        setUser(user);
      } else {
        throw new Error(response.error?.message || 'ログインに失敗しました');
      }
    } catch (error: any) {
      console.error('ログインエラー:', error);
      throw new Error(
        error.response?.data?.error?.message || 
        error.message || 
        'ログインに失敗しました'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    
    authService.logout().catch(console.error);
  };

  const refreshToken = async () => {
    try {
      const response = await authService.refreshToken();

      if (response.success && response.data) {
        const { token } = response.data;
        localStorage.setItem('token', token);
      } else {
        throw new Error('トークンの更新に失敗しました');
      }
    } catch (error) {
      console.error('トークン更新エラー:', error);
      logout();
      throw error;
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};