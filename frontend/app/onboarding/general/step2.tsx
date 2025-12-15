import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

interface Categories {
  venue_categories: Record<string, string[]>;
  entrepreneur_categories: Record<string, string[]>;
}

export default function OnboardingStep3() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Categories | null>(null);
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [selectedEntrepreneurs, setSelectedEntrepreneurs] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCategories();
    loadSavedProgress();
  }, []);

  const loadSavedProgress = async () => {
    try {
      const savedData = await AsyncStorage.getItem('general_step2_progress');
      if (savedData) {
        const data = JSON.parse(savedData);
        if (data.selectedVenues) setSelectedVenues(data.selectedVenues);
        if (data.selectedEntrepreneurs) setSelectedEntrepreneurs(data.selectedEntrepreneurs);
        console.log('Loaded General Public Step 2 progress');
      }
    } catch (error) {
      console.error('Error loading Step 2 progress:', error);
    }
  };

  // Auto-save progress with debouncing
  useEffect(() => {
    const saveProgress = async () => {
      try {
        await AsyncStorage.setItem('general_step2_progress', JSON.stringify({
          selectedVenues,
          selectedEntrepreneurs,
        }));
      } catch (error) {
        console.error('Error saving Step 2 progress:', error);
      }
    };

    // Debounce save - only save if user stops interacting for 1 second
    const timeoutId = setTimeout(saveProgress, 1000);
    return () => clearTimeout(timeoutId);
  }, [selectedVenues, selectedEntrepreneurs]);

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/profile/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', 'Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleVenueCategory = (category: string, subcategory: string) => {
    const value = `${category}:${subcategory}`;
    if (selectedVenues.includes(value)) {
      setSelectedVenues(selectedVenues.filter(v => v !== value));
    } else {
      setSelectedVenues([...selectedVenues, value]);
    }
  };

  const toggleEntrepreneurCategory = (category: string, subcategory: string) => {
    const value = `${category}:${subcategory}`;
    if (selectedEntrepreneurs.includes(value)) {
      setSelectedEntrepreneurs(selectedEntrepreneurs.filter(e => e !== value));
    } else {
      setSelectedEntrepreneurs([...selectedEntrepreneurs, value]);
    }
  };

  const handleComplete = async () => {
    if (selectedVenues.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one venue category to personalize your content.');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Prepare profile photo
      let profilePhoto = params.profilePhoto as string;
      if (profilePhoto === 'default' || !profilePhoto) {
        profilePhoto = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzE1NjVGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjgwIiBmb250LWZhbWlseT0iQXJpYWwiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7wn5CkPC90ZXh0Pjwvc3ZnPg==';
      }

      // Update profile
      await axios.put(
        `${API_URL}/api/profile`,
        {
          full_name: params.fullName,
          location: params.location || '',
          bio: params.bio || '',
          profile_photo: profilePhoto,
          venue_categories: selectedVenues,
          entrepreneur_categories: selectedEntrepreneurs,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Clear ALL General Public onboarding progress after successful completion
      try {
        await AsyncStorage.multiRemove([
          'general_step1_progress',
          'general_step2_progress',
        ]);
        console.log('✅ Cleared all General Public onboarding progress');
      } catch (clearError) {
        console.error('Error clearing onboarding progress:', clearError);
      }

      // Navigate to completion screen
      router.replace('/onboarding/general/complete');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        <Text style={styles.title}>What interests you?</Text>
        <Text style={styles.subtitle}>Select categories to personalize your feed</Text>

        <View style={styles.selectionBadge}>
          <Ionicons name="checkmark-circle" size={20} color="#1565FF" />
          <Text style={styles.selectionText}>
            {selectedVenues.length} venue{selectedVenues.length !== 1 ? 's' : ''} selected
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Venue Types *</Text>
          <Text style={styles.sectionSubtitle}>Choose at least one</Text>
          
          {categories && Object.entries(categories.venue_categories).map(([category, subcategories]) => (
            <View key={category} style={styles.categoryContainer}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleSection(`venue-${category}`)}
              >
                <Text style={styles.categoryName}>{category}</Text>
                <Ionicons
                  name={expandedSections.has(`venue-${category}`) ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
              
              {expandedSections.has(`venue-${category}`) && (
                <View style={styles.subcategoryContainer}>
                  {subcategories.map((sub) => {
                    const value = `${category}:${sub}`;
                    const isSelected = selectedVenues.includes(value);
                    return (
                      <TouchableOpacity
                        key={sub}
                        style={[styles.subcategoryChip, isSelected && styles.subcategoryChipSelected]}
                        onPress={() => toggleVenueCategory(category, sub)}
                      >
                        <Text style={[styles.subcategoryText, isSelected && styles.subcategoryTextSelected]}>
                          {sub}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entrepreneur Services</Text>
          <Text style={styles.sectionSubtitle}>Optional - helps connect you with service providers</Text>
          
          {categories && Object.entries(categories.entrepreneur_categories).map(([category, subcategories]) => (
            <View key={category} style={styles.categoryContainer}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleSection(`entrepreneur-${category}`)}
              >
                <Text style={styles.categoryName}>{category}</Text>
                <Ionicons
                  name={expandedSections.has(`entrepreneur-${category}`) ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
              
              {expandedSections.has(`entrepreneur-${category}`) && (
                <View style={styles.subcategoryContainer}>
                  {subcategories.map((sub) => {
                    const value = `${category}:${sub}`;
                    const isSelected = selectedEntrepreneurs.includes(value);
                    return (
                      <TouchableOpacity
                        key={sub}
                        style={[styles.subcategoryChip, isSelected && styles.subcategoryChipSelected]}
                        onPress={() => toggleEntrepreneurCategory(category, sub)}
                      >
                        <Text style={[styles.subcategoryText, isSelected && styles.subcategoryTextSelected]}>
                          {sub}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.completeButton, (selectedVenues.length === 0 || saving) && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={selectedVenues.length === 0 || saving}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 24,
  },
  selectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 24,
    gap: 8,
    marginBottom: 24,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565FF',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  categoryContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  subcategoryContainer: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subcategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 4,
  },
  subcategoryChipSelected: {
    backgroundColor: '#1565FF',
    borderColor: '#1565FF',
  },
  subcategoryText: {
    fontSize: 14,
    color: '#333',
  },
  subcategoryTextSelected: {
    color: '#fff',
    fontWeight: '600',
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
