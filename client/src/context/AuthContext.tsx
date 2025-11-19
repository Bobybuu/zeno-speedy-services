// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useRef } from 'react';
import { authApiService, isAuthenticated as checkAuthStatus } from '@/services/api';
import { vendorsApiService } from '@/services/vendorService';
import { 
  User, 
  VendorProfile, 
  AuthContextType, 
  LoginData,
  RegisterData
} from '@/types';

// Enhanced type definitions with strict typing
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

// Strict result types with discriminated unions
export type ApiResult<T = any> = 
  | { success: true; data: T }
  | { success: false; error: ApiError };

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  field_errors?: Record<string, string[]>;
  status?: number;
}

export type EnhancedLoginResult = ApiResult<{
  user: User;
  refresh: string;
  access: string;
  message: string;
  vendor_profile?: VendorProfile;
  redirectPath?: string;
}>;

export type RegistrationResponse = ApiResult<{
  user: User;
  refresh: string;
  access: string;
  message: string;
  requires_otp_verification: boolean;
  remaining_otp_attempts?: number;
  preferred_channel_used: string;
  vendor_profile?: VendorProfile;
  redirectPath?: string;
}> & { redirectPath?: string };

export type VerifyOTPResult = ApiResult<{
  user: User;
  refresh: string;
  access: string;
  message: string;
  vendor_profile?: VendorProfile;
  redirectPath?: string;
}>;

export type UpdateOTPChannelResult = ApiResult<{
  preferred_otp_channel: string;
  preferred_otp_channel_display: string;
  message: string;
}>;

export type CreateVendorProfileResult = ApiResult<VendorProfile>;

export type LocalResendOTPResult = ApiResult<{
  message: string;
  channel_used: string;
  preferred_channel: string;
  remaining_attempts: number;
}>;

// Enhanced vendor data interface
interface VendorData {
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
  total_gas_products?: number;
  available_gas_products?: number;
  low_stock_products?: number;
  out_of_stock_products?: number;
  order_completion_rate?: number;
  average_commission?: number;
  has_payout_preference?: boolean;
  payout_preference?: unknown;
  recent_earnings?: unknown[];
  recent_payouts?: unknown[];
  next_payout_amount?: number;
}

