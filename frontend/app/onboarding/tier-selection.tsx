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
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

interface TierInfo {
  id: string;
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
  icon: string;
}

export default function TierSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userType, setUserType] = useState('');
  const [selectedTier, setSelectedTier] = useState('basic');
  const [promoCode, setPromoCode] = useState('');
  const [promoValid, setPromoValid] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');
  const [trialDays, setTrialDays] = useState(0);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [isUpgradeMode, setIsUpgradeMode] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Check if this is an upgrade flow
      const upgradeParam = params.upgrade === 'true' || params.upgrade === true;
      setIsUpgradeMode(upgradeParam);

      let type = '';
      
      if (upgradeParam) {
        // In upgrade mode, load user type from profile API
        console.log('🔄 Upgrade mode detected - loading user type from profile');
        try {
          const token = await AsyncStorage.getItem('auth_token');
          if (token) {
            const response = await axios.get(`${API_URL}/api/profile`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            type = response.data.user_type;
            console.log('✅ User type from profile:', type);
          }
        } catch (error) {
          console.error('Error loading profile for upgrade:', error);
        }
      } else {
        // In onboarding mode, load from AsyncStorage
        type = await AsyncStorage.getItem('onboarding_user_type') || '';
      }

      setUserType(type);
      
      // Pre-select tier from params if provided
      if (params.preselect) {
        setSelectedTier(params.preselect as string);
      } else {
        // Load any previously selected tier
        const savedTier = await AsyncStorage.getItem('onboarding_tier');
        if (savedTier) {
          setSelectedTier(savedTier);
        }
      }

      console.log('📋 Tier Selection State:', {
        userType: type,
        isUpgrade: upgradeParam,
        selectedTier: params.preselect || selectedTier
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTiersForUserType = (): TierInfo[] => {
    if (userType === 'general_public') {
      return [
        {
          id: 'basic',
          name: 'Basic',
          price: 0,
          icon: 'person-outline',
          features: [
            'Browse events and venues',
            'RSVP to events',
            'Basic alerts',
            'Profile creation'
          ]
        },
        {
          id: 'appreciation',
          name: 'Appreciation',
          price: 1.99,
          icon: 'heart',
          popular: true,
          features: [
            'All Basic features',
            'Unlimited messaging with businesses & entertainers',
            'Save favorite contacts & venues',
            'Early event notifications',
            'Special deals & discounts',
            'Priority visibility in search',
            'Premium support'
          ]
        }
      ];
    } else if (userType === 'entrepreneur') {
      return [
        {
          id: 'basic',
          name: 'Basic',
          price: 0,
          icon: 'person-outline',
          features: [
            'Basic profile',
            'Post events & services',
            'Directory listing',
            '3 media uploads'
          ]
        },
        {
          id: 'silver',
          name: 'Silver',
          price: 9.99,
          icon: 'medal-outline',
          features: [
            'All Basic features',
            'Enhanced profile',
            'More photos/videos',
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
          popular: true,
          features: [
            'All Silver features',
            'Unlimited media uploads',
            '3 featured videos/week',
            'VIP access',
            'Early notifications',
            'Premium placement',
            'Full entrepreneur network'
          ]
        }
      ];
    } else if (userType === 'business') {
      return [
        {
          id: 'basic',
          name: 'Basic',
          price: 0,
          icon: 'storefront-outline',
          features: [
            'Basic profile',
            'Event/venue listing',
            '3 media uploads',
            'Directory listing'
          ]
        },
        {
          id: 'silver',
          name: 'Silver',
          price: 19.99,
          icon: 'medal-outline',
          features: [
            'All Basic features',
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
          popular: true,
          features: [
            'All Silver features',
            'Unlimited media uploads',
            '3 featured videos/week',
            'Full dashboard',
            'VIP business tools',
            'Premium placement',
            'Direct entrepreneur access'
          ]
        }
      ];
    }
    return [];
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim()) return;
    
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

  const handleContinue = async () => {
    setProcessing(true);
    try {
      // Save selected tier
      await AsyncStorage.setItem('onboarding_tier', selectedTier);
      await AsyncStorage.setItem('onboarding_promo_code', promoCode);
      await AsyncStorage.setItem('onboarding_trial_days', trialDays.toString());

      // If in upgrade mode, set upgrade flags for payment-success navigation
      if (isUpgradeMode) {
        console.log('🔄 Setting upgrade flags for payment-success navigation');
        try {
          const token = await AsyncStorage.getItem('auth_token');
          if (token) {
            const profileResponse = await axios.get(`${API_URL}/api/profile`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const currentTier = profileResponse.data.membership_tier || 'basic';
            await AsyncStorage.setItem('upgrade_from_tier', currentTier);
            await AsyncStorage.setItem('upgrade_to_tier', selectedTier);
            console.log(`✅ Upgrade flags set: ${currentTier} → ${selectedTier}`);
          }
        } catch (error) {
          console.error('Error setting upgrade flags:', error);
        }
      }

      // If free tier selected, go to type-specific onboarding
      if (selectedTier === 'basic') {
        // For general public, go to entertainment preferences
        if (userType === 'general_public') {
          router.push('/onboarding/entertainment-preferences');
        } else if (userType === 'entrepreneur') {
          // Go directly to entrepreneur onboarding (they have detailed setup)
          router.push('/onboarding/entrepreneur/step0');
        } else if (userType === 'business') {
          // Go directly to business onboarding (they have detailed setup)
          router.push('/onboarding/business/step1');
        }
        return;
      }

      // For paid tiers, go to payment first, then to appropriate onboarding
      router.push('/onboarding/payment');
    } catch (error) {
      console.error('Error saving tier selection:', error);
    } finally {
      setProcessing(false);
    }
  };

  const tiers = getTiersForUserType();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              // If in upgrade mode, go back to previous screen (profile)
              // If in onboarding mode, go to user type selection
              if (isUpgradeMode) {
                router.back();
              } else {
                router.push('/onboarding/user-type-selection');
              }
            }} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          {/* Only show progress dots in onboarding mode */}
          {!isUpgradeMode && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressDot, styles.progressDotActive]} />
              <View style={[styles.progressDot, styles.progressDotActive]} />
              <View style={[styles.progressDot, styles.progressDotActive]} />
              <View style={styles.progressDot} />
            </View>
          )}
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Choose Your Plan 💎</Text>
          <Text style={styles.subtitle}>
            Select the tier that best fits your needs. You can upgrade or downgrade anytime.
          </Text>
        </View>

        {/* Tier Cards */}
        <View style={styles.tiersContainer}>
          {tiers.map((tier) => {
            const isSelected = selectedTier === tier.id;
            const isFree = tier.price === 0;
            
            return (
              <TouchableOpacity
                key={tier.id}
                style={[
                  styles.tierCard,
                  isSelected && styles.tierCardSelected,
                  tier.popular && styles.tierCardPopular
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
                {tier.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                  </View>
                )}

                <View style={styles.tierHeader}>
                  <Ionicons name={tier.icon as any} size={40} color={isSelected ? '#1565FF' : '#666'} />
                  <Text style={[styles.tierName, isSelected && styles.tierNameSelected]}>
                    {tier.name}
                  </Text>
                </View>

                <View style={styles.tierPricing}>
                  {isFree ? (
                    <Text style={styles.tierPrice}>Free</Text>
                  ) : (
                    <>
                      <Text style={styles.tierPrice}>${tier.price.toFixed(2)}</Text>
                      <Text style={styles.tierPeriod}>/month</Text>
                    </>
                  )}
                </View>

                {promoValid && !isFree && isSelected && trialDays > 0 && (
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

        {/* Promo Code Section - Only for paid tiers */}
        {selectedTier !== 'basic' && (
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

        {/* Bottom padding */}
        <View style={{ height: 24 }} />

        {/* Action Button - Inside ScrollView for better Android compatibility */}
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.continueButtonText}>
                  {selectedTier === 'basic' ? 'Continue with Free' : 'Continue to Payment'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Extra bottom padding to clear Android navigation */}
        <View style={{ height: 150 }} />
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
    paddingBottom: 120, // Extra padding for bottom bar
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E0E0E0',
  },
  progressDotActive: {
    backgroundColor: '#1565FF',
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
    position: 'relative',
  },
  tierCardSelected: {
    borderColor: '#1565FF',
    backgroundColor: '#F0F7FF',
  },
  tierCardPopular: {
    borderColor: '#FFD700',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a1a1a',
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
  actionButtonContainer: {
    paddingVertical: 20,
    paddingHorizontal: 0,
  },
  bottomBar: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  continueButton: {
    flexDirection: 'row',
    backgroundColor: '#1565FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
