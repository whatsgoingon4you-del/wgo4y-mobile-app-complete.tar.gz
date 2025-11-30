import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function BusinessStep1() {
  const router = useRouter();
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);

  // Load saved progress on mount
  useEffect(() => {
    loadSavedProgress();
  }, []);

  const loadSavedProgress = async () => {
    try {
      const savedData = await AsyncStorage.getItem('business_step1_progress');
      if (savedData) {
        const data = JSON.parse(savedData);
        setBusinessLogo(data.businessLogo);
        console.log('Loaded business Step 1 progress');
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const saveProgress = async (logo: string | null) => {
    try {
      await AsyncStorage.setItem('business_step1_progress', JSON.stringify({
        businessLogo: logo
      }));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to upload your logo');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const logoUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setBusinessLogo(logoUri);
      await saveProgress(logoUri);
    }
  };

  const handleContinue = async () => {
    await saveProgress(businessLogo);
    router.push({
      pathname: '/onboarding/business/step2',
      params: { businessLogo: businessLogo || 'default' }
    });
  };

  const handleSkip = async () => {
    await saveProgress(null);
    router.push({
      pathname: '/onboarding/business/step2',
      params: { businessLogo: 'default' }
    });
  };

  const handleChangeUserType = async () => {
    // Clear the confirmation flag so user can change type
    await AsyncStorage.removeItem('onboarding_user_type_confirmed');
    router.push('/onboarding/user-type-selection');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleChangeUserType} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.stepText}>Step 1 of 3</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Upload Your Logo</Text>
        <Text style={styles.subtitle}>Add your business logo. You can skip for now and add one later.</Text>

        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
            {businessLogo ? (
              <Image source={{ uri: businessLogo }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="business" size={64} color="#ccc" />
                <Text style={styles.photoPlaceholderText}>Tap to upload logo</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {businessLogo && (
            <TouchableOpacity style={styles.changePhotoButton} onPress={pickImage}>
              <Ionicons name="camera" size={20} color="#1565FF" />
              <Text style={styles.changePhotoText}>Change Logo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#1565FF" />
          <Text style={styles.infoText}>
            A professional logo helps customers recognize and trust your business. You can always add one later.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip for Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
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
    marginBottom: 48,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  photoContainer: {
    width: 150,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
  },
  changePhotoText: {
    fontSize: 14,
    color: '#1565FF',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    gap: 12,
  },
  skipButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  continueButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1565FF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});