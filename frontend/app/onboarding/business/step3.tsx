import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../utils/api';

export default function BusinessStep3() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [businessPhotos, setBusinessPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Social media links state
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');

  // Load saved progress on mount
  React.useEffect(() => {
    loadSavedProgress();
  }, []);

  const loadSavedProgress = async () => {
    try {
      const savedData = await AsyncStorage.getItem('business_step3_progress');
      if (savedData) {
        const data = JSON.parse(savedData);
        // Only load social media links (NOT base64 images)
        if (data.instagram) setInstagram(data.instagram);
        if (data.facebook) setFacebook(data.facebook);
        if (data.twitter) setTwitter(data.twitter);
        console.log('Loaded business Step 3 progress: social links');
      }
    } catch (error) {
      console.error('Error loading Step 3 progress:', error);
    }
  };

  const saveProgress = async (socialData?: { instagram?: string, facebook?: string, twitter?: string }) => {
    try {
      // DON'T store base64 images in localStorage (causes quota exceeded)
      // Only store social media links
      const progressData = {
        instagram: socialData?.instagram ?? instagram,
        facebook: socialData?.facebook ?? facebook,
        twitter: socialData?.twitter ?? twitter,
        photoCount: businessPhotos.length, // Store count only, not actual images
      };
      await AsyncStorage.setItem('business_step3_progress', JSON.stringify(progressData));
    } catch (error) {
      console.error('Error saving Step 3 progress:', error);
    }
  };

  const pickImage = async () => {
    if (businessPhotos.length >= 3) {
      Alert.alert('Limit Reached', 'You can upload up to 3 photos.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to upload business photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      
      // Check file size (approx 5MB limit)
      const sizeInMB = (base64Image.length * 3/4) / (1024 * 1024);
      if (sizeInMB > 5) {
        Alert.alert('File Too Large', 'Please select an image smaller than 5MB.');
        return;
      }

      const updatedPhotos = [...businessPhotos, base64Image];
      setBusinessPhotos(updatedPhotos);
      // Don't save photos to localStorage (causes quota exceeded)
      await saveProgress(); // Save social links only
    }
  };

  const removePhoto = async (index: number) => {
    const newPhotos = businessPhotos.filter((_, i) => i !== index);
    setBusinessPhotos(newPhotos);
    // Don't save photos to localStorage
    await saveProgress();
  };

  const handleComplete = async () => {
    if (businessPhotos.length === 0) {
      if (Platform.OS === 'web') {
        alert('At least 1 photo required: Please upload at least one photo of your business.');
      } else {
        Alert.alert('At least 1 photo required', 'Please upload at least one photo of your business.');
      }
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        console.error('❌ No auth token found');
        if (Platform.OS === 'web') {
          alert('Error: Authentication token not found. Please log in again.');
        } else {
          Alert.alert('Error', 'Authentication token not found. Please log in again.');
        }
        setLoading(false);
        return;
      }

      // Parse venue categories from Step 2
      const venueCategories = params.venueCategories ? JSON.parse(params.venueCategories as string) : [];
      
      // Parse hours from step 2
      const hours = params.hours ? JSON.parse(params.hours as string) : {};

      // Prepare profile update payload
      const profileData = {
        full_name: params.businessName,
        bio: params.description,
        location: params.address,
        business_name: params.businessName,
        business_type: params.businessType,
        business_address: params.address,
        business_phone: params.phone,
        business_hours: hours,
        business_description: params.description,
        business_logo: params.businessLogo || '',
        business_photos: businessPhotos,
        venue_categories: venueCategories,
        amenities: [], // Can be added in profile edit later
        entertainment_categories: [], // Can be added in profile edit later
        social_links: {
          instagram: instagram.trim(),
          facebook: facebook.trim(),
          twitter: twitter.trim(),
          website: '',
          yelp: '',
          google_business: '',
        },
        profile_completed: true,
      };

      console.log('📤 Submitting profile data:', {
        ...profileData,
        business_photos: `${businessPhotos.length} photos`,
        business_logo: params.businessLogo ? 'has logo' : 'no logo',
      });

      // Use centralized API_URL (never localhost)
      const response = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Profile updated successfully');
        
        // Update user data in AsyncStorage
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          const updatedUser = { ...user, ...data.user, profile_completed: true };
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        }

        // Clear ALL Business onboarding progress after successful completion
        try {
          await AsyncStorage.multiRemove([
            'business_step1_progress',
            'onboarding_step2_progress',
            'business_step3_progress',
            'business_step4_progress',
            'onboarding_tier',
            'onboarding_promo_code',
            'onboarding_trial_days',
          ]);
          console.log('✅ Cleared all Business onboarding progress');
        } catch (clearError) {
          console.error('Error clearing onboarding progress:', clearError);
        }

        // Navigate to completion screen
        console.log('→ Navigating to completion screen');
        router.replace('/onboarding/business/complete');
      } else {
        console.error('❌ Profile update failed:', data);
        const errorMsg = data.detail || 'Failed to update profile. Please try again.';
        
        if (Platform.OS === 'web') {
          alert('Error: ' + errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (error: any) {
      console.error('❌ Profile update error:', error);
      const errorMsg = error.message || 'Failed to complete profile. Please try again.';
      
      if (Platform.OS === 'web') {
        alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotComplete]} />
            <View style={[styles.progressDot, styles.progressDotComplete]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
          </View>
          <Text style={styles.stepText}>Step 3 of 3</Text>
        </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Upload photos and add your social media links</Text>

        {/* Photos Section */}
        <Text style={styles.sectionTitle}>Business Photos (1-3 required)</Text>
        <View style={styles.photosGrid}>
          {businessPhotos.map((photo, index) => (
            <View key={index} style={styles.photoContainer}>
              <Image source={{ uri: photo }} style={styles.photo} />
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => removePhoto(index)}
              >
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))}

          {businessPhotos.length < 3 && (
            <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
              <Ionicons name="camera" size={32} color="#1565FF" />
              <Text style={styles.addPhotoText}>Add Photo</Text>
              <Text style={styles.photoCount}>{businessPhotos.length}/3</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Social Media Links Section */}
        <Text style={styles.sectionTitle}>Social Media (Optional)</Text>
        <Text style={styles.sectionSubtitle}>Add your top social media accounts</Text>
        
        <View style={styles.socialInputContainer}>
          <View style={styles.socialInputWrapper}>
            <Ionicons name="logo-instagram" size={24} color="#E4405F" style={styles.socialIcon} />
            <TextInput
              style={styles.socialInput}
              placeholder="Instagram username or URL"
              placeholderTextColor="#999"
              value={instagram}
              onChangeText={(text) => {
                setInstagram(text);
                saveProgress(businessPhotos, { instagram: text, facebook, twitter });
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.socialInputWrapper}>
            <Ionicons name="logo-facebook" size={24} color="#1877F2" style={styles.socialIcon} />
            <TextInput
              style={styles.socialInput}
              placeholder="Facebook page or URL"
              placeholderTextColor="#999"
              value={facebook}
              onChangeText={(text) => {
                setFacebook(text);
                saveProgress(businessPhotos, { instagram, facebook: text, twitter });
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.socialInputWrapper}>
            <Ionicons name="logo-twitter" size={24} color="#1DA1F2" style={styles.socialIcon} />
            <TextInput
              style={styles.socialInput}
              placeholder="X/Twitter handle or URL"
              placeholderTextColor="#999"
              value={twitter}
              onChangeText={(text) => {
                setTwitter(text);
                saveProgress(businessPhotos, { instagram, facebook, twitter: text });
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#1565FF" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Photo Tips:</Text>
            <Text style={styles.infoText}>• Show your venue, space, or services</Text>
            <Text style={styles.infoText}>• Use good lighting and clear images</Text>
            <Text style={styles.infoText}>• Highlight what makes you unique</Text>
            <Text style={styles.infoText}>• You can add more photos later</Text>
          </View>
        </View>

        {businessPhotos.length > 0 && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>✓ Ready to Complete</Text>
            <Text style={styles.summaryText}>
              Your profile will be created with {businessPhotos.length} photo{businessPhotos.length > 1 ? 's' : ''}. 
              You can add amenities, entertainment categories, and social links later in your profile settings.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.completeButton, 
            (businessPhotos.length === 0 || loading) && styles.buttonDisabled
          ]} 
          onPress={handleComplete}
          disabled={businessPhotos.length === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.completeButtonText}>Complete Profile</Text>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  progressDotComplete: {
    backgroundColor: '#4CAF50',
    width: 24,
  },
  progressDotActive: {
    backgroundColor: '#1565FF',
    width: 24,
  },
  stepText: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  socialInputContainer: {
    marginBottom: 24,
  },
  socialInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  socialIcon: {
    marginRight: 12,
  },
  socialInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 12,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  photoContainer: {
    width: '48%',
    aspectRatio: 4/3,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: '48%',
    aspectRatio: 4/3,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1565FF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565FF',
    marginTop: 8,
  },
  photoCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
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
    color: '#333',
    lineHeight: 20,
    marginBottom: 4,
  },
  summaryBox: {
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
  footer: {
    padding: 24,
  },
  completeButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});