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

export default function MyManagedEventsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<ManagedEventRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      console.log('📋 Loading my managed event requests...');
      const response = await axios.get(`${API_URL}/api/managed-events/my-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Loaded requests:', response.data.requests.length);
      setRequests(response.data.requests);
    } catch (error: any) {
      console.error('❌ Error loading requests:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to load requests';
      
      if (Platform.OS === 'web') {
        alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleViewRequest = (requestId: string) => {
    router.push(`/events/managed/${requestId}`);
  };

  const handleNewRequest = () => {
    router.push('/events/request-managed');
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading your managed events...</Text>
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
        <Text style={styles.headerTitle}>My Managed Events</Text>
        <TouchableOpacity onPress={handleNewRequest} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={80} color="#CCC" />
            <Text style={styles.emptyTitle}>No Managed Events Yet</Text>
            <Text style={styles.emptyText}>
              Let WGO4Y handle your next event with our handpicked team of professionals
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleNewRequest}>
              <Ionicons name="add-circle-outline" size={20} color="#FFF" />
              <Text style={styles.emptyButtonText}>Request Managed Event</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {requests.map((request) => (
              <TouchableOpacity
                key={request.id}
                style={styles.requestCard}
                onPress={() => handleViewRequest(request.id)}
              >
                {/* Header */}
                <View style={styles.requestHeader}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{request.event_name}</Text>
                    <Text style={styles.requestType}>{request.event_type}</Text>
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

                {/* Details */}
                <View style={styles.requestDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {new Date(request.event_date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {request.location.city}, {request.location.state}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="cash-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>Budget: {request.budget}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {request.worker_count > 0 
                        ? `${request.worker_count} worker${request.worker_count !== 1 ? 's' : ''} assigned`
                        : 'Team being assembled'}
                    </Text>
                  </View>
                </View>

                {/* Status Message */}
                {request.status === 'pending' && (
                  <View style={styles.statusMessage}>
                    <Ionicons name="time-outline" size={14} color="#FFA500" />
                    <Text style={styles.statusMessageText}>
                      Awaiting WGO4Y review
                    </Text>
                  </View>
                )}
                {request.status === 'confirmed' && (
                  <View style={[styles.statusMessage, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="#4CAF50" />
                    <Text style={[styles.statusMessageText, { color: '#4CAF50' }]}>
                      Team confirmed! Event is ready
                    </Text>
                  </View>
                )}
                {request.status === 'completed' && (
                  <View style={[styles.statusMessage, { backgroundColor: '#E0E0E0' }]}>
                    <Ionicons name="star-outline" size={14} color="#666" />
                    <Text style={[styles.statusMessageText, { color: '#666' }]}>
                      Leave feedback for your team
                    </Text>
                  </View>
                )}

                {/* Action */}
                <TouchableOpacity style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={16} color="#FF6B35" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
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
  addButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  listContainer: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
    marginRight: 12,
  },
  requestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  requestType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  requestDetails: {
    marginBottom: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  statusMessageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFA500',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
});
