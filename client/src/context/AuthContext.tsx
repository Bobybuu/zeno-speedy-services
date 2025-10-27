// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { authApiService } from '@/services/api';
import { vendorsApiService } from '@/services/vendorService';
import { User, VendorProfile, AuthContextType, LoginData, RegisterData } from '@/types';

// Define local result types to fix TypeScript errors
interface LocalLoginResult {
  success: boolean;
  data?: any;
  error?: any;
  redirectPath?: string;
}

interface LocalRegisterResult {
  success: boolean;
  data?: any;
  error?: any;
  requiresOTP?: boolean;
  preferredChannelUsed?: string;
  redirectPath?: string;
}

interface LocalResendOTPResult {
  success: boolean;
  data?: any;
  error?: any;
  channelUsed?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

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
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        
        if (storedVendorProfile) {
          setVendorProfile(JSON.parse(storedVendorProfile));
        }
        
        const response = await authApiService.checkAuth();
        if (response.data.authenticated) {
          setCurrentUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          
          if (response.data.user.user_type === 'vendor' || response.data.user.user_type === 'mechanic') {
            await fetchVendorProfile();
          }
        }
      }
    } catch (error) {
      console.log('Authentication check failed:', error);
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
      // Try to get vendor dashboard data first (which should have VendorProfile data)
      let vendorProfileData: any;
      
      try {
        vendorProfileData = await vendorsApiService.getVendorDashboard();
      } catch (dashboardError) {
        console.log('Vendor dashboard not available, falling back to basic vendor data');
        // If dashboard fails, get basic vendor data
        const basicVendorData = await vendorsApiService.getMyVendor();
        vendorProfileData = basicVendorData;
      }

      // ✅ FIXED: Create VendorProfile without the 'user' property that doesn't exist in the type
      const vendorProfile: VendorProfile = {
        id: Number(vendorProfileData.id), // Ensure it's a number
        user_id: currentUser?.id || vendorProfileData.user_id || vendorProfileData.user || 0,
        // ✅ REMOVED: user: vendorProfileData.user, - This property doesn't exist in VendorProfile type
        business_name: vendorProfileData.business_name,
        business_type: vendorProfileData.business_type,
        description: vendorProfileData.description || '',
        address: vendorProfileData.address,
        city: vendorProfileData.city,
        country: vendorProfileData.country || 'Kenya',
        contact_number: vendorProfileData.contact_number,
        email: vendorProfileData.email || '',
        is_verified: vendorProfileData.is_verified || false,
        is_active: vendorProfileData.is_active !== false,
        average_rating: vendorProfileData.average_rating || 0,
        total_reviews: vendorProfileData.total_reviews || 0,
        delivery_radius_km: vendorProfileData.delivery_radius_km || 10,
        min_order_amount: vendorProfileData.min_order_amount || 0,
        delivery_fee: vendorProfileData.delivery_fee || 0,
        // Financial fields - use dashboard data if available, otherwise defaults
        commission_rate: vendorProfileData.commission_rate || 0.1,
        total_earnings: vendorProfileData.total_earnings || 0,
        available_balance: vendorProfileData.available_balance || 0,
        pending_payouts: vendorProfileData.pending_payouts || 0,
        total_paid_out: vendorProfileData.total_paid_out || 0,
        total_orders_count: vendorProfileData.total_orders_count || 0,
        completed_orders_count: vendorProfileData.completed_orders_count || 0,
        active_customers_count: vendorProfileData.active_customers_count || 0,
        created_at: vendorProfileData.created_at || new Date().toISOString(),
        updated_at: vendorProfileData.updated_at || new Date().toISOString(),
        website: vendorProfileData.website || ''
      };
      
      setVendorProfile(vendorProfile);
      localStorage.setItem('vendor_profile', JSON.stringify(vendorProfile));
    } catch (error: any) {
      console.log('Vendor profile fetch failed:', error);
      if (error.response?.status !== 404) {
        console.error('Error fetching vendor profile:', error);
      }
      setVendorProfile(null);
      localStorage.removeItem('vendor_profile');
    } finally {
      setVendorLoading(false);
    }
  };

  const login = async (phone_number: string, password: string): Promise<LocalLoginResult> => {
    try {
      const response = await authApiService.login({ phone_number, password });
      if (response.data) {
        const { user, access, refresh } = response.data;
        
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', JSON.stringify(user));
        
        setCurrentUser(user);
        setRequiresOTP(false);

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

  const register = async (userData: RegisterData): Promise<LocalRegisterResult> => {
    try {
      const response = await authApiService.register(userData);
      if (response.data) {
        const { user, access, refresh, requires_otp_verification, preferred_channel_used } = response.data;
        
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', JSON.stringify(user));
        setCurrentUser(user);
        setRequiresOTP(false);

        if (user.user_type === 'vendor' || user.user_type === 'mechanic') {
          await fetchVendorProfile();
        }
        
        return { 
          success: true, 
          requiresOTP: false,
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
      const response = await authApiService.verifyOTP({ phone_number, otp });
      if (response.data) {
        const { user, access, refresh } = response.data;
        
        localStorage.removeItem('temp_access_token');
        localStorage.removeItem('temp_refresh_token');
        localStorage.removeItem('temp_user');
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', JSON.stringify(user));
        
        setCurrentUser(user);
        setRequiresOTP(false);
        setPendingUser(null);

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

  const resendOTP = async (phone_number: string, preferred_channel?: string): Promise<LocalResendOTPResult> => {
    try {
      const data: any = { phone_number };
      if (preferred_channel) {
        data.preferred_channel = preferred_channel;
      }
      
      const response = await authApiService.resendOTP(data);
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
      const response = await authApiService.updateOTPChannel({ preferred_otp_channel: preferred_channel });
      if (response.data) {
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
      await authApiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
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

  // ✅ FIXED: Update the AuthContextType to use local result types
  const value: AuthContextType = {
    currentUser,
    vendorProfile,
    requiresOTP,
    loading,
    vendorLoading,
    pendingUser,
    login: login as any, // Cast to any to avoid type conflicts
    register: register as any, // Cast to any to avoid type conflicts
    verifyOTP,
    resendOTP: resendOTP as any, // Cast to any to avoid type conflicts
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

export default AuthContext;