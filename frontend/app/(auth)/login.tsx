import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // Prevent back navigation from login screen
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Return true to prevent default back behavior
      // User stays on login screen
      return true;
    });

    return () => backHandler.remove();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Starting login for:', username);
      
      // Send username as-is (backend handles various formats: username, email, full_name)
      await login(username.trim(), password);
      
      console.log('✅ Login successful, waiting for user data...');
      
      // Wait a bit for AsyncStorage to persist (web compatibility)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // After login, check profile status and route accordingly
      const userData = await AsyncStorage.getItem('user');
      const tokenData = await AsyncStorage.getItem('auth_token');
      
      console.log('📦 Retrieved from storage:', {
        hasUserData: !!userData,
        hasToken: !!tokenData,
        userDataLength: userData?.length
      });
      
      if (userData && tokenData) {
        const user = JSON.parse(userData);
        
        console.log('👤 User data:', {
          username: user.username,
          type: user.user_type,
          tier: user.membership_tier,
          profile_completed: user.profile_completed,
          is_admin: user.is_admin,
          is_approval_admin: user.is_approval_admin
        });
        
        // PRIORITY 1: Approval Admin → Approval Dashboard
        if (user.user_type === 'admin' || user.is_approval_admin) {
          console.log('→ Approval admin detected, navigating to approval dashboard');
          router.replace('/admin/approval-dashboard');
          return;
        }
        
        // PRIORITY 2: Paid tier users ALWAYS go to dashboard (skip onboarding)
        // Check if user has a paid membership tier
        const hasPaidTier = user.membership_tier && 
          user.membership_tier !== 'basic' && 
          user.membership_tier !== 'free';
        
        console.log('🔐 Login routing decision:', {
          profile_completed: user.profile_completed,
          membership_tier: user.membership_tier,
          hasPaidTier
        });
        
        if (hasPaidTier) {
          console.log('→ Paid tier detected, navigating to dashboard');
          setTimeout(() => {
            router.replace('/(tabs)/home');
          }, 100);
        } else if (user.profile_completed === false) {
          // For basic/free users, check profile completion
          console.log('→ Profile incomplete, navigating to onboarding');
          setTimeout(() => {
            router.replace('/onboarding/user-type-selection');
          }, 100);
        } else {
          console.log('→ Profile complete, navigating to dashboard');
          setTimeout(() => {
            router.replace('/(tabs)/home');
          }, 100);
        }
      } else {
        console.error('❌ User data not found in AsyncStorage after login');
        console.error('Storage check:', { userData: !!userData, tokenData: !!tokenData });
        Alert.alert('Error', 'Failed to load user data. Please try logging in again.');
        setLoading(false);
      }
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>Welcome to WGO4Y</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholderTextColor="#999"
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={22}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.push('/(auth)/register')}
              >
                <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1565FF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  eyeIcon: {
    paddingHorizontal: 12,
  },
  button: {
    backgroundColor: '#1565FF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    padding: 12,
    alignItems: 'center',
  },
  linkText: {
    color: '#1565FF',
    fontSize: 14,
  },
});
