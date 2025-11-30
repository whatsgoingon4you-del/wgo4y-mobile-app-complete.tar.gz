import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVenuesFromEntertainment, getServicesFromEntertainment } from '../../utils/preferenceMapping';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ProfilePhotoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfilePhoto(base64Image);
      await AsyncStorage.setItem('onboarding_profile_photo', base64Image);
    }
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      // Verify we have auth token
      let token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        console.error('❌ No auth token - user needs to log in');
        if (Platform.OS === 'web') {
          alert('Session expired. Please log in again.');
          router.replace('/login');
        }
        return;
      }

      // Save all onboarding data to backend with smart mapping
      const tier = await AsyncStorage.getItem('onboarding_tier');
      const preferencesStr = await AsyncStorage.getItem('onboarding_entertainment_preferences');
      const entertainmentPrefs = preferencesStr ? JSON.parse(preferencesStr) : [];

      // Smart mapping: Auto-populate venue and service preferences
      const suggestedVenues = getVenuesFromEntertainment(entertainmentPrefs);
      const suggestedServices = getServicesFromEntertainment(entertainmentPrefs);

      console.log('💾 Saving profile with smart mapping:', { 
        has_photo: !!profilePhoto, 
        tier, 
        entertainment_count: entertainmentPrefs.length,
        suggested_venues: suggestedVenues.length,
        suggested_services: suggestedServices.length
      });

      const response = await axios.put(
        `${API_URL}/api/profile`,
        {
          profile_photo: profilePhoto,
          entertainment_preferences: entertainmentPrefs,
          venue_preferences: suggestedVenues,  // Auto-populate from entertainment
          service_preferences: suggestedServices,  // Auto-populate from entertainment
          membership_tier: tier || 'basic',
          profile_completed: true
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('✅ Profile saved successfully');

      // Clear onboarding data
      await AsyncStorage.multiRemove([
        'onboarding_user_type',
        'onboarding_tier',
        'onboarding_promo_code',
        'onboarding_trial_days',
        'onboarding_entertainment_preferences',
        'onboarding_profile_photo'
      ]);

      // Navigate to appropriate next step based on user type
      const userData = await AsyncStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;

      console.log('🎯 Navigation: user_type=', user?.user_type);

      if (user?.user_type === 'entrepreneur') {
        router.replace('/onboarding/entrepreneur/step0');
      } else if (user?.user_type === 'business') {
        router.replace('/onboarding/business/step1');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      console.error('❌ Error completing onboarding:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to save profile';
      
      if (Platform.OS === 'web') {
        alert('Error: ' + errorMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    handleContinue();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.photoContent}>
          <Text style={styles.title}>Add a Profile Photo 📸</Text>
          <Text style={styles.subtitle}>
            Help others recognize you! This is optional and can be added later.
          </Text>

          {/* Photo Preview */}
          <View style={styles.photoContainer}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person" size={60} color="#BDBDBD" />
              </View>
            )}
            <TouchableOpacity style={styles.editPhotoButton} onPress={pickImage}>
              <Ionicons name="camera" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Ionicons name="image" size={20} color="#1565FF" />
            <Text style={styles.uploadButtonText}>
              {profilePhoto ? 'Change Photo' : 'Upload Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons - Inside content for Android compatibility */}
        <View style={styles.actionButtonContainer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>Complete Setup</Text>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Extra spacing to ensure button visibility on Android */}
        <View style={{ height: 150 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
  photoContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
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
    textAlign: 'center',
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  photoContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 24,
    position: 'relative',
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  photoPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#1565FF',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1565FF',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#1565FF',
    fontWeight: '600',
  },
  actionButtonContainer: {
    paddingVertical: 32,
    paddingHorizontal: 0,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  continueButton: {
    flex: 2,
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
