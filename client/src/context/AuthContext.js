// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        // Set user from localStorage immediately for better UX
        setCurrentUser(JSON.parse(storedUser));
        
        // Then verify with backend
        const response = await authAPI.checkAuth();
        if (response.data.authenticated) {
          setCurrentUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
    } catch (error) {
      console.log('Authentication check failed:', error);
      // Clear invalid tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      if (response.data) {
        const { user, access, refresh } = response.data;
        
        // Store tokens and user data
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', JSON.stringify(user));
        
        setCurrentUser(user);
        setRequiresOTP(false);
        return { success: true, data: response.data };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data || { message: 'Login failed' } 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      if (response.data) {
        const { user, access, refresh, requires_otp_verification } = response.data;
        
        if (requires_otp_verification) {
          setPendingUser(user);
          setRequiresOTP(true);
          // Store tokens temporarily for OTP verification
          localStorage.setItem('temp_access_token', access);
          localStorage.setItem('temp_refresh_token', refresh);
          localStorage.setItem('temp_user', JSON.stringify(user));
        } else {
          // No OTP required, complete registration
          localStorage.setItem('access_token', access);
          localStorage.setItem('refresh_token', refresh);
          localStorage.setItem('user', JSON.stringify(user));
          setCurrentUser(user);
        }
        
        return { 
          success: true, 
          requiresOTP: requires_otp_verification,
          data: response.data 
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error.response?.data || { message: 'Registration failed' } 
      };
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      const response = await authAPI.verifyOTP({ email, otp });
      if (response.data) {
        const { user, access, refresh } = response.data;
        
        // Replace temporary tokens with permanent ones
        localStorage.removeItem('temp_access_token');
        localStorage.removeItem('temp_refresh_token');
        localStorage.removeItem('temp_user');
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user', JSON.stringify(user));
        
        setCurrentUser(user);
        setRequiresOTP(false);
        setPendingUser(null);
        
        return { success: true, data: response.data };
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      return { 
        success: false, 
        error: error.response?.data || { message: 'OTP verification failed' } 
      };
    }
  };

  const resendOTP = async (email) => {
    try {
      const response = await authAPI.resendOTP({ email });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Resend OTP error:', error);
      return { 
        success: false, 
        error: error.response?.data || { message: 'Failed to resend OTP' } 
      };
    }
  };

  const logout = async () => {
    try {
      // Call backend logout if needed (optional)
      // await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('temp_access_token');
      localStorage.removeItem('temp_refresh_token');
      localStorage.removeItem('temp_user');
      setCurrentUser(null);
      setRequiresOTP(false);
      setPendingUser(null);
    }
  };

  const updateUser = (userData) => {
    setCurrentUser(prev => ({ ...prev, ...userData }));
    localStorage.setItem('user', JSON.stringify({ ...currentUser, ...userData }));
  };

  const value = {
    currentUser,
    requiresOTP,
    pendingUser,
    login,
    register,
    verifyOTP,
    resendOTP,
    logout,
    checkAuthentication,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};