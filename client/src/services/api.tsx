// src/services/api.tsx
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  // Check for both temporary and permanent tokens
  const token = localStorage.getItem('access_token') || localStorage.getItem('temp_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Ensure JSON content type for all requests
  if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  
  // ✅ Add shorter timeout for cart operations
  if (config.url?.includes('/cart/')) {
    config.timeout = 8000; // 8 seconds for cart operations
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle token refresh for 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken
          });
          
          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Refresh failed, logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('temp_access_token');
        localStorage.removeItem('temp_refresh_token');
        localStorage.removeItem('temp_user');
        
        // Redirect to login if we're not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error);
      // You could show a network error notification here
    }
    
    return Promise.reject(error);
  }
);

// ========== ENHANCED TYPES FOR VENDOR DASHBOARD ==========

// Vendor Dashboard Analytics Types
export interface VendorDashboardAnalytics {
  // Financial Analytics
  total_earnings: number;
  available_balance: number;
  pending_payouts: number;
  total_paid_out: number;
  next_payout_amount: number;
  
  // Order Analytics
  total_orders_count: number;
  completed_orders_count: number;
  order_completion_rate: number;
  active_customers_count: number;
  
  // Product Analytics
  total_gas_products: number;
  available_gas_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  
  // Commission Analytics
  commission_rate: number;
  average_commission: number;
  
  // Payout Status
  has_payout_preference: boolean;
  payout_preference?: VendorPayoutPreference;
  
  // Recent Activity
  recent_earnings: VendorEarning[];
  recent_payouts: PayoutTransaction[];
  
  // Basic Info
  business_name: string;
  average_rating: number;
  total_reviews: number;
  is_verified: boolean;
}

export interface VendorOrderAnalytics {
  date_period: string;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  total_commission: number;
  net_earnings: number;
  average_order_value: number;
  order_completion_rate: number;
  daily_orders: Array<{ date: string; count: number }>;
  weekly_revenue: Array<{ week: number; revenue: number }>;
}

export interface VendorEarning {
  id: number;
  earning_type: 'order' | 'commission' | 'refund' | 'bonus';
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  net_amount: number;
  status: 'pending' | 'processed' | 'paid' | 'failed';
  order_id?: number;
  order_total?: number;
  customer_name?: string;
  description?: string;
  created_at: string;
  processed_at?: string;
}

export interface VendorPayoutPreference {
  id: number;
  payout_method: 'mpesa' | 'bank_transfer' | 'cash';
  mobile_money_number?: string;
  mobile_money_name?: string;
  bank_name?: string;
  bank_type?: string;
  account_number?: string;
  account_name?: string;
  branch_code?: string;
  swift_code?: string;
  is_verified: boolean;
  verification_document?: string;
  auto_payout: boolean;
  payout_threshold: number;
  payout_details_summary: string;
  created_at: string;
  updated_at: string;
}

export interface PayoutTransaction {
  id: number;
  vendor: number;
  vendor_name: string;
  payout_method: string;
  payout_reference: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recipient_details: any;
  gateway_response: any;
  initiated_at: string;
  processed_at?: string;
  completed_at?: string;
  description?: string;
  earnings_count?: number;
  earnings_total?: number;
}

export interface VendorPerformance {
  id: number;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  average_order_value: number;
  total_revenue: number;
  total_commission: number;
  total_earnings: number;
  repeat_customers: number;
  customer_satisfaction_score: number;
  completion_rate: number;
  cancellation_rate: number;
  last_order_date?: string;
  metrics_updated_at: string;
}

// Vendor Dashboard Stats
export interface VendorStats {
  gas_products: {
    total: number;
    available: number;
    low_stock: number;
  };
  services: {
    total: number;
    available: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
  };
  financial: {
    total_earnings: number;
    available_balance: number;
    pending_payouts: number;
    total_paid_out: number;
    currency: string;
  };
  ratings: {
    average: number;
    total_reviews: number;
  };
}

// Bulk Operations Types
export interface BulkOrderStatusUpdate {
  order_ids: number[];
  status: string;
  note?: string;
}

