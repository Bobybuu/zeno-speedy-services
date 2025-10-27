// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { authApiService } from '@/services/api';
import { vendorsApiService } from '@/services/vendorService';
import { 
  User, 
  VendorProfile, 
  AuthContextType, 
  LoginData, 
  RegisterData
} from '@/types';

// Define the missing types locally since they're not exported from '@/types'
export interface VendorRegistrationData {
  business_name: string;
  business_type: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  contact_number: string;
  email?: string;
  website?: string;
  delivery_radius_km?: number;
  min_order_amount?: number;
  delivery_fee?: number;
}

export interface ExtendedRegisterData extends RegisterData {
  vendor_data?: VendorRegistrationData;
  user_type: 'customer' | 'vendor' | 'mechanic';
}

export interface EnhancedLoginResult {
  success: boolean;
  data?: {
    user: User;
    refresh: string;
    access: string;
    message: string;
    vendor_profile?: VendorProfile;
    redirectPath?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
    field_errors?: Record<string, string[]>;
  };
}

export interface RegistrationResponse {
  success: boolean;
  data?: {
    user: User;
    refresh: string;
    access: string;
    message: string;
    requires_otp_verification: boolean;
    remaining_otp_attempts?: number;
    preferred_channel_used: string;
    vendor_profile?: VendorProfile;
    redirectPath?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
    field_errors?: Record<string, string[]>;
  };
  redirectPath?: string;
}

// Define a flexible vendor data type that can handle both basic vendor and dashboard data
interface VendorData {
  // Basic vendor properties
  id?: number;
  user_id?: number;
  business_name?: string;
  business_type?: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  contact_number?: string;
  email?: string;
  website?: string;
  is_verified?: boolean;
  is_active?: boolean;
  average_rating?: number;
  total_reviews?: number;
  delivery_radius_km?: number;
  min_order_amount?: number;
  delivery_fee?: number;
  
  // Extended financial properties (from dashboard)
  commission_rate?: number;
  total_earnings?: number;
  available_balance?: number;
  pending_payouts?: number;
  total_paid_out?: number;
  total_orders_count?: number;
  completed_orders_count?: number;
  active_customers_count?: number;
  created_at?: string;
  updated_at?: string;
  
  // Dashboard analytics specific properties
  total_gas_products?: number;
  available_gas_products?: number;
  low_stock_products?: number;
  out_of_stock_products?: number;
  order_completion_rate?: number;
  average_commission?: number;
  has_payout_preference?: boolean;
  payout_preference?: any;
  recent_earnings?: any[];
  recent_payouts?: any[];
  next_payout_amount?: number;
}

// Define proper result types that match the AuthContextType interface
interface VerifyOTPResult {
  success: boolean; 
  data?: {
    user: User;
    refresh: string;
    access: string;
    message: string;
    vendor_profile?: VendorProfile;
    redirectPath?: string;
  }; 
  error?: any;
}

interface UpdateOTPChannelResult {
  success: boolean; 
  data?: any; 
  error?: any;
}

interface CreateVendorProfileResult {
  success: boolean; 
  data?: VendorProfile; 
  error?: any;
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
      let vendorData: VendorData = {};

      try {
        // Try to get vendor dashboard data first
        const dashboardData = await vendorsApiService.getVendorDashboard();
        vendorData = dashboardData as VendorData;
      } catch (dashboardError) {
        console.log('Vendor dashboard not available, falling back to basic vendor data');
        // If dashboard fails, get basic vendor data
        try {
          const basicVendorData = await vendorsApiService.getMyVendor();
          vendorData = basicVendorData as VendorData;
        } catch (basicError) {
          console.log('Basic vendor data also unavailable');
          vendorData = {};
        }
      }

