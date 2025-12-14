import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-login disabled for easier testing
    // Users will need to manually log in each session
    setLoading(false);
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Refresh user data to get latest profile_completed status
        await refreshUserData(storedToken);
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async (authToken: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const updatedUser = response.data;
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
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
      
      // Store in AsyncStorage
      await AsyncStorage.setItem('auth_token', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      
      console.log('💾 AuthContext: Stored token and user in AsyncStorage');
      
      // Also store in localStorage for web (better compatibility)
      if (Platform.OS === 'web') {
        try {
          localStorage.setItem('auth_token', newToken);
          localStorage.setItem('user', JSON.stringify(newUser));
          console.log('💾 AuthContext: Also stored in localStorage for web');
        } catch (e) {
          console.warn('localStorage not available:', e);
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
      
      await AsyncStorage.setItem('auth_token', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      
      // Also use localStorage for web
      if (Platform.OS === 'web') {
        try {
          localStorage.setItem('auth_token', newToken);
          localStorage.setItem('user', JSON.stringify(newUser));
          console.log('💾 AuthContext: Also stored in localStorage for web');
        } catch (e) {
          console.warn('localStorage not available:', e);
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
