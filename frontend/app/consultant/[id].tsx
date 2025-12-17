import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://test-ready-preview.preview.emergentagent.com';

export default function ConsultingRequestDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadRequest();
    checkAdminStatus();
  }, [id]);

  const checkAdminStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsAdmin(response.data.is_admin || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const loadRequest = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/consulting/requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setRequest(response.data);
    } catch (error: any) {
      console.error('Error loading request:', error);
      Alert.alert('Error', 'Could not load consulting request');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      await axios.patch(
        `${API_URL}/api/consulting/requests/${id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const statusLabel = newStatus.replace('_', ' ');
      Alert.alert(
        'Status Updated',
        `Request marked as ${statusLabel}`,
        [{ text: 'OK', onPress: () => loadRequest() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim()) {
      Alert.alert('Error', 'Please enter a reply message');
      return;
    }

    setSending(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Send reply_text as query parameter, not body
      await axios.post(
        `${API_URL}/api/consulting/requests/${id}/reply?reply_text=${encodeURIComponent(replyText.trim())}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Alert.alert(
        'Reply Sent',
        'Your reply has been sent to the user. They will receive a notification.',
        [{ text: 'OK' }]
      );
      
      // Clear the reply text
      setReplyText('');
      
      // Reload request to show updated reply history
      await loadRequest();
    } catch (error: any) {
      console.error('Error sending reply:', error);
      
      // Safely extract error message and ensure it's a string
      let errorMessage = 'Failed to send reply';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        // Handle array of errors
        if (Array.isArray(detail)) {
          errorMessage = detail.map(err => 
            typeof err === 'string' ? err : err.msg || JSON.stringify(err)
          ).join(', ');
        } 
        // Handle object errors
        else if (typeof detail === 'object') {
          errorMessage = detail.msg || detail.message || JSON.stringify(detail);
        }
        // Handle string errors
        else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSending(false);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
          <Text style={styles.loadingText}>Loading request...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Request not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
            <Text style={styles.statusText}>
              {request.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {isAdmin && (
            <View style={styles.infoSection}>
              <Text style={styles.label}>Requester</Text>
              <Text style={styles.value}>{request.owner_name}</Text>
              <Text style={styles.sublabel}>{request.owner_type}</Text>
              
              {request.owner_email && (
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={18} color="#666" />
                  <Text style={styles.contactText}>{request.owner_email}</Text>
                </View>
              )}
              
              {request.owner_phone && (
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={18} color="#666" />
                  <Text style={styles.contactText}>{request.owner_phone}</Text>
                </View>
              )}
              
              {(request.owner_city || request.owner_state) && (
                <View style={styles.contactRow}>
                  <Ionicons name="location-outline" size={18} color="#666" />
                  <Text style={styles.contactText}>
                    {request.owner_city && request.owner_state
                      ? `${request.owner_city}, ${request.owner_state}`
                      : request.owner_city || request.owner_state}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Topics */}
          <View style={styles.infoSection}>
            <Text style={styles.label}>Topics</Text>
            <View style={styles.topicsContainer}>
              {request.topics.map((topic: string, idx: number) => (
                <View key={idx} style={styles.topicBadge}>
                  <Text style={styles.topicBadgeText}>{topic}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Schedule Preference */}
          {request.preferred_schedule && (
            <View style={styles.infoSection}>
              <Text style={styles.label}>Preferred Schedule</Text>
              <Text style={styles.value}>{request.preferred_schedule}</Text>
            </View>
          )}

          {/* Notes */}
          {request.notes && (
            <View style={styles.infoSection}>
              <Text style={styles.label}>Notes & Goals</Text>
              <Text style={styles.notesText}>{request.notes}</Text>
            </View>
          )}

          {/* Admin Reply Section */}
          {isAdmin && (
            <View style={styles.replySection}>
              <Text style={styles.label}>Send Reply to User</Text>
              <Text style={styles.replyHint}>
                Your reply will be sent as a message and the user will receive a notification
              </Text>
              
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
                <TextInput
                  style={styles.replyInput}
                  placeholder="Type your reply here (e.g., video link, instructions, advice)..."
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!sending}
                />
                
                <TouchableOpacity
                  style={[styles.sendReplyButton, sending && styles.sendReplyButtonDisabled]}
                  onPress={sendReply}
                  disabled={sending || !replyText.trim()}
                >
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.sendReplyButtonText}>
                    {sending ? 'Sending...' : 'Send Reply'}
                  </Text>
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </View>
          )}

          {/* Timestamps */}
          <View style={styles.infoSection}>
            <Text style={styles.label}>Request Date</Text>
            <Text style={styles.value}>
              {new Date(request.created_at).toLocaleString()}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Admin Actions */}
      {isAdmin && request.status !== 'completed' && (
        <View style={styles.footer}>
          {request.status === 'new' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.progressButton, updating && styles.actionButtonDisabled]}
              onPress={() => updateStatus('in_progress')}
              disabled={updating}
            >
              <Ionicons name="time" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>
                {updating ? 'Updating...' : 'Mark In Progress'}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton, updating && styles.actionButtonDisabled]}
            onPress={() => updateStatus('completed')}
            disabled={updating}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>
              {updating ? 'Updating...' : 'Mark Completed'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {request.status === 'completed' && (
        <View style={styles.footer}>
          <View style={styles.completedMessage}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.completedText}>This consulting session has been completed</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  backButtonText: {
    color: '#1565FF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    padding: 8,
  },
  statusSection: {
    alignItems: 'center',
    padding: 20,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  infoSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  value: {
    fontSize: 18,
    color: '#000',
    fontWeight: '600',
  },
  sublabel: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  contactText: {
    fontSize: 15,
    color: '#333',
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  topicBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565FF',
  },
  notesText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  progressButton: {
    backgroundColor: '#2196F3',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonDisabled: {
    backgroundColor: '#ccc',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  completedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  completedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  replySection: {
    marginBottom: 24,
    backgroundColor: '#F5F9FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  replyHint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  replyInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 12,
  },
  sendReplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  sendReplyButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendReplyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
