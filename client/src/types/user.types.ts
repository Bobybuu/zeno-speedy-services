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
}

export interface AuthContextType {
  currentUser: User | null;
  vendorProfile: VendorProfile | null;
  requiresOTP: boolean;
  loading: boolean;
  vendorLoading: boolean;
  pendingUser: User | null;
  login: (phone_number: string, password: string) => Promise<LoginResult>;
  register: (userData: RegisterData) => Promise<RegisterResult>;
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
  getCartApiBaseUrl: () => string;
  getCartItemsUrl: (cartId?: number) => string;
  getCartItemUrl: (itemId: number, cartId?: number) => string;
}