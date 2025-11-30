import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ENTREPRENEUR_SERVICES } from './servicesData';
import { getServicesForCategories, getCategoryDisplayNames } from './categoryMapping';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EntrepreneurStep3() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['🎤 Occupation']));

  // Load selected categories from Step 0 and filter services
  const filteredServices = useMemo(() => {
    const allowedServices = getServicesForCategories(selectedCategories);
    return ENTREPRENEUR_SERVICES.map(cat => ({
      ...cat,
      services: cat.services.filter(service => allowedServices.includes(service))
    })).filter(cat => cat.services.length > 0);
  }, [selectedCategories]);

  // Load saved progress on mount
  useEffect(() => {
    loadCategoriesFromStep0();
    loadSavedProgress();
  }, []);

  const loadCategoriesFromStep0 = async () => {
    try {
      const saved = await AsyncStorage.getItem('entrepreneur_step0_progress');
      if (saved) {
        const data = JSON.parse(saved);
        setSelectedCategories(data.selectedCategories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Auto-save progress when services change
  useEffect(() => {
    const saveProgress = async () => {
      if (selectedServices.length > 0) {
        try {
          await AsyncStorage.setItem('entrepreneur_step3_progress', JSON.stringify({
            selectedServices
          }));
        } catch (error) {
          console.error('Error saving progress:', error);
        }
      }
    };

    const timeoutId = setTimeout(saveProgress, 1000);
    return () => clearTimeout(timeoutId);
  }, [selectedServices]);

  const loadSavedProgress = async () => {
    try {
      const savedData = await AsyncStorage.getItem('entrepreneur_step3_progress');
      if (savedData) {
        const data = JSON.parse(savedData);
        setSelectedServices(data.selectedServices || []);
        console.log('Loaded entrepreneur Step 3 progress');
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleService = (serviceName: string) => {
    if (selectedServices.includes(serviceName)) {
      setSelectedServices(selectedServices.filter(s => s !== serviceName));
    } else {
      setSelectedServices([...selectedServices, serviceName]);
    }
  };

  const handleContinue = () => {
    if (selectedServices.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one service to personalize your profile.');
      return;
    }

    router.push({
      pathname: '/onboarding/entrepreneur/step4',
      params: {
        profilePhoto: params.profilePhoto,
        displayName: params.displayName,
        location: params.location,
        bio: params.bio,
        services: JSON.stringify(selectedServices),
      }
    });
  };

  const handleBack = () => {
    router.back();
  };

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
          <View style={styles.progressDot} />
        </View>
        <Text style={styles.stepText}>Step 3 of 4</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Which Services Do You Offer?</Text>
        <Text style={styles.subtitle}>Select all that apply. Please choose at least one service.</Text>

        <View style={styles.selectionBadge}>
          <Ionicons name="checkmark-circle" size={20} color="#1565FF" />
          <Text style={styles.selectionText}>
            {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
          </Text>
        </View>

        {selectedCategories.length > 0 && (
          <View style={styles.categoryInfo}>
            <Ionicons name="filter" size={18} color="#1565FF" />
            <Text style={styles.categoryInfoText}>
              Showing services for: {getCategoryDisplayNames(selectedCategories).join(', ')}
            </Text>
          </View>
        )}

        {filteredServices.map((categoryData) => {
          // Define example services for each category
          const getExampleServices = (category: string) => {
            if (category.includes('Occupation')) return 'Musician / Performer / Artist';
            if (category.includes('Event Support')) return 'Event Planner / Stage Manager / Cleaning Crew';
            if (category.includes('Marketing')) return 'Social Media Marketing / Influencer / PR';
            if (category.includes('Food & Drink')) return 'Caterer / Food Truck / Bartender';
            return '';
          };

          return (
            <View key={categoryData.category} style={styles.categorySection}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(categoryData.category)}
              >
                <View style={styles.categoryTitleContainer}>
                  <Text style={styles.categoryTitle}>{categoryData.category}</Text>
                  <Text style={styles.categoryExamples}>{getExampleServices(categoryData.category)}</Text>
                </View>
                <Ionicons
                  name={expandedCategories.has(categoryData.category) ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>

            {expandedCategories.has(categoryData.category) && (
              <View style={styles.servicesGrid}>
                {categoryData.services.map((serviceName) => {
                  const isSelected = selectedServices.includes(serviceName);
                  return (
                    <TouchableOpacity
                      key={serviceName}
                      style={[styles.serviceChip, isSelected && styles.serviceChipSelected]}
                      onPress={() => toggleService(serviceName)}
                    >
                      <Text style={[styles.serviceText, isSelected && styles.serviceTextSelected]}>
                        {serviceName}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
        })}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#1565FF" />
          <Text style={styles.infoText}>
            Select the services you offer. You can always update this later in your profile settings.
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, selectedServices.length === 0 && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={selectedServices.length === 0}
        >
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
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  categoryInfoText: {
    fontSize: 13,
    color: '#F57C00',
    flex: 1,
    lineHeight: 18,
  },
  categorySection: {
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
  categoryTitleContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  categoryExamples: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  servicesGrid: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  serviceChipSelected: {
    backgroundColor: '#1565FF',
    borderColor: '#1565FF',
  },
  serviceText: {
    fontSize: 14,
    color: '#333',
  },
  serviceTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    gap: 12,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  footer: {
    padding: 24,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
