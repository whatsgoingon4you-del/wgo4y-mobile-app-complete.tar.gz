import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UpgradeModal from '../../components/UpgradeModal';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ConsultingScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userType, setUserType] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [membershipTier, setMembershipTier] = useState('basic');

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
      loadRequests();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIsAdmin(response.data.is_admin || false);
      setUserType(response.data.user_type);
      
      // Check membership tier
      const tier = response.data.membership_tier?.toLowerCase() || 'basic';
      setMembershipTier(tier);
      
      // Show upgrade modal for Basic tier users (not admins)
      const hasPremiumTier = ['appreciation', 'networking', 'gold', 'silver'].includes(tier);
      if (!hasPremiumTier && !response.data.is_admin) {
        setShowUpgradeModal(true);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadRequests = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/consulting/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setRequests(response.data);
      console.log(`✅ Loaded ${response.data.length} consulting requests`);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const handleNewRequest = () => {
    const hasPremiumTier = ['appreciation', 'networking', 'gold', 'silver'].includes(membershipTier);
    if (hasPremiumTier) {
      router.push('/consultant/request');
    } else {
      setShowUpgradeModal(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return '#FF9800';
      case 'in_progress': return '#2196F3';
      case 'completed': return '#4CAF50';
      default: return '#999';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return 'alert-circle';
      case 'in_progress': return 'time';
      case 'completed': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const renderRequest = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => router.push(`/consultant/${item.id}`)}
    >
      <View style={styles.requestHeader}>
        <View style={styles.statusBadge} style={{ backgroundColor: getStatusColor(item.status) + '20' }}>
          <Ionicons name={getStatusIcon(item.status)} size={16} color={getStatusColor(item.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      {isAdmin && (
        <Text style={styles.ownerName}>{item.owner_name}</Text>
      )}

      <View style={styles.topicsContainer}>
        {item.topics.slice(0, 3).map((topic: string, idx: number) => (
          <View key={idx} style={styles.topicChip}>
            <Text style={styles.topicText}>{topic}</Text>
          </View>
        ))}
        {item.topics.length > 3 && (
          <Text style={styles.moreTopics}>+{item.topics.length - 3} more</Text>
        )}
      </View>

      {isAdmin && item.owner_city && item.owner_state && (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.locationText}>
            {item.owner_city}, {item.owner_state}
          </Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.footerText}>
          {item.notes ? item.notes.substring(0, 60) + '...' : 'No additional notes'}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>
        {isAdmin ? 'No consulting requests yet' : 'No consulting requests'}
      </Text>
      <Text style={styles.emptySubtext}>
        {isAdmin 
          ? 'Requests from businesses and entrepreneurs will appear here'
          : 'Request a consulting session to get personalized guidance'}
      </Text>
      {!isAdmin && (
        <TouchableOpacity
          style={styles.requestButton}
          onPress={handleNewRequest}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.requestButtonText}>Request Consulting Session</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isAdmin ? 'Consulting Requests' : 'My Consulting Requests'}
        </Text>
        {!isAdmin && (
          <TouchableOpacity onPress={handleNewRequest} style={styles.addButton}>
            <Ionicons name="add-circle" size={28} color="#1565FF" />
          </TouchableOpacity>
        )}
        {isAdmin && <View style={{ width: 40 }} />}
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={requests.length === 0 ? styles.emptyListContainer : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={renderEmptyState}
        />
      )}
      
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
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
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestCard: {
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
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 13,
    color: '#999',
  },
  ownerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  topicChip: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  topicText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1565FF',
  },
  moreTopics: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    marginRight: 8,
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
    lineHeight: 20,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
