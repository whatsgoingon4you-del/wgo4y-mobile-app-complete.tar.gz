import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://test-ready-preview.preview.emergentagent.com';

export default function EntrepreneurStep4() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    facebook: '',
    tiktok: '',
    youtube: '',
    linkedin: '',
    website: '',
  });
  const [saving, setSaving] = useState(false);

  // Load saved progress on mount
  useEffect(() => {
    loadSavedProgress();
  }, []);

  // Auto-save progress when data changes
  useEffect(() => {
    const saveProgress = async () => {
      try {
        await AsyncStorage.setItem('entrepreneur_step4_progress', JSON.stringify({
          portfolioPhotos,
          socialLinks
        }));
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    };

    const timeoutId = setTimeout(saveProgress, 1000);
    return () => clearTimeout(timeoutId);
  }, [portfolioPhotos, socialLinks]);

  const loadSavedProgress = async () => {
    try {
      const savedData = await AsyncStorage.getItem('entrepreneur_step4_progress');
      if (savedData) {
        const data = JSON.parse(savedData);
        setPortfolioPhotos(data.portfolioPhotos || []);
        setSocialLinks(data.socialLinks || {
          instagram: '',
          facebook: '',
          tiktok: '',
          youtube: '',
          linkedin: '',
          website: '',
        });
        console.log('Loaded entrepreneur Step 4 progress');
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const pickImage = async () => {
    if (portfolioPhotos.length >= 3) {
      Alert.alert('Limit Reached', 'You can upload up to 3 photos.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to upload portfolio photos');
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

      setPortfolioPhotos([...portfolioPhotos, base64Image]);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = portfolioPhotos.filter((_, i) => i !== index);
    setPortfolioPhotos(newPhotos);
  };

  const handleComplete = async () => {
    if (portfolioPhotos.length === 0) {
      Alert.alert('At least 1 photo required', 'Please upload at least one portfolio photo to showcase your work.');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Load ALL data from AsyncStorage (not router params)
      const step0Data = await AsyncStorage.getItem('entrepreneur_step0_progress');
      const step1Data = await AsyncStorage.getItem('entrepreneur_step1_progress');
      const step2Data = await AsyncStorage.getItem('entrepreneur_step2_progress');
      const step3Data = await AsyncStorage.getItem('entrepreneur_step3_progress');

      // Parse saved data
      const step0 = step0Data ? JSON.parse(step0Data) : {};
      const step1 = step1Data ? JSON.parse(step1Data) : {};
      const step2 = step2Data ? JSON.parse(step2Data) : {};
      const step3 = step3Data ? JSON.parse(step3Data) : {};

      // Validate we have required data
      if (!step0.selectedOccupations || step0.selectedOccupations.length === 0) {
        Alert.alert(
          'Occupations Missing',
          'Please select your occupations in Step 1.',
          [
            {
              text: 'Go to Step 1',
              onPress: () => router.push('/onboarding/entrepreneur/step0')
            }
          ]
        );
        return;
      }
      
      if (!step2.displayName || !step2.location) {
        Alert.alert(
          'Onboarding Data Missing',
          'Some required information is missing. Please go back and complete all steps:\n\n• Step 3: Display Name & Location',
          [
            {
              text: 'Go to Step 3',
              onPress: () => router.push('/onboarding/entrepreneur/step2')
            }
          ]
        );
        return;
      }
      
      // Prepare profile photo
      let profilePhoto = step1.profilePhoto || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzE1NjVGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjgwIiBmb250LWZhbWlseT0iQXJpYWwiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7wn5CkPC90ZXh0Pjwvc3ZnPg==';
      
      const occupations = step0.selectedOccupations;

      // Build social links array (only non-empty)
      const socialLinksArray = [];
      if (socialLinks.instagram) socialLinksArray.push(`instagram:${socialLinks.instagram}`);
      if (socialLinks.facebook) socialLinksArray.push(`facebook:${socialLinks.facebook}`);
      if (socialLinks.tiktok) socialLinksArray.push(`tiktok:${socialLinks.tiktok}`);
      if (socialLinks.youtube) socialLinksArray.push(`youtube:${socialLinks.youtube}`);
      if (socialLinks.linkedin) socialLinksArray.push(`linkedin:${socialLinks.linkedin}`);
      if (socialLinks.website) socialLinksArray.push(`website:${socialLinks.website}`);

      console.log('Submitting profile with data:', {
        displayName: step2.displayName,
        location: step2.location,
        bio: step2.bio,
        occupationsCount: occupations.length,
        portfolioCount: portfolioPhotos.length,
        socialLinksCount: socialLinksArray.length
      });

      // Update profile
      await axios.put(
        `${API_URL}/api/profile`,
        {
          full_name: step2.displayName,
          location: step2.location || '',
          bio: step2.bio || '',
          profile_photo: profilePhoto,
          service_name: step2.displayName,
          services: occupations,  // Occupations selected in Step 0
          services_offered: [],  // Empty during onboarding, filled later in profile edit
          portfolio_photos: portfolioPhotos,
          social_links: socialLinksArray,
          entrepreneur_categories: occupations,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Clear all saved progress on successful completion
      await AsyncStorage.multiRemove([
        'entrepreneur_step0_progress',
        'entrepreneur_step1_progress',
        'entrepreneur_step2_progress',
        'entrepreneur_step3_progress',
        'entrepreneur_step4_progress'
      ]);
      
      // Navigate to completion screen
      router.replace('/onboarding/entrepreneur/complete');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      
      // Handle error detail - backend may return array or string
      let errorMessage = 'Failed to save profile. Please try again.';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail.join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotComplete]} />
            <View style={[styles.progressDot, styles.progressDotComplete]} />
            <View style={[styles.progressDot, styles.progressDotComplete]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
          </View>
          <Text style={styles.stepText}>Step 4 of 4</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Show Off Your Work</Text>
          <Text style={styles.subtitle}>Upload up to 3 photos to showcase your talent</Text>

          {/* Portfolio Photos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio Photos *</Text>
            <Text style={styles.sectionSubtitle}>At least 1 photo required</Text>
            
            <View style={styles.photosGrid}>
              {portfolioPhotos.map((photo, index) => (
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
              
              {portfolioPhotos.length < 3 && (
                <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                  <Ionicons name="camera" size={32} color="#1565FF" />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Social Media Links */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social Media & Website</Text>
            <Text style={styles.sectionSubtitle}>Optional - help people find you</Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Ionicons name="logo-instagram" size={20} color="#E4405F" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Instagram username"
                value={socialLinks.instagram}
                onChangeText={(text) => setSocialLinks({...socialLinks, instagram: text})}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Ionicons name="logo-facebook" size={20} color="#1877F2" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Facebook profile"
                value={socialLinks.facebook}
                onChangeText={(text) => setSocialLinks({...socialLinks, facebook: text})}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Ionicons name="logo-tiktok" size={20} color="#000" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="TikTok username"
                value={socialLinks.tiktok}
                onChangeText={(text) => setSocialLinks({...socialLinks, tiktok: text})}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Ionicons name="logo-youtube" size={20} color="#FF0000" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="YouTube channel"
                value={socialLinks.youtube}
                onChangeText={(text) => setSocialLinks({...socialLinks, youtube: text})}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Ionicons name="logo-linkedin" size={20} color="#0A66C2" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="LinkedIn profile"
                value={socialLinks.linkedin}
                onChangeText={(text) => setSocialLinks({...socialLinks, linkedin: text})}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Ionicons name="globe-outline" size={20} color="#1565FF" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Website or booking link"
                value={socialLinks.website}
                onChangeText={(text) => setSocialLinks({...socialLinks, website: text})}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.completeButton, (portfolioPhotos.length === 0 || saving) && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={portfolioPhotos.length === 0 || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.completeButtonText}>Complete Profile</Text>
                <Ionicons name="checkmark" size={20} color="#fff" />
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1565FF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#1565FF',
    marginTop: 4,
    fontWeight: '600',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
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