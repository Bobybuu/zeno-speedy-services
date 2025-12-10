import { 
  VendorProfile, 
  LoginResult, 
  RegisterResult, 
  ResendOTPResult,
  RegisterData 
} from './base.types';

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  user_type: 'customer' | 'vendor' | 'mechanic' | 'admin';
  location: string;
  is_verified: boolean;
  phone_verified: boolean;
  date_joined: string;
  preferred_otp_channel: string;
  preferred_otp_channel_display?: string;
  has_vendor_profile?: boolean; // Added for better type safety
}

// Comprehensive interface for registration response
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
    vendor_profile?: VendorProfile; // Added for vendor registration
    redirectPath?: string; // Added for proper redirection
  };
  error?: {
    code: string;
    message: string;
    details?: any;
    field_errors?: Record<string, string[]>;
  };
  redirectPath?: string;
}

// Enhanced Login Result interface
export interface EnhancedLoginResult {
  success: boolean;
  data?: {
    user: User;
    refresh: string;
    access: string;
    message: string;
    vendor_profile?: VendorProfile; // Added for vendor login
    redirectPath?: string; // Added for proper redirection
  };
  error?: {
    code: string;
    message: string;
    details?: any;
    field_errors?: Record<string, string[]>;
  };
}

// Vendor-specific registration data
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

// Extended RegisterData to include vendor information
export interface ExtendedRegisterData extends RegisterData {
  vendor_data?: VendorRegistrationData;
  user_type: 'customer' | 'vendor' | 'mechanic';
}

export interface AuthContextType {
  currentUser: User | null;
  vendorProfile: VendorProfile | null;
  requiresOTP: boolean;
  loading: boolean;
  vendorLoading: boolean;
  pendingUser: User | null;
  
  // Enhanced with proper typing
  login: (phone_number: string, password: string) => Promise<EnhancedLoginResult>;
  register: (userData: ExtendedRegisterData) => Promise<RegistrationResponse>;
  verifyOTP: (phone_number: string, otp: string) => Promise<{ 
    success: boolean; 
    data?: {
      user: User;
      refresh: string;
      access: string;
      message: string;
      vendor_profile?: VendorProfile;
      redirectPath?: string;
    }; 
    error?: any 
  }>;
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
  getCartApiBaseUrl: () => string;
  getCartItemsUrl: (cartId?: number) => string;
  getCartItemUrl: (itemId: number, cartId?: number) => string;
  
  // New methods for vendor registration
  createVendorProfile: (vendorData: VendorRegistrationData) => Promise<{ success: boolean; data?: VendorProfile; error?: any }>;
  isVendorRegistrationComplete: () => boolean;
}

// Error types for better error handling
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field_errors?: Record<string, string[]>;
  status?: number;
}

// Response wrapper for consistent API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  redirectPath?: string;
}

// Vendor profile status
export interface VendorProfileStatus {
  hasProfile: boolean;
  isVerified: boolean;
  isActive: boolean;
  profileComplete: boolean;
}

// User session information
export interface UserSession {
  user: User;
  vendorProfile?: VendorProfile;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}