// Cache interface for vendor profile caching
interface VendorProfileCache {
  data: VendorProfile | null;
  timestamp: number;
  isFetching: boolean;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const secureStorage = {
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn(`Failed to store ${key} in localStorage:`, error);
    }
  },

  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
      return null;
    } catch (error) {
      console.warn(`Failed to retrieve ${key} from localStorage:`, error);
      return null;
    }
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Failed to remove ${key} from localStorage:`, error);
    }
  },

  clear: (): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('vendor_profile');
        localStorage.removeItem('temp_access_token');
        localStorage.removeItem('temp_refresh_token');
        localStorage.removeItem('temp_user');
      }
    } catch (error) {
      console.warn('Failed to clear auth data from localStorage:', error);
    }
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  
  // Cache and race condition prevention
  const vendorProfileCache = useRef<VendorProfileCache>({ 
    data: null, 
    timestamp: 0, 
    isFetching: false 
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Secure storage functions
  const setAuthStorage = useCallback((access: string, refresh: string, user: User, vendor?: VendorProfile) => {
    secureStorage.setItem('access_token', access);
    secureStorage.setItem('refresh_token', refresh);
    secureStorage.setItem('user', JSON.stringify(user));
    if (vendor) {
      secureStorage.setItem('vendor_profile', JSON.stringify(vendor));
    }
  }, []);

  const getAuthStorage = useCallback(() => {
    const token = secureStorage.getItem('access_token');
    const storedUser = secureStorage.getItem('user');
    const storedVendorProfile = secureStorage.getItem('vendor_profile');
    
    return {
      token,
      user: storedUser ? JSON.parse(storedUser) as User : null,
      vendorProfile: storedVendorProfile ? JSON.parse(storedVendorProfile) as VendorProfile : null
    };
  }, []);

  const clearAuthStorage = useCallback(() => {
    secureStorage.clear();
    vendorProfileCache.current = { data: null, timestamp: 0, isFetching: false };
  }, []);

  // Enhanced authentication check with error boundary
  const checkAuthentication = useCallback(async () => {
    try {
      const { token, user, vendorProfile: storedVendor } = getAuthStorage();
      
      if (token && user && checkAuthStatus()) {
        setCurrentUser(user);
        
        if (storedVendor) {
          setVendorProfile(storedVendor);
          vendorProfileCache.current = { 
            data: storedVendor, 
            timestamp: Date.now(), 
            isFetching: false 
          };
        }

        // Validate token with backend
        try {
          const response = await authApiService.checkAuth();
          if (response.data.authenticated) {
            const updatedUser = response.data.user;
            setCurrentUser(updatedUser);
            secureStorage.setItem('user', JSON.stringify(updatedUser));
            
            if (updatedUser.user_type === 'vendor' || updatedUser.user_type === 'mechanic') {
              await fetchVendorProfile(true); // Force refresh
            }
          } else {
            throw new Error('Token validation failed');
          }
        } catch (error) {
          console.warn('Token validation failed, clearing auth:', error);
          clearAuthStorage();
          setCurrentUser(null);
          setVendorProfile(null);
        }
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      clearAuthStorage();
      setCurrentUser(null);
      setVendorProfile(null);
    } finally {
      setLoading(false);
    }
  }, [getAuthStorage, clearAuthStorage]);

  // Enhanced vendor profile fetching with caching and race condition prevention
  const fetchVendorProfile = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!currentUser || (currentUser.user_type !== 'vendor' && currentUser.user_type !== 'mechanic')) {
      return;
    }

    // Check cache first
    const cache = vendorProfileCache.current;
    const now = Date.now();
    
    if (!forceRefresh && cache.data && (now - cache.timestamp) < CACHE_TTL) {
      setVendorProfile(cache.data);
      return;
    }

    // Prevent concurrent requests
    if (cache.isFetching) {
      return;
    }

    setVendorLoading(true);
    cache.isFetching = true;

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      let vendorData: VendorData = {};

      try {
        // Try to get vendor dashboard data first
        const dashboardData = await vendorsApiService.getVendorDashboard();
        vendorData = dashboardData as VendorData;
      } catch (dashboardError) {
        if (abortController.signal.aborted) return;
        
        console.log('Vendor dashboard not available, falling back to basic vendor data');
        // If dashboard fails, get basic vendor data
        try {
          const basicVendorData = await vendorsApiService.getMyVendor();
          vendorData = basicVendorData as VendorData;
        } catch (basicError) {
          if (abortController.signal.aborted) return;
          console.log('Basic vendor data also unavailable');
          vendorData = {};
        }
      }

      if (abortController.signal.aborted) return;

      // Create VendorProfile with safe property access
      const newVendorProfile: VendorProfile = {
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
      
      // Update cache and state
      vendorProfileCache.current = { 
        data: newVendorProfile, 
        timestamp: Date.now(), 
        isFetching: false 
      };
      
      setVendorProfile(newVendorProfile);
      secureStorage.setItem('vendor_profile', JSON.stringify(newVendorProfile));
      
    } catch (error: any) {
      if (abortController.signal.aborted) return;
      
      console.log('Vendor profile fetch failed:', error);
      if (error.response?.status !== 404) {
        console.error('Error fetching vendor profile:', error);
      }
      
      // Don't clear existing profile on temporary errors
      if (!vendorProfileCache.current.data) {
        setVendorProfile(null);
        secureStorage.removeItem('vendor_profile');
      }
    } finally {
      if (!abortController.signal.aborted) {
        setVendorLoading(false);
        vendorProfileCache.current.isFetching = false;
      }
    }
  }, [currentUser]);

  // ✅ FIXED: Enhanced login with proper error handling and response structure
  const login = useCallback(async (phone_number: string, password: string): Promise<EnhancedLoginResult> => {
    try {
      setLoading(true);
      
      console.log('Sending login data:', { phone_number, password: '***' });

      const response = await authApiService.login({ phone_number, password });

      console.log('Login response:', response);

      // ✅ FIX: Check the actual response structure from your backend
      if (response.data && response.data.success) {
        // Your backend returns: {success: true, message: "...", data: {user: {...}, tokens: {...}}}
        const userData = response.data.data?.user || response.data.user;
        const tokens = response.data.data?.tokens || response.data.tokens;
        
        console.log('User data:', userData);
        console.log('Tokens:', tokens);

        // ✅ FIX: Add null checks before accessing properties
        if (!userData) {
          throw new Error('User data not found in response');
        }

        // ✅ FIX: Ensure user_type exists with fallback
        if (!userData.user_type) {
          console.warn('User type not found in response, using default');
          userData.user_type = 'customer'; // Default fallback
        }

        // Store user data
        setCurrentUser(userData);
        secureStorage.setItem('user', JSON.stringify(userData));
        
        // Store tokens if available
        if (tokens) {
          secureStorage.setItem('access_token', tokens.access);
          secureStorage.setItem('refresh_token', tokens.refresh);
          
          // Set default authorization header
          if (tokens.access) {
            // Assuming you have an api instance configured
            const api = (window as any).api || {};
            if (api.defaults && api.defaults.headers) {
              api.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
            }
          }
        }

        setRequiresOTP(false);

        // Fetch vendor profile if applicable
        if (userData.user_type === 'vendor' || userData.user_type === 'mechanic') {
          await fetchVendorProfile(true);
        }
        
        return { 
          success: true, 
          data: {
            user: userData,
            refresh: tokens?.refresh || '',
            access: tokens?.access || '',
            message: response.data.message || 'Login successful',
            vendor_profile: response.data.data?.vendor_profile || response.data.vendor_profile,
            redirectPath: response.data.data?.redirect_path || response.data.redirectPath || getRedirectPath()
          }
        };
      } else {
        throw new Error(response.data?.message || 'Login failed');
      }
      
    } catch (error: any) {
      console.error('🔴 COMPLETE LOGIN ERROR:', {
        status: error.response?.status,
        backend_error: error.response?.data?.error,
        full_error_response: error.response?.data,
        validation_details: error.response?.data?.error?.details || {},
        field_errors: error.response?.data?.error?.field_errors,
        complete_error_object: error.response?.data,
      });

      // ✅ FIX: Better error handling
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        // Server responded with error status
        const serverError = error.response.data;
        
        if (typeof serverError === 'string') {
          try {
            const parsedError = JSON.parse(serverError);
            errorMessage = parsedError.message || parsedError.detail || errorMessage;
          } catch (e) {
            errorMessage = serverError || errorMessage;
          }
        } else if (serverError && typeof serverError === 'object') {
          errorMessage = serverError.message || serverError.detail || 
                        serverError.non_field_errors?.[0] || errorMessage;
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Handle specific error cases
      if (errorMessage.includes('user_type')) {
        errorMessage = 'User data format error. Please contact support.';
      }

      setLoading(false);
      
      return { 
        success: false, 
        error: { 
          code: 'LOGIN_FAILED', 
          message: errorMessage
        } 
      };
    } finally {
      setLoading(false);
    }
  }, [fetchVendorProfile]);

  
  const register = useCallback(async (userData: ExtendedRegisterData): Promise<RegistrationResponse> => {
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
        
        setAuthStorage(access, refresh, user, vendor_profile);
        setCurrentUser(user);
        setRequiresOTP(requires_otp_verification || false);

        if (user.user_type === 'vendor' || user.user_type === 'mechanic') {
          await fetchVendorProfile(true); // Force refresh after registration
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
  }, [setAuthStorage, fetchVendorProfile]);

 
  const verifyOTP = useCallback(async (phone_number: string, otp: string): Promise<VerifyOTPResult> => {
    try {
      const response = await authApiService.verifyOTP({ phone_number, otp });
      
      if (response.data) {
        const { user, access, refresh, vendor_profile, redirectPath } = response.data;
        
        secureStorage.removeItem('temp_access_token');
        secureStorage.removeItem('temp_refresh_token');
        secureStorage.removeItem('temp_user');
        
        setAuthStorage(access, refresh, user, vendor_profile);
        setCurrentUser(user);
        setRequiresOTP(false);
        setPendingUser(null);

        if (user.user_type === 'vendor' || user.user_type === 'mechanic') {
          await fetchVendorProfile(true);
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
  }, [setAuthStorage, fetchVendorProfile]);

 const resendOTP = async (phone_number: string, preferred_channel?: string): Promise<LocalResendOTPResult> => {
  try {
    const data: { phone_number: string; preferred_channel?: string } = { phone_number };
    if (preferred_channel) {
      data.preferred_channel = preferred_channel;
    }
    
    const response = await authApiService.resendOTP(data);
    return { 
      success: true, 
      data: {
        message: response.data.message,
        channel_used: response.data.channel_used,
        preferred_channel: preferred_channel || 'whatsapp',
        remaining_attempts: response.data.remaining_attempts || 3
      }
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
   

  const updateOTPChannel = useCallback(async (preferred_channel: string): Promise<UpdateOTPChannelResult> => {
    try {
      const response = await authApiService.updateOTPChannel({ preferred_otp_channel: preferred_channel });
      
      if (response.data) {
        const updatedUser = { ...currentUser, ...response.data } as User;
        setCurrentUser(updatedUser);
        secureStorage.setItem('user', JSON.stringify(updatedUser));
        
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
  }, [currentUser]);

  const createVendorProfile = useCallback(async (vendorData: VendorRegistrationData): Promise<CreateVendorProfileResult> => {
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
      
      // Create vendor profile with safe property access
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
      vendorProfileCache.current = { 
        data: newVendorProfile, 
        timestamp: Date.now(), 
        isFetching: false 
      };
      secureStorage.setItem('vendor_profile', JSON.stringify(newVendorProfile));

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
  }, [currentUser, vendorProfile]);

  
  const logout = useCallback(async () => {
    try {
      await authApiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      clearAuthStorage();
      setCurrentUser(null);
      setVendorProfile(null);
      setRequiresOTP(false);
      setPendingUser(null);
      vendorProfileCache.current = { data: null, timestamp: 0, isFetching: false };
    }
  }, [clearAuthStorage]);

  
  const updateUser = useCallback((userData: Partial<User>) => {
    setCurrentUser(prev => {
      if (!prev) return null;
      const updatedUser = { ...prev, ...userData };
      secureStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  const isVendor = useCallback((): boolean => {
    return currentUser?.user_type === 'vendor' || currentUser?.user_type === 'mechanic';
  }, [currentUser]);

  const isMechanic = useCallback((): boolean => {
    return currentUser?.user_type === 'mechanic';
  }, [currentUser]);

  const isCustomer = useCallback((): boolean => {
    return currentUser?.user_type === 'customer';
  }, [currentUser]);

  const hasVendorProfile = useCallback((): boolean => {
    return isVendor() && vendorProfile !== null;
  }, [isVendor, vendorProfile]);

  const isVendorRegistrationComplete = useCallback((): boolean => {
    return hasVendorProfile() && 
           vendorProfile !== null && 
           vendorProfile.business_name !== '' && 
           vendorProfile.address !== '' && 
           vendorProfile.city !== '' && 
           vendorProfile.contact_number !== '';
  }, [hasVendorProfile, vendorProfile]);

  const getRedirectPath = useCallback((): string => {
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
  }, [currentUser, isVendor, hasVendorProfile]);

  const redirectBasedOnUserType = useCallback((): string => {
    return getRedirectPath();
  }, [getRedirectPath]);

  const getCartApiBaseUrl = useCallback((): string => {
    return 'https://api.zenoservices.co.ke/api/orders/';
  }, []);

  const getCartItemsUrl = useCallback((cartId?: number): string => {
    const baseUrl = getCartApiBaseUrl();
    if (cartId) {
      return `${baseUrl}cart/${cartId}/items/`;
    }
    return `${baseUrl}cart/items/`;
  }, [getCartApiBaseUrl]);

  const getCartItemUrl = useCallback((itemId: number, cartId?: number): string => {
    const baseUrl = getCartApiBaseUrl();
    if (cartId) {
      return `${baseUrl}cart/${cartId}/items/${itemId}/`;
    }
    return `${baseUrl}cart/items/${itemId}/`;
  }, [getCartApiBaseUrl]);

 
  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  useEffect(() => {
    if (currentUser && (currentUser.user_type === 'vendor' || currentUser.user_type === 'mechanic')) {
      fetchVendorProfile();
    } else {
      setVendorProfile(null);
      vendorProfileCache.current = { data: null, timestamp: 0, isFetching: false };
    }
  }, [currentUser, fetchVendorProfile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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
    createVendorProfile,
    isVendorRegistrationComplete
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;