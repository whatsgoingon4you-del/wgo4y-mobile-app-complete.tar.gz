import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

interface TierInfo {
  id: string;
  name: string;
  price: number;
  features: string[];
  icon: string;
}

export default function UpgradeMembershipScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentTier, setCurrentTier] = useState('basic');
  const [userType, setUserType] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoValid, setPromoValid] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');
  const [trialDays, setTrialDays] = useState(0);
  const [validatingPromo, setValidatingPromo] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const profile = response.data;
      setCurrentTier(profile.membership_tier || 'basic');
      setUserType(profile.user_type || 'general_public');
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableUpgrades = (): TierInfo[] => {
    const current = currentTier.toLowerCase();

    if (userType === 'general_public') {
      if (current === 'basic') {
        return [{
          id: 'appreciation',
          name: 'Appreciation',
          price: 1.99,
          icon: 'heart',
          features: [
            'All Basic features',
            'Early event notifications',
            'Special deals & discounts',
            'Networking features',
            'Priority support'
          ]
        }];
      }
      return []; // Already at highest tier
    } else if (userType === 'entrepreneur') {
      if (current === 'basic') {
        return [
          {
            id: 'silver',
            name: 'Silver',
            price: 9.99,
            icon: 'medal-outline',
            features: [
              'Enhanced profile',
              'More photos/videos',
              '3 music tracks',
              'Job board access',
              '1 featured video/week',
              'Networking tools'
            ]
          },
          {
            id: 'networking',
            name: 'Networking',
            price: 19.99,
            icon: 'trophy',
            features: [
              'All Silver features',
              'Unlimited media uploads',
              '10 music tracks',
              '3 featured videos/week',
              'VIP access',
              'Premium placement',
              'Full entrepreneur network'
            ]
          }
        ];
      } else if (current === 'silver') {
        return [{
          id: 'networking',
          name: 'Networking',
          price: 19.99,
          icon: 'trophy',
          features: [
            'All Silver features',
            'Unlimited media uploads',
            '10 music tracks',
            '3 featured videos/week',
            'VIP access',
            'Premium placement'
          ]
        }];
      }
      return []; // Already at highest tier
    } else if (userType === 'business') {
      if (current === 'basic') {
        return [
          {
            id: 'silver',
            name: 'Silver',
            price: 19.99,
            icon: 'medal-outline',
            features: [
              'Enhanced profile',
              'More media uploads',
              'Post jobs/events',
              '1 featured video/week',
              'Business network access',
              'Coupons & raffles'
            ]
          },
          {
            id: 'gold',
            name: 'Gold',
            price: 39.99,
            icon: 'trophy',
            features: [
              'All Silver features',
              'Unlimited media uploads',
              'Unlimited business photos',
              '3 featured videos/week',
              'Full dashboard',
              'VIP business tools',
              'Premium placement'
            ]
          }
        ];
      } else if (current === 'silver') {
        return [{
          id: 'gold',
          name: 'Gold',
          price: 39.99,
          icon: 'trophy',
          features: [
            'All Silver features',
            'Unlimited media uploads',
            'Unlimited photos',
            '3 featured videos/week',
            'Full dashboard',
            'Premium placement'
          ]
        }];
      }
      return []; // Already at highest tier
    }
    return [];
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim() || !selectedTier) return;
    
    setValidatingPromo(true);
    try {
      const response = await axios.post(`${API_URL}/api/promo-codes/validate`, {
        code: promoCode.trim(),
        user_type: userType,
        tier: selectedTier
      });

      if (response.data.valid) {
        setPromoValid(true);
        setTrialDays(response.data.trial_days);
        setPromoMessage(response.data.message);
        
        if (Platform.OS === 'web') {
          alert(`Success! ${response.data.message}`);
        }
      } else {
        setPromoValid(false);
        setTrialDays(0);
        setPromoMessage(response.data.message);
        
        if (Platform.OS === 'web') {
          alert(`Invalid Code: ${response.data.message}`);
        }
      }
    } catch (error: any) {
      console.error('Error validating promo code:', error);
      setPromoValid(false);
      setPromoMessage('Error validating code');
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedTier) {
      const msg = 'Please select a tier to upgrade to';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Selection Required', msg);
      }
      return;
    }

    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Get origin URL for success/cancel redirects
      let originUrl = '';
      if (Platform.OS === 'web') {
        originUrl = window.location.origin;
      } else {
        const baseUrl = API_URL?.split('/api')[0] || 'http://localhost:3000';
        originUrl = baseUrl;
      }

      console.log('🔐 Creating upgrade checkout session:', { 
        current_tier: currentTier,
        new_tier: selectedTier,
        user_type: userType,
        promo_code: promoCode
      });

      const response = await axios.post(
        `${API_URL}/api/checkout/create-session`,
        {
          tier: selectedTier,
          user_type: userType,
          promo_code: promoCode ? promoCode.trim() : null,
          origin_url: originUrl,
          is_upgrade: true, // Flag to indicate this is an upgrade, not initial subscription
          current_tier: currentTier
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { checkout_url, session_id } = response.data;
      
      console.log('✅ Upgrade checkout session created:', session_id);

      // Save session ID
      await AsyncStorage.setItem('checkout_session_id', session_id);
      await AsyncStorage.setItem('upgrade_from_tier', currentTier);
      await AsyncStorage.setItem('upgrade_to_tier', selectedTier);

      console.log('💳 Opening Stripe checkout for upgrade...');

      // Redirect to Stripe checkout
      if (Platform.OS === 'web') {
        window.location.href = checkout_url;
      } else {
        await WebBrowser.openBrowserAsync(checkout_url);
        
        // Navigate to success screen after delay
        setTimeout(() => {
          router.replace(`/onboarding/payment-success?session_id=${session_id}`);
          setProcessing(false);
        }, 2000);
      }
    } catch (error: any) {
      console.error('❌ Upgrade error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to start upgrade';
      
      if (Platform.OS === 'web') {
        alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
      setProcessing(false);
    }
  };

  const availableUpgrades = getAvailableUpgrades();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
        </View>
      </SafeAreaView>
    );
  }

  // Already at highest tier
  if (availableUpgrades.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upgrade Membership</Text>
        </View>
        
        <View style={styles.maxTierContainer}>
          <Ionicons name="trophy" size={80} color="#FFD700" />
          <Text style={styles.maxTierTitle}>You're at the Top! 🎉</Text>
          <Text style={styles.maxTierText}>
            You're already enjoying our {currentTier === 'networking' ? 'Networking' : currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} tier with all premium features!
          </Text>
          <TouchableOpacity style={styles.backToProfileButton} onPress={() => router.back()}>
            <Text style={styles.backToProfileText}>Back to Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upgrade Membership</Text>
        </View>

        {/* Current Tier Display */}
        <View style={styles.currentTierSection}>
          <Text style={styles.currentTierLabel}>Current Tier:</Text>
          <View style={styles.currentTierBadge}>
            <Ionicons name="person" size={20} color="#666" />
            <Text style={styles.currentTierName}>
              {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
            </Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Unlock More Features 🚀</Text>
          <Text style={styles.subtitle}>
            Upgrade your membership to access premium features, increase your visibility, and grow your business.
          </Text>
        </View>

        {/* Available Upgrade Tiers */}
        <View style={styles.tiersContainer}>
          {availableUpgrades.map((tier) => {
            const isSelected = selectedTier === tier.id;
            
            return (
              <TouchableOpacity
                key={tier.id}
                style={[
                  styles.tierCard,
                  isSelected && styles.tierCardSelected,
                ]}
                onPress={() => {
                  setSelectedTier(tier.id);
                  // Clear promo if switching tiers
                  if (tier.id !== selectedTier) {
                    setPromoValid(false);
                    setPromoMessage('');
                  }
                }}
              >
                <View style={styles.tierHeader}>
                  <Ionicons name={tier.icon as any} size={40} color={isSelected ? '#1565FF' : '#666'} />
                  <Text style={[styles.tierName, isSelected && styles.tierNameSelected]}>
                    {tier.name}
                  </Text>
                </View>

                <View style={styles.tierPricing}>
                  <Text style={styles.tierPrice}>${tier.price.toFixed(2)}</Text>
                  <Text style={styles.tierPeriod}>/month</Text>
                </View>

                {promoValid && isSelected && trialDays > 0 && (
                  <View style={styles.trialBanner}>
                    <Ionicons name="gift" size={16} color="#4CAF50" />
                    <Text style={styles.trialText}>{trialDays} days free trial!</Text>
                  </View>
                )}

                <View style={styles.featuresContainer}>
                  {tier.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={18} color={isSelected ? '#1565FF' : '#4CAF50'} />
                      <Text style={[styles.featureText, isSelected && styles.featureTextSelected]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>

                {isSelected && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color="#1565FF" />
                    <Text style={styles.selectedText}>Selected</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Promo Code Section */}
        {selectedTier && (
          <View style={styles.promoSection}>
            <Text style={styles.promoTitle}>Have a promo code?</Text>
            <View style={styles.promoInputContainer}>
              <TextInput
                style={styles.promoInput}
                value={promoCode}
                onChangeText={setPromoCode}
                placeholder="Enter code (e.g., WGO4Y60)"
                placeholderTextColor="#999"
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.validateButton, validatingPromo && styles.validateButtonDisabled]}
                onPress={validatePromoCode}
                disabled={validatingPromo || !promoCode.trim()}
              >
                {validatingPromo ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.validateButtonText}>Apply</Text>
                )}
              </TouchableOpacity>
            </View>
            
            {promoMessage && (
              <View style={[styles.promoMessageContainer, promoValid && styles.promoMessageSuccess]}>
                <Ionicons
                  name={promoValid ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={promoValid ? '#4CAF50' : '#F44336'}
                />
                <Text style={[styles.promoMessage, promoValid && styles.promoMessageTextSuccess]}>
                  {promoMessage}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Important Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#1565FF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Upgrade Information:</Text>
            <Text style={styles.infoText}>
              • Your new features activate immediately after payment{'\n'}
              • Pro-rated billing for the current period{'\n'}
              • Cancel anytime from your profile settings{'\n'}
              • Downgrades take effect at end of billing period
            </Text>
          </View>
        </View>

        <View style={{ height: 24 }} />

        {/* Upgrade Button */}
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={[styles.upgradeButton, !selectedTier && styles.upgradeButtonDisabled]}
            onPress={handleUpgrade}
            disabled={processing || !selectedTier}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.upgradeButtonText}>
                  Upgrade to {selectedTier ? availableUpgrades.find(t => t.id === selectedTier)?.name : '...'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 150 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  currentTierSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  currentTierLabel: {
    fontSize: 14,
    color: '#666',
  },
  currentTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  currentTierName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  titleSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  tiersContainer: {
    gap: 16,
    marginBottom: 24,
  },
  tierCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  tierCardSelected: {
    borderColor: '#1565FF',
    backgroundColor: '#F0F7FF',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  tierName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  tierNameSelected: {
    color: '#1565FF',
  },
  tierPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  tierPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  tierPeriod: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 6,
  },
  trialText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  featuresContainer: {
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
  featureTextSelected: {
    color: '#1a1a1a',
    fontWeight: '500',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 8,
  },
  selectedText: {
    fontSize: 16,
    color: '#1565FF',
    fontWeight: '600',
  },
  promoSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  promoInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  validateButton: {
    backgroundColor: '#1565FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  validateButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  validateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  promoMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
    gap: 8,
  },
  promoMessageSuccess: {
    backgroundColor: '#E8F5E9',
  },
  promoMessage: {
    flex: 1,
    fontSize: 14,
    color: '#F44336',
  },
  promoMessageTextSuccess: {
    color: '#4CAF50',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F7FF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565FF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1565FF',
    lineHeight: 20,
  },
  actionButtonContainer: {
    paddingVertical: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    backgroundColor: '#1565FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  upgradeButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  upgradeButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  maxTierContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  maxTierTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 24,
    marginBottom: 12,
  },
  maxTierText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  backToProfileButton: {
    backgroundColor: '#1565FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backToProfileText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
