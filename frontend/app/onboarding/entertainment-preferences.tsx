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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

interface EntertainmentCategory {
  id: string;
  name: string;
  icon: string;
  category: string;
}

export default function EntertainmentPreferencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<EntertainmentCategory[]>([]);
  const [groupedCategories, setGroupedCategories] = useState<Record<string, EntertainmentCategory[]>>({});
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [userType, setUserType] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get user type from AsyncStorage
      const type = await AsyncStorage.getItem('onboarding_user_type');
      setUserType(type || '');

      // Load entertainment categories from backend
      const response = await axios.get(`${API_URL}/api/entertainment-categories`);
      setCategories(response.data.categories);
      setGroupedCategories(response.data.grouped);

      // During ONBOARDING: Only use AsyncStorage (ignore backend profile)
      // This ensures each new user starts fresh
      const savedPrefs = await AsyncStorage.getItem('onboarding_entertainment_preferences');
      if (savedPrefs) {
        const parsedPrefs = JSON.parse(savedPrefs);
        console.log('📋 Resuming onboarding with saved preferences:', parsedPrefs);
        setSelectedPreferences(parsedPrefs);
      } else {
        // Fresh start for new user
        console.log('📋 Fresh start - no preferences selected');
        setSelectedPreferences([]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      if (Platform.OS === 'web') {
        alert('Error loading entertainment categories');
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = async (categoryId: string) => {
    let updated: string[];
    if (selectedPreferences.includes(categoryId)) {
      updated = selectedPreferences.filter(id => id !== categoryId);
    } else {
      updated = [...selectedPreferences, categoryId];
    }
    setSelectedPreferences(updated);
    
    // Auto-save to AsyncStorage
    await AsyncStorage.setItem('onboarding_entertainment_preferences', JSON.stringify(updated));
  };

  const handleContinue = async () => {
    if (selectedPreferences.length === 0) {
      if (Platform.OS === 'web') {
        alert('Please select at least one entertainment preference to continue');
      }
      return;
    }

    setSaving(true);
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem('onboarding_entertainment_preferences', JSON.stringify(selectedPreferences));
      
      // Navigate to profile photo upload
      router.push('/onboarding/profile-photo');
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    // Allow skip but navigate to profile photo
    router.push('/onboarding/profile-photo');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
          <Text style={styles.loadingText}>Loading preferences...</Text>
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

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>What entertains you? 🎉</Text>
          <Text style={styles.subtitle}>
            Select your interests so we can personalize your experience and show you events you'll love
          </Text>
          <Text style={styles.selectedCount}>
            {selectedPreferences.length} selected
          </Text>
        </View>

        {/* Categories by Group */}
        {Object.entries(groupedCategories).map(([groupName, groupCategories]) => (
          <View key={groupName} style={styles.categoryGroup}>
            <Text style={styles.groupTitle}>{groupName}</Text>
            <View style={styles.categoryGrid}>
              {groupCategories.map((category) => {
                const isSelected = selectedPreferences.includes(category.id);
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryCard,
                      isSelected && styles.categoryCardSelected
                    ]}
                    onPress={() => togglePreference(category.id)}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={28}
                      color={isSelected ? '#1565FF' : '#666'}
                    />
                    <Text style={[
                      styles.categoryName,
                      isSelected && styles.categoryNameSelected
                    ]}>
                      {category.name}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark-circle" size={20} color="#1565FF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Bottom padding */}
        <View style={{ height: 24 }} />

        {/* Action Buttons - Inside ScrollView for Android compatibility */}
        <View style={styles.actionButtonContainer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.continueButton,
                selectedPreferences.length === 0 && styles.continueButtonDisabled
              ]}
              onPress={handleContinue}
              disabled={saving || selectedPreferences.length === 0}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
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
    backgroundColor: '#fff',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    marginBottom: 12,
  },
  selectedCount: {
    fontSize: 14,
    color: '#1565FF',
    fontWeight: '600',
  },
  categoryGroup: {
    marginBottom: 32,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    minWidth: 140,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  categoryCardSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1565FF',
  },
  categoryName: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  categoryNameSelected: {
    color: '#1565FF',
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  actionButtonContainer: {
    paddingVertical: 20,
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
  continueButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  continueButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