export interface BulkOrderStatusUpdateResult {
  message: string;
  results: Array<{
    order_id: number;
    success: boolean;
    new_status?: string;
    error?: string;
  }>;
}

// ========== EXISTING TYPES (KEPT FOR COMPATIBILITY) ==========

export interface LoginData {
  phone_number: string;
  password: string;
}

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

// ✅ UPDATED: Gas Products Types to match backend
export interface GasProduct {
  id: number;
  name: string;
  gas_type: string;
  cylinder_size: string;
  brand: string;
  price_with_cylinder: number;
  price_without_cylinder: number;
  cylinder_deposit?: number;
  stock_quantity: number;
  min_stock_alert: number;
  description?: string;
  ingredients?: string;
  safety_instructions?: string;
  is_available: boolean; // ✅ This matches your backend
  is_active: boolean;    // ✅ This matches your backend
  featured: boolean;
  in_stock: boolean;     // ✅ Calculated field
  low_stock: boolean;    // ✅ Calculated field
  vendor: number;
  vendor_name: string;
  vendor_city: string;
  vendor_latitude?: number;
  vendor_longitude?: number;
  images: Array<{
    id: number;
    image: string;
    alt_text: string;
    is_primary: boolean;
  }>;
  created_at: string;
  updated_at: string;
}

export interface GasProductCreateData {
  name: string;
  gas_type: string;
  cylinder_size: string;
  brand?: string;
  price_with_cylinder: number;
  price_without_cylinder: number;
  stock_quantity: number;
  min_stock_alert?: number;
  description?: string;
  ingredients?: string;
  safety_instructions?: string;
  featured?: boolean;
}

