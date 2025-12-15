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
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

export default function EventsPage() {
  const router = useRouter();
  const { category } = useLocalSearchParams();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Category data from backend
  const [eventCategories, setEventCategories] = useState<any[]>([]);
  const [usStates, setUsStates] = useState<any[]>([]);
  const [quickFilters, setQuickFilters] = useState<any[]>([]);
  
  // Active filters
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedPriceType, setSelectedPriceType] = useState<string | null>(null);
  const [selectedFamilyFriendly, setSelectedFamilyFriendly] = useState<boolean | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<string | null>(null);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCategoryData();
    // Load all events immediately on mount (no filters = all upcoming events)
    console.log('🎬 Events: Component mounted, loading all upcoming events');
    loadEvents();
  }, []);

  // Reload events when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('👁️ Events: Screen focused, reloading events');
      loadEvents();
    }, [])
  );

  // Reload events when any filter changes
  useEffect(() => {
    // Only run if we have at least one active filter (skip initial mount)
    const hasActiveFilter = selectedQuickFilter || selectedCategory || selectedState || 
                           selectedCity || selectedPriceType || selectedFamilyFriendly !== null || 
                           selectedDateRange;
    
    if (hasActiveFilter) {
      console.log('🔄 Events: Filter changed, reloading events');
      loadEvents();
    }
  }, [
    selectedQuickFilter,
    selectedCategory,
    selectedState,
    selectedCity,
    selectedPriceType,
    selectedFamilyFriendly,
    selectedDateRange
  ]);

  const loadCategoryData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/event-categories`);
      setEventCategories(response.data.categories || []);
      setUsStates(response.data.states || []);
      setQuickFilters(response.data.quick_filters || []);
    } catch (error) {
      console.error('Error loading category data:', error);
    }
  };

  const loadEvents = async () => {
    console.log('🔄 Events: Loading events with filters:', {
      category,
      selectedCategory,
      selectedState,
      selectedCity,
      selectedPriceType,
      selectedFamilyFriendly,
      selectedDateRange
    });
    
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Build query parameters
      const params: any = {};
      
      // Old category filter (backward compatibility)
      if (category) {
        params.category = category;
      }
      
      // New filters
      if (selectedCategory) {
        params.event_category = selectedCategory;
      }
      
      if (selectedState) {
        params.state = selectedState;
      }
      
      if (selectedCity && selectedCity.trim()) {
        params.city = selectedCity.trim();
      }
      
      if (selectedPriceType) {
        params.price_type = selectedPriceType;
      }
      
      if (selectedFamilyFriendly !== null) {
        params.family_friendly = selectedFamilyFriendly;
      }
      
      if (selectedDateRange) {
        params.date_range = selectedDateRange;
      }
      
      console.log('🔄 Events: API call params:', params);
      
      const response = await axios.get(`${API_URL}/api/events`, {
        headers,
        params
      });
      
      console.log(`✅ Events: Loaded ${response.data.length} events`);
      setEvents(response.data);
    } catch (error) {
      console.error('❌ Events: Error loading events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleQuickFilter = (filterId: string) => {
    // Reset all filters
    setSelectedCategory(null);
    setSelectedState(null);
    setSelectedCity('');
    setSelectedPriceType(null);
    setSelectedFamilyFriendly(null);
    setSelectedDateRange(null);
    setSelectedQuickFilter(null);
    
    const filter = quickFilters.find(f => f.id === filterId);
    if (!filter) return;
    
    // Apply the quick filter logic
    if (filter.category_id) {
      setSelectedCategory(filter.category_id);
    }
    
    if (filter.price_type) {
      setSelectedPriceType(filter.price_type);
    }
    
    if (filterId === 'tonight') {
      setSelectedDateRange('tonight');
    } else if (filterId === 'this_weekend') {
      setSelectedDateRange('this_weekend');
    }
    
    setSelectedQuickFilter(filterId);
  };

  const clearAllFilters = () => {
    setSelectedQuickFilter(null);
    setSelectedCategory(null);
    setSelectedState(null);
    setSelectedCity('');
    setSelectedPriceType(null);
    setSelectedFamilyFriendly(null);
    setSelectedDateRange(null);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedCategory) count++;
    if (selectedState) count++;
    if (selectedCity) count++;
    if (selectedPriceType) count++;
    if (selectedFamilyFriendly !== null) count++;
    if (selectedDateRange) count++;
    return count;
  };

  const getCategoryName = (categoryId: string) => {
    const cat = eventCategories.find(c => c.id === categoryId);
    return cat ? cat.name : categoryId;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
  };

  const renderEvent = ({ item }: { item: any }) => {
    // Get category names for display
    const categoryNames = item.event_categories?.map((catId: string) => 
      getCategoryName(catId)
    ) || [];
    
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => router.push(`/event/${item.id}`)}
      >
        <Image source={{ uri: item.image }} style={styles.eventImage} />
        
        {/* Family-friendly badge */}
        {item.family_friendly && (
          <View style={styles.familyBadge}>
            <Ionicons name="people" size={14} color="#fff" />
            <Text style={styles.familyBadgeText}>Family</Text>
          </View>
        )}
        
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.title}
          </Text>
          
          {/* Location */}
          <View style={styles.eventMeta}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.eventMetaText} numberOfLines={1}>
              {item.city && item.state 
                ? `${item.city}, ${item.state}`
                : item.venue}
            </Text>
          </View>
          
          {/* Date */}
          <View style={styles.eventMeta}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.eventMetaText}>
              {new Date(item.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </Text>
          </View>
          
          <View style={styles.eventFooter}>
            <Text style={[styles.eventPrice, item.price === 0 && styles.freePrice]}>
              {item.price === 0 ? 'FREE' : `$${item.price}`}
            </Text>
            
            {/* Category badges */}
            {categoryNames.length > 0 && (
              <View style={styles.categoryBadges}>
                {categoryNames.slice(0, 2).map((name: string, idx: number) => (
                  <View key={idx} style={styles.categoryBadge}>
                    <Text style={styles.categoryText} numberOfLines={1}>{name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
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
          {/* Category Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Category</Text>
            <View style={styles.filterOptions}>
              {eventCategories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.filterChip,
                    selectedCategory === cat.id && styles.filterChipActive
                  ]}
                  onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                >
                  <Text style={styles.filterChipEmoji}>{cat.icon}</Text>
                  <Text style={[
                    styles.filterChipText,
                    selectedCategory === cat.id && styles.filterChipTextActive
                  ]}>
                    {cat.name}
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

          {/* Date Range */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>When</Text>
            <View style={styles.filterOptions}>
              {[
                { id: 'tonight', name: 'Tonight' },
                { id: 'this_weekend', name: 'This Weekend' },
                { id: 'this_week', name: 'This Week' },
                { id: 'next_30_days', name: 'Next 30 Days' }
              ].map(range => (
                <TouchableOpacity
                  key={range.id}
                  style={[
                    styles.filterChip,
                    selectedDateRange === range.id && styles.filterChipActive
                  ]}
                  onPress={() => setSelectedDateRange(selectedDateRange === range.id ? null : range.id)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedDateRange === range.id && styles.filterChipTextActive
                  ]}>
                    {range.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Type */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Price</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedPriceType === 'free' && styles.filterChipActive
                ]}
                onPress={() => setSelectedPriceType(selectedPriceType === 'free' ? null : 'free')}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedPriceType === 'free' && styles.filterChipTextActive
                ]}>
                  Free Events
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedPriceType === 'paid' && styles.filterChipActive
                ]}
                onPress={() => setSelectedPriceType(selectedPriceType === 'paid' ? null : 'paid')}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedPriceType === 'paid' && styles.filterChipTextActive
                ]}>
                  Paid Events
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Family-Friendly */}
          <View style={styles.filterSection}>
            <TouchableOpacity
              style={styles.toggleFilter}
              onPress={() => setSelectedFamilyFriendly(selectedFamilyFriendly ? null : true)}
            >
              <View style={styles.toggleInfo}>
                <Ionicons name="people" size={20} color="#666" />
                <Text style={styles.toggleLabel}>Family-Friendly Events Only</Text>
              </View>
              <View style={[
                styles.toggle,
                selectedFamilyFriendly && styles.toggleActive
              ]}>
                {selectedFamilyFriendly && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.applyButtonText}>
              Show {events.length} Event{events.length !== 1 ? 's' : ''}
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
        <Text style={styles.headerTitle}>Experiences</Text>
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

      {/* Event List */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <Text>Loading...</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No events found</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your filters or check back soon for new events
          </Text>
          {getActiveFilterCount() > 0 && (
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearAllFilters}>
              <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
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
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f0f0f0',
  },
  familyBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  familyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  eventInfo: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eventMetaText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  eventPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1565FF',
  },
  freePrice: {
    color: '#4CAF50',
  },
  categoryBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    maxWidth: 120,
  },
  categoryText: {
    fontSize: 12,
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
  toggleFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#1565FF',
    borderColor: '#1565FF',
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