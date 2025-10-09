// src/services/api.tsx
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

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

// Define types
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

export interface ResendOTPData {
  phone_number: string;
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
  customer?: number;
  vendor?: number;
}

// Gas Products Types
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
  is_available: boolean;
  is_active: boolean;
  featured: boolean;
  in_stock: boolean;
  low_stock: boolean;
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
  forgotPassword: (phone_number: string) => api.post('/auth/forgot-password/', { phone_number }),
  verifyResetCode: (data: VerifyResetCodeData) => api.post('/auth/verify-reset-code/', data),
  resetPassword: (data: ResetPasswordData) => api.post('/auth/reset-password/', data),
};

// Services API
export const servicesAPI = {
  getServices: (filters?: ServiceFilters) => api.get('/services/', { params: filters }),
  getService: (id: number) => api.get(`/services/${id}/`),
  createService: (data: any) => api.post('/services/', data),
  updateService: (id: number, data: any) => api.put(`/services/${id}/`, data),
  deleteService: (id: number) => api.delete(`/services/${id}/`),
};

// Vendors API
export const vendorsAPI = {
  // Vendor management
  getVendors: (filters?: VendorFilters) => api.get('/vendors/vendors/', { params: filters }),
  getVendor: (id: number) => api.get(`/vendors/vendors/${id}/`),
  getMyVendor: () => api.get('/vendors/vendors/my_vendor/'),
  registerVendor: (data: VendorCreateData) => api.post('/vendors/vendors/', data),
  updateVendor: (id: number, data: VendorUpdateData) => api.patch(`/vendors/vendors/${id}/`, data),
  getVendorDashboard: () => api.get('/vendors/vendors/my_vendor/vendor_dashboard/'),
  
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

// Gas Products API
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

// Orders API
export const ordersAPI = {
  getOrders: (filters?: OrderFilters) => api.get('/orders/', { params: filters }),
  getOrder: (id: number) => api.get(`/orders/${id}/`),
  createOrder: (data: CreateOrderData) => api.post('/orders/', data),
  updateOrder: (id: number, data: any) => api.put(`/orders/${id}/`, data),
  cancelOrder: (id: number) => api.post(`/orders/${id}/cancel/`),
  
  // Customer orders
  getMyOrders: () => api.get('/orders/my_orders/'),
  
  // Vendor orders
  getVendorOrders: () => api.get('/orders/vendor_orders/'),
  updateOrderStatus: (orderId: number, status: string) => 
    api.patch(`/orders/${orderId}/update_status/`, { status }),
};

// Payments API
export const paymentsAPI = {
  createPayment: (data: any) => api.post('/payments/', data),
  getPayment: (id: number) => api.get(`/payments/${id}/`),
  verifyPayment: (id: number) => api.post(`/payments/${id}/verify/`),
  
  // Order payments
  createOrderPayment: (orderId: number, paymentMethod: string) => 
    api.post('/payments/create_order_payment/', { order: orderId, payment_method: paymentMethod }),
};

// Cart API (local storage based, but could be API-based)
export const cartAPI = {
  getCart: () => {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
  },
  
  addToCart: (item: CartItem) => {
    const cart = cartAPI.getCart();
    const existingItemIndex = cart.findIndex((cartItem: CartItem) => 
      cartItem.product_id === item.product_id && cartItem.include_cylinder === item.include_cylinder
    );
    
    if (existingItemIndex > -1) {
      cart[existingItemIndex].quantity += item.quantity;
    } else {
      cart.push(item);
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    return cart;
  },
  
  updateCartItem: (productId: number, includeCylinder: boolean, quantity: number) => {
    const cart = cartAPI.getCart();
    const itemIndex = cart.findIndex((item: CartItem) => 
      item.product_id === productId && item.include_cylinder === includeCylinder
    );
    
    if (itemIndex > -1) {
      if (quantity <= 0) {
        cart.splice(itemIndex, 1);
      } else {
        cart[itemIndex].quantity = quantity;
      }
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    return cart;
  },
  
  removeFromCart: (productId: number, includeCylinder: boolean) => {
    const cart = cartAPI.getCart();
    const filteredCart = cart.filter((item: CartItem) => 
      !(item.product_id === productId && item.include_cylinder === includeCylinder)
    );
    
    localStorage.setItem('cart', JSON.stringify(filteredCart));
    return filteredCart;
  },
  
  clearCart: () => {
    localStorage.removeItem('cart');
    return [];
  },
  
  getCartTotal: () => {
    const cart = cartAPI.getCart();
    return cart.reduce((total: number, item: CartItem) => {
      const price = item.include_cylinder ? 
        (item.product?.price_with_cylinder || 0) : 
        (item.product?.price_without_cylinder || 0);
      return total + (price * item.quantity);
    }, 0);
  },
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

export default api;


// Add to your api.tsx
export const safeGasProductsAPI = {
  getGasProducts: async (filters?: GasProductFilters) => {
    try {
      // Remove problematic filters that might cause 500 errors
      const safeFilters = { ...filters };
      
      // Don't send empty or undefined values
      Object.keys(safeFilters).forEach(key => {
        if (safeFilters[key as keyof GasProductFilters] === undefined || safeFilters[key as keyof GasProductFilters] === '') {
          delete safeFilters[key as keyof GasProductFilters];
        }
      });

      // Ensure boolean values are properly formatted
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
      
      // If there's a 500 error, try without location filters
      if (error.response?.status === 500 && filters?.lat && filters?.lng) {
        console.log('Retrying without location filters...');
        const { lat, lng, radius, ...retryFilters } = filters;
        return gasProductsAPI.getGasProducts(retryFilters);
      }
      
      throw error;
    }
  }
};