      // Create VendorProfile by safely extracting properties from vendorData
      const vendorProfile: VendorProfile = {
        id: Number(vendorData.id || 0),
        user_id: currentUser?.id || vendorData.user_id || 0,
        business_name: vendorData.business_name || '',
        business_type: vendorData.business_type || 'mechanic',
        description: vendorData.description || '',
        address: vendorData.address || '',
        city: vendorData.city || '',
        country: vendorData.country || 'Kenya',
        contact_number: vendorData.contact_number || '',
        email: vendorData.email || '',
        is_verified: vendorData.is_verified || false,
        is_active: vendorData.is_active !== false,
        average_rating: vendorData.average_rating || 0,
        total_reviews: vendorData.total_reviews || 0,
        delivery_radius_km: vendorData.delivery_radius_km || 10,
        min_order_amount: vendorData.min_order_amount || 0,
        delivery_fee: vendorData.delivery_fee || 0,
        // Financial fields - use safe access with fallbacks
        commission_rate: vendorData.commission_rate || 0.1,
        total_earnings: vendorData.total_earnings || 0,
        available_balance: vendorData.available_balance || 0,
        pending_payouts: vendorData.pending_payouts || 0,
        total_paid_out: vendorData.total_paid_out || 0,
        total_orders_count: vendorData.total_orders_count || 0,
        completed_orders_count: vendorData.completed_orders_count || 0,
        active_customers_count: vendorData.active_customers_count || 0,
        created_at: vendorData.created_at || new Date().toISOString(),
        updated_at: vendorData.updated_at || new Date().toISOString(),
        website: vendorData.website || ''
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

  const login = async (phone_number: string, password: string): Promise<EnhancedLoginResult> => {
    try {
      const response = await authApiService.login({ phone_number, password });
      if (response.data) {
        const { user, access, refresh, vendor_profile, redirectPath } = response.data;
        
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
          data: {
            user,
            refresh,
            access,
            message: 'Login successful',
            vendor_profile,
            redirectPath: redirectPath || getRedirectPath()
          }
        };
      }
      return { 
        success: false, 
        error: { 
          code: 'NO_RESPONSE_DATA', 
          message: 'No response data received from server' 
        } 
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data || { 
          code: 'LOGIN_FAILED', 
          message: 'Login failed. Please check your credentials and try again.' 
        } 
      };
    }
  };

  const register = async (userData: ExtendedRegisterData): Promise<RegistrationResponse> => {
    try {
      const response = await authApiService.register(userData);
      if (response.data) {
        const { 
          user, 
          access, 
          refresh, 
          requires_otp_verification, 
          preferred_channel_used,
          vendor_profile,
          redirectPath,
          message 
        } = response.data;
        
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', JSON.stringify(user));
        setCurrentUser(user);
        setRequiresOTP(requires_otp_verification || false);

        if (user.user_type === 'vendor' || user.user_type === 'mechanic') {
          await fetchVendorProfile();
        }
        
        return { 
          success: true, 
          data: {
            user,
            refresh,
            access,
            message: message || 'Registration successful',
            requires_otp_verification: requires_otp_verification || false,
            preferred_channel_used: preferred_channel_used || 'whatsapp',
            vendor_profile,
            redirectPath: redirectPath || getRedirectPath()
          },
          redirectPath: redirectPath || getRedirectPath()
        };
      }
      return { 
        success: false, 
        error: { 
          code: 'NO_RESPONSE_DATA', 
          message: 'No response data received from server' 
        } 
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error.response?.data || { 
          code: 'REGISTRATION_FAILED', 
          message: 'Registration failed. Please try again.' 
        } 
      };
    }
  };

  const verifyOTP = async (phone_number: string, otp: string): Promise<VerifyOTPResult> => {
    try {
      const response = await authApiService.verifyOTP({ phone_number, otp });
      if (response.data) {
        const { user, access, refresh, vendor_profile, redirectPath } = response.data;
        
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
        
        return { 
          success: true, 
          data: {
            user,
            refresh,
            access,
            message: 'OTP verified successfully',
            vendor_profile,
            redirectPath: redirectPath || getRedirectPath()
          }
        };
      }
      return { 
        success: false, 
        error: { 
          code: 'NO_RESPONSE_DATA', 
          message: 'No response data received from server' 
        } 
      };
    } catch (error: any) {
      console.error('OTP verification error:', error);
      return { 
        success: false, 
        error: error.response?.data || { 
          code: 'OTP_VERIFICATION_FAILED', 
          message: 'OTP verification failed. Please check the code and try again.' 
        } 
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
        error: error.response?.data || { 
          code: 'RESEND_OTP_FAILED', 
          message: 'Failed to resend OTP. Please try again.' 
        } 
      };
    }
  };

