import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { GROUPED_VENUE_CATEGORIES } from '../onboarding/business/groupedVenueCategories';
import { GROUPED_ENTERTAINMENT_CATEGORIES } from '../onboarding/business/groupedEntertainmentCategories';
import { GROUPED_SERVICE_CATEGORIES } from '../onboarding/general/groupedServiceCategories';
import { getVenuesFromEntertainment, getServicesFromEntertainment } from '../../utils/preferenceMapping';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://test-ready-preview.preview.emergentagent.com';

export default function EditProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Basic Info
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  
  // Preferences
  const [venuePreferences, setVenuePreferences] = useState<string[]>([]);
  const [servicePreferences, setServicePreferences] = useState<string[]>([]);
  const [entertainmentPreferences, setEntertainmentPreferences] = useState<string[]>([]);
  
  // Search states
  const [venueSearch, setVenueSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [entertainmentSearch, setEntertainmentSearch] = useState('');
  
  // UI state for collapsible sections and groups
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));
  const [expandedVenueGroups, setExpandedVenueGroups] = useState<Set<string>>(new Set());
  const [expandedEntertainmentGroups, setExpandedEntertainmentGroups] = useState<Set<string>>(new Set());
  const [expandedServiceGroups, setExpandedServiceGroups] = useState<Set<string>>(new Set());

  // Helper Functions
  const toggleSection = (section: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleVenueGroup = (groupName: string) => {
    const newExpanded = new Set(expandedVenueGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedVenueGroups(newExpanded);
  };

  const toggleEntertainmentGroup = (groupName: string) => {
    const newExpanded = new Set(expandedEntertainmentGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedEntertainmentGroups(newExpanded);
  };

  const toggleServiceGroup = (groupName: string) => {
    const newExpanded = new Set(expandedServiceGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedServiceGroups(newExpanded);
  };

  const toggleVenuePreference = (venue: string) => {
    if (venuePreferences.includes(venue)) {
      setVenuePreferences(venuePreferences.filter(v => v !== venue));
    } else {
      setVenuePreferences([...venuePreferences, venue]);
    }
  };

  const toggleServicePreference = (service: string) => {
    if (servicePreferences.includes(service)) {
      setServicePreferences(servicePreferences.filter(s => s !== service));
    } else {
      setServicePreferences([...servicePreferences, service]);
    }
  };

  const toggleEntertainmentPreference = (entertainment: string) => {
    if (entertainmentPreferences.includes(entertainment)) {
      setEntertainmentPreferences(entertainmentPreferences.filter(e => e !== entertainment));
    } else {
      setEntertainmentPreferences([...entertainmentPreferences, entertainment]);
    }
  };

  // Select/Deselect entire group
  const selectEntireVenueGroup = (groupItems: string[]) => {
    const allSelected = groupItems.every(item => venuePreferences.includes(item));
    if (allSelected) {
      // Deselect all in group
      setVenuePreferences(venuePreferences.filter(v => !groupItems.includes(v)));
    } else {
      // Select all in group
      const newSelections = [...venuePreferences];
      groupItems.forEach(item => {
        if (!newSelections.includes(item)) {
          newSelections.push(item);
        }
      });
      setVenuePreferences(newSelections);
    }
  };

  const selectEntireServiceGroup = (groupItems: string[]) => {
    const allSelected = groupItems.every(item => servicePreferences.includes(item));
    if (allSelected) {
      setServicePreferences(servicePreferences.filter(s => !groupItems.includes(s)));
    } else {
      const newSelections = [...servicePreferences];
      groupItems.forEach(item => {
        if (!newSelections.includes(item)) {
          newSelections.push(item);
        }
      });
      setServicePreferences(newSelections);
    }
  };

  const selectEntireEntertainmentGroup = (groupItems: string[]) => {
    const allSelected = groupItems.every(item => entertainmentPreferences.includes(item));
    if (allSelected) {
      setEntertainmentPreferences(entertainmentPreferences.filter(e => !groupItems.includes(e)));
    } else {
      const newSelections = [...entertainmentPreferences];
      groupItems.forEach(item => {
        if (!newSelections.includes(item)) {
          newSelections.push(item);
        }
      });
      setEntertainmentPreferences(newSelections);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const profile = response.data;
      setFullName(profile.full_name || '');
      setLocation(profile.location || '');
      setBio(profile.bio || '');
      setProfilePhoto(profile.profile_photo);
      
      // Load entertainment preferences first
      const entertainment = profile.entertainment_preferences || [];
      setEntertainmentPreferences(entertainment);
      
      // Smart mapping: Auto-populate venue and service preferences based on entertainment
      const suggestedVenues = getVenuesFromEntertainment(entertainment);
      const suggestedServices = getServicesFromEntertainment(entertainment);
      
      // Merge saved preferences with smart suggestions (avoid duplicates)
      const venueSet = new Set([...(profile.venue_preferences || []), ...suggestedVenues]);
      const serviceSet = new Set([...(profile.service_preferences || []), ...suggestedServices]);
      
      setVenuePreferences(Array.from(venueSet));
      setServicePreferences(Array.from(serviceSet));
      
      console.log('📋 Loaded general public profile with smart mapping:', {
        entertainment: entertainment.length,
        venues_saved: (profile.venue_preferences || []).length,
        venues_suggested: suggestedVenues.length,
        venues_total: venueSet.size,
        services_saved: (profile.service_preferences || []).length,
        services_suggested: suggestedServices.length,
        services_total: serviceSet.size
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      if (Platform.OS === 'web') {
        alert('Error: Failed to load profile data');
      } else {
        Alert.alert('Error', 'Failed to load profile data');
      }
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to update your photo');
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
      setProfilePhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const removePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => setProfilePhoto(null)
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Required Field', 'Please enter your full name');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await axios.put(
        `${API_URL}/api/profile`,
        {
          full_name: fullName,
          location: location || null,
          bio: bio || null,
          profile_photo: profilePhoto,
          venue_preferences: venuePreferences,
          service_preferences: servicePreferences,
          entertainment_preferences: entertainmentPreferences,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('✅ General public profile saved:', {
        venues: venuePreferences.length,
        services: servicePreferences.length,
        entertainment: entertainmentPreferences.length
      });

      // Update user data in AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const updatedUser = { ...user, ...response.data };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }

      console.log('✅ Profile saved successfully');
      
      // Show success message
      if (Platform.OS === 'web') {
        alert('Success! Your profile has been updated.');
      } else {
        Alert.alert('Success', 'Profile updated successfully!');
      }
      
      // Navigate back after successful save
      router.back();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (Platform.OS === 'web') {
        alert('Error: ' + (error.response?.data?.detail || 'Failed to update profile'));
      } else {
        Alert.alert('Error', error.response?.data?.detail || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1565FF" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            disabled={saving}
            style={styles.saveButton}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Information Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('basic')}
          >
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <Ionicons 
              name={expandedSections.has('basic') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('basic') && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionDescription}>
                Your profile information helps others connect with you.
              </Text>

              {/* Profile Photo */}
              <View style={styles.photoSection}>
                <TouchableOpacity onPress={pickImage} style={styles.photoContainer}>
                  {profilePhoto ? (
                    <Image source={{ uri: profilePhoto }} style={styles.photo} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="person" size={50} color="#999" />
                    </View>
                  )}
                  <View style={styles.photoOverlay}>
                    <Ionicons name="camera" size={24} color="#fff" />
                  </View>
                </TouchableOpacity>
                {profilePhoto && (
                  <TouchableOpacity onPress={removePhoto} style={styles.removePhotoButton}>
                    <Text style={styles.removePhotoText}>Remove Photo</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Location */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="City, State"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Bio */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={300}
                />
                <Text style={styles.charCount}>{bio.length}/300</Text>
              </View>
            </View>
          )}

          {/* Venue Preferences Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('venues')}
          >
            <Text style={styles.sectionTitle}>Venue Preferences ({venuePreferences.length} selected)</Text>
            <Ionicons 
              name={expandedSections.has('venues') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('venues') && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionDescription}>
                Select the types of venues you're interested in visiting.
              </Text>

              {/* Venue Search */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search venues..."
                  value={venueSearch}
                  onChangeText={setVenueSearch}
                  autoCapitalize="none"
                />
                {venueSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setVenueSearch('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Grouped Venue Categories */}
              {GROUPED_VENUE_CATEGORIES.map((group) => {
                const filteredGroupItems = venueSearch.trim()
                  ? group.items.filter(item => item.toLowerCase().includes(venueSearch.toLowerCase()))
                  : group.items;
                
                if (filteredGroupItems.length === 0 && venueSearch.trim()) return null;
                
                const isGroupExpanded = expandedVenueGroups.has(group.name);
                const selectedInGroup = filteredGroupItems.filter(item => venuePreferences.includes(item)).length;
                const allGroupSelected = filteredGroupItems.length > 0 && filteredGroupItems.every(item => venuePreferences.includes(item));
                
                return (
                  <View key={group.name} style={styles.groupContainer}>
                    <TouchableOpacity 
                      style={styles.groupHeader}
                      onPress={() => toggleVenueGroup(group.name)}
                    >
                      <View style={styles.groupHeaderLeft}>
                        <Ionicons 
                          name={isGroupExpanded ? 'chevron-down' : 'chevron-forward'} 
                          size={20} 
                          color="#666" 
                        />
                        <Text style={styles.groupTitle}>{group.name}</Text>
                        {selectedInGroup > 0 && (
                          <View style={styles.selectionBadge}>
                            <Text style={styles.selectionBadgeText}>{selectedInGroup}</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          selectEntireVenueGroup(filteredGroupItems);
                        }}
                        style={styles.selectAllButton}
                      >
                        <Ionicons 
                          name={allGroupSelected ? 'checkbox' : 'square-outline'} 
                          size={22} 
                          color={allGroupSelected ? '#1565FF' : '#999'} 
                        />
                        <Text style={[styles.selectAllText, allGroupSelected && styles.selectAllTextActive]}>
                          {allGroupSelected ? 'Deselect' : 'Select All'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    
                    {isGroupExpanded && (
                      <View style={styles.groupItemsContainer}>
                        {filteredGroupItems.map((item) => (
                          <TouchableOpacity
                            key={item}
                            style={[styles.chip, venuePreferences.includes(item) && styles.chipSelected]}
                            onPress={() => toggleVenuePreference(item)}
                          >
                            <Text style={[styles.chipText, venuePreferences.includes(item) && styles.chipTextSelected]}>
                              {item}
                            </Text>
                            {venuePreferences.includes(item) && (
                              <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginLeft: 4 }} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Service Preferences Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('services')}
          >
            <Text style={styles.sectionTitle}>Service Preferences ({servicePreferences.length} selected)</Text>
            <Ionicons 
              name={expandedSections.has('services') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('services') && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionDescription}>
                Select the entrepreneur services you're interested in booking or connecting with.
              </Text>

              {/* Service Search */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search services..."
                  value={serviceSearch}
                  onChangeText={setServiceSearch}
                  autoCapitalize="none"
                />
                {serviceSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setServiceSearch('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Grouped Service Categories */}
              {GROUPED_SERVICE_CATEGORIES.map((group) => {
                const filteredGroupItems = serviceSearch.trim()
                  ? group.items.filter(item => item.toLowerCase().includes(serviceSearch.toLowerCase()))
                  : group.items;
                
                if (filteredGroupItems.length === 0 && serviceSearch.trim()) return null;
                
                const isGroupExpanded = expandedServiceGroups.has(group.name);
                const selectedInGroup = filteredGroupItems.filter(item => servicePreferences.includes(item)).length;
                const allGroupSelected = filteredGroupItems.length > 0 && filteredGroupItems.every(item => servicePreferences.includes(item));
                
                return (
                  <View key={group.name} style={styles.groupContainer}>
                    <TouchableOpacity 
                      style={styles.groupHeader}
                      onPress={() => toggleServiceGroup(group.name)}
                    >
                      <View style={styles.groupHeaderLeft}>
                        <Ionicons 
                          name={isGroupExpanded ? 'chevron-down' : 'chevron-forward'} 
                          size={20} 
                          color="#666" 
                        />
                        <Text style={styles.groupTitle}>{group.name}</Text>
                        {selectedInGroup > 0 && (
                          <View style={styles.selectionBadge}>
                            <Text style={styles.selectionBadgeText}>{selectedInGroup}</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          selectEntireServiceGroup(filteredGroupItems);
                        }}
                        style={styles.selectAllButton}
                      >
                        <Ionicons 
                          name={allGroupSelected ? 'checkbox' : 'square-outline'} 
                          size={22} 
                          color={allGroupSelected ? '#1565FF' : '#999'} 
                        />
                        <Text style={[styles.selectAllText, allGroupSelected && styles.selectAllTextActive]}>
                          {allGroupSelected ? 'Deselect' : 'Select All'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    
                    {isGroupExpanded && (
                      <View style={styles.groupItemsContainer}>
                        {filteredGroupItems.map((item) => (
                          <TouchableOpacity
                            key={item}
                            style={[styles.chip, servicePreferences.includes(item) && styles.chipSelected]}
                            onPress={() => toggleServicePreference(item)}
                          >
                            <Text style={[styles.chipText, servicePreferences.includes(item) && styles.chipTextSelected]}>
                              {item}
                            </Text>
                            {servicePreferences.includes(item) && (
                              <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginLeft: 4 }} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Entertainment Preferences Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('entertainment')}
          >
            <Text style={styles.sectionTitle}>Entertainment Preferences ({entertainmentPreferences.length} selected)</Text>
            <Ionicons 
              name={expandedSections.has('entertainment') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('entertainment') && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionDescription}>
                Select the types of entertainment and events you enjoy.
              </Text>

              {/* Entertainment Search */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search entertainment..."
                  value={entertainmentSearch}
                  onChangeText={setEntertainmentSearch}
                  autoCapitalize="none"
                />
                {entertainmentSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setEntertainmentSearch('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Grouped Entertainment Categories */}
              {GROUPED_ENTERTAINMENT_CATEGORIES.map((group) => {
                const filteredGroupItems = entertainmentSearch.trim()
                  ? group.items.filter(item => item.toLowerCase().includes(entertainmentSearch.toLowerCase()))
                  : group.items;
                
                if (filteredGroupItems.length === 0 && entertainmentSearch.trim()) return null;
                
                const isGroupExpanded = expandedEntertainmentGroups.has(group.name);
                const selectedInGroup = filteredGroupItems.filter(item => entertainmentPreferences.includes(item)).length;
                const allGroupSelected = filteredGroupItems.length > 0 && filteredGroupItems.every(item => entertainmentPreferences.includes(item));
                
                return (
                  <View key={group.name} style={styles.groupContainer}>
                    <TouchableOpacity 
                      style={styles.groupHeader}
                      onPress={() => toggleEntertainmentGroup(group.name)}
                    >
                      <View style={styles.groupHeaderLeft}>
                        <Ionicons 
                          name={isGroupExpanded ? 'chevron-down' : 'chevron-forward'} 
                          size={20} 
                          color="#666" 
                        />
                        <Text style={styles.groupTitle}>{group.name}</Text>
                        {selectedInGroup > 0 && (
                          <View style={styles.selectionBadge}>
                            <Text style={styles.selectionBadgeText}>{selectedInGroup}</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          selectEntireEntertainmentGroup(filteredGroupItems);
                        }}
                        style={styles.selectAllButton}
                      >
                        <Ionicons 
                          name={allGroupSelected ? 'checkbox' : 'square-outline'} 
                          size={22} 
                          color={allGroupSelected ? '#1565FF' : '#999'} 
                        />
                        <Text style={[styles.selectAllText, allGroupSelected && styles.selectAllTextActive]}>
                          {allGroupSelected ? 'Deselect' : 'Select All'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    
                    {isGroupExpanded && (
                      <View style={styles.groupItemsContainer}>
                        {filteredGroupItems.map((item) => (
                          <TouchableOpacity
                            key={item}
                            style={[styles.chip, entertainmentPreferences.includes(item) && styles.chipSelected]}
                            onPress={() => toggleEntertainmentPreference(item)}
                          >
                            <Text style={[styles.chipText, entertainmentPreferences.includes(item) && styles.chipTextSelected]}>
                              {item}
                            </Text>
                            {entertainmentPreferences.includes(item) && (
                              <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginLeft: 4 }} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565FF',
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sectionContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1565FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  removePhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  removePhotoText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  groupContainer: {
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  selectionBadge: {
    backgroundColor: '#1565FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectAllText: {
    fontSize: 13,
    color: '#999',
  },
  selectAllTextActive: {
    color: '#1565FF',
    fontWeight: '500',
  },
  groupItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipSelected: {
    backgroundColor: '#1565FF',
    borderColor: '#1565FF',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});
