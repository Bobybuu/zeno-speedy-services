// src/services/api.js
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

export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  register: (userData) => api.post('/auth/register/', userData),
  verifyOTP: (data) => api.post('/auth/verify-otp/', data),
  resendOTP: (data) => api.post('/auth/resend-otp/', data),
  checkAuth: () => api.get('/auth/check-auth/'),
  logout: (data) => api.post('/auth/logout/', data),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.put('/auth/profile/', data),
  refreshToken: (refresh) => api.post('/auth/token/refresh/', { refresh }),
};

export const servicesAPI = {
  getServices: (filters) => api.get('/services/', { params: filters }),
  getService: (id) => api.get(`/services/${id}/`),
  createService: (data) => api.post('/services/', data),
  updateService: (id, data) => api.put(`/services/${id}/`, data),
  deleteService: (id) => api.delete(`/services/${id}/`),
};

export const vendorsAPI = {
  getVendors: (filters) => api.get('/vendors/', { params: filters }),
  getVendor: (id) => api.get(`/vendors/${id}/`),
  registerVendor: (data) => api.post('/vendors/register/', data),
  updateVendor: (id, data) => api.put(`/vendors/${id}/`, data),
  getVendorServices: (vendorId) => api.get(`/vendors/${vendorId}/services/`),
};

export const ordersAPI = {
  getOrders: (filters) => api.get('/orders/', { params: filters }),
  getOrder: (id) => api.get(`/orders/${id}/`),
  createOrder: (data) => api.post('/orders/', data),
  updateOrder: (id, data) => api.put(`/orders/${id}/`, data),
  cancelOrder: (id) => api.post(`/orders/${id}/cancel/`),
};

export const paymentsAPI = {
  createPayment: (data) => api.post('/payments/', data),
  getPayment: (id) => api.get(`/payments/${id}/`),
  verifyPayment: (id) => api.post(`/payments/${id}/verify/`),
};

// Utility function to check if user is authenticated
export const isAuthenticated = () => {
  return !!localStorage.getItem('access_token');
};

// Utility function to get current token
export const getToken = () => {
  return localStorage.getItem('access_token');
};

// Utility function to clear all auth data
export const clearAuthData = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('temp_access_token');
  localStorage.removeItem('temp_refresh_token');
  localStorage.removeItem('temp_user');
};

export default api;