import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  LayoutAnimation,
  UIManager,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BROAD_OCCUPATIONS } from './broadOccupations';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function EntrepreneurStep0() {
  const router = useRouter();
  const [selectedOccupations, setSelectedOccupations] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    clearStaleDataAndLoad();
  }, []);

  const clearStaleDataAndLoad = async () => {
    try {
      // Get current user
      const userData = await AsyncStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;
      
      if (!currentUser) {
        console.log('⚠️ No user found, clearing all entrepreneur data');
        await AsyncStorage.multiRemove([
          'entrepreneur_step0_progress',
          'entrepreneur_step1_progress',
          'entrepreneur_step2_progress',
          'entrepreneur_step3_progress',
          'entrepreneur_step4_progress',
        ]);
        return;
      }
      
      // Check if user just registered (created very recently, like within last 5 minutes)
      const createdAt = new Date(currentUser.created_at || Date.now());
      const now = new Date();
      const ageMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
      const isNewUser = ageMinutes < 5;
      
      console.log('👤 User info:', {
        id: currentUser.id,
        created: createdAt.toISOString(),
        ageMinutes: ageMinutes.toFixed(1),
        isNew: isNewUser
      });
      
      const saved = await AsyncStorage.getItem('entrepreneur_step0_progress');
      
      if (isNewUser && saved) {
        // New user but has old data - clear it
        console.log('🗑️ New user detected - clearing all stale entrepreneur progress');
        await AsyncStorage.multiRemove([
          'entrepreneur_step0_progress',
          'entrepreneur_step1_progress',
          'entrepreneur_step2_progress',
          'entrepreneur_step3_progress',
          'entrepreneur_step4_progress',
        ]);
        // Don't load anything - start fresh
        return;
      }
      
      if (saved) {
        const data = JSON.parse(saved);
        
        // Verify this data belongs to current user
        if (data.userId === currentUser.id && data.selectedOccupations) {
          console.log('✅ Loading entrepreneur step0 progress for current user');
          setSelectedOccupations(data.selectedOccupations);
        } else {
          // Different user's data - clear it
          console.log('🗑️ Clearing stale entrepreneur step0 progress (different user)');
          await AsyncStorage.removeItem('entrepreneur_step0_progress');
        }
      } else {
        console.log('📋 No saved progress - starting fresh');
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const saveProgress = async (occupations: string[]) => {
    try {
      // Save with user ID to prevent cross-user contamination
      const userData = await AsyncStorage.getItem('user');
      const userId = userData ? JSON.parse(userData).id : null;
      
      await AsyncStorage.setItem(
        'entrepreneur_step0_progress',
        JSON.stringify({ 
          userId,
          selectedOccupations: occupations 
        })
      );
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const toggleCategory = (categoryName: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleOccupation = (occupation: string) => {
    let newOccupations: string[];
    if (selectedOccupations.includes(occupation)) {
      newOccupations = selectedOccupations.filter(s => s !== occupation);
    } else {
      newOccupations = [...selectedOccupations, occupation];
    }
    setSelectedOccupations(newOccupations);
    saveProgress(newOccupations);
  };

  const handleContinue = () => {
    if (selectedOccupations.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one occupation that describes what you do');
      return;
    }

    // Skip step1 (duplicate occupation selection) and go directly to step2 (profile details)
    router.push('/onboarding/entrepreneur/step2');
  };

  // Get occupations by category with search filter
  const getOccupationsByCategory = (categoryName: string) => {
    const category = BROAD_OCCUPATIONS.find(cat => cat.category === categoryName);
    if (!category) return [];
    
    let occupations = category.occupations;
    if (searchQuery.trim()) {
      occupations = occupations.filter(occupation =>
        occupation.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return occupations;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
          </View>
          <Text style={styles.title}>Select Your Occupations</Text>
          <Text style={styles.subtitle}>
            Choose the specific occupations you do. Select from one or more categories below.
          </Text>
          <View style={styles.suggestionBox}>
            <Ionicons name="bulb-outline" size={20} color="#FF9500" />
            <Text style={styles.suggestionText}>
              💡 Tip: Tap a category to expand and see all services. Select as many as you offer!
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search occupations..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Tabs with Expandable Services */}
        <View style={styles.categoriesContainer}>
          {BROAD_OCCUPATIONS.map((categoryData) => {
            const isExpanded = expandedCategories.has(categoryData.category);
            const occupations = getOccupationsByCategory(categoryData.category);
            const selectedInCategory = occupations.filter(o => selectedOccupations.includes(o)).length;
            
            return (
              <View key={categoryData.category} style={styles.categorySection}>
                {/* Category Header/Tab */}
                <TouchableOpacity
                  style={[
                    styles.categoryTab,
                    selectedInCategory > 0 && styles.categoryTabActive,
                  ]}
                  onPress={() => toggleCategory(categoryData.category)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryTabLeft}>
                    <Text style={styles.categoryIcon}>{categoryData.category.split(' ')[0]}</Text>
                    <View style={styles.categoryInfo}>
                      <Text style={[styles.categoryName, selectedInCategory > 0 && styles.categoryNameActive]}>
                        {categoryData.category.substring(3)}
                      </Text>
                      <Text style={styles.categoryDescription}>Select your primary occupation(s)</Text>
                    </View>
                  </View>
                  <View style={styles.categoryTabRight}>
                    {selectedInCategory > 0 && (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}>{selectedInCategory}</Text>
                      </View>
                    )}
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={24}
                      color={selectedInCategory > 0 ? '#1565FF' : '#666'}
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded Occupations List */}
                {isExpanded && (
                  <View style={styles.servicesContainer}>
                    {occupations.length > 0 ? (
                      <View style={styles.servicesGrid}>
                        {occupations.map((occupation) => {
                          const isSelected = selectedOccupations.includes(occupation);
                          return (
                            <TouchableOpacity
                              key={occupation}
                              style={[
                                styles.serviceChip,
                                isSelected && styles.serviceChipSelected,
                              ]}
                              onPress={() => toggleOccupation(occupation)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.serviceChipText, isSelected && styles.serviceChipTextSelected]}>
                                {occupation}
                              </Text>
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={18} color="#1565FF" />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.noResults}>No occupations match your search</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Selection Summary */}
        {selectedOccupations.length > 0 && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.summaryTitle}>
                {selectedOccupations.length} {selectedOccupations.length === 1 ? 'Service' : 'Services'} Selected
              </Text>
            </View>
            <View style={styles.selectedOccupationsPreview}>
              {selectedOccupations.slice(0, 5).map((service, index) => (
                <View key={index} style={styles.previewChip}>
                  <Text style={styles.previewChipText}>{service}</Text>
                </View>
              ))}
              {selectedOccupations.length > 5 && (
                <Text style={styles.moreText}>+{selectedOccupations.length - 5} more</Text>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedOccupations.length === 0 && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={selectedOccupations.length === 0}
          accessibilityLabel="Continue to next step"
        >
          <Text style={styles.continueButtonText}>
            Continue
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
        {selectedOccupations.length === 0 && (
          <Text style={styles.footerHint}>Select at least one service to continue</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  progressDotActive: {
    backgroundColor: '#1565FF',
    width: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#F57C00',
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    gap: 8,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  categoriesContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  categorySection: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryTabActive: {
    backgroundColor: '#F0F7FF',
    borderColor: '#1565FF',
  },
  categoryTabLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  categoryNameActive: {
    color: '#1565FF',
  },
  categoryDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  categoryTabRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedBadge: {
    backgroundColor: '#1565FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  selectedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  servicesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    padding: 16,
    backgroundColor: '#FAFAFA',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    gap: 6,
  },
  serviceChipSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1565FF',
  },
  serviceChipText: {
    fontSize: 14,
    color: '#333',
  },
  serviceChipTextSelected: {
    color: '#1565FF',
    fontWeight: '600',
  },
  noResults: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 16,
  },
  summaryContainer: {
    marginTop: 24,
    marginHorizontal: 24,
    padding: 16,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1565FF',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565FF',
  },
  selectedOccupationsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  previewChip: {
    backgroundColor: '#1565FF',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  previewChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  moreText: {
    fontSize: 12,
    color: '#1565FF',
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565FF',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  footerHint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});
