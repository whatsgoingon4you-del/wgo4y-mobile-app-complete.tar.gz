import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

const DISCOUNT_TYPE_LABELS: any = {
  amount_off: '$ Off',
  percent_off: '% Off',
  bogo: 'BOGO',
  free_item: 'Free Item',
  other: 'Special'
};

export default function CouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userType, setUserType] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedDiscountType, setSelectedDiscountType] = useState<string | null>(null);
  const [selectedOwnerType, setSelectedOwnerType] = useState<string | null>(null);

  useEffect(() => {
    loadUserType();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      console.log('🎫 Coupons: Screen focused, reloading');
      // Reload based on user type
      if (userType === 'business' || userType === 'entrepreneur') {
        loadCoupons(userId);
      } else {
        loadCoupons();
      }
    }, [userType, userId])
  );

  const loadUserType = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;
      
      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUserType(response.data.user_type);
      setUserId(response.data.id);
      
      // Load coupons based on user type
      if (response.data.user_type === 'business' || response.data.user_type === 'entrepreneur') {
        console.log('👔 Loading owner coupons for:', response.data.user_type);
        loadCoupons(response.data.id); // Pass user ID to filter by owner
      } else {
        console.log('👥 Loading all public coupons for GP user');
        loadCoupons(); // No filter = all coupons
      }
    } catch (error) {
      console.error('Error loading user type:', error);
    }
  };

  const loadCoupons = async (ownerId?: string) => {
    console.log('🔄 Coupons: Loading with filters:', {
      ownerId,
      selectedState,
      selectedCity,
      selectedDiscountType,
      selectedOwnerType
    });
    
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Build query parameters
      const params: any = {};
      
      // If ownerId provided, filter by owner (for business/entrepreneur view)
      if (ownerId) {
        params.owner_id = ownerId;
      }
      
      if (selectedState) {
        params.state = selectedState;
      }
      
      if (selectedCity && selectedCity.trim()) {
        params.city = selectedCity.trim();
      }
      
      if (selectedDiscountType) {
        params.discount_type = selectedDiscountType;
      }
      
      if (selectedOwnerType) {
        params.owner_type = selectedOwnerType;
      }
      
      const response = await axios.get(`${API_URL}/api/coupons`, {
        headers,
        params
      });
      
      console.log(`✅ Coupons: Loaded ${response.data.length} coupons`);
      setCoupons(response.data);
    } catch (error) {
      console.error('Error loading coupons:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const clearAllFilters = () => {
    setSelectedState(null);
    setSelectedCity('');
    setSelectedDiscountType(null);
    setSelectedOwnerType(null);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedState) count++;
    if (selectedCity) count++;
    if (selectedDiscountType) count++;
    if (selectedOwnerType) count++;
    return count;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCoupons();
  };

  const getDiscountDisplay = (type: string, value: number) => {
    switch (type) {
      case 'amount_off':
        return `$${value} Off`;
      case 'percent_off':
        return `${value}% Off`;
      case 'bogo':
        return 'Buy 1 Get 1';
      case 'free_item':
        return 'Free Item';
      default:
        return 'Special Offer';
    }
  };

  const renderCoupon = ({ item }: { item: any }) => {
    const hasUsed = item.user_redemption_count > 0;
    const limitReached = item.user_redemption_count >= item.usage_limit_per_user;
    
    return (
      <TouchableOpacity
        style={styles.couponCard}
        onPress={() => router.push(`/coupon/${item.id}`)}
      >
        <View style={styles.couponHeader}>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {getDiscountDisplay(item.discount_type, item.discount_value)}
            </Text>
            <Text style={styles.discountType}>
              {DISCOUNT_TYPE_LABELS[item.discount_type] || item.discount_type}
            </Text>
          </View>
          
          {hasUsed && (
            <View style={[styles.usedBadge, limitReached && styles.limitReachedBadge]}>
              <Ionicons name="checkmark-circle" size={14} color="#fff" />
              <Text style={styles.usedBadgeText}>
                Used {item.user_redemption_count}/{item.usage_limit_per_user}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.couponTitle} numberOfLines={2}>
          {item.title}
        </Text>
        
        {/* Owner */}
        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={16} color="#666" />
          <Text style={styles.metaText} numberOfLines={1}>
            {item.owner_name}
          </Text>
        </View>
        
        {/* Location */}
        {(item.owner_city || item.owner_state) && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.metaText}>
              {item.owner_city && item.owner_state
                ? `${item.owner_city}, ${item.owner_state}`
                : item.owner_city || item.owner_state}
            </Text>
          </View>
        )}
        
        {/* Valid Until */}
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.metaText}>
            Valid until {new Date(item.valid_until).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.couponFooter}>
          <Text style={styles.codeText}>
            {item.code || 'No code'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
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
          {/* Discount Type */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Discount Type</Text>
            <View style={styles.filterOptions}>
              {Object.entries(DISCOUNT_TYPE_LABELS).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.filterChip,
                    selectedDiscountType === key && styles.filterChipActive
                  ]}
                  onPress={() => setSelectedDiscountType(selectedDiscountType === key ? null : key)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedDiscountType === key && styles.filterChipTextActive
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Owner Type */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Offered By</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedOwnerType === 'business' && styles.filterChipActive
                ]}
                onPress={() => setSelectedOwnerType(selectedOwnerType === 'business' ? null : 'business')}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedOwnerType === 'business' && styles.filterChipTextActive
                ]}>
                  Venues
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedOwnerType === 'entrepreneur' && styles.filterChipActive
                ]}
                onPress={() => setSelectedOwnerType(selectedOwnerType === 'entrepreneur' ? null : 'entrepreneur')}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedOwnerType === 'entrepreneur' && styles.filterChipTextActive
                ]}>
                  Entrepreneurs
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* City */}
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
            onPress={() => {
              setShowFilters(false);
              loadCoupons();
            }}
          >
            <Text style={styles.applyButtonText}>
              Show {coupons.length} Coupon{coupons.length !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="pricetag-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No coupons available</Text>
      <Text style={styles.emptySubtext}>
        Check back soon for deals from local venues and services!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {(userType === 'business' || userType === 'entrepreneur') ? 'My Coupons' : 'Coupons'}
        </Text>
        {(userType === 'business' || userType === 'entrepreneur') ? (
          <TouchableOpacity onPress={() => router.push('/coupons/create')} style={styles.createButton}>
            <Ionicons name="add-circle" size={28} color="#4CAF50" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterButton}>
            <Ionicons name="options-outline" size={24} color="#000" />
            {getActiveFilterCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={coupons}
          renderItem={renderCoupon}
          keyExtractor={(item) => item.id}
          contentContainerStyle={coupons.length === 0 ? styles.emptyListContainer : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={renderEmptyState}
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
  createButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  listContent: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  discountBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  discountType: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  usedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  limitReachedBadge: {
    backgroundColor: '#999',
  },
  usedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  couponTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  couponFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  codeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1565FF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#1565FF',
    borderColor: '#1565FF',
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
