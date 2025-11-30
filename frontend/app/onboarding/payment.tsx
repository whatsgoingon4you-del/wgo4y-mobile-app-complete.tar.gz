import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function PaymentScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState('');
  const [price, setPrice] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [trialDays, setTrialDays] = useState(0);
  const [userType, setUserType] = useState('');

  useEffect(() => {
    loadPaymentInfo();
  }, []);

  const loadPaymentInfo = async () => {
    try {
      const savedTier = await AsyncStorage.getItem('onboarding_tier');
      const savedPromo = await AsyncStorage.getItem('onboarding_promo_code');
      const savedTrial = await AsyncStorage.getItem('onboarding_trial_days');
      
      setTier(savedTier || '');
      setPromoCode(savedPromo || '');
      setTrialDays(parseInt(savedTrial || '0'));

      // Load user type from profile API (for authenticated upgrade flow)
      // This ensures we get the correct current user type instead of stale AsyncStorage data
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          const profileResponse = await axios.get(`${API_URL}/api/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const profileUserType = profileResponse.data.user_type;
          setUserType(profileUserType);
          console.log('✅ Loaded user type from profile:', profileUserType);
          
          // Calculate price based on user type and tier
          const pricing: Record<string, Record<string, number>> = {
            'general_public': { 'appreciation': 1.99 },
            'entrepreneur': { 'silver': 9.99, 'networking': 19.99 },
            'business': { 'silver': 19.99, 'gold': 39.99 }
          };

          if (profileUserType && savedTier && pricing[profileUserType]) {
            setPrice(pricing[profileUserType][savedTier] || 0);
          }
        } else {
          // Fallback to AsyncStorage for onboarding flow (no auth token yet)
          const savedUserType = await AsyncStorage.getItem('onboarding_user_type');
          setUserType(savedUserType || '');
          console.log('⚠️ No token - using AsyncStorage user type:', savedUserType);
          
          const pricing: Record<string, Record<string, number>> = {
            'general_public': { 'appreciation': 1.99 },
            'entrepreneur': { 'silver': 9.99, 'networking': 19.99 },
            'business': { 'silver': 19.99, 'gold': 39.99 }
          };

          if (savedUserType && savedTier && pricing[savedUserType]) {
            setPrice(pricing[savedUserType][savedTier] || 0);
          }
        }
      } catch (profileError) {
        console.error('Error loading profile, falling back to AsyncStorage:', profileError);
        const savedUserType = await AsyncStorage.getItem('onboarding_user_type');
        setUserType(savedUserType || '');
      }
    } catch (error) {
      console.error('Error loading payment info:', error);
    }
  };

  const handleStartCheckout = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        console.error('❌ No auth token found');
        if (Platform.OS === 'web') {
          alert('Error: Not authenticated. Please log in again.');
        }
        setLoading(false);
        return;
      }
      
      // Get origin URL for success/cancel redirects
      let originUrl = '';
      if (Platform.OS === 'web') {
        originUrl = window.location.origin;
      } else {
        // For mobile, use the backend URL without /api suffix
        const baseUrl = API_URL?.split('/api')[0] || 'http://localhost:3000';
        originUrl = baseUrl;
      }

      console.log('🔐 Creating checkout session with:', { 
        tier, 
        promoCode, 
        originUrl,
        userType 
      });

      const response = await axios.post(
        `${API_URL}/api/checkout/create-session`,
        {
          tier: tier.trim(),
          user_type: userType, // Send the selected onboarding user type
          promo_code: promoCode ? promoCode.trim() : null,
          origin_url: originUrl
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { checkout_url, session_id } = response.data;
      
      console.log('✅ Checkout session created:', session_id);

      // Save session ID for later verification
      await AsyncStorage.setItem('checkout_session_id', session_id);

      console.log('💳 Opening Stripe checkout...');

      // Redirect to Stripe checkout
      if (Platform.OS === 'web') {
        // On web, just redirect
        window.location.href = checkout_url;
      } else {
        // On mobile with Expo Go, we have a limitation:
        // WebBrowser opens but can't automatically return to app after payment
        // User needs to manually close browser and return
        
        console.log('📱 Opening browser for Stripe checkout');
        console.log('⚠️  After payment, please close the browser and return to this app to continue');
        
        // Show instruction to user
        if (Platform.OS === 'web') {
          alert('After completing payment, please close the browser tab to return to the app.');
        }
        
        // Open browser (will return immediately with "opened" status)
        await WebBrowser.openBrowserAsync(checkout_url);
        
        // Browser opened, now wait for user to return
        // Show a button/message to continue after they close browser
        console.log('📱 Browser opened. Waiting for user to complete payment and return...');
        
        // Don't auto-navigate - let user manually return and tap a "Check Payment Status" button
        // For now, navigate after a delay to give them time
        setTimeout(() => {
          console.log('→ Navigating to payment verification...');
          router.replace(`/onboarding/payment-success?session_id=${session_id}`);
          setLoading(false);
        }, 2000);
      }
    } catch (error: any) {
      console.error('❌ Checkout error:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to create checkout session';
      
      if (Platform.OS === 'web') {
        alert('Error: ' + errorMsg);
      }
      setLoading(false);
    }
  };

  const getTierDisplayName = () => {
    const names: Record<string, string> = {
      'appreciation': 'Appreciation',
      'silver': 'Silver',
      'networking': 'Networking',
      'gold': 'Gold'
    };
    return names[tier] || tier;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Payment Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="card" size={60} color="#1565FF" />
          </View>

          <Text style={styles.title}>Complete Your Upgrade</Text>
          <Text style={styles.subtitle}>
            You're upgrading to {getTierDisplayName()} membership
          </Text>

          {/* Pricing Card */}
          <View style={styles.pricingCard}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>{getTierDisplayName()} Membership</Text>
              <Text style={styles.pricingAmount}>${price.toFixed(2)}/mo</Text>
            </View>

            {promoCode && trialDays > 0 && (
              <View style={styles.promoRow}>
                <View style={styles.promoInfo}>
                  <Ionicons name="gift" size={20} color="#4CAF50" />
                  <Text style={styles.promoText}>Promo Code: {promoCode}</Text>
                </View>
                <Text style={styles.promoDiscount}>{trialDays} days FREE</Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                {trialDays > 0 ? `First ${trialDays} days` : 'Due today'}
              </Text>
              <Text style={styles.totalAmount}>
                {trialDays > 0 ? 'FREE' : `$${price.toFixed(2)}`}
              </Text>
            </View>

            {trialDays > 0 && (
              <Text style={styles.billingNote}>
                After {trialDays} days, you'll be billed ${price.toFixed(2)}/month unless you cancel
              </Text>
            )}
          </View>

          {/* Features Reminder */}
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>What you'll get:</Text>
            <View style={styles.featuresList}>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Enhanced profile & features</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Feature videos on homepage</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Priority placement</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Cancel anytime</Text>
              </View>
            </View>
          </View>

          {/* Checkout Button - Inside ScrollView */}
          <TouchableOpacity
            style={[styles.checkoutButton, loading && styles.checkoutButtonDisabled]}
            onPress={handleStartCheckout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={20} color="#fff" />
                <Text style={styles.checkoutButtonText}>
                  {trialDays > 0 ? 'Start Free Trial' : 'Proceed to Payment'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.secureText}>
            🔒 Secure payment powered by Stripe
          </Text>

          {/* Extra spacing for Android navigation bar */}
          <View style={{ height: 150 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  summaryContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  pricingCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pricingLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  pricingAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  promoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  promoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  promoDiscount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1565FF',
  },
  billingNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  featuresCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  featuresList: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  checkoutButton: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'row',
    backgroundColor: '#1565FF',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  checkoutButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  secureText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
