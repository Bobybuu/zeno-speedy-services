import { ApiError } from './base.types';

// Export types explicitly to avoid conflicts - don't use wildcard exports
export type { ID, BaseEntity } from './base.types';
// Base types
export type { GasProduct, Vendor, VendorProfile, CheckoutOrderItem, RegisterData, LoginResult, RegisterResult, ResendOTPResult, ApiResult, ApiError, Service, ServiceCategory, ServiceImage } from './base.types';
// API types
export type { LoginData, VerifyOTPData, UpdateOTPChannelData, ResendOTPData, ChangePasswordData, UpdateProfileData, ForgotPasswordData, VerifyResetCodeData, ResetPasswordData, ServiceFilters, VendorFilters, GasProductFilters, OrderFilters, ApiConfig } from './api.types';

// User types
export type { User, AuthContextType } from './user.types';

// Vendor types
export type { OperatingHours, VendorReview, VendorCreateData, VendorUpdateData, VendorReviewData, OperatingHoursData } from './vendor.types';

// Product types
export type { GasProductCardProps, GasProductCardProduct, GasProductCreateData, GasProductUpdateData } from './product.types';

// Cart types
export type { 
  BackendCart as Cart, // FIXED: Export BackendCart as Cart for backward compatibility
  CartItem, 
  CartContextType,
  CartState,
  AddToCartPayload,
  AddServiceToCartPayload,
  UpdateCartItemPayload,
  RemoveCartItemPayload,
  CheckoutState,
  ShippingAddress,
  OrderSummary,
  CartValidationResult,
  CheckoutDetails,
  OrderItemPayload,
  CreateOrderPayload,
  OrderCreationResult,
  VendorInfo,
  RawCartItem,
  RawCartData,
  CartError,
  CartErrorCode,
  CartOperationResult,
  CartAnalytics,
  LocalStorageCart,
  CartSyncResult,
  BackendCartItem,
  ValidationResult as CartValidationResultType
} from './cart.types';

// Order types
export type {
  Order,
  OrderItem,
  OrderTracking,
  OrderStatus,
  PaymentStatus,
  CreateOrderData,
  BulkOrderStatusUpdate,
  BulkOrderStatusUpdateResult,
  OrderAnalytics,
  ValidationResult as OrderValidationResult
} from './order.types';

// Payment types
export type {
  Payment,
  PaymentStatus as PaymentStatusType,
  PaymentResponse,
  PaymentStatusResponse,
  PaymentState,
  PaymentContextType,
  PaymentResult,
  VendorDashboardAnalytics,
  VendorEarning,
  VendorPayoutPreference,
  PayoutTransaction,
  PaymentWebhook,
  MpesaSTKWebhook,
  MpesaB2CWebhook,
  CommissionSummary,
  PayoutRequest,
  ValidationResult as PaymentValidationResult
} from './payment.types';

// Common utility types
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
  errors?: ApiError[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  total_pages?: number;
  current_page?: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location {
  address: string;
  city: string;
  country: string;
  coordinates?: Coordinates;
  postal_code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings?: string[];
}

export interface ServiceCardProps {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  price?: number;
  available?: boolean;
  onClick?: () => void;
}

export interface MapProvider {
  id: number;
  name: string;
  location: string;
  coords: [number, number];
  price: string;
  rating?: number;
  distance?: string;
  business_type?: string;
  is_verified?: boolean;
}

export interface MapProps {
  providers?: MapProvider[];
  center?: [number, number];
  userLocation?: [number, number] | null;
  zoom?: number;
  onProviderSelect?: (provider: MapProvider) => void;
}

export interface MapboxConfig {
  accessToken: string;
  styleUrl: string;
  container?: string;
}

// Common Form Types
export interface FormField<T = any> {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'select' | 'textarea' | 'file';
  required: boolean;
  value: T;
  error?: string;
  options?: Array<{ label: string; value: any }>;
  validation?: (value: T) => ValidationResult;
}

export interface FormState {
  isValid: boolean;
  isSubmitting: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

// Common Filter Types
export interface DateRangeFilter {
  start_date?: string;
  end_date?: string;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface SearchFilters extends PaginationParams, DateRangeFilter {
  search?: string;
  status?: string;
  is_active?: boolean;
}