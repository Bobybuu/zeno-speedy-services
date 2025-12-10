// src/services/api.ts
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ApiConfig, LoginData, RegisterData, VerifyOTPData, UpdateOTPChannelData, ResendOTPData, ChangePasswordData, UpdateProfileData, ForgotPasswordData, VerifyResetCodeData, ResetPasswordData } from '@/types';

// ✅ FIX: Define extended interface for request config
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _retry?: boolean;
}

// Environment-based configuration
const getApiBaseUrl = (): string => {
  // Use environment variable with fallback for different environments
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  if (import.meta.env.PROD) {
    return 'https://api.zenoservices.co.ke/api';
  }
  
  // Development and test environments
  if (import.meta.env.MODE === 'test') {
    return 'http://localhost:8001/api'; // Test server
  }
  
  return 'http://localhost:8000/api'; // Default development
};

const API_BASE_URL = getApiBaseUrl();

// Enhanced API configuration with better defaults
const apiConfig: ApiConfig = {
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased timeout for better mobile network support
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// Create axios instance with enhanced configuration
const api = axios.create(apiConfig);

// REMOVED: CSRF token management since we're using JWT

// Secure token storage with encryption fallback
const secureStorage = {
  setItem: (key: string, value: string): void => {
    try {
      // Try to use encrypted storage if available
      if (typeof window !== 'undefined' && window.localStorage) {
        // Simple obfuscation for development (use proper encryption in production)
        const encryptedValue = import.meta.env.PROD 
          ? btoa(unescape(encodeURIComponent(value))) // Base64 encoding
          : value;
        localStorage.setItem(key, encryptedValue);
      }
    } catch (error) {
      console.warn(`Failed to store ${key} in localStorage:`, error);
    }
  },

  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const value = localStorage.getItem(key);
        if (!value) return null;
        
        // Decrypt if encrypted
        return import.meta.env.PROD 
          ? decodeURIComponent(escape(atob(value))) // Base64 decoding
          : value;
      }
      return null;
    } catch (error) {
      console.warn(`Failed to retrieve ${key} from localStorage:`, error);
      return null;
    }
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Failed to remove ${key} from localStorage:`, error);
    }
  },

  clear: (): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('vendor_profile');
        localStorage.removeItem('temp_access_token');
        localStorage.removeItem('temp_refresh_token');
        localStorage.removeItem('temp_user');
      }
    } catch (error) {
      console.warn('Failed to clear auth data from localStorage:', error);
    }
  }
};

// UPDATED: Request interceptor - REMOVED CSRF logic for JWT
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // REMOVED: CSRF token logic for JWT
    // Only add auth token
    const token = secureStorage.getItem('access_token') || secureStorage.getItem('temp_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking
    if (config.headers) {
      config.headers['X-Request-ID'] = generateRequestId();
    }

    // Dynamic timeout based on endpoint type
    if (config.url?.includes('/cart/') || config.url?.includes('/orders/')) {
      config.timeout = 10000; // Shorter timeout for cart/order operations
    } else if (config.url?.includes('/upload/') || config.method === 'put') {
      config.timeout = 30000; // Longer timeout for file uploads
    }

    console.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      hasAuth: !!token,
      timeout: config.timeout
    });

    return config;
  },
  (error: AxiosError) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// UPDATED: Response interceptor - REMOVED CSRF token extraction
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.debug(`API Response: ${response.status} ${response.config.url}`, {
      data: response.data
    });

    return response;
  },
  async (error: AxiosError) => {
    // ✅ FIX: Cast to our extended type
    console.error('🚨 FULL API ERROR DETAILS:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      // This is the most important part - the actual error message from backend
      message: error.message,
      full_response_data: error.response?.data,
      request_data: JSON.parse(error.config?.data || '{}'), // What we sent
      headers: error.response?.headers,
    });
    const originalRequest = error.config as ExtendedAxiosRequestConfig;
    
    // Initialize retry count if not present
    if (!originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }

    console.error(`API Error: ${error.response?.status} ${error.config?.url}`, {
      message: error.message,
      retryCount: originalRequest._retryCount,
      data: error.response?.data
    });

    // ✅ FIX: Now _retry property should work
    // Handle token refresh for 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = secureStorage.getItem('refresh_token');
        if (refreshToken) {
          console.info('Attempting token refresh...');
          
          const response = await api.post('/auth/token/refresh/', {
            refresh: refreshToken
          });
          
          const newAccessToken = response.data.access;
          secureStorage.setItem('access_token', newAccessToken);
          
          // Update the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          
          console.info('Token refresh successful');
          return api(originalRequest);
        } else {
          console.warn('No refresh token available');
          clearAuthData();
          redirectToLogin();
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        clearAuthData();
        redirectToLogin();
      }
    }

    // Handle network errors with retry mechanism
    if (!error.response && originalRequest._retryCount < getMaxRetries()) {
      originalRequest._retryCount++;
      
      const retryDelay = calculateRetryDelay(originalRequest._retryCount);
      console.warn(`Retrying request (${originalRequest._retryCount}/${getMaxRetries()}) after ${retryDelay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return api(originalRequest);
    }

    // Handle specific error cases
    handleSpecificErrors(error);

    return Promise.reject(enhanceError(error));
  }
);

