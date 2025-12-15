import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../contexts/AuthContext';
import { ORDERED_OCCUPATIONS } from './broadOccupations';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

export default function EntrepreneurStep2() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedOccupations, setSelectedOccupations] = useState<string[]>([]);
  const [showAllOccupations, setShowAllOccupations] = useState(false);
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [instagram, setInstagram] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      // Get current user for verification
      const userData = await AsyncStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;
      
      if (!currentUser) {
        console.log('⚠️ No user found in step2');
        return;
      }
      
      // Check if user is newly created (within last 5 minutes)
      const createdAt = new Date(currentUser.created_at || Date.now());
      const ageMinutes = (new Date().getTime() - createdAt.getTime()) / (1000 * 60);
      const isNewUser = ageMinutes < 5;
      
      if (isNewUser) {
        // New user - clear any old step2 data and load fresh from step0
        console.log('🆕 New user in step2 - loading fresh data from step0');
        await AsyncStorage.removeItem('entrepreneur_step2');
        await AsyncStorage.removeItem('entrepreneur_step1'); // Also clear old step1
        
        // Load occupations from step0 (where they were just selected)
        const step0Data = await AsyncStorage.getItem('entrepreneur_step0_progress');
        if (step0Data) {
          const data = JSON.parse(step0Data);
          if (data.userId === currentUser.id && data.selectedOccupations && data.selectedOccupations.length > 0) {
            console.log('✅ Loaded occupations from step0:', data.selectedOccupations);
            setSelectedOccupations(data.selectedOccupations);
          }
        }
        return;
      }
      
      // Existing user - try to load from step2 progress
      const saved = await AsyncStorage.getItem('entrepreneur_step2');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.userId === currentUser.id) {
          console.log('✅ Loading step2 progress for existing user');
          if (data.occupations) setSelectedOccupations(data.occupations);
          setFacebook(data.facebook || '');
          setTiktok(data.tiktok || '');
          setInstagram(data.instagram || '');
        } else {
          // Wrong user's data - clear and load from step0
          console.log('🗑️ Clearing wrong user data from step2');
          await AsyncStorage.removeItem('entrepreneur_step2');
          
          // Load from step0 as fallback
          const step0Data = await AsyncStorage.getItem('entrepreneur_step0_progress');
          if (step0Data) {
            const data = JSON.parse(step0Data);
            if (data.selectedOccupations) {
              setSelectedOccupations(data.selectedOccupations);
            }
          }
        }
      } else {
        // No step2 data - load from step0
        console.log('📋 No step2 data - loading from step0');
        const step0Data = await AsyncStorage.getItem('entrepreneur_step0_progress');
        if (step0Data) {
          const data = JSON.parse(step0Data);
          if (data.selectedOccupations) {
            console.log('✅ Loaded occupations from step0:', data.selectedOccupations);
            setSelectedOccupations(data.selectedOccupations);
          }
        }
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const saveProgress = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const userId = userData ? JSON.parse(userData).id : null;
      
      await AsyncStorage.setItem('entrepreneur_step2', JSON.stringify({
        userId,
        occupations: selectedOccupations,
        facebook,
        tiktok,
        instagram,
      }));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const toggleOccupation = (occupation: string) => {
    if (selectedOccupations.includes(occupation)) {
      // Don't allow removing the last occupation
      if (selectedOccupations.length === 1) {
        Alert.alert('Required', 'You must have at least one occupation selected');
        return;
      }
      setSelectedOccupations(selectedOccupations.filter(o => o !== occupation));
    } else {
      setSelectedOccupations([...selectedOccupations, occupation]);
    }
  };

  const handleFinish = async () => {
    if (selectedOccupations.length === 0) {
      Alert.alert('Required Field', 'Please select at least one occupation');
      return;
    }

    setSaving(true);
    await saveProgress();

    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Build social links object
      const socialLinks: any = {};
      if (facebook) socialLinks.facebook = facebook;
      if (tiktok) socialLinks.tiktok = tiktok;
      if (instagram) socialLinks.instagram = instagram;

      // Save minimal profile to backend
      await axios.put(`${API_URL}/api/profile`, {
        full_name: user?.full_name,
        email: user?.email,
        services: selectedOccupations, // Save occupations
        social_links: socialLinks,
        profile_completed: false, // Mark as incomplete (needs services & portfolio)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Clear onboarding progress
      await AsyncStorage.removeItem('entrepreneur_step1');
      await AsyncStorage.removeItem('entrepreneur_step2');

      // Redirect to home (modal will appear to finish profile)
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkipSocial = async () => {
    await handleFinish();
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotComplete]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
          </View>
        </View>

        {/* Welcome Message */}
        <Text style={styles.title}>Welcome, {user?.full_name?.split(' ')[0] || 'there'}!</Text>
        <Text style={styles.subtitle}>
          Let's finish setting up your profile
        </Text>

        {/* Selected Occupations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Occupation(s)</Text>
          <View style={styles.occupationsContainer}>
            {selectedOccupations.map((occupation, index) => (
              <View key={index} style={styles.selectedOccupationChip}>
                <Text style={styles.selectedOccupationText}>{occupation}</Text>
                {selectedOccupations.length > 1 && (
                  <TouchableOpacity onPress={() => toggleOccupation(occupation)}>
                    <Ionicons name="close-circle" size={18} color="#fff" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Add Another Occupation Button */}
          <TouchableOpacity 
            style={styles.addOccupationButton}
            onPress={() => setShowAllOccupations(!showAllOccupations)}
          >
            <Ionicons 
              name={showAllOccupations ? "remove-circle-outline" : "add-circle-outline"} 
              size={24} 
              color="#1565FF" 
            />
            <Text style={styles.addOccupationText}>
              {showAllOccupations ? 'Hide Occupations' : 'Add Another Occupation'}
            </Text>
          </TouchableOpacity>

          {/* Occupation List (when expanded) */}
          {showAllOccupations && (
            <View style={styles.occupationsList}>
              <Text style={styles.helperText}>Select additional occupations:</Text>
              <View style={styles.occupationGrid}>
                {ORDERED_OCCUPATIONS.map((occupation) => {
                  const isSelected = selectedOccupations.includes(occupation);
                  if (isSelected) return null; // Don't show already selected
                  return (
                    <TouchableOpacity
                      key={occupation}
                      style={styles.occupationChip}
                      onPress={() => toggleOccupation(occupation)}
                    >
                      <Text style={styles.occupationText}>{occupation}</Text>
                      <Ionicons name="add-circle" size={16} color="#1565FF" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <Text style={styles.infoText}>
            You can add more occupations and customize your profile later
          </Text>
        </View>

        {/* Social Media (Optional) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connect Your Social Media (Optional)</Text>
          <Text style={styles.helperText}>Add your top 3 platforms - you can add more later</Text>

          {/* Facebook */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconRow}>
              <Ionicons name="logo-facebook" size={20} color="#1877F2" />
              <Text style={styles.inputLabel}>Facebook</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="facebook.com/yourprofile"
              placeholderTextColor="#999"
              value={facebook}
              onChangeText={setFacebook}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {/* TikTok */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconRow}>
              <Ionicons name="musical-notes" size={20} color="#000" />
              <Text style={styles.inputLabel}>TikTok</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="tiktok.com/@yourhandle"
              placeholderTextColor="#999"
              value={tiktok}
              onChangeText={setTiktok}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {/* Instagram */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconRow}>
              <Ionicons name="logo-instagram" size={20} color="#E4405F" />
              <Text style={styles.inputLabel}>Instagram</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="instagram.com/yourhandle"
              placeholderTextColor="#999"
              value={instagram}
              onChangeText={setInstagram}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.finishButton}
          onPress={handleFinish}
          disabled={saving}
        >
          <Text style={styles.finishButtonText}>
            {saving ? 'Saving...' : 'Finish & Explore'}
          </Text>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkipSocial}
          disabled={saving}
        >
          <Text style={styles.skipButtonText}>Skip Social Media for Now</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  progressDotActive: {
    backgroundColor: '#1565FF',
  },
  progressDotComplete: {
    backgroundColor: '#4CAF50',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  occupationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  selectedOccupationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  selectedOccupationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  addOccupationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1565FF',
    backgroundColor: '#F0F7FF',
    marginBottom: 12,
    gap: 8,
  },
  addOccupationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1565FF',
  },
  occupationsList: {
    marginTop: 16,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  occupationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  occupationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#1565FF',
  },
  occupationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1565FF',
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#000',
    backgroundColor: '#F9F9F9',
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565FF',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  finishButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 12,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
    textDecorationLine: 'underline',
  },
});
