import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface ManagedEventRequest {
  id: string;
  business_name: string;
  business_contact: string;
  event_name: string;
  event_type: string;
  event_date: string;
  location: {
    city: string;
    state: string;
  };
  budget: string;
  status: string;
  worker_count: number;
  created_at: string;
  updated_at: string;
}

export default function AdminManagedEventsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<ManagedEventRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ManagedEventRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadManagedEvents();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [statusFilter, requests]);

  const loadManagedEvents = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      console.log('📋 Loading managed event requests...');
      const response = await axios.get(`${API_URL}/api/admin/managed-events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Loaded managed events:', response.data.requests.length);
      setRequests(response.data.requests);
    } catch (error: any) {
      console.error('❌ Error loading managed events:', error);
      if (error.response?.status === 403) {
        if (Platform.OS === 'web') {
          alert('Access Denied: Admin permissions required.');
        } else {
          Alert.alert('Access Denied', 'Admin permissions required.');
        }
        router.back();
      } else {
        if (Platform.OS === 'web') {
          alert('Error: Failed to load managed events');
        } else {
          Alert.alert('Error', 'Failed to load managed events');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    if (statusFilter === 'all') {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(r => r.status === statusFilter));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadManagedEvents();
    setRefreshing(false);
  };

  const handleViewEvent = (eventId: string) => {
    router.push(`/admin/managed-events/${eventId}`);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: '#FFA500',
      reviewing: '#2196F3',
      assigning: '#9C27B0',
      confirmed: '#4CAF50',
      in_progress: '#FF6B35',
      completed: '#607D8B',
      cancelled: '#F44336',
    };
    return colors[status] || '#999';
  };

  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: string } = {
      pending: 'time-outline',
      reviewing: 'eye-outline',
      assigning: 'people-outline',
      confirmed: 'checkmark-circle-outline',
      in_progress: 'play-circle-outline',
      completed: 'checkmark-done-outline',
      cancelled: 'close-circle-outline',
    };
    return icons[status] || 'help-circle-outline';
  };

  const statuses = ['all', 'pending', 'reviewing', 'assigning', 'confirmed', 'in_progress', 'completed'];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading managed events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Managed Events</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Status Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        {statuses.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              statusFilter === status && styles.filterChipActive
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[
              styles.filterChipText,
              statusFilter === status && styles.filterChipTextActive
            ]}>
              {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{requests.length}</Text>
          <Text style={styles.statLabel}>Total Requests</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {requests.filter(r => r.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {requests.filter(r => r.status === 'confirmed' || r.status === 'in_progress').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      {/* Events List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No managed events found</Text>
            <Text style={styles.emptySubtext}>
              {statusFilter !== 'all' 
                ? `No ${statusFilter} events` 
                : 'Events will appear here as businesses request them'}
            </Text>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <TouchableOpacity 
              key={request.id} 
              style={styles.eventCard}
              onPress={() => handleViewEvent(request.id)}
            >
              {/* Event Header */}
              <View style={styles.eventHeader}>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{request.event_name}</Text>
                  <Text style={styles.businessName}>{request.business_name}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(request.status) }
                ]}>
                  <Ionicons 
                    name={getStatusIcon(request.status) as any} 
                    size={14} 
                    color="#FFF" 
                  />
                  <Text style={styles.statusText}>
                    {request.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </View>
              </View>

              {/* Event Details */}
              <View style={styles.eventDetails}>
                <View style={styles.eventDetailRow}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.eventDetailText}>
                    {new Date(request.event_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                
                <View style={styles.eventDetailRow}>
                  <Ionicons name="location-outline" size={16} color="#666" />
                  <Text style={styles.eventDetailText}>
                    {request.location.city}, {request.location.state}
                  </Text>
                </View>
                
                <View style={styles.eventDetailRow}>
                  <Ionicons name="cash-outline" size={16} color="#666" />
                  <Text style={styles.eventDetailText}>Budget: {request.budget}</Text>
                </View>
                
                <View style={styles.eventDetailRow}>
                  <Ionicons name="people-outline" size={16} color="#666" />
                  <Text style={styles.eventDetailText}>
                    {request.worker_count} worker{request.worker_count !== 1 ? 's' : ''} assigned
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.eventActions}>
                {request.status === 'pending' && (
                  <View style={styles.actionBadge}>
                    <Ionicons name="alert-circle-outline" size={14} color="#FFA500" />
                    <Text style={styles.actionBadgeText}>Needs Review</Text>
                  </View>
                )}
                {request.status === 'assigning' && (
                  <View style={[styles.actionBadge, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="people-outline" size={14} color="#2196F3" />
                    <Text style={[styles.actionBadgeText, { color: '#2196F3' }]}>
                      Assign Workers
                    </Text>
                  </View>
                )}
                <TouchableOpacity style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={16} color="#FF6B35" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  headerRight: {
    width: 40,
  },
  filterContainer: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  filterChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  eventCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  eventInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  businessName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  eventDetails: {
    marginBottom: 16,
    gap: 8,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#666',
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFA500',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
});