// Enhanced Auth API Service Class with retry mechanism
export class AuthApiService {
  private async requestWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    maxRetries: number = 3
  ): Promise<AxiosResponse<T>> {
    let lastError: AxiosError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await requestFn();
        return response;
      } catch (error) {
        lastError = error as AxiosError;
        
        // Don't retry on 4xx errors (except 429 - rate limiting)
        if (error.response?.status && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = calculateRetryDelay(attempt);
          console.warn(`Request attempt ${attempt} failed, retrying in ${delay}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`All ${maxRetries} request attempts failed`);
    throw lastError!;
  }

  async login(credentials: LoginData): Promise<AxiosResponse> {
    return this.requestWithRetry(() => 
      api.post('/auth/login/', credentials)
    );
  }

  async register(userData: RegisterData): Promise<AxiosResponse> {
    return this.requestWithRetry(() => 
      api.post('/auth/register/', userData)
    );
  }

  async verifyOTP(data: VerifyOTPData): Promise<AxiosResponse> {
    return this.requestWithRetry(() => 
      api.post('/auth/verify-otp/', data)
    );
  }

  async resendOTP(data: ResendOTPData): Promise<AxiosResponse> {
    return this.requestWithRetry(() => 
      api.post('/auth/resend-otp/', data)
    );
  }

  async checkAuth(): Promise<AxiosResponse> {
    return this.requestWithRetry(() => 
      api.get('/auth/check-auth/')
    );
  }

  async logout(data?: any): Promise<AxiosResponse> {
    return this.requestWithRetry(() => 
      api.post('/auth/logout/', data)
    );
  }

  async getProfile(): Promise<AxiosResponse> {
    return this.requestWithRetry(() => 
      api.get('/auth/profile/')
    );
  }

  async updateProfile(data: UpdateProfileData): Promise<AxiosResponse> {
    return this.requestWithRetry(() => 
      api.put('/auth/update-profile/', data)
    );
  }

  async changePassword(data: ChangePasswordData): Promise<AxiosResponse> {
    return this.requestWithRetry(() => 
      api.post('/auth/change-password/', data)
    );
  }

  async refreshToken(refresh: string): Promise<AxiosResponse> {
    return this.requestWithRetry(() => 
      api.post('/auth/token/refresh/', { refresh })
    );
  }

  async forgotPassword(data: ForgotPasswordData): Promise<AxiosResponse> {
    return this.requestWithRetry(() => 
      api.post('/auth/forgot-password/', data)
    );
  }

  async verifyResetCode(data: VerifyResetCodeData): Promise<AxiosResponse> {
    return this.requestWithRetry(() => 
      api.post('/auth/verify-reset-code/', data)
    );
  }

  async resetPassword(data: ResetPasswordData): Promise<AxiosResponse> {
    return this.requestWithRetry(() => 
      api.post('/auth/reset-password/', data)
    );
  }

  async updateOTPChannel(data: UpdateOTPChannelData): Promise<AxiosResponse> {
    return this.requestWithRetry(() => 
      api.post('/auth/update-otp-channel/', data)
    );
  }

  // New method to validate token without refresh
  async validateToken(): Promise<boolean> {
    try {
      await this.checkAuth();
      return true;
    } catch (error) {
      console.warn('Token validation failed:', error);
      return false;
    }
  }
}

// Helper functions
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getMaxRetries = (): number => {
  return import.meta.env.VITE_MAX_RETRIES ? parseInt(import.meta.env.VITE_MAX_RETRIES) : 3;
};

const calculateRetryDelay = (attempt: number): number => {
  // Exponential backoff with jitter: 1s, 2s, 4s, etc.
  const baseDelay = 1000; // 1 second
  const maxDelay = 10000; // 10 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  const jitter = delay * 0.1 * Math.random(); // 10% jitter
  return delay + jitter;
};

const redirectToLogin = (): void => {
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    // Preserve intended destination for post-login redirect
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `/login?next=${encodeURIComponent(currentPath)}`;
  }
};

// UPDATED: Handle specific errors - REMOVED CSRF refresh logic
const handleSpecificErrors = (error: AxiosError): void => {
  if (!error.response) return;

  const { status, data } = error.response;

  switch (status) {
    case 429:
      console.error('Rate limit exceeded:', data);
      break;
    
    case 403:
      console.error('Access forbidden:', data);
      break;
    
    case 500:
      console.error('Server error - please try again later:', data);
      break;
    
    case 502:
    case 503:
    case 504:
      console.error('Service temporarily unavailable:', data);
      break;
    
    default:
      break;
  }
};

const enhanceError = (error: AxiosError): AxiosError => {
  // Add additional context to error objects
  if (error.response) {
    (error as any).enhancedMessage = getEnhancedErrorMessage(error);
  }
  return error;
};

const getEnhancedErrorMessage = (error: AxiosError): string => {
  const { status, data } = error.response!;
  
  if (typeof data === 'object' && data !== null) {
    const errorData = data as any;
    
    if (errorData.detail) {
      return errorData.detail;
    }
    
    if (errorData.message) {
      return errorData.message;
    }
    
    if (errorData.non_field_errors) {
      return Array.isArray(errorData.non_field_errors) 
        ? errorData.non_field_errors[0] 
        : errorData.non_field_errors;
    }
  }
  
  // Generic messages based on status code
  switch (status) {
    case 400: return 'Invalid request. Please check your input.';
    case 401: return 'Authentication required. Please log in.';
    case 403: return 'You do not have permission to perform this action.';
    case 404: return 'The requested resource was not found.';
    case 429: return 'Too many requests. Please try again later.';
    case 500: return 'Server error. Please try again later.';
    default: return 'An unexpected error occurred.';
  }
};

// Create singleton instance
export const authApiService = new AuthApiService();

// Legacy exports for backward compatibility (with enhanced error handling)
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
  validateToken: () => authApiService.validateToken(),
};

// Enhanced utility functions
export const isAuthenticated = (): boolean => {
  const token = secureStorage.getItem('access_token');
  if (!token) return false;
  
  // Basic token validation (check expiration if JWT)
  try {
    if (token.includes('.')) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiration = payload.exp * 1000; // Convert to milliseconds
      return Date.now() < expiration;
    }
  } catch (error) {
    console.warn('Token validation error:', error);
  }
  
  return !!token;
};

export const getToken = (): string | null => {
  return secureStorage.getItem('access_token');
};

// UPDATED: Clear auth data - REMOVED CSRF token clearing
export const clearAuthData = (): void => {
  secureStorage.clear();
};

export const getStoredUser = (): any => {
  try {
    const userData = secureStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.warn('Failed to parse stored user data:', error);
    return null;
  }
};

// Enhanced file upload with progress tracking and retry
export const uploadFile = (
  file: File, 
  uploadUrl: string, 
  onProgress?: (progress: number) => void,
  onError?: (error: AxiosError) => void
): Promise<AxiosResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post(uploadUrl, formData, {
    headers: { 
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // Longer timeout for file uploads
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        onProgress(progress);
      }
    },
  }).catch((error: AxiosError) => {
    if (onError) {
      onError(error);
    }
    throw error;
  });
};

// Enhanced health checks with retry
export const healthAPI = {
  checkBackendHealth: () => 
    api.get('/health/', { timeout: 5000 }).catch(error => {
      console.error('Backend health check failed:', error);
      throw error;
    }),
    
  checkCartHealth: () => 
    api.get('/orders/cart/health/', { timeout: 8000 }).catch(error => {
      console.error('Cart health check failed:', error);
      throw error;
    }),
    
  checkDatabaseHealth: () =>
    api.get('/health/database/', { timeout: 10000 }).catch(error => {
      console.error('Database health check failed:', error);
      throw error;
    }),
};

// Network status monitoring
export const networkStatus = {
  isOnline: (): boolean => navigator.onLine,
  
  addOnlineListener: (callback: () => void): void => {
    window.addEventListener('online', callback);
  },
  
  addOfflineListener: (callback: () => void): void => {
    window.addEventListener('offline', callback);
  },
  
  removeOnlineListener: (callback: () => void): void => {
    window.removeEventListener('online', callback);
  },
  
  removeOfflineListener: (callback: () => void): void => {
    window.removeEventListener('offline', callback);
  },
};

// Request queue for offline support
const requestQueue: Array<() => Promise<void>> = [];

export const queueRequest = (requestFn: () => Promise<void>): void => {
  if (networkStatus.isOnline()) {
    requestFn();
  } else {
    requestQueue.push(requestFn);
    console.info('Request queued for when network is available');
  }
};

export const processQueuedRequests = async (): Promise<void> => {
  while (requestQueue.length > 0 && networkStatus.isOnline()) {
    const requestFn = requestQueue.shift();
    if (requestFn) {
      try {
        await requestFn();
        console.info('Queued request completed successfully');
      } catch (error) {
        console.error('Queued request failed:', error);
        // Optionally re-queue failed requests
      }
    }
  }
};

// Initialize network monitoring
if (typeof window !== 'undefined') {
  networkStatus.addOnlineListener(() => {
    console.info('Network connection restored');
    processQueuedRequests();
  });
  
  networkStatus.addOfflineListener(() => {
    console.warn('Network connection lost - requests will be queued');
  });
}

export default api;