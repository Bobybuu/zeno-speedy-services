// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { authAPI, vendorsAPI } from '../services/api';

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

interface VendorProfile {
  id: number;
  user: number;
  business_name: string;
  business_type: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  contact_number: string;
  email?: string;
  is_verified: boolean;
  is_active: boolean;
  average_rating: number;
  total_reviews: number;
  delivery_radius_km: number;
  min_order_amount: number;
  delivery_fee: number;
  commission_rate: number;
  total_earnings: number;
  available_balance: number;
  pending_payouts: number;
  total_paid_out: number;
  total_orders_count: number;
  completed_orders_count: number;
  active_customers_count: number;
  created_at: string;
  updated_at: string;
  website?: string;
}

interface RegisterResult {
  success: boolean;
  requiresOTP?: boolean;
  data?: any;
  error?: any;
  preferredChannelUsed?: string;
  redirectPath?: string;
}

interface LoginResult {
  success: boolean;
  data?: any;
  error?: any;
  redirectPath?: string;
}

interface ResendOTPResult {
  success: boolean;
  data?: any;
  error?: any;
  channelUsed?: string;
}

interface AuthContextType {
  currentUser: User | null;
  vendorProfile: VendorProfile | null;
  requiresOTP: boolean;
  loading: boolean;
  vendorLoading: boolean;
  pendingUser: User | null;
  login: (phone_number: string, password: string) => Promise<LoginResult>;
  register: (userData: any) => Promise<RegisterResult>;
  verifyOTP: (phone_number: string, otp: string) => Promise<{ success: boolean; data?: any; error?: any }>;
  resendOTP: (phone_number: string, preferred_channel?: string) => Promise<ResendOTPResult>;
  logout: () => Promise<void>;
  checkAuthentication: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  updateOTPChannel: (preferred_channel: string) => Promise<{ success: boolean; data?: any; error?: any }>;
  fetchVendorProfile: () => Promise<void>;
  isVendor: () => boolean;
  isMechanic: () => boolean;
  isCustomer: () => boolean;
  hasVendorProfile: () => boolean;
  redirectBasedOnUserType: () => string;
  getRedirectPath: () => string;
  // ✅ ADDED: Cart-related functions for API consistency
  getCartApiBaseUrl: () => string;
  getCartItemsUrl: (cartId?: number) => string;
  getCartItemUrl: (itemId: number, cartId?: number) => string;
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
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthentication();
  }, []);

  // Fetch vendor profile when user is a vendor/mechanic
  useEffect(() => {
    if (currentUser && (currentUser.user_type === 'vendor' || currentUser.user_type === 'mechanic')) {
      fetchVendorProfile();
    } else {
      setVendorProfile(null);
    }
  }, [currentUser]);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      const storedVendorProfile = localStorage.getItem('vendor_profile');
      
      if (token && storedUser) {
        // Set user from localStorage immediately for better UX
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        
        // Set vendor profile if exists
        if (storedVendorProfile) {
          setVendorProfile(JSON.parse(storedVendorProfile));
        }
        
        // Then verify with backend
        const response = await authAPI.checkAuth();
        if (response.data.authenticated) {
          setCurrentUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          // Fetch vendor profile if user is vendor/mechanic
          if (response.data.user.user_type === 'vendor' || response.data.user.user_type === 'mechanic') {
            await fetchVendorProfile();
          }
        }
      }
    } catch (error) {
      console.log('Authentication check failed:', error);
      // Clear invalid tokens
      clearAuthStorage();
      setCurrentUser(null);
      setVendorProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorProfile = async () => {
    if (!currentUser || (currentUser.user_type !== 'vendor' && currentUser.user_type !== 'mechanic')) {
      return;
    }

    setVendorLoading(true);
    try {
      const response = await vendorsAPI.getMyVendor();
      setVendorProfile(response.data);
      localStorage.setItem('vendor_profile', JSON.stringify(response.data));
    } catch (error: any) {
      console.log('Vendor profile fetch failed:', error);
      // If 404, vendor profile doesn't exist yet (normal for new vendors)
      if (error.response?.status !== 404) {
        console.error('Error fetching vendor profile:', error);
      }
      setVendorProfile(null);
      localStorage.removeItem('vendor_profile');
    } finally {
      setVendorLoading(false);
    }
  };

  const login = async (phone_number: string, password: string): Promise<LoginResult> => {
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

        // Fetch vendor profile if user is vendor/mechanic
        if (user.user_type === 'vendor' || user.user_type === 'mechanic') {
          await fetchVendorProfile();
        }
        
        return { 
          success: true, 
          data: response.data,
          redirectPath: getRedirectPath()
        };
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
        
        // MVP: No OTP required, complete registration immediately
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', JSON.stringify(user));
        setCurrentUser(user);
        setRequiresOTP(false);

        // Fetch vendor profile if user registered as vendor/mechanic
        if (user.user_type === 'vendor' || user.user_type === 'mechanic') {
          await fetchVendorProfile();
        }
        
        return { 
          success: true, 
          requiresOTP: false, // Force to false for MVP
          data: response.data,
          preferredChannelUsed: preferred_channel_used,
          redirectPath: getRedirectPath()
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

        // Fetch vendor profile if user is vendor/mechanic
        if (user.user_type === 'vendor' || user.user_type === 'mechanic') {
          await fetchVendorProfile();
        }
        
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
      clearAuthStorage();
      setCurrentUser(null);
      setVendorProfile(null);
      setRequiresOTP(false);
      setPendingUser(null);
    }
  };

  const clearAuthStorage = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('vendor_profile');
    localStorage.removeItem('temp_access_token');
    localStorage.removeItem('temp_refresh_token');
    localStorage.removeItem('temp_user');
  };

  const updateUser = (userData: Partial<User>) => {
    setCurrentUser(prev => prev ? { ...prev, ...userData } : null);
    if (currentUser) {
      localStorage.setItem('user', JSON.stringify({ ...currentUser, ...userData }));
    }
  };

  // Helper functions for user type checking
  const isVendor = (): boolean => {
    return currentUser?.user_type === 'vendor' || currentUser?.user_type === 'mechanic';
  };

  const isMechanic = (): boolean => {
    return currentUser?.user_type === 'mechanic';
  };

  const isCustomer = (): boolean => {
    return currentUser?.user_type === 'customer';
  };

  const hasVendorProfile = (): boolean => {
    return isVendor() && vendorProfile !== null;
  };

  const getRedirectPath = (): string => {
    if (!currentUser) return '/login';

    if (isVendor()) {
      if (hasVendorProfile()) {
        return '/vendor/dashboard';
      } else {
        return '/vendor/setup';
      }
    } else if (isCustomer()) {
      return '/dashboard';
    } else {
      return '/dashboard';
    }
  };

  const redirectBasedOnUserType = (): string => {
    return getRedirectPath();
  };

  // ✅ ADDED: Cart API URL helpers based on your API root structure
  const getCartApiBaseUrl = (): string => {
    return 'http://127.0.0.1:8000/api/orders/';
  };

  const getCartItemsUrl = (cartId?: number): string => {
    const baseUrl = getCartApiBaseUrl();
    if (cartId) {
      return `${baseUrl}cart/${cartId}/items/`;
    }
    return `${baseUrl}cart/items/`;
  };

  const getCartItemUrl = (itemId: number, cartId?: number): string => {
    const baseUrl = getCartApiBaseUrl();
    if (cartId) {
      return `${baseUrl}cart/${cartId}/items/${itemId}/`;
    }
    return `${baseUrl}cart/items/${itemId}/`;
  };

  const value: AuthContextType = {
    currentUser,
    vendorProfile,
    requiresOTP,
    loading,
    vendorLoading,
    pendingUser,
    login,
    register,
    verifyOTP,
    resendOTP,
    logout,
    checkAuthentication,
    updateUser,
    updateOTPChannel,
    fetchVendorProfile,
    isVendor,
    isMechanic,
    isCustomer,
    hasVendorProfile,
    redirectBasedOnUserType,
    getRedirectPath,
    getCartApiBaseUrl,
    getCartItemsUrl,
    getCartItemUrl,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};