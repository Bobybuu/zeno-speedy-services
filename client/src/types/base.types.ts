// Base types that are used across multiple domains

// Common ID type for consistency - FIXED: Always number based on backend
export type ID = number;

// Base entity interface
export interface BaseEntity {
  id: ID;
  created_at?: string;
  updated_at?: string;
}

// Import dependent types first to avoid circular dependencies
export interface OperatingHours {
  id: ID;
  vendor_id: ID;
  day: number;
  opening_time: string;
  closing_time: string;
  is_closed: boolean;
}

export interface VendorReview {
  id: ID;
  vendor_id: ID;
  customer_id: ID;
  customer_name: string;
  customer_username: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface User {
  id: ID;
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

export interface GasProduct extends BaseEntity {
  name: string;
  gas_type: string;
  cylinder_size: string;
  price_with_cylinder: number;
  price_without_cylinder: number;
  vendor_id: ID; // FIXED: Consistent vendor_id
  vendor_name: string;
  vendor_city: string;
  vendor_latitude?: number;
  vendor_longitude?: number;
  is_available: boolean;
  in_stock: boolean;
  stock_quantity: number;
  min_stock_alert: number;
  description?: string;
  vendor_address?: string;
  vendor_contact?: string;
  brand?: string;
  cylinder_deposit?: number;
  is_active: boolean; // FIXED: Required field
  featured: boolean; // FIXED: Required field
  low_stock?: boolean;
  images?: Array<{
    id: ID;
    image: string;
    alt_text: string;
    is_primary: boolean;
  }>;
  ingredients?: string;
  safety_instructions?: string;
}

export interface Vendor extends BaseEntity {
  user_id?: ID;
  business_name: string;
  business_type: 'gas_station' | 'mechanic' | 'hospital' | 'roadside_assistance';
  description: string;
  latitude?: number;
  longitude?: number;
  address: string;
  city: string;
  country: string;
  contact_number: string;
  email?: string;
  website?: string;
  opening_hours?: string;
  is_verified: boolean;
  is_active: boolean;
  average_rating: number;
  total_reviews: number;
  operating_hours: OperatingHours[];
  reviews: VendorReview[];
  owner_name?: string;
  owner_email?: string;
  delivery_radius_km?: number;
  min_order_amount?: number;
  delivery_fee?: number;
  total_gas_products?: number;
  available_gas_products?: number;
}

export interface VendorProfile extends BaseEntity {
  user_id: ID; // FIXED: Consistent user_id
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
  website?: string;
}

export interface CheckoutOrderItem {
  id: ID;
  productId: ID;
  productName: string;
  vendorId: ID; // FIXED: Added vendorId
  vendorName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  includeCylinder: boolean;
  description?: string;
  itemType: 'gas_product' | 'service'; // FIXED: Added itemType
}

// Common API Data Types
export interface RegisterData {
  email?: string;
  username: string;
  password: string;
  password_confirm: string;
  user_type: string;
  phone_number: string;
  location?: string;
  first_name?: string;
  last_name?: string;
  preferred_otp_channel?: string; // FIXED: Added OTP channel
}

// Common API Result Types
export interface ApiResult<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field_errors?: Record<string, string[]>;
}

export interface LoginResult extends ApiResult<{
  user: User;
  refresh: string;
  access: string;
  message: string;
}> {}

export interface RegisterResult extends ApiResult<{
  user: User;
  refresh: string;
  access: string;
  message: string;
  requires_otp_verification: boolean;
  remaining_otp_attempts?: number;
  preferred_channel_used: string;
}> {}

export interface ResendOTPResult extends ApiResult<{
  message: string;
  channel_used: string;
  preferred_channel: string;
  remaining_attempts: number;
}> {}

// Service Types - ADDED: Missing service types
export interface Service extends BaseEntity {
  vendor_id: ID;
  category_id: ID;
  name: string;
  description: string;
  price: number;
  available: boolean;
  vendor_name?: string;
  vendor_type?: string;
  vendor_contact?: string;
  vendor_address?: string;
  vendor_latitude?: number;
  vendor_longitude?: number;
  images?: ServiceImage[];
  category?: ServiceCategory;
}

export interface ServiceCategory extends BaseEntity {
  name: string;
  description?: string;
  icon?: string;
}

export interface ServiceImage extends BaseEntity {
  service_id: ID;
  image: string;
  is_primary: boolean;
  alt_text?: string;
}