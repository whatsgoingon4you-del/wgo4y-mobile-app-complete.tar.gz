import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UpgradeModal from '../../components/UpgradeModal';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

// Worker roles/categories
const WORKER_ROLES = [
  'All Roles',
  'DJ',
  'Photographer',
  'Videographer',
  'Security',
  'Caterer',
  'Event Planner',
  'Bartender',
  'Server',
  'Sound & Lighting',
  'Decorator',
  'MC/Host',
  'Performer',
  'Other'
];

// US States
const US_STATES = [
  'All States', 'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function WorkersDiscoveryScreen() {
  const router = useRouter();
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [selectedState, setSelectedState] = useState('All States');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [userType, setUserType] = useState('');
  const [membershipTier, setMembershipTier] = useState('basic');
  const [contactingWorkerId, setContactingWorkerId] = useState<string | null>(null);
  const [contactNote, setContactNote] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      checkAccessAndLoad();
    }, [])
  );

  // Reload workers when filters change (but not on initial load)
  React.useEffect(() => {
    // Only trigger if we've finished initial loading
    if (!loading && workers.length >= 0) {
      const reloadFiltered = async () => {
        try {
          const token = await AsyncStorage.getItem('auth_token');
          
          // Build query params - only include non-default filters
          const params: any = {};
          if (selectedRole !== 'All Roles') params.role = selectedRole;
          if (selectedState !== 'All States') params.state = selectedState;
          
          const response = await axios.get(`${API_URL}/api/workers`, {
            headers: { Authorization: `Bearer ${token}` },
            params
          });
          
          setWorkers(response.data);
          console.log(`✅ Filtered workers: ${response.data.length} results (role: ${selectedRole}, state: ${selectedState})`);
        } catch (error: any) {
          console.error('Error filtering workers:', error);
        }
      };
      
      reloadFiltered();
    }
  }, [selectedRole, selectedState]);

  const checkAccessAndLoad = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const user = response.data;
      setUserType(user.user_type);
      
      const tier = user.membership_tier?.toLowerCase() || 'basic';
      setMembershipTier(tier);
      
      // Check if user has premium tier and is business/entrepreneur
      const hasPremiumTier = ['appreciation', 'networking', 'gold', 'silver'].includes(tier);
      const canAccess = user.user_type === 'business' || user.user_type === 'entrepreneur';
      
      if (!canAccess) {
        // General Public users - show error and go back
        setShowUpgradeModal(true);
        setLoading(false);
        return;
      }
      
      if (!hasPremiumTier && !user.is_admin) {
        // Basic tier - show upgrade modal
        setShowUpgradeModal(true);
        setLoading(false);
        return;
      }
      
      // Load workers
      await loadWorkers();
    } catch (error) {
      console.error('Error checking access:', error);
      setLoading(false);
    }
  };

  const loadWorkers = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Build query params
      const params: any = {};
      if (selectedRole !== 'All Roles') params.role = selectedRole;
      if (selectedState !== 'All States') params.state = selectedState;
      
      const response = await axios.get(`${API_URL}/api/workers`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      setWorkers(response.data);
      console.log(`✅ Loaded ${response.data.length} workers`);
    } catch (error: any) {
      console.error('Error loading workers:', error);
      if (error.response?.status === 403) {
        setShowUpgradeModal(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkers();
  };

  const handleApplyFilters = () => {
    setLoading(true);
    loadWorkers();
  };

  const handleRequestContact = async (workerId: string) => {
    setContactingWorkerId(workerId);
  };

  const handleSendContactRequest = async () => {
    if (!contactingWorkerId) return;
    
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.post(
        `${API_URL}/api/workers/${contactingWorkerId}/contact`,
        { message: contactNote.trim() || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Contact request sent! The worker will be notified.');
      setContactingWorkerId(null);
      setContactNote('');
    } catch (error: any) {
      console.error('Error sending contact request:', error);
      if (error.response?.status === 403) {
        setShowUpgradeModal(true);
      } else {
        alert(error.response?.data?.detail || 'Failed to send contact request');
      }
    }
  };

  const filteredWorkers = workers.filter(worker => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      worker.user_name?.toLowerCase().includes(query) ||
      worker.role?.toLowerCase().includes(query) ||
      worker.stage_name?.toLowerCase().includes(query)
    );
  });

  const renderWorkerCard = ({ item }: { item: any }) => (
    <View style={styles.workerCard}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={() => router.push(`/workers/${item.id}`)}
      >
        {/* Profile Photo */}
        <View style={styles.photoContainer}>
          {item.profile_photo ? (
            <Image source={{ uri: item.profile_photo }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Ionicons name="person" size={32} color="#999" />
            </View>
          )}
        </View>

        {/* Worker Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.workerName}>
            {item.stage_name || item.user_name}
          </Text>
          <Text style={styles.workerRole}>{item.role}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.locationText}>
              {item.city}, {item.state}
            </Text>
          </View>
          {item.tagline && (
            <Text style={styles.tagline} numberOfLines={2}>
              {item.tagline}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Request Contact Button */}
      <TouchableOpacity
        style={styles.contactButton}
        onPress={() => handleRequestContact(item.id)}
      >
        <Ionicons name="mail-outline" size={18} color="#1565FF" />
        <Text style={styles.contactButtonText}>Request Contact</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="briefcase-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No workers found</Text>
      <Text style={styles.emptySubtext}>
        Try adjusting your filters or search criteria
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find Workers</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
          <Text style={styles.loadingText}>Loading workers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Workers</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or role..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowRoleModal(true)}
        >
          <Ionicons name="briefcase-outline" size={18} color="#1565FF" />
          <Text style={styles.filterButtonText}>
            {selectedRole === 'All Roles' ? 'Role' : selectedRole}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#1565FF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowStateModal(true)}
        >
          <Ionicons name="location-outline" size={18} color="#1565FF" />
          <Text style={styles.filterButtonText}>
            {selectedState === 'All States' ? 'State' : selectedState}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#1565FF" />
        </TouchableOpacity>

        {(selectedRole !== 'All Roles' || selectedState !== 'All States') && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSelectedRole('All Roles');
              setSelectedState('All States');
            }}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Workers List */}
      <FlatList
        data={filteredWorkers}
        renderItem={renderWorkerCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filteredWorkers.length === 0 ? styles.emptyListContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={renderEmptyState}
      />

      {/* Role Filter Modal */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Role</Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={WORKER_ROLES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    item === selectedRole && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    setSelectedRole(item);
                    setShowRoleModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    item === selectedRole && styles.modalItemTextSelected
                  ]}>
                    {item}
                  </Text>
                  {item === selectedRole && (
                    <Ionicons name="checkmark" size={20} color="#1565FF" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* State Filter Modal */}
      <Modal
        visible={showStateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStateModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={US_STATES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    item === selectedState && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    setSelectedState(item);
                    setShowStateModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    item === selectedState && styles.modalItemTextSelected
                  ]}>
                    {item}
                  </Text>
                  {item === selectedState && (
                    <Ionicons name="checkmark" size={20} color="#1565FF" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Contact Request Modal */}
      <Modal
        visible={contactingWorkerId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setContactingWorkerId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Contact</Text>
              <TouchableOpacity onPress={() => setContactingWorkerId(null)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Add an optional note to introduce yourself and your event needs:
            </Text>
            
            <TextInput
              style={styles.noteInput}
              placeholder="e.g., Looking for a DJ for a corporate event in March..."
              value={contactNote}
              onChangeText={setContactNote}
              multiline
              numberOfLines={4}
              maxLength={500}
              placeholderTextColor="#999"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setContactingWorkerId(null);
                  setContactNote('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendContactRequest}
              >
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.sendButtonText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          router.back();
        }}
        userType={userType}
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1565FF',
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#1565FF',
    fontWeight: '600',
  },
  clearButton: {
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  photoContainer: {
    marginRight: 12,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  photoPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  workerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  workerRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565FF',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
  },
  tagline: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F7FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1565FF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemSelected: {
    backgroundColor: '#F0F7FF',
  },
  modalItemText: {
    fontSize: 16,
    color: '#000',
  },
  modalItemTextSelected: {
    color: '#1565FF',
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    padding: 20,
    paddingBottom: 12,
  },
  noteInput: {
    backgroundColor: '#f5f5f5',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565FF',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
