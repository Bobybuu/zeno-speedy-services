// Base types that are used across multiple domains
export interface GasProduct {
  id: number;
  name: string;
  gas_type: string;
  cylinder_size: string;
  price_with_cylinder: number;
  price_without_cylinder: number;
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
  is_active?: boolean;
  featured?: boolean;
  low_stock?: boolean;
  vendor?: number;
  images?: Array<{
    id: number;
    image: string;
    alt_text: string;
    is_primary: boolean;
  }>;
  created_at?: string;
  updated_at?: string;
  ingredients?: string;
  safety_instructions?: string;
}

export interface Vendor {
  id: number | string;
  user?: number;
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
  operating_hours: any[];
  reviews: any[];
  owner_name?: string;
  owner_email?: string;
  delivery_radius_km?: number;
  min_order_amount?: number;
  delivery_fee?: number;
  total_gas_products?: number;
  available_gas_products?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VendorProfile {
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

export interface CheckoutOrderItem {
  id: number;
  productId: number;
  productName: string;
  vendorName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  includeCylinder: boolean;
  description?: string;
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
}

// Common API Result Types
export interface LoginResult {
  success: boolean;
  data?: any;
  error?: any;
  redirectPath?: string;
}

export interface RegisterResult {
  success: boolean;
  requiresOTP?: boolean;
  data?: any;
  error?: any;
  preferredChannelUsed?: string;
  redirectPath?: string;
}

export interface ResendOTPResult {
  success: boolean;
  data?: any;
  error?: any;
  channelUsed?: string;
}