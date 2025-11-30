import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function PlacesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Category data from backend
  const [venueTypes, setVenueTypes] = useState<any[]>([]);
  const [useCaseTags, setUseCaseTags] = useState<any[]>([]);
  const [usStates, setUsStates] = useState<any[]>([]);
  const [quickFilters, setQuickFilters] = useState<any[]>([]);
  
  // Active filters
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string | null>(null);
  const [selectedVenueType, setSelectedVenueType] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCategoryData();
    // Load all venues immediately on mount (no filters = all venues)
    console.log('🏢 Places: Component mounted, loading all venues');
    loadVenues();
  }, []);

  // Reload venues when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('👁️ Places: Screen focused, reloading venues');
      loadVenues();
    }, [])
  );

  // Reload venues when any filter changes
  useEffect(() => {
    // Only run if we have at least one active filter
    const hasActiveFilter = selectedQuickFilter || selectedVenueType || selectedState || 
                           selectedCity || selectedUseCase;
    
    if (hasActiveFilter) {
      console.log('🔄 Places: Filter changed, reloading venues');
      loadVenues();
    }
  }, [
    selectedQuickFilter,
    selectedVenueType,
    selectedState,
    selectedCity,
    selectedUseCase
  ]);

  const loadCategoryData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/venue-types`);
      setVenueTypes(response.data.venue_types || []);
      setUseCaseTags(response.data.use_cases || []);
      setUsStates(response.data.states || []);
      setQuickFilters(response.data.quick_filters || []);
      console.log('✅ Places: Loaded venue types and use cases');
    } catch (error) {
      console.error('Error loading venue types:', error);
    }
  };

  const loadVenues = async () => {
    console.log('🔄 Places: Loading venues with filters:', {
      selectedVenueType,
      selectedState,
      selectedCity,
      selectedUseCase
    });
    
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Build query parameters
      const params: any = {};
      
      if (selectedVenueType) {
        params.venue_type = selectedVenueType;
      }
      
      if (selectedState) {
        params.state = selectedState;
      }
      
      if (selectedCity && selectedCity.trim()) {
        params.city = selectedCity.trim();
      }
      
      if (selectedUseCase) {
        params.use_case = selectedUseCase;
      }
      
      console.log('🔄 Places: API call params:', params);
      
      const response = await axios.get(`${API_URL}/api/places`, {
        headers,
        params
      });
      
      console.log(`✅ Places: Loaded ${response.data.length} venues`);
      setVenues(response.data);
    } catch (error) {
      console.error('❌ Places: Error loading venues:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleQuickFilter = (filterId: string) => {
    // Reset all filters
    setSelectedVenueType(null);
    setSelectedState(null);
    setSelectedCity('');
    setSelectedUseCase(null);
    setSelectedQuickFilter(null);
    
    const filter = quickFilters.find(f => f.id === filterId);
    if (!filter) return;
    
    // Apply the quick filter logic
    if (filter.use_case_id) {
      setSelectedUseCase(filter.use_case_id);
    }
    
    setSelectedQuickFilter(filterId);
  };

  const clearAllFilters = () => {
    setSelectedQuickFilter(null);
    setSelectedVenueType(null);
    setSelectedState(null);
    setSelectedCity('');
    setSelectedUseCase(null);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedVenueType) count++;
    if (selectedState) count++;
    if (selectedCity) count++;
    if (selectedUseCase) count++;
    return count;
  };

  const getVenueTypeName = (typeId: string) => {
    const vtype = venueTypes.find(v => v.id === typeId);
    return vtype ? vtype.name : typeId;
  };

  const getUseCaseName = (useCaseId: string) => {
    const useCase = useCaseTags.find(u => u.id === useCaseId);
    return useCase ? useCase.name : useCaseId;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVenues();
  };

  const renderVenue = ({ item }: { item: any }) => {
    const useCaseNames = item.use_cases?.map((useCaseId: string) => 
      getUseCaseName(useCaseId)
    ) || [];
    
    return (
      <TouchableOpacity
        style={styles.venueCard}
        onPress={() => router.push(`/profile/${item.id}`)}
      >
        {item.business_logo ? (
          <Image source={{ uri: item.business_logo }} style={styles.venueLogo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Ionicons name="business" size={32} color="#ccc" />
          </View>
        )}
        
        <View style={styles.venueInfo}>
          <Text style={styles.venueName} numberOfLines={1}>
            {item.business_name}
          </Text>
          
          {/* Venue Type */}
          {item.venue_type && (
            <View style={styles.venueMeta}>
              <Text style={styles.venueType}>
                {getVenueTypeName(item.venue_type)}
              </Text>
            </View>
          )}
          
          {/* Location */}
          {(item.city || item.state) && (
            <View style={styles.venueMeta}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.venueMetaText} numberOfLines={1}>
                {item.city && item.state 
                  ? `${item.city}, ${item.state}`
                  : item.city || item.state}
              </Text>
            </View>
          )}
          
          {/* Use Case Badges */}
          {useCaseNames.length > 0 && (
            <View style={styles.useCaseBadges}>
              {useCaseNames.slice(0, 3).map((name: string, idx: number) => (
                <View key={idx} style={styles.useCaseBadge}>
                  <Text style={styles.useCaseBadgeText} numberOfLines={1}>{name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  const renderFiltersModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowFilters(false)}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filters</Text>
          <TouchableOpacity onPress={clearAllFilters}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Venue Type Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Venue Type</Text>
            <View style={styles.filterOptions}>
              {venueTypes.map(vtype => (
                <TouchableOpacity
                  key={vtype.id}
                  style={[
                    styles.filterChip,
                    selectedVenueType === vtype.id && styles.filterChipActive
                  ]}
                  onPress={() => setSelectedVenueType(selectedVenueType === vtype.id ? null : vtype.id)}
                >
                  <Text style={styles.filterChipEmoji}>{vtype.icon}</Text>
                  <Text style={[
                    styles.filterChipText,
                    selectedVenueType === vtype.id && styles.filterChipTextActive
                  ]}>
                    {vtype.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Use Cases Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Use Cases</Text>
            <View style={styles.filterOptions}>
              {useCaseTags.map(useCase => (
                <TouchableOpacity
                  key={useCase.id}
                  style={[
                    styles.filterChip,
                    selectedUseCase === useCase.id && styles.filterChipActive
                  ]}
                  onPress={() => setSelectedUseCase(selectedUseCase === useCase.id ? null : useCase.id)}
                >
                  <Text style={styles.filterChipEmoji}>{useCase.icon}</Text>
                  <Text style={[
                    styles.filterChipText,
                    selectedUseCase === useCase.id && styles.filterChipTextActive
                  ]}>
                    {useCase.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* State Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>State</Text>
            <View style={styles.filterOptions}>
              {usStates.map(state => (
                <TouchableOpacity
                  key={state.id}
                  style={[
                    styles.filterChip,
                    selectedState === state.id && styles.filterChipActive
                  ]}
                  onPress={() => setSelectedState(selectedState === state.id ? null : state.id)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedState === state.id && styles.filterChipTextActive
                  ]}>
                    {state.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* City Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>City</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter city name..."
              value={selectedCity}
              onChangeText={setSelectedCity}
              placeholderTextColor="#999"
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.applyButtonText}>
              Show {venues.length} Venue{venues.length !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Places</Text>
        <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color="#000" />
          {getActiveFilterCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Filters */}
      {quickFilters.length > 0 && (
        <View style={styles.quickFiltersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickFiltersContent}
          >
            {quickFilters.map(filter => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.quickFilterChip,
                  selectedQuickFilter === filter.id && styles.quickFilterChipActive
                ]}
                onPress={() => {
                  if (selectedQuickFilter === filter.id) {
                    setSelectedQuickFilter(null);
                    clearAllFilters();
                  } else {
                    handleQuickFilter(filter.id);
                  }
                }}
              >
                <Text style={[
                  styles.quickFilterText,
                  selectedQuickFilter === filter.id && styles.quickFilterTextActive
                ]}>
                  {filter.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Venue List */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <Text>Loading...</Text>
        </View>
      ) : venues.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No venues found</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your filters or check back soon for new venues
          </Text>
          {getActiveFilterCount() > 0 && (
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearAllFilters}>
              <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={venues}
          renderItem={renderVenue}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {renderFiltersModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#1565FF',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  quickFiltersContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  quickFiltersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  quickFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  quickFilterChipActive: {
    backgroundColor: '#1565FF',
  },
  quickFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  quickFilterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  venueCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  venueLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    marginRight: 16,
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  venueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  venueType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565FF',
  },
  venueMetaText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  useCaseBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  useCaseBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  useCaseBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1565FF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1565FF',
    borderRadius: 8,
  },
  clearFiltersButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  clearText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565FF',
  },
  modalContent: {
    flex: 1,
  },
  filterSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#1565FF',
    borderColor: '#1565FF',
  },
  filterChipEmoji: {
    fontSize: 16,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  applyButton: {
    backgroundColor: '#1565FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
