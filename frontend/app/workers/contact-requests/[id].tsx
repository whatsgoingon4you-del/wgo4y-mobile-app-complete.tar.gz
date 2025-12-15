import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

export default function ContactRequestDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const requestId = params.id as string;
  
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadRequestDetail();
    }, [requestId])
  );

  const loadRequestDetail = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Get all contact requests and find the specific one
      const response = await axios.get(`${API_URL}/api/workers/contact-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const found = response.data.find((r: any) => r.id === requestId);
      if (found) {
        setRequest(found);
      }
    } catch (error) {
      console.error('Error loading request:', error);
      Alert.alert('Error', 'Failed to load contact request');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!request) return;
    
    setUpdatingStatus(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Update status in database
      await axios.patch(
        `${API_URL}/api/workers/contact-requests/${requestId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setRequest({ ...request, status: newStatus });
      
      // Safe alert message
      const successMessage = `Status updated to ${newStatus}`;
      Alert.alert('Success', successMessage);
    } catch (error: any) {
      console.error('Error updating status:', error);
      
      // Safe error message extraction
      let errorMessage = 'Failed to update status';
      if (error.response?.data?.detail && typeof error.response.data.detail === 'string') {
        errorMessage = error.response.data.detail;
      } else if (error.message && typeof error.message === 'string') {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Request</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Request</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Request not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Request</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Requester Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>From</Text>
          <View style={styles.requesterCard}>
            {request.requester_photo ? (
              <Image source={{ uri: request.requester_photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="business" size={32} color="#999" />
              </View>
            )}
            
            <View style={styles.requesterInfo}>
              <Text style={styles.requesterName}>{request.requester_name}</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>
                  {request.requester_type?.toUpperCase() || 'BUSINESS'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message</Text>
          {request.message ? (
            <Text style={styles.messageText}>{request.message}</Text>
          ) : (
            <Text style={styles.noMessageText}>No message provided</Text>
          )}
        </View>

        {/* Request Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Request Details</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Requested</Text>
              <Text style={styles.infoValue}>{getRelativeTime(request.created_at)}</Text>
            </View>
          </View>

          {request.worker_name && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Worker</Text>
                <Text style={styles.infoValue}>
                  {request.worker_name} ({request.worker_role})
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Status Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                request.status === 'new' && styles.statusButtonActive
              ]}
              onPress={() => handleUpdateStatus('new')}
              disabled={updatingStatus || request.status === 'new'}
            >
              <Ionicons 
                name="alert-circle" 
                size={20} 
                color={request.status === 'new' ? '#fff' : '#FF9800'} 
              />
              <Text style={[
                styles.statusButtonText,
                request.status === 'new' && styles.statusButtonTextActive
              ]}>
                New
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusButton,
                request.status === 'contacted' && styles.statusButtonActive
              ]}
              onPress={() => handleUpdateStatus('contacted')}
              disabled={updatingStatus || request.status === 'contacted'}
            >
              <Ionicons 
                name="mail" 
                size={20} 
                color={request.status === 'contacted' ? '#fff' : '#2196F3'} 
              />
              <Text style={[
                styles.statusButtonText,
                request.status === 'contacted' && styles.statusButtonTextActive
              ]}>
                Contacted
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusButton,
                request.status === 'completed' && styles.statusButtonActive
              ]}
              onPress={() => handleUpdateStatus('completed')}
              disabled={updatingStatus || request.status === 'completed'}
            >
              <Ionicons 
                name="checkmark-circle" 
                size={20} 
                color={request.status === 'completed' ? '#fff' : '#4CAF50'} 
              />
              <Text style={[
                styles.statusButtonText,
                request.status === 'completed' && styles.statusButtonTextActive
              ]}>
                Completed
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  requesterCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requesterInfo: {
    flex: 1,
  },
  requesterName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  typeBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1565FF',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  noMessageText: {
    fontSize: 15,
    color: '#999',
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusButtonActive: {
    backgroundColor: '#1565FF',
    borderColor: '#1565FF',
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
