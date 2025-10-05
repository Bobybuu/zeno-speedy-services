// src/services/api.ts
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
}

export interface OrderFilters {
  status?: string;
  customer?: number;
  vendor?: number;
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
  getVendors: (filters?: VendorFilters) => api.get('/vendors/', { params: filters }),
  getVendor: (id: number) => api.get(`/vendors/${id}/`),
  registerVendor: (data: any) => api.post('/vendors/register/', data),
  updateVendor: (id: number, data: any) => api.put(`/vendors/${id}/`, data),
  getVendorServices: (vendorId: number) => api.get(`/vendors/${vendorId}/services/`),
};

// Orders API
export const ordersAPI = {
  getOrders: (filters?: OrderFilters) => api.get('/orders/', { params: filters }),
  getOrder: (id: number) => api.get(`/orders/${id}/`),
  createOrder: (data: any) => api.post('/orders/', data),
  updateOrder: (id: number, data: any) => api.put(`/orders/${id}/`, data),
  cancelOrder: (id: number) => api.post(`/orders/${id}/cancel/`),
};

// Payments API
export const paymentsAPI = {
  createPayment: (data: any) => api.post('/payments/', data),
  getPayment: (id: number) => api.get(`/payments/${id}/`),
  verifyPayment: (id: number) => api.post(`/payments/${id}/verify/`),
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

export default api;