  const updateOTPChannel = async (preferred_channel: string): Promise<UpdateOTPChannelResult> => {
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
      return { 
        success: false, 
        error: { 
          code: 'NO_RESPONSE_DATA', 
          message: 'No response data received from server' 
        } 
      };
    } catch (error: any) {
      console.error('Update OTP channel error:', error);
      return { 
        success: false, 
        error: error.response?.data || { 
          code: 'UPDATE_OTP_CHANNEL_FAILED', 
          message: 'Failed to update OTP channel. Please try again.' 
        } 
      };
    }
  };

  const createVendorProfile = async (vendorData: VendorRegistrationData): Promise<CreateVendorProfileResult> => {
    try {
      if (!currentUser || (currentUser.user_type !== 'vendor' && currentUser.user_type !== 'mechanic')) {
        return {
          success: false,
          error: {
            code: 'INVALID_USER_TYPE',
            message: 'Only vendor or mechanic users can create vendor profiles'
          }
        };
      }

      // Check if vendor profile already exists
      if (vendorProfile) {
        return {
          success: false,
          error: {
            code: 'PROFILE_ALREADY_EXISTS',
            message: 'Vendor profile already exists'
          }
        };
      }

      const response = await vendorsApiService.registerVendor(vendorData);
      const vendorResponse = response as VendorData;
      
      // Create the vendor profile with safe property access
      const newVendorProfile: VendorProfile = {
        id: vendorResponse.id || 0,
        user_id: currentUser.id,
        business_name: vendorResponse.business_name || '',
        business_type: vendorResponse.business_type || 'mechanic',
        description: vendorResponse.description || '',
        address: vendorResponse.address || '',
        city: vendorResponse.city || '',
        country: vendorResponse.country || 'Kenya',
        contact_number: vendorResponse.contact_number || '',
        email: vendorResponse.email || '',
        website: vendorResponse.website || '',
        is_verified: vendorResponse.is_verified || false,
        is_active: vendorResponse.is_active !== false,
        average_rating: vendorResponse.average_rating || 0,
        total_reviews: vendorResponse.total_reviews || 0,
        delivery_radius_km: vendorResponse.delivery_radius_km || 10,
        min_order_amount: vendorResponse.min_order_amount || 0,
        delivery_fee: vendorResponse.delivery_fee || 0,
        commission_rate: vendorResponse.commission_rate || 0.1,
        total_earnings: vendorResponse.total_earnings || 0,
        available_balance: vendorResponse.available_balance || 0,
        pending_payouts: vendorResponse.pending_payouts || 0,
        total_paid_out: vendorResponse.total_paid_out || 0,
        total_orders_count: vendorResponse.total_orders_count || 0,
        completed_orders_count: vendorResponse.completed_orders_count || 0,
        active_customers_count: vendorResponse.active_customers_count || 0,
        created_at: vendorResponse.created_at || new Date().toISOString(),
        updated_at: vendorResponse.updated_at || new Date().toISOString()
      };

      setVendorProfile(newVendorProfile);
      localStorage.setItem('vendor_profile', JSON.stringify(newVendorProfile));

      return {
        success: true,
        data: newVendorProfile
      };
    } catch (error: any) {
      console.error('Create vendor profile error:', error);
      return {
        success: false,
        error: error.response?.data || {
          code: 'CREATE_VENDOR_PROFILE_FAILED',
          message: 'Failed to create vendor profile. Please try again.'
        }
      };
    }
  };

  const isVendorRegistrationComplete = (): boolean => {
    return hasVendorProfile() && 
           vendorProfile !== null && 
           vendorProfile.business_name !== '' && 
           vendorProfile.address !== '' && 
           vendorProfile.city !== '' && 
           vendorProfile.contact_number !== '';
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
    return 'https://api.zenoservices.co.ke/api/orders/';
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

  // Fix the type casting for the context value
  const value: AuthContextType = {
    currentUser,
    vendorProfile,
    requiresOTP,
    loading,
    vendorLoading,
    pendingUser,
    login: login as any,
    register: register as any,
    verifyOTP: verifyOTP as any,
    resendOTP: resendOTP as any,
    logout,
    checkAuthentication,
    updateUser,
    updateOTPChannel: updateOTPChannel as any,
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
    createVendorProfile: createVendorProfile as any,
    isVendorRegistrationComplete
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;