export interface GasProductUpdateData {
  name?: string;
  brand?: string;
  price_with_cylinder?: number;
  price_without_cylinder?: number;
  stock_quantity?: number;
  min_stock_alert?: number;
  description?: string;
  ingredients?: string;
  safety_instructions?: string;
  is_active?: boolean;
  featured?: boolean;
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

export interface Vendor {
  id: number;
  user: number;
  business_name: string;
  business_type: string;
  description?: string;
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
  delivery_radius_km: number;
  min_order_amount: number;
  delivery_fee: number;
  total_gas_products?: number;
  available_gas_products?: number;
  operating_hours: Array<{
    id: number;
    day: number;
    opening_time: string;
    closing_time: string;
    is_closed: boolean;
  }>;
  reviews: Array<{
    id: number;
    customer: number;
    customer_name: string;
    rating: number;
    comment: string;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface VendorCreateData {
  business_name: string;
  business_type: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address: string;
  city: string;
  country?: string;
  contact_number: string;
  email?: string;
  website?: string;
  delivery_radius_km?: number;
  min_order_amount?: number;
  delivery_fee?: number;
}

export interface VendorUpdateData {
  business_name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  contact_number?: string;
  email?: string;
  website?: string;
  opening_hours?: string;
  delivery_radius_km?: number;
  min_order_amount?: number;
  delivery_fee?: number;
}

export interface VendorReviewData {
  rating: number;
  comment?: string;
}

export interface OperatingHoursData {
  day: number;
  opening_time: string;
  closing_time: string;
  is_closed?: boolean;
}

export interface CartItem {
  product_id: number;
  quantity: number;
  include_cylinder: boolean;
  product?: GasProduct;
}

export interface OrderItem {
  product: number;
  quantity: number;
  unit_price: number;
  include_cylinder: boolean;
}

export interface CreateOrderData {
  vendor: number;
  items: OrderItem[];
  delivery_address?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  special_instructions?: string;
}

// ========== ENHANCED API ENDPOINTS ==========

// Auth API
export const authAPI = {
  login: (credentials: LoginData) => api.post('/auth/login/', credentials),
  register: (userData: RegisterData) => api.post('/auth/register/', userData),
  verifyOTP: (data: VerifyOTPData) => api.post('/auth/verify-otp/', data),
  resendOTP: (data: ResendOTPData) => api.post('/auth/resend-otp/', data),
  checkAuth: () => api.get('/auth/check-auth/'),
  logout: (data?: any) => api.post('/auth/logout/', data),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data: UpdateProfileData) => api.put('/auth/update-profile/', data),
  changePassword: (data: ChangePasswordData) => api.post('/auth/change-password/', data),
  refreshToken: (refresh: string) => api.post('/auth/token/refresh/', { refresh }),
  forgotPassword: (data: ForgotPasswordData) => api.post('/auth/forgot-password/', data),
  verifyResetCode: (data: VerifyResetCodeData) => api.post('/auth/verify-reset-code/', data),
  resetPassword: (data: ResetPasswordData) => api.post('/auth/reset-password/', data),
  updateOTPChannel: (data: UpdateOTPChannelData) => api.post('/auth/update-otp-channel/', data),
};

// Services API
export const servicesAPI = {
  getServices: (filters?: ServiceFilters) => api.get('/services/', { params: filters }),
  getService: (id: number) => api.get(`/services/${id}/`),
  createService: (data: any) => api.post('/services/', data),
  updateService: (id: number, data: any) => api.put(`/services/${id}/`, data),
  deleteService: (id: number) => api.delete(`/services/${id}/`),
};

// ========== ENHANCED VENDORS API WITH DASHBOARD ENDPOINTS ==========
export const vendorsAPI = {
  // Vendor management
  getVendors: (filters?: VendorFilters) => api.get('/vendors/vendors/', { params: filters }),
  getVendor: (id: number) => api.get(`/vendors/vendors/${id}/`),
  getMyVendor: () => api.get('/vendors/vendors/my_vendor/'),
  registerVendor: (data: VendorCreateData) => api.post('/vendors/vendors/', data),
  updateVendor: (id: number, data: VendorUpdateData) => api.patch(`/vendors/vendors/${id}/`, data),
  
  // Vendor Dashboard & Analytics
  getVendorDashboard: () => api.get('/vendors/vendors/my_vendor/vendor_dashboard/'),
  getVendorDashboardAnalytics: () => api.get('/vendors/vendors/my_vendor/vendor_dashboard_analytics/'),
  getVendorStats: () => api.get('/vendors/vendors/vendor_stats/'),
  getOrderAnalytics: (period?: string) => api.get('/vendors/vendors/my_vendor/order_analytics/', { 
    params: { period } 
  }),
  updatePerformanceMetrics: () => api.post('/vendors/vendors/my_vendor/update_performance_metrics/'),
  
  // Vendor Earnings & Payouts
  getEarnings: (filters?: { type?: string; status?: string; date_from?: string; date_to?: string }) => 
    api.get('/vendors/vendors/my_vendor/earnings/', { params: filters }),
  getPayoutHistory: () => api.get('/vendors/vendors/my_vendor/payout_history/'),
  
  // Payout Preferences
  getPayoutPreferences: () => api.get('/vendors/vendors/my_vendor/payout_preferences/'),
  updatePayoutPreferences: (data: any) => api.put('/vendors/vendors/my_vendor/payout_preferences/', data),
  
  // Vendor location and discovery
  getNearbyVendors: (lat: number, lng: number, radius: number = 10, business_type?: string) => 
    api.get('/vendors/vendors/nearby_vendors/', { 
      params: { lat, lng, radius, business_type } 
    }),
  
  // Vendor with products
  getVendorWithProducts: (id: number) => api.get(`/vendors/vendors/${id}/vendor_with_products/`),
  
  // Reviews
  getVendorReviews: (vendorId: number) => api.get(`/vendors/reviews/vendor_reviews/?vendor=${vendorId}`),
  createReview: (vendorId: number, data: VendorReviewData) => api.post('/vendors/reviews/', { ...data, vendor: vendorId }),
  updateReview: (reviewId: number, data: VendorReviewData) => api.put(`/vendors/reviews/${reviewId}/`, data),
  deleteReview: (reviewId: number) => api.delete(`/vendors/reviews/${reviewId}/`),
  
  // Operating hours
  getOperatingHours: (vendorId: number) => api.get('/vendors/operating-hours/', { params: { vendor: vendorId } }),
  createOperatingHours: (data: OperatingHoursData) => api.post('/vendors/operating-hours/', data),
  updateOperatingHours: (id: number, data: OperatingHoursData) => api.put(`/vendors/operating-hours/${id}/`, data),
  deleteOperatingHours: (id: number) => api.delete(`/vendors/operating-hours/${id}/`),
};

// ========== ENHANCED GAS PRODUCTS API ==========
export const gasProductsAPI = {
  // Product management
  getGasProducts: (filters?: GasProductFilters) => api.get('/vendors/gas-products/', { params: filters }),
  getGasProduct: (id: number) => api.get(`/vendors/gas-products/${id}/`),
  createGasProduct: (data: GasProductCreateData) => api.post('/vendors/gas-products/', data),
  updateGasProduct: (id: number, data: GasProductUpdateData) => api.patch(`/vendors/gas-products/${id}/`, data),
  deleteGasProduct: (id: number) => api.delete(`/vendors/gas-products/${id}/`),
  
  // Vendor-specific products
  getMyProducts: () => api.get('/vendors/gas-products/my_products/'),
  
  // Product actions
  updateStock: (id: number, stockQuantity: number, minStockAlert?: number) => 
    api.patch(`/vendors/gas-products/${id}/update_stock/`, { stock_quantity: stockQuantity, min_stock_alert: minStockAlert }),
  
  toggleAvailability: (id: number) => 
    api.post(`/vendors/gas-products/${id}/toggle_availability/`),
  
  // Product discovery
  getFeaturedProducts: () => api.get('/vendors/gas-products/featured_products/'),
  
  searchProducts: (query: string, filters?: GasProductFilters) => 
    api.get('/vendors/gas-products/search_products/', { 
      params: { search: query, ...filters } 
    }),
  
  // Product images
  uploadProductImage: (productId: number, imageFile: File, altText?: string, isPrimary?: boolean) => {
    const formData = new FormData();
    formData.append('product', productId.toString());
    formData.append('image', imageFile);
    if (altText) formData.append('alt_text', altText);
    if (isPrimary) formData.append('is_primary', isPrimary.toString());
    
    return api.post('/vendors/product-images/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  deleteProductImage: (imageId: number) => api.delete(`/vendors/product-images/${imageId}/`),
  setPrimaryImage: (imageId: number) => api.post(`/vendors/product-images/${imageId}/set_primary/`),
};

// ✅ UPDATED: ORDERS API WITH CORRECT ENDPOINTS
export const ordersAPI = {
  // ✅ FIXED: Basic order operations matching your Django endpoints
  getOrders: (filters?: OrderFilters) => api.get('/orders/orders/', { params: filters }),
  getOrder: (id: number) => api.get(`/orders/orders/${id}/`),
  createOrder: (data: CreateOrderData) => api.post('/orders/orders/', data),
  updateOrder: (id: number, data: any) => api.patch(`/orders/orders/${id}/`, data),
  cancelOrder: (id: number) => api.post(`/orders/orders/${id}/cancel/`),
  
  // ✅ FIXED: Customer orders
  getMyOrders: () => api.get('/orders/orders/my_orders/'),
  
  // ✅ FIXED: Vendor orders management - USE CORRECT ENDPOINTS
  getVendorOrders: (filters?: OrderFilters) => api.get('/orders/orders/vendor/orders/', { params: filters }),
  getVendorDashboardOrders: () => api.get('/orders/orders/vendor/dashboard/'),
  getGasProductOrders: (filters?: { status?: string }) => api.get('/orders/orders/vendor/gas_products/', { params: filters }),
  
  // ✅ FIXED: Order actions - USE CORRECT ENDPOINTS
  updateOrderStatus: (orderId: number, status: string, note?: string) => 
    api.post(`/orders/orders/${orderId}/update_status/`, { status, note }),
  updateOrderPriority: (orderId: number, priority: string) => 
    api.post(`/orders/orders/${orderId}/update_priority/`, { priority }),
  updateCompletionTime: (orderId: number, estimatedCompletionTime: string) => 
    api.post(`/orders/orders/${orderId}/update_completion_time/`, { estimated_completion_time: estimatedCompletionTime }),
  
  // ✅ FIXED: Bulk operations
  bulkUpdateStatus: (data: BulkOrderStatusUpdate) => 
    api.post('/orders/orders/vendor/bulk_update_status/', data),
  
  // ✅ FIXED: Analytics
  getVendorAnalytics: (days?: number) => 
    api.get('/orders/orders/vendor/analytics/', { params: { days } }),
  
  // ✅ FIXED: Tracking
  getOrderTracking: (orderId: number) => 
    api.get(`/orders/orders/${orderId}/tracking/`),
};

// ========== ENHANCED PAYMENTS API WITH VENDOR PAYOUTS ==========
export const paymentsAPI = {
  // Payment operations
  createPayment: (data: any) => api.post('/payments/', data),
  getPayment: (id: number) => api.get(`/payments/${id}/`),
  verifyPayment: (id: number) => api.post(`/payments/${id}/verify/`),
  
  // Order payments
  createOrderPayment: (orderId: number, paymentMethod: string) => 
    api.post('/payments/create_order_payment/', { order: orderId, payment_method: paymentMethod }),
  
  // Vendor payouts
  getPayoutRequests: () => api.get('/payments/payout-requests/'),
  createPayoutRequest: (data: any) => api.post('/payments/payout-requests/', data),
  approvePayoutRequest: (payoutRequestId: number) => 
    api.post(`/payments/payout-requests/${payoutRequestId}/approve/`),
  processPayoutRequest: (payoutRequestId: number) => 
    api.post(`/payments/payout-requests/${payoutRequestId}/process/`),
  
  // Commission management
  processCommission: (paymentId: number, commissionRate?: number) => 
    api.post(`/payments/${paymentId}/process_commission/`, { commission_rate: commissionRate }),
};

// ========== VENDOR DASHBOARD SPECIFIC API ==========
export const vendorDashboardAPI = {
  // Comprehensive dashboard data
  getDashboardOverview: () => vendorsAPI.getVendorDashboard(),
  getDashboardAnalytics: () => vendorsAPI.getVendorDashboardAnalytics(),
  getVendorStats: () => vendorsAPI.getVendorStats(),
  
  // Financial data
  getEarnings: (filters?: any) => vendorsAPI.getEarnings(filters),
  getPayoutHistory: () => vendorsAPI.getPayoutHistory(),
  
  // Order analytics
  getOrderAnalytics: (period?: string) => vendorsAPI.getOrderAnalytics(period),
  getVendorOrderAnalytics: (days?: number) => ordersAPI.getVendorAnalytics(days),
  
  // Products management
  getMyProducts: () => gasProductsAPI.getMyProducts(),
  
  // Orders management
  getVendorOrders: (filters?: OrderFilters) => ordersAPI.getVendorOrders(filters),
  getDashboardOrders: () => ordersAPI.getVendorDashboardOrders(),
  
  // Payout preferences
  getPayoutPreferences: () => vendorsAPI.getPayoutPreferences(),
  updatePayoutPreferences: (data: any) => vendorsAPI.updatePayoutPreferences(data),
};

// ========== VENDOR PAYOUT MANAGEMENT API ==========
export const vendorPayoutsAPI = {
  // Payout preferences
  getPayoutPreferences: () => api.get('/vendors/payout-preferences/'),
  createPayoutPreference: (data: any) => api.post('/vendors/payout-preferences/', data),
  updatePayoutPreference: (id: number, data: any) => api.put(`/vendors/payout-preferences/${id}/`, data),
  
  // Earnings
  getEarnings: (filters?: any) => api.get('/vendors/vendor-earnings/', { params: filters }),
  getEarning: (id: number) => api.get(`/vendors/vendor-earnings/${id}/`),
  
  // Payout transactions
  getPayoutTransactions: (filters?: any) => api.get('/vendors/payout-transactions/', { params: filters }),
  getPayoutTransaction: (id: number) => api.get(`/vendors/payout-transactions/${id}/`),
};

// ✅ UPDATED: CART API WITH CORRECT DJANGO ENDPOINTS
export const cartAPI = {
  // ✅ FIXED: Get cart from backend
  getCart: async (): Promise<any> => {
    try {
      const response = await api.get('/orders/cart/my_cart/');
      console.log('🛒 Backend cart response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching cart from backend:', error);
      // Return empty cart structure if 404 (cart doesn't exist yet)
      if (error.response?.status === 404) {
        return {
          id: null,
          items: [],
          total_amount: 0,
          item_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      throw error;
    }
  },

  // ✅ FIXED: Add gas product to cart - USE CORRECT ENDPOINT AND PAYLOAD
  addGasProduct: async (productId: number, quantity: number = 1, includeCylinder: boolean = false): Promise<any> => {
    const payload = {
      product_id: productId, // ✅ CORRECT FIELD NAME
      quantity: quantity,
      include_cylinder: includeCylinder
      // ✅ item_type is handled by backend
    };

    console.log('📦 Sending payload to backend:', payload);
    
    // ✅ USE CORRECT ENDPOINT: /orders/cart/add_gas_product/
    const response = await api.post('/orders/cart/add_gas_product/', payload);
    console.log('✅ Gas product added to cart:', response.data);
    return response.data;
  },

  // ✅ FIXED: Update cart item quantity - USE CORRECT ENDPOINT
  updateCartItem: async (itemId: number, quantity: number): Promise<any> => {
    const payload = {
      item_id: itemId, // ✅ CORRECT FIELD NAME
      quantity: quantity
    };
    
    const response = await api.post('/orders/cart/update_quantity/', payload);
    console.log('✅ Cart item updated:', response.data);
    return response.data;
  },

  // ✅ FIXED: Remove item from cart - USE CORRECT ENDPOINT
  removeFromCart: async (itemId: number): Promise<any> => {
    const payload = {
      item_id: itemId // ✅ CORRECT FIELD NAME
    };
    
    const response = await api.post('/orders/cart/remove_item/', payload);
    console.log('✅ Item removed from cart');
    return response.data;
  },

  // ✅ FIXED: Clear entire cart - USE CORRECT ENDPOINT
  clearCart: async (): Promise<any> => {
    const response = await api.post('/orders/cart/clear/');
    console.log('✅ Cart cleared:', response.data);
    return response.data;
  },

  // ✅ FIXED: Sync localStorage cart (if needed)
  syncLocalStorageCart: async (): Promise<any> => {
    const localCart = localStorage.getItem('local_cart');
    if (localCart) {
      try {
        const cartData = JSON.parse(localCart);
        console.log('🔄 Syncing localStorage cart items to server...');
        
        // Sync local cart items to server using correct endpoint
        for (const item of cartData.items) {
          await api.post('/orders/cart/add_gas_product/', {
            product_id: item.product_id,
            quantity: item.quantity,
            include_cylinder: item.include_cylinder
          });
        }
        
        // Clear local cart after sync
        localStorage.removeItem('local_cart');
        console.log('✅ LocalStorage cart synced to backend');
        
        return { success: true, message: 'Cart synced successfully' };
      } catch (error) {
        console.error('❌ Error syncing local cart:', error);
        return { success: false, message: 'Failed to sync cart' };
      }
    }
    return { success: true, message: 'No items to sync' };
  },

  // ========== LOCALSTORAGE METHODS (FALLBACK FOR UNAUTHENTICATED USERS) ==========

  // Get cart from localStorage
  getLocalStorageCart: () => {
    try {
      const cartData = localStorage.getItem('local_cart');
      if (cartData) {
        return JSON.parse(cartData);
      }
      return { 
        id: null, 
        items: [], 
        total_amount: 0, 
        item_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error reading cart from localStorage:', error);
      return { 
        id: null, 
        items: [], 
        total_amount: 0, 
        item_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  },

  // Add product to localStorage cart
  addToLocalStorageCart: (productId: number, quantity: number = 1, includeCylinder: boolean = false) => {
    try {
      const currentCart = cartAPI.getLocalStorageCart();
      
      // Generate a unique item ID
      const itemId = Date.now();
      
      // Create mock product data for display
      const mockProduct = {
        id: productId,
        name: `Gas Product ${productId}`,
        gas_type: 'lpg',
        cylinder_size: '13kg',
        brand: 'Generic',
        price_with_cylinder: 3000,
        price_without_cylinder: 2500,
        vendor_name: 'Gas Vendor',
        vendor_city: 'Nairobi',
        is_available: true,
        in_stock: true
      };
      
      const existingItemIndex = currentCart.items.findIndex(
        (item: any) => item.product_id === productId && item.include_cylinder === includeCylinder
      );

      if (existingItemIndex > -1) {
        // Update existing item
        currentCart.items[existingItemIndex].quantity += quantity;
        currentCart.items[existingItemIndex].total_price = 
          currentCart.items[existingItemIndex].quantity * 
          (includeCylinder ? mockProduct.price_with_cylinder : mockProduct.price_without_cylinder);
      } else {
        // Add new item
        const unitPrice = includeCylinder ? mockProduct.price_with_cylinder : mockProduct.price_without_cylinder;
        currentCart.items.push({
          id: itemId,
          item_type: 'gas_product',
          gas_product: productId,
          product_id: productId,
          quantity: quantity,
          unit_price: unitPrice,
          total_price: unitPrice * quantity,
          include_cylinder: includeCylinder,
          item_name: mockProduct.name,
          gas_product_details: mockProduct,
          added_at: new Date().toISOString()
        });
      }

      // Recalculate totals
      currentCart.item_count = currentCart.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      currentCart.total_amount = currentCart.items.reduce((sum: number, item: any) => sum + item.total_price, 0);
      currentCart.updated_at = new Date().toISOString();

      localStorage.setItem('local_cart', JSON.stringify(currentCart));
      
      console.log('✅ Product added to localStorage cart:', { productId, quantity, includeCylinder });
      return { 
        success: true, 
        message: 'Added to cart',
        cart: currentCart
      };
    } catch (error) {
      console.error('Error adding to localStorage cart:', error);
      return { 
        success: false, 
        message: 'Failed to add to cart',
        cart: { items: [], total_amount: 0, item_count: 0 }
      };
    }
  },

  // Update localStorage cart item
  updateLocalStorageCartItem: (itemId: number, quantity: number) => {
    try {
      const currentCart = cartAPI.getLocalStorageCart();
      const itemIndex = currentCart.items.findIndex((item: any) => item.id === itemId);

      if (itemIndex > -1) {
        if (quantity <= 0) {
          // Remove item if quantity is 0 or less
          currentCart.items.splice(itemIndex, 1);
        } else {
          // Update quantity
          currentCart.items[itemIndex].quantity = quantity;
          currentCart.items[itemIndex].total_price = 
            currentCart.items[itemIndex].quantity * currentCart.items[itemIndex].unit_price;
        }

        // Recalculate totals
        currentCart.item_count = currentCart.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        currentCart.total_amount = currentCart.items.reduce((sum: number, item: any) => sum + item.total_price, 0);
        currentCart.updated_at = new Date().toISOString();

        localStorage.setItem('local_cart', JSON.stringify(currentCart));
        
        console.log('✅ LocalStorage cart item updated:', { itemId, quantity });
        return { 
          success: true, 
          message: 'Cart updated',
          cart: currentCart
        };
      } else {
        throw new Error('Item not found in cart');
      }
    } catch (error) {
      console.error('Error updating localStorage cart item:', error);
      return { 
        success: false, 
        message: 'Failed to update cart',
        cart: cartAPI.getLocalStorageCart()
      };
    }
  },

  // Remove item from localStorage cart
  removeFromLocalStorageCart: (itemId: number) => {
    try {
      const currentCart = cartAPI.getLocalStorageCart();
      currentCart.items = currentCart.items.filter((item: any) => item.id !== itemId);

      // Recalculate totals
      currentCart.item_count = currentCart.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      currentCart.total_amount = currentCart.items.reduce((sum: number, item: any) => sum + item.total_price, 0);
      currentCart.updated_at = new Date().toISOString();

      localStorage.setItem('local_cart', JSON.stringify(currentCart));
      
      console.log('✅ Item removed from localStorage cart:', itemId);
      return { 
        success: true, 
        message: 'Item removed from cart',
        cart: currentCart
      };
    } catch (error) {
      console.error('Error removing from localStorage cart:', error);
      return { 
        success: false, 
        message: 'Failed to remove item',
        cart: cartAPI.getLocalStorageCart()
      };
    }
  },

  // Clear localStorage cart
  clearLocalStorageCart: () => {
    try {
      const emptyCart = { 
        id: null, 
        items: [], 
        total_amount: 0, 
        item_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      localStorage.setItem('local_cart', JSON.stringify(emptyCart));
      
      console.log('✅ LocalStorage cart cleared');
      return { 
        success: true, 
        message: 'Cart cleared',
        cart: emptyCart
      };
    } catch (error) {
      console.error('Error clearing localStorage cart:', error);
      return { 
        success: false, 
        message: 'Failed to clear cart',
        cart: cartAPI.getLocalStorageCart()
      };
    }
  }
};

// Utility functions
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('access_token');
};

export const getToken = (): string | null => {
  return localStorage.getItem('access_token');
};

export const clearAuthData = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('temp_access_token');
  localStorage.removeItem('temp_refresh_token');
  localStorage.removeItem('temp_user');
  // Also clear localStorage cart on logout
  cartAPI.clearLocalStorageCart();
};

// Helper function for file uploads
export const uploadFile = (file: File, uploadUrl: string, onProgress?: (progress: number) => void) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post(uploadUrl, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = (progressEvent.loaded / progressEvent.total) * 100;
        onProgress(progress);
      }
    },
  });
};

export const healthAPI = {
  checkBackendHealth: () => api.get('/health/'),
  checkCartHealth: () => api.get('/orders/cart/health/', { timeout: 5000 })
};

export const safeGasProductsAPI = {
  getGasProducts: async (filters?: GasProductFilters) => {
    try {
      const safeFilters = { ...filters };
      Object.keys(safeFilters).forEach(key => {
        if (safeFilters[key as keyof GasProductFilters] === undefined || safeFilters[key as keyof GasProductFilters] === '') {
          delete safeFilters[key as keyof GasProductFilters];
        }
      });

      if (safeFilters.is_available !== undefined) {
        safeFilters.is_available = Boolean(safeFilters.is_available);
      }
      if (safeFilters.vendor__is_verified !== undefined) {
        safeFilters.vendor__is_verified = Boolean(safeFilters.vendor__is_verified);
      }

      console.log('Making API call with filters:', safeFilters);
      
      const response = await api.get('/vendors/gas-products/', { 
        params: safeFilters,
        paramsSerializer: (params) => {
          return Object.entries(params)
            .map(([key, value]) => {
              if (value === null || value === undefined) return '';
              return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            })
            .filter(Boolean)
            .join('&');
        }
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Error in safeGasProductsAPI.getGasProducts:', error);
      if (error.response?.status === 500 && filters?.lat && filters?.lng) {
        console.log('Retrying without location filters...');
        const { lat, lng, radius, ...retryFilters } = filters;
        return gasProductsAPI.getGasProducts(retryFilters);
      }
      throw error;
    }
  }
};

// ✅ ADDED: Debug function to test endpoints
export const testCartEndpoints = async () => {
  console.log('🧪 Testing cart endpoints...');
  
  try {
    // Test 1: Get cart
    const cart = await cartAPI.getCart();
    console.log('✅ GET /orders/cart/my_cart/:', cart);
    
    // Test 2: Add product (use a test product ID)
    const testProductId = 6; // Use your actual product ID
    try {
      const addResult = await cartAPI.addGasProduct(testProductId, 1, false);
      console.log('✅ POST /orders/cart/add_gas_product/:', addResult);
    } catch (addError: any) {
      console.log('❌ POST /orders/cart/add_gas_product/ failed:', addError.response?.data);
    }
    
  } catch (error: any) {
    console.error('❌ Cart endpoint test failed:', error);
  }
};

export default api;