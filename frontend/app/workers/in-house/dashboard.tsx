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

interface Assignment {
  event_id: string;
  event_name: string;
  event_type: string;
  event_date: string;
  location: {
    address: string;
    city: string;
    state: string;
  };
  business_name: string;
  role: string;
  status: string;
  assigned_at: string;
  requirements: string;
  special_notes?: string;
}

interface InHouseStats {
  is_in_house: boolean;
  in_house_since?: string;
  stats?: {
    total_assignments: number;
    completed_assignments: number;
    decline_count_60_days: number;
    at_risk: boolean;
  };
  warning_message?: string;
}

export default function WorkerInHouseDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<InHouseStats | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingAssignment, setProcessingAssignment] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadStats(), loadAssignments()]);
  };

  const loadStats = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/in-house/my-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error: any) {
      console.error('❌ Error loading stats:', error);
    }
  };

  const loadAssignments = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/in-house/my-assignments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Loaded assignments:', response.data.assignments.length);
      setAssignments(response.data.assignments);
    } catch (error: any) {
      console.error('❌ Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAccept = async (eventId: string, eventName: string) => {
    const confirmMsg = `Accept assignment for "${eventName}"?`;
    
    if (Platform.OS === 'web') {
      if (!confirm(confirmMsg)) return;
    } else {
      Alert.alert(
        'Confirm Acceptance',
        confirmMsg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Accept', onPress: () => performAccept(eventId, eventName) }
        ]
      );
      return;
    }

    await performAccept(eventId, eventName);
  };

  const performAccept = async (eventId: string, eventName: string) => {
    setProcessingAssignment(eventId);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.post(
        `${API_URL}/api/in-house/assignments/${eventId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (Platform.OS === 'web') {
        alert(`Success! You accepted the assignment for "${eventName}"`);
      } else {
        Alert.alert('Success!', `You accepted the assignment for "${eventName}"`);
      }
      
      await loadData();
    } catch (error: any) {
      console.error('❌ Error accepting assignment:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to accept assignment';
      
      if (Platform.OS === 'web') {
        alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setProcessingAssignment(null);
    }
  };

  const handleDecline = async (eventId: string, eventName: string) => {
    if (Platform.OS === 'web') {
      const reason = prompt(`Decline assignment for "${eventName}"?\n\nOptional: Enter reason for declining:`);
      if (reason === null) return; // Cancelled
      await performDecline(eventId, reason || undefined);
    } else {
      Alert.prompt(
        'Decline Assignment',
        `Decline assignment for "${eventName}"?\n\nOptional: Enter reason:`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Decline',
            style: 'destructive',
            onPress: (reason) => performDecline(eventId, reason)
          }
        ],
        'plain-text'
      );
    }
  };

  const performDecline = async (eventId: string, reason?: string) => {
    setProcessingAssignment(eventId);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.post(
        `${API_URL}/api/in-house/assignments/${eventId}/decline`,
        {
          accept: false,
          decline_reason: reason || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { decline_count, warning, removed, warning_message } = response.data;
      
      let alertTitle = 'Assignment Declined';
      let alertMessage = `You declined this assignment. (${decline_count} declines in 60 days)`;
      
      if (removed) {
        alertTitle = 'In-House Status Removed';
        alertMessage = 'You have been removed from in-house status due to 3 declines in 60 days.';
      } else if (warning) {
        alertTitle = 'Warning';
        alertMessage = warning_message || 'One more decline will remove your in-house status.';
      }
      
      if (Platform.OS === 'web') {
        alert(`${alertTitle}\n\n${alertMessage}`);
      } else {
        Alert.alert(alertTitle, alertMessage);
      }
      
      await loadData();
    } catch (error: any) {
      console.error('❌ Error declining assignment:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to decline assignment';
      
      if (Platform.OS === 'web') {
        alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setProcessingAssignment(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: '#FFA500',
      accepted: '#4CAF50',
      declined: '#F44336',
    };
    return colors[status] || '#999';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading your in-house dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!stats?.is_in_house) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>In-House Dashboard</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.notInHouseContainer}>
          <Ionicons name="shield-outline" size={80} color="#CCC" />
          <Text style={styles.notInHouseTitle}>Not an In-House Worker</Text>
          <Text style={styles.notInHouseText}>
            You are not currently part of the WGO4Y in-house team. 
            In-house workers are handpicked by our team and receive exclusive managed event assignments.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const pendingAssignments = assignments.filter(a => a.status === 'pending');
  const acceptedAssignments = assignments.filter(a => a.status === 'accepted');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>In-House Dashboard</Text>
        <TouchableOpacity 
          onPress={() => router.push('/workers/in-house/decline-history')}
          style={styles.historyButton}
        >
          <Ionicons name="time-outline" size={24} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* In-House Badge */}
        <View style={styles.badgeContainer}>
          <View style={styles.inHouseBadge}>
            <Ionicons name="shield-checkmark" size={32} color="#FF6B35" />
            <View style={styles.badgeContent}>
              <Text style={styles.badgeTitle}>WGO4Y In-House Worker</Text>
              <Text style={styles.badgeSubtitle}>
                Member since {new Date(stats.in_house_since!).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statCardNumber}>{stats.stats?.total_assignments || 0}</Text>
            <Text style={styles.statCardLabel}>Total Assignments</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardNumber}>{stats.stats?.completed_assignments || 0}</Text>
            <Text style={styles.statCardLabel}>Completed</Text>
          </View>
          <View style={[
            styles.statCard,
            stats.stats?.at_risk && styles.statCardWarning
          ]}>
            <Text style={[
              styles.statCardNumber,
              stats.stats?.at_risk && styles.statCardNumberWarning
            ]}>
              {stats.stats?.decline_count_60_days || 0}/3
            </Text>
            <Text style={styles.statCardLabel}>Declines (60d)</Text>
          </View>
        </View>

        {/* Warning Message */}
        {stats.warning_message && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={24} color="#FFA500" />
            <Text style={styles.warningText}>{stats.warning_message}</Text>
          </View>
        )}

        {/* Pending Assignments */}
        {pendingAssignments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pending Assignments ({pendingAssignments.length})
            </Text>
            {pendingAssignments.map((assignment) => (
              <View key={assignment.event_id} style={styles.assignmentCard}>
                <View style={styles.assignmentHeader}>
                  <Text style={styles.assignmentName}>{assignment.event_name}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{assignment.role}</Text>
                  </View>
                </View>

                <View style={styles.assignmentDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="business-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>{assignment.business_name}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {new Date(assignment.event_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {assignment.location.city}, {assignment.location.state}
                    </Text>
                  </View>
                </View>

                {/* Requirements */}
                {assignment.requirements && (
                  <View style={styles.requirementsBox}>
                    <Text style={styles.requirementsLabel}>Requirements:</Text>
                    <Text style={styles.requirementsText}>{assignment.requirements}</Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.assignmentActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleAccept(assignment.event_id, assignment.event_name)}
                    disabled={processingAssignment === assignment.event_id}
                  >
                    {processingAssignment === assignment.event_id ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                        <Text style={styles.actionBtnText}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.declineBtn]}
                    onPress={() => handleDecline(assignment.event_id, assignment.event_name)}
                    disabled={processingAssignment === assignment.event_id}
                  >
                    <Ionicons name="close-circle" size={20} color="#FF4444" />
                    <Text style={[styles.actionBtnText, styles.declineBtnText]}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Accepted Assignments */}
        {acceptedAssignments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Upcoming Events ({acceptedAssignments.length})
            </Text>
            {acceptedAssignments.map((assignment) => (
              <View key={assignment.event_id} style={styles.assignmentCard}>
                <View style={styles.assignmentHeader}>
                  <Text style={styles.assignmentName}>{assignment.event_name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
                    <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                    <Text style={styles.statusBadgeText}>Confirmed</Text>
                  </View>
                </View>

                <View style={styles.assignmentDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="briefcase-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>Role: {assignment.role}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {new Date(assignment.event_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {assignment.location.city}, {assignment.location.state}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.viewDetailsBtn}
                  onPress={() => router.push(`/workers/in-house/events/${assignment.event_id}`)}
                >
                  <Text style={styles.viewDetailsBtnText}>View Event Details</Text>
                  <Ionicons name="chevron-forward" size={16} color="#FF6B35" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {assignments.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No assignments yet</Text>
            <Text style={styles.emptySubtext}>
              You'll receive notifications when you're assigned to managed events
            </Text>
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
  historyButton: {
    padding: 8,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  badgeContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  inHouseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 16,
  },
  badgeContent: {
    flex: 1,
  },
  badgeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  badgeSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statCardWarning: {
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  statCardNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  statCardNumberWarning: {
    color: '#FFA500',
  },
  statCardLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFA500',
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA500',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  assignmentCard: {
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
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  assignmentName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 12,
  },
  roleBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  assignmentDetails: {
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
  requirementsBox: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  requirementsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  requirementsText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  assignmentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: '#4CAF50',
  },
  declineBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  declineBtnText: {
    color: '#FF4444',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  viewDetailsBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  notInHouseContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  notInHouseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  notInHouseText: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
});
