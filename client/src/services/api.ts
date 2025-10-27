import axios from 'axios';
import { ApiConfig, LoginData, RegisterData, VerifyOTPData, UpdateOTPChannelData, ResendOTPData, ChangePasswordData, UpdateProfileData, ForgotPasswordData, VerifyResetCodeData, ResetPasswordData } from '@/types';

const API_BASE_URL = 'https://api.zenoservices.co.ke/api';

const apiConfig: ApiConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
};

const api = axios.create(apiConfig);

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('temp_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  
  // Shorter timeout for cart operations
  if (config.url?.includes('/cart/')) {
    config.timeout = 8000;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle token refresh for 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await api.post('/auth/token/refresh/', {
            refresh: refreshToken
          });
          
          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        clearAuthData();
        
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error);
    }
    
    return Promise.reject(error);
  }
);

// Auth API Service Class
export class AuthApiService {
  async login(credentials: LoginData) {
    const response = await api.post('/auth/login/', credentials);
    return response;
  }

  async register(userData: RegisterData) {
    const response = await api.post('/auth/register/', userData);
    return response;
  }

  async verifyOTP(data: VerifyOTPData) {
    const response = await api.post('/auth/verify-otp/', data);
    return response;
  }

  async resendOTP(data: ResendOTPData) {
    const response = await api.post('/auth/resend-otp/', data);
    return response;
  }

  async checkAuth() {
    const response = await api.get('/auth/check-auth/');
    return response;
  }

  async logout(data?: any) {
    const response = await api.post('/auth/logout/', data);
    return response;
  }

  async getProfile() {
    const response = await api.get('/auth/profile/');
    return response;
  }

  async updateProfile(data: UpdateProfileData) {
    const response = await api.put('/auth/update-profile/', data);
    return response;
  }

  async changePassword(data: ChangePasswordData) {
    const response = await api.post('/auth/change-password/', data);
    return response;
  }

  async refreshToken(refresh: string) {
    const response = await api.post('/auth/token/refresh/', { refresh });
    return response;
  }

  async forgotPassword(data: ForgotPasswordData) {
    const response = await api.post('/auth/forgot-password/', data);
    return response;
  }

  async verifyResetCode(data: VerifyResetCodeData) {
    const response = await api.post('/auth/verify-reset-code/', data);
    return response;
  }

  async resetPassword(data: ResetPasswordData) {
    const response = await api.post('/auth/reset-password/', data);
    return response;
  }

  async updateOTPChannel(data: UpdateOTPChannelData) {
    const response = await api.post('/auth/update-otp-channel/', data);
    return response;
  }
}

// Create singleton instance
export const authApiService = new AuthApiService();

// Legacy exports for backward compatibility
export const authAPI = {
  login: (credentials: LoginData) => authApiService.login(credentials),
  register: (userData: RegisterData) => authApiService.register(userData),
  verifyOTP: (data: VerifyOTPData) => authApiService.verifyOTP(data),
  resendOTP: (data: ResendOTPData) => authApiService.resendOTP(data),
  checkAuth: () => authApiService.checkAuth(),
  logout: (data?: any) => authApiService.logout(data),
  getProfile: () => authApiService.getProfile(),
  updateProfile: (data: UpdateProfileData) => authApiService.updateProfile(data),
  changePassword: (data: ChangePasswordData) => authApiService.changePassword(data),
  refreshToken: (refresh: string) => authApiService.refreshToken(refresh),
  forgotPassword: (data: ForgotPasswordData) => authApiService.forgotPassword(data),
  verifyResetCode: (data: VerifyResetCodeData) => authApiService.verifyResetCode(data),
  resetPassword: (data: ResetPasswordData) => authApiService.resetPassword(data),
  updateOTPChannel: (data: UpdateOTPChannelData) => authApiService.updateOTPChannel(data),
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

export const healthAPI = {
  checkBackendHealth: () => api.get('/health/'),
  checkCartHealth: () => api.get('/orders/cart/health/', { timeout: 5000 })
};

export default api;