// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';

// Define types
interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  user_type: string;
  location: string;
  is_verified: boolean;
  phone_verified: boolean;
  date_joined: string;
  preferred_otp_channel: string;
  preferred_otp_channel_display?: string;
}

interface RegisterResult {
  success: boolean;
  requiresOTP?: boolean;
  data?: any;
  error?: any;
  preferredChannelUsed?: string;
}

interface ResendOTPResult {
  success: boolean;
  data?: any;
  error?: any;
  channelUsed?: string;
}

interface AuthContextType {
  currentUser: User | null;
  requiresOTP: boolean;
  loading: boolean;
  pendingUser: User | null;
  login: (phone_number: string, password: string) => Promise<{ success: boolean; data?: any; error?: any }>;
  register: (userData: any) => Promise<RegisterResult>;
  verifyOTP: (phone_number: string, otp: string) => Promise<{ success: boolean; data?: any; error?: any }>;
  resendOTP: (phone_number: string, preferred_channel?: string) => Promise<ResendOTPResult>;
  logout: () => Promise<void>;
  checkAuthentication: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  updateOTPChannel: (preferred_channel: string) => Promise<{ success: boolean; data?: any; error?: any }>;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Create context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        // Set user from localStorage immediately for better UX
        setCurrentUser(JSON.parse(storedUser));
        
        // Then verify with backend
        const response = await authAPI.checkAuth();
        if (response.data.authenticated) {
          setCurrentUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
    } catch (error) {
      console.log('Authentication check failed:', error);
      // Clear invalid tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('temp_access_token');
      localStorage.removeItem('temp_refresh_token');
      localStorage.removeItem('temp_user');
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone_number: string, password: string) => {
    try {
      const response = await authAPI.login({ phone_number, password });
      if (response.data) {
        const { user, access, refresh } = response.data;
        
        // Store tokens and user data
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', JSON.stringify(user));
        
        setCurrentUser(user);
        setRequiresOTP(false);
        return { success: true, data: response.data };
      }
      return { success: false, error: { message: 'No response data' } };
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data || { message: 'Login failed' } 
      };
    }
  };

  const register = async (userData: any): Promise<RegisterResult> => {
    try {
      const response = await authAPI.register(userData);
      if (response.data) {
        const { user, access, refresh, requires_otp_verification, preferred_channel_used } = response.data;
        
        if (requires_otp_verification) {
          setPendingUser(user);
          setRequiresOTP(true);
          // Store tokens temporarily for OTP verification
          localStorage.setItem('temp_access_token', access);
          localStorage.setItem('temp_refresh_token', refresh);
          localStorage.setItem('temp_user', JSON.stringify(user));
        } else {
          // No OTP required, complete registration
          localStorage.setItem('access_token', access);
          localStorage.setItem('refresh_token', refresh);
          localStorage.setItem('user', JSON.stringify(user));
          setCurrentUser(user);
        }
        
        return { 
          success: true, 
          requiresOTP: requires_otp_verification,
          data: response.data,
          preferredChannelUsed: preferred_channel_used
        };
      }
      return { success: false, error: { message: 'No response data' } };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error.response?.data || { message: 'Registration failed' } 
      };
    }
  };

  const verifyOTP = async (phone_number: string, otp: string) => {
    try {
      const response = await authAPI.verifyOTP({ phone_number, otp });
      if (response.data) {
        const { user, access, refresh } = response.data;
        
        // Replace temporary tokens with permanent ones
        localStorage.removeItem('temp_access_token');
        localStorage.removeItem('temp_refresh_token');
        localStorage.removeItem('temp_user');
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', JSON.stringify(user));
        
        setCurrentUser(user);
        setRequiresOTP(false);
        setPendingUser(null);
        
        return { success: true, data: response.data };
      }
      return { success: false, error: { message: 'No response data' } };
    } catch (error: any) {
      console.error('OTP verification error:', error);
      return { 
        success: false, 
        error: error.response?.data || { message: 'OTP verification failed' } 
      };
    }
  };

  const resendOTP = async (phone_number: string, preferred_channel?: string): Promise<ResendOTPResult> => {
    try {
      const data: any = { phone_number };
      if (preferred_channel) {
        data.preferred_channel = preferred_channel;
      }
      
      const response = await authAPI.resendOTP(data);
      return { 
        success: true, 
        data: response.data,
        channelUsed: response.data.channel_used 
      };
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      return { 
        success: false, 
        error: error.response?.data || { message: 'Failed to resend OTP' } 
      };
    }
  };

  const updateOTPChannel = async (preferred_channel: string) => {
    try {
      const response = await authAPI.updateOTPChannel({ preferred_otp_channel: preferred_channel });
      if (response.data) {
        // Update current user in state and localStorage
        const updatedUser = { ...currentUser, ...response.data };
        setCurrentUser(updatedUser as User);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        return { 
          success: true, 
          data: response.data 
        };
      }
      return { success: false, error: { message: 'No response data' } };
    } catch (error: any) {
      console.error('Update OTP channel error:', error);
      return { 
        success: false, 
        error: error.response?.data || { message: 'Failed to update OTP channel' } 
      };
    }
  };

  const logout = async () => {
    try {
      // Call backend logout if needed (optional)
      // await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('temp_access_token');
      localStorage.removeItem('temp_refresh_token');
      localStorage.removeItem('temp_user');
      setCurrentUser(null);
      setRequiresOTP(false);
      setPendingUser(null);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setCurrentUser(prev => prev ? { ...prev, ...userData } : null);
    if (currentUser) {
      localStorage.setItem('user', JSON.stringify({ ...currentUser, ...userData }));
    }
  };

  const value: AuthContextType = {
    currentUser,
    requiresOTP,
    pendingUser,
    login,
    register,
    verifyOTP,
    resendOTP,
    logout,
    checkAuthentication,
    updateUser,
    updateOTPChannel,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};