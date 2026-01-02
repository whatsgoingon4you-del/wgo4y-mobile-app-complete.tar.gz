import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import axios from 'axios';
import { API_URL } from '../utils/api';

interface User {
  id: string;
  username: string;
  email: string;
  user_type: string;
  full_name?: string;
  profile_completed?: boolean;
  membership_tier?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email: string, userType: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper: Strip large base64 fields from user object before storing in localStorage
// Prevents QuotaExceededError (localStorage has 5-10MB limit)
const stripLargeFieldsFromUser = (user: any): any => {
  if (!user) return null;
  
  const { 
    profile_photo, 
    business_logo,
    business_photos, 
    portfolio_photos, 
    portfolio_videos,
    ...minimalUser 
  } = user;
  
  return minimalUser;
};

// Helper: Safely store in localStorage with error handling
const safeLocalStorageSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    if (error.name === 'QuotaExceededError') {
      console.error('❌ localStorage quota exceeded. Clearing old data and retrying...');
      // Try to clear some space
      try {
        localStorage.removeItem('onboarding_step2_progress');
        localStorage.removeItem('business_step3_progress');
        localStorage.removeItem('entrepreneur_step1_progress');
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error('❌ Still quota exceeded after cleanup:', retryError);
        return false;
      }
    }
    console.error('❌ localStorage error:', error);
    return false;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-login disabled for easier testing
    // Users will need to manually log in each session
    setLoading(false);
  }, []);

  const refreshUserData = async (authToken: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const updatedUser = response.data;
      setUser(updatedUser);
      
      // Store minimal user data (exclude large base64 fields)
      const minimalUser = stripLargeFieldsFromUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(minimalUser));
      
      // Also update localStorage for web
      if (Platform.OS === 'web') {
        safeLocalStorageSet('user', JSON.stringify(minimalUser));
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const refreshUser = async () => {
    if (token) {
      await refreshUserData(token);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      console.log('🔐 AuthContext: Starting login API call for:', username);
      const response = await axios.post(`${API_URL}/api/auth/login`, { username, password });
      const { token: newToken, user: newUser } = response.data;
      
      console.log('✅ AuthContext: Login API successful, received token and user');
      console.log('👤 User data:', newUser);
      
      // Store minimal user data (exclude large base64 fields to prevent QuotaExceededError)
      const minimalUser = stripLargeFieldsFromUser(newUser);
      
      // Store in AsyncStorage
      await AsyncStorage.setItem('auth_token', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(minimalUser));
      
      console.log('💾 AuthContext: Stored token and minimal user in AsyncStorage');
      
      // Also store in localStorage for web with error handling
      if (Platform.OS === 'web') {
        const tokenStored = safeLocalStorageSet('auth_token', newToken);
        const userStored = safeLocalStorageSet('user', JSON.stringify(minimalUser));
        
        if (tokenStored && userStored) {
          console.log('💾 AuthContext: Successfully stored in localStorage for web');
        } else {
          console.warn('⚠️ localStorage storage failed - continuing without persistence');
        }
      }
      
      setToken(newToken);
      setUser(newUser);
      
      console.log('✅ AuthContext: Set token and user in state');
      
      // Refresh to get profile_completed status
      await refreshUserData(newToken);
      
      console.log('✅ AuthContext: Login complete');
    } catch (error: any) {
      console.error('❌ AuthContext: Login failed:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  const register = async (
    username: string,
    password: string,
    email: string,
    userType: string,
    fullName?: string
  ) => {
    try {
      console.log('📝 AuthContext: Starting registration for:', username);
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        username,
        password,
        email,
        user_type: userType,
        full_name: fullName,
      });
      const { token: newToken, user: newUser } = response.data;
      
      console.log('✅ AuthContext: Registration successful');
      
      // Clear ALL onboarding progress for fresh start
      await AsyncStorage.removeItem('business_step1_progress');
      await AsyncStorage.removeItem('onboarding_step2_progress');
      await AsyncStorage.removeItem('business_step3_progress');
      await AsyncStorage.removeItem('business_step4_progress');
      await AsyncStorage.removeItem('entrepreneur_step0_progress');
      await AsyncStorage.removeItem('entrepreneur_step1_progress');
      await AsyncStorage.removeItem('entrepreneur_step2_progress');
      await AsyncStorage.removeItem('general_step1_progress');
      await AsyncStorage.removeItem('general_step2_progress');
      await AsyncStorage.removeItem('general_step3_progress');
      
      // Store minimal user data (exclude large base64 fields)
      const minimalUser = stripLargeFieldsFromUser(newUser);
      
      await AsyncStorage.setItem('auth_token', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(minimalUser));
      
      // Also use safe localStorage for web
      if (Platform.OS === 'web') {
        const tokenStored = safeLocalStorageSet('auth_token', newToken);
        const userStored = safeLocalStorageSet('user', JSON.stringify(minimalUser));
        
        if (tokenStored && userStored) {
          console.log('💾 AuthContext: Successfully stored in localStorage for web');
        } else {
          console.warn('⚠️ localStorage storage failed - continuing without persistence');
        }
      }
      
      setToken(newToken);
      setUser(newUser);
      
      console.log('✅ AuthContext: Registration complete');
    } catch (error: any) {
      console.error('❌ AuthContext: Registration failed:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  };

  const logout = async () => {
    // Clear auth data
    await AsyncStorage.multiRemove([
      'auth_token',
      'user',
      'profile_modal_dismissed_session',
      // Only clear onboarding progress for incomplete users
      // Keep onboarding_user_type_confirmed for completed users
      'onboarding_tier',
      'onboarding_promo_code',
      'onboarding_trial_days',
      'onboarding_entertainment_preferences',
      'onboarding_profile_photo',
      // Upgrade flags
      'upgrade_from_tier',
      'upgrade_to_tier',
      // Business onboarding progress
      'business_step1_progress',
      'onboarding_step2_progress',
      'business_step3_progress',
      'business_step4_progress',
      // Entrepreneur onboarding progress
      'entrepreneur_step0_progress',
      'entrepreneur_step1_progress',
      'entrepreneur_step2_progress',
      // General onboarding progress
      'general_step1_progress',
      'general_step2_progress',
      'general_step3_progress'
    ]);
    
    setToken(null);
    setUser(null);
    
    console.log('🚪 Logout complete - auth data cleared');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
