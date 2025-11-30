import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

interface UserTypeOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
}

export default function UserTypeSelectionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('');
  const [processing, setProcessing] = useState(false);
  const [hasPartialData, setHasPartialData] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Auth guard: redirect logged-out users to login
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        console.log('⚠️ No auth token - redirecting to login');
        router.replace('/login');
        return;
      }

      // Load saved user type
      const savedType = await AsyncStorage.getItem('onboarding_user_type');
      if (savedType) {
        setSelectedType(savedType);
      }

      // Check for partial onboarding data
      const tier = await AsyncStorage.getItem('onboarding_tier');
      const preferences = await AsyncStorage.getItem('onboarding_entertainment_preferences');
      if (tier || preferences) {
        setHasPartialData(true);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const userTypes: UserTypeOption[] = [
    {
      id: 'general_public',
      title: 'General Public',
      description: 'For individuals exploring events, venues, and entertainment',
      icon: 'people',
      color: '#1565FF',
      features: [
        'Browse events and venues',
        'RSVP to events',
        'Save favorite venues',
        'Get personalized recommendations',
        'Access exclusive deals'
      ]
    },
    {
      id: 'entrepreneur',
      title: 'Entrepreneur',
      description: 'For independent service providers and creative professionals',
      icon: 'bulb',
      color: '#FF9800',
      features: [
        'Showcase your services',
        'Build professional portfolio',
        'Feature your work',
        'Network with businesses',
        'Get hired for events'
      ]
    },
    {
      id: 'business',
      title: 'Business',
      description: 'For venues, event spaces, and service businesses',
      icon: 'storefront',
      color: '#4CAF50',
      features: [
        'List your venue or business',
        'Post events and offerings',
        'Manage bookings',
        'Connect with entrepreneurs',
        'Promote your brand'
      ]
    }
  ];

  const handleResetOnboarding = async () => {
    const message = 'This will clear your current onboarding progress and let you start fresh. Continue?';
    
    if (Platform.OS === 'web') {
      if (!confirm(message)) return;
    } else {
      Alert.alert(
        'Start Fresh?',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: async () => {
              await performReset();
            }
          }
        ]
      );
      return;
    }
    
    await performReset();
  };

  const performReset = async () => {
    try {
      await AsyncStorage.multiRemove([
        'onboarding_tier',
        'onboarding_promo_code',
        'onboarding_trial_days',
        'onboarding_entertainment_preferences',
        'onboarding_profile_photo',
        'onboarding_user_type_confirmed',
        // Business progress
        'business_step1_progress',
        'onboarding_step2_progress',
        'business_step3_progress',
        'business_step4_progress',
        // Entrepreneur progress
        'entrepreneur_step0_progress',
        'entrepreneur_step1_progress',
        'entrepreneur_step2_progress',
        'entrepreneur_step3_progress',
        'entrepreneur_step4_progress',
        // General progress
        'general_step1_progress',
        'general_step2_progress',
        'general_step3_progress',
      ]);
      setHasPartialData(false);
      
      const successMsg = 'Onboarding progress cleared. Please select your account type below.';
      if (Platform.OS === 'web') {
        alert(successMsg);
      } else {
        Alert.alert('Success', successMsg);
      }
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  const handleContinue = async () => {
    if (!selectedType) {
      const msg = 'Please select an account type';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Selection Required', msg);
      }
      return;
    }

    setProcessing(true);
    try {
      // Save selected user type and set confirmation flag
      await AsyncStorage.setItem('onboarding_user_type', selectedType);
      await AsyncStorage.setItem('onboarding_user_type_confirmed', 'true');

      // Update user data in AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        user.user_type = selectedType;
        await AsyncStorage.setItem('user', JSON.stringify(user));
      }

      // CRITICAL: Also update the database user_type via API
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
          await axios.put(
            `${API_URL}/api/profile`,
            { user_type: selectedType },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log('✅ Updated user_type in database:', selectedType);
        }
      } catch (apiError) {
        console.error('⚠️ Failed to update user_type in database:', apiError);
        // Don't block onboarding if this fails
      }

      // Navigate to tier selection
      router.push('/onboarding/tier-selection');
    } catch (error) {
      console.error('Error saving user type:', error);
    } finally {
      setProcessing(false);
    }
  };

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
          </View>
        </View>

        {/* Partial Data Warning */}
        {hasPartialData && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={24} color="#FF9800" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Onboarding in Progress</Text>
              <Text style={styles.warningText}>
                You have partial onboarding data. Changing your user type will clear this data.
              </Text>
              <TouchableOpacity onPress={handleResetOnboarding} style={styles.resetButton}>
                <Text style={styles.resetButtonText}>Start Fresh</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Choose Your Account Type 🎯</Text>
          <Text style={styles.subtitle}>
            Select the option that best describes you. You can change this later if needed.
          </Text>
        </View>

        {/* User Type Cards */}
        <View style={styles.typesContainer}>
          {userTypes.map((type) => {
            const isSelected = selectedType === type.id;
            
            return (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  isSelected && styles.typeCardSelected,
                  isSelected && { borderColor: type.color }
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                <View style={styles.typeHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: `${type.color}15` }]}>
                    <Ionicons name={type.icon as any} size={32} color={type.color} />
                  </View>
                  <View style={styles.typeInfo}>
                    <Text style={[styles.typeName, isSelected && { color: type.color }]}>
                      {type.title}
                    </Text>
                    <Text style={styles.typeDescription}>{type.description}</Text>
                  </View>
                </View>

                <View style={styles.featuresContainer}>
                  <Text style={styles.featuresTitle}>What you can do:</Text>
                  {type.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Ionicons 
                        name="checkmark-circle" 
                        size={16} 
                        color={isSelected ? type.color : '#4CAF50'} 
                      />
                      <Text style={[styles.featureText, isSelected && styles.featureTextSelected]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>

                {isSelected && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={20} color={type.color} />
                    <Text style={[styles.selectedText, { color: type.color }]}>Selected</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#1565FF" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Not sure which to choose?</Text>
            <Text style={styles.infoText}>
              • Choose <Text style={styles.bold}>General Public</Text> if you're browsing events
            </Text>
            <Text style={styles.infoText}>
              • Choose <Text style={styles.bold}>Entrepreneur</Text> if you offer services (DJ, photographer, etc.)
            </Text>
            <Text style={styles.infoText}>
              • Choose <Text style={styles.bold}>Business</Text> if you own a venue or company
            </Text>
          </View>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 24 }} />

        {/* Continue Button */}
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={[styles.continueButton, !selectedType && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={processing || !selectedType}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Extra bottom padding */}
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
    paddingBottom: 120,
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
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    marginBottom: 12,
    lineHeight: 20,
  },
  resetButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  typesContainer: {
    gap: 16,
    marginBottom: 24,
  },
  typeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  typeCardSelected: {
    backgroundColor: '#F0F7FF',
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  featuresContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  featureTextSelected: {
    color: '#333',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '600',
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
  infoContent: {
    flex: 1,
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
    marginBottom: 4,
  },
  bold: {
    fontWeight: '600',
  },
  actionButtonContainer: {
    paddingVertical: 20,
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
  continueButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  continueButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
