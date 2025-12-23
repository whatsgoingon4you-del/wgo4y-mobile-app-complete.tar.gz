import axios from 'axios';
import Constants from 'expo-constants';

/**
 * Centralized API Configuration
 * 
 * This is the SINGLE source of truth for the backend API URL.
 * All API calls across the application MUST use this configuration.
 * 
 * DO NOT define API_URL anywhere else in the codebase.
 * Import either API_URL or apiClient from this file.
 */

// Get API URL from environment with intelligent fallback
// For web deployments, use same-origin (relative path) to avoid CORS issues
// For mobile/Expo, use the configured backend URL
const getApiUrl = (): string => {
  // Priority 1: For WEB, always use same-origin to avoid CORS
  if (typeof window !== 'undefined') {
    // Check if we have an explicit override (for special cases only)
    const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL;
    
    // If env URL is set AND different from current origin, log warning
    if (envUrl && envUrl !== window.location.origin) {
      console.warn('⚠️ [API Client] EXPO_PUBLIC_BACKEND_URL is set but will be ignored on web');
      console.warn('⚠️ [API Client] Using same-origin instead:', window.location.origin);
    }
    
    // Always use same-origin for web (works with Kubernetes ingress routing)
    return window.location.origin;
  }
  
  // Priority 2: For MOBILE/NATIVE, use explicit environment variable
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  
  // Priority 3: Expo config extra
  if (Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL) {
    return Constants.expoConfig.extra.EXPO_PUBLIC_BACKEND_URL;
  }
  
  // Fallback: localhost for development
  return 'http://localhost:8001';
};

export const API_URL = getApiUrl();

// Debug logging (only in development)
if (__DEV__) {
  console.log('🔗 [API Client] URL configured as:', API_URL);
  console.log('🔗 [API Client] process.env:', process.env.EXPO_PUBLIC_BACKEND_URL);
  console.log('🔗 [API Client] Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
}

/**
 * Pre-configured axios instance for API calls
 * 
 * Usage:
 *   import { apiClient } from '@/utils/api';
 *   const response = await apiClient.get('/api/profile');
 * 
 * For endpoints requiring authentication, add headers in the request:
 *   await apiClient.get('/api/profile', {
 *     headers: { Authorization: `Bearer ${token}` }
 *   });
 */
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - logs all outgoing API calls in development
if (__DEV__) {
  apiClient.interceptors.request.use(
    (config) => {
      console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      return config;
    },
    (error) => {
      console.error('📤 [API] Request error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - logs responses and errors
  apiClient.interceptors.response.use(
    (response) => {
      console.log(`📥 [API] ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      if (error.response) {
        console.error(`📥 [API] ${error.response.status} ${error.config?.url}`, error.response.data);
      } else {
        console.error('📥 [API] Network error:', error.message);
      }
      return Promise.reject(error);
    }
  );
}

// Export as default for convenience
export default apiClient;
