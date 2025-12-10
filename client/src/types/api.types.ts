// API Request Types
export interface LoginData {
  phone_number: string;
  password: string;
}

export interface VerifyOTPData {
  phone_number: string;
  otp: string;
}

export interface UpdateOTPChannelData {
  preferred_otp_channel: string;
}

export interface ResendOTPData {
  phone_number: string;
  preferred_channel?: string;
}

export interface ChangePasswordData {
  old_password: string;
  new_password1: string;
  new_password2: string;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  location?: string;
  profile_picture?: File;
}

export interface ForgotPasswordData {
  phone_number: string;
}

export interface VerifyResetCodeData {
  phone_number: string;
  reset_code: string;
}

export interface ResetPasswordData {
  reset_token: string;
  new_password: string;
  confirm_password: string;
}

// API Filter Types
export interface ServiceFilters {
  service_type?: string;
  vendor__business_type?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}

export interface VendorFilters {
  business_type?: string;
  service_type?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  is_verified?: boolean;
  is_active?: boolean;
  city?: string;
}

export interface GasProductFilters {
  gas_type?: string;
  cylinder_size?: string;
  vendor?: number;
  is_available?: boolean;
  featured?: boolean;
  min_price?: number;
  max_price?: number;
  city?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  vendor__is_verified?: boolean;
}

export interface OrderFilters {
  status?: string;
  payment_status?: string;
  order_type?: string;
  priority?: string;
  date_from?: string;
  date_to?: string;
  customer?: number;
  vendor?: number;
}

// API Configuration
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers?: Record<string, string>;
}