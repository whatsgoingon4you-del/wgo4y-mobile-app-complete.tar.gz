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
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UpgradeModal from '../../components/UpgradeModal';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://test-ready-preview.preview.emergentagent.com';

export default function WorkerDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const workerId = params.id as string;
  
  const [worker, setWorker] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userType, setUserType] = useState('');
  const [membershipTier, setMembershipTier] = useState('basic');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactNote, setContactNote] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadWorkerAndProfile();
    }, [workerId])
  );

  const loadWorkerAndProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Load profile and worker data in parallel
      const [profileRes, workerRes] = await Promise.all([
        axios.get(`${API_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/workers/${workerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      const user = profileRes.data;
      setIsAdmin(user.is_admin || false);
      setUserType(user.user_type);
      
      const tier = user.membership_tier?.toLowerCase() || 'basic';
      setMembershipTier(tier);
      
      // Check access for non-admins
      const hasPremiumTier = ['appreciation', 'networking', 'gold', 'silver'].includes(tier);
      const canAccess = user.user_type === 'business' || user.user_type === 'entrepreneur';
      
      if (!user.is_admin && (!canAccess || !hasPremiumTier)) {
        setShowUpgradeModal(true);
        setLoading(false);
        return;
      }
      
      setWorker(workerRes.data);
      console.log('✅ Worker loaded:', workerRes.data.user_name);
    } catch (error: any) {
      console.error('Error loading worker:', error);
      if (error.response?.status === 403) {
        setShowUpgradeModal(true);
      } else {
        Alert.alert('Error', 'Failed to load worker profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'approved' | 'rejected') => {
    if (!worker) return;
    
    Alert.alert(
      `${newStatus === 'approved' ? 'Approve' : 'Reject'} Worker`,
      `Are you sure you want to ${newStatus === 'approved' ? 'approve' : 'reject'} ${worker.user_name}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus === 'approved' ? 'Approve' : 'Reject',
          style: newStatus === 'approved' ? 'default' : 'destructive',
          onPress: async () => {
            setUpdatingStatus(true);
            try {
              const token = await AsyncStorage.getItem('auth_token');
              await axios.patch(
                `${API_URL}/api/workers/${workerId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              
              Alert.alert('Success', `Worker ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully`);
              // Reload worker data
              await loadWorkerAndProfile();
            } catch (error: any) {
              console.error('Error updating status:', error);
              Alert.alert('Error', error.response?.data?.detail || 'Failed to update status');
            } finally {
              setUpdatingStatus(false);
            }
          }
        }
      ]
    );
  };

  const handleSendContactRequest = async () => {
    setSendingRequest(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.post(
        `${API_URL}/api/workers/${workerId}/contact`,
        { message: contactNote.trim() || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Platform-specific alert for web compatibility
      if (Platform.OS === 'web') {
        alert('Request Sent! Your contact request has been sent to the worker. They will be notified.');
        setShowContactModal(false);
        setContactNote('');
      } else {
        Alert.alert(
          'Request Sent!',
          'Your contact request has been sent to the worker. They will be notified.',
          [{ text: 'OK', onPress: () => {
            setShowContactModal(false);
            setContactNote('');
          }}]
        );
      }
    } catch (error: any) {
      console.error('Error sending contact request:', error);
      if (error.response?.status === 403) {
        setShowUpgradeModal(true);
      } else {
        const errorMessage = error.response?.data?.detail || 'Failed to send contact request';
        if (Platform.OS === 'web') {
          alert(`Error: ${errorMessage}`);
        } else {
          Alert.alert('Error', errorMessage);
        }
      }
    } finally {
      setSendingRequest(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      case 'pending': return '#FF9800';
      default: return '#999';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      case 'pending': return 'time';
      default: return 'help-circle';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Worker Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!worker) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Worker Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Worker not found</Text>
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
        <Text style={styles.headerTitle}>
          {isAdmin ? 'Worker Application' : 'Worker Profile'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {worker.profile_photo ? (
            <Image source={{ uri: worker.profile_photo }} style={styles.profilePhoto} />
          ) : (
            <View style={[styles.profilePhoto, styles.photoPlaceholder]}>
              <Ionicons name="person" size={48} color="#999" />
            </View>
          )}
          
          <Text style={styles.workerName}>
            {worker.stage_name || worker.user_name}
          </Text>
          
          <View style={styles.roleContainer}>
            <Ionicons name="briefcase" size={16} color="#1565FF" />
            <Text style={styles.roleText}>{worker.role}</Text>
          </View>
          
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.locationText}>
              {worker.city}, {worker.state}
            </Text>
          </View>

          {/* Status Badge (Admin View) */}
          {isAdmin && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(worker.status) + '20' }]}>
              <Ionicons name={getStatusIcon(worker.status)} size={18} color={getStatusColor(worker.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(worker.status) }]}>
                {worker.status.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Tagline */}
        {worker.tagline && (
          <View style={styles.section}>
            <Text style={styles.tagline}>{worker.tagline}</Text>
          </View>
        )}

        {/* Bio */}
        {worker.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{worker.bio}</Text>
          </View>
        )}

        {/* Experience */}
        {worker.experience_years && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#1565FF" />
              <Text style={styles.infoText}>{worker.experience_years}</Text>
            </View>
          </View>
        )}

        {/* Contact Info (Admin View Only) */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            {worker.user_email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color="#666" />
                <Text style={styles.infoText}>{worker.user_email}</Text>
              </View>
            )}
            {worker.user_phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color="#666" />
                <Text style={styles.infoText}>{worker.user_phone}</Text>
              </View>
            )}
          </View>
        )}

        {/* Application Date (Admin View) */}
        {isAdmin && worker.created_at && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Application Date</Text>
            <Text style={styles.infoText}>
              {new Date(worker.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>
        )}

        {/* Admin Actions */}
        {isAdmin && worker.status === 'pending' && (
          <View style={styles.adminActions}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleUpdateStatus('rejected')}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => handleUpdateStatus('approved')}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.approveButtonText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Request Contact Button (Non-Admin View) */}
        {!isAdmin && worker.status === 'approved' && (
          <TouchableOpacity
            style={styles.requestContactButton}
            onPress={() => setShowContactModal(true)}
          >
            <Ionicons name="mail" size={20} color="#fff" />
            <Text style={styles.requestContactButtonText}>Request Contact</Text>
          </TouchableOpacity>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Contact Request Modal */}
      <Modal
        visible={showContactModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Contact</Text>
              <TouchableOpacity onPress={() => setShowContactModal(false)}>
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
                  setShowContactModal(false);
                  setContactNote('');
                }}
                disabled={sendingRequest}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.sendButton, sendingRequest && styles.sendButtonDisabled]}
                onPress={handleSendContactRequest}
                disabled={sendingRequest}
              >
                {sendingRequest ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#fff" />
                    <Text style={styles.sendButtonText}>Send Request</Text>
                  </>
                )}
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  photoPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1565FF',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginTop: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
  },
  bioText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  adminActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  requestContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565FF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  requestContactButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
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
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
