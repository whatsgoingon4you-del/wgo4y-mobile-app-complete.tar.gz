import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface InHouseWorker {
  id: string;
  name: string;
  role: string;
  total_declines_60_days: number;
  completed_assignments: number;
}

export default function AdminEventAssignScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id;

  const [event, setEvent] = useState<any>(null);
  const [availableWorkers, setAvailableWorkers] = useState<InHouseWorker[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<{ [role: string]: string[] }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const roles = ['DJ', 'Security', 'Event Staff', 'Lighting', 'Sound', 'Promoter'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadEvent(), loadAvailableWorkers()]);
    setLoading(false);
  };

  const loadEvent = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/admin/managed-events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvent(response.data);
      
      // Pre-populate selected workers if already assigned
      const preSelected: { [role: string]: string[] } = {};
      response.data.worker_assignments?.forEach((assignment: any) => {
        if (!preSelected[assignment.role]) {
          preSelected[assignment.role] = [];
        }
        preSelected[assignment.role].push(assignment.worker_id);
      });
      setSelectedWorkers(preSelected);
    } catch (error: any) {
      console.error('❌ Error loading event:', error);
      if (Platform.OS === 'web') {
        alert('Error: Failed to load event details');
      } else {
        Alert.alert('Error', 'Failed to load event details');
      }
      router.back();
    }
  };

  const loadAvailableWorkers = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/admin/in-house/workers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableWorkers(response.data.workers);
    } catch (error: any) {
      console.error('❌ Error loading workers:', error);
    }
  };

  const toggleWorkerSelection = (role: string, workerId: string) => {
    setSelectedWorkers(prev => {
      const current = prev[role] || [];
      const isSelected = current.includes(workerId);
      
      return {
        ...prev,
        [role]: isSelected 
          ? current.filter(id => id !== workerId)
          : [...current, workerId]
      };
    });
  };

  const getWorkersForRole = (role: string) => {
    return availableWorkers.filter(w => w.role === role);
  };

  const handleSubmit = async () => {
    // Build assignments array
    const assignments: any[] = [];
    
    Object.entries(selectedWorkers).forEach(([role, workerIds]) => {
      workerIds.forEach(workerId => {
        const worker = availableWorkers.find(w => w.id === workerId);
        if (worker) {
          assignments.push({
            worker_id: workerId,
            worker_name: worker.name,
            role: role
          });
        }
      });
    });

    if (assignments.length === 0) {
      if (Platform.OS === 'web') {
        alert('Please select at least one worker');
      } else {
        Alert.alert('No Workers Selected', 'Please select at least one worker to assign');
      }
      return;
    }

    const confirmMsg = `Assign ${assignments.length} worker(s) to this event? They will be notified immediately.`;
    
    if (Platform.OS === 'web') {
      if (!confirm(confirmMsg)) return;
    } else {
      Alert.alert(
        'Confirm Assignment',
        confirmMsg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Assign', onPress: () => performAssignment(assignments) }
        ]
      );
      return;
    }

    await performAssignment(assignments);
  };

  const performAssignment = async (assignments: any[]) => {
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.post(
        `${API_URL}/api/admin/managed-events/${eventId}/assign`,
        { worker_assignments: assignments },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (Platform.OS === 'web') {
        alert('Success! Workers have been assigned and notified.');
      } else {
        Alert.alert('Success!', 'Workers have been assigned and notified.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }
      
      router.back();
    } catch (error: any) {
      console.error('❌ Error assigning workers:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to assign workers';
      
      if (Platform.OS === 'web') {
        alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading assignment interface...</Text>
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
        <Text style={styles.headerTitle}>Assign Workers</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventName}>{event?.event_name}</Text>
          <View style={styles.eventMeta}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.eventMetaText}>
              {new Date(event?.event_date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.eventMeta}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.eventMetaText}>
              {event?.location?.city}, {event?.location?.state}
            </Text>
          </View>
        </View>

        {/* Requirements */}
        {event?.requirements && (
          <View style={styles.requirementsCard}>
            <Text style={styles.requirementsTitle}>Event Requirements</Text>
            <Text style={styles.requirementsText}>{event.requirements}</Text>
          </View>
        )}

        {/* Worker Selection by Role */}
        <View style={styles.rolesContainer}>
          <Text style={styles.sectionTitle}>Select Workers by Role</Text>
          
          {roles.map((role) => {
            const workersForRole = getWorkersForRole(role);
            const selected = selectedWorkers[role] || [];
            
            return (
              <View key={role} style={styles.roleSection}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleTitle}>{role}</Text>
                  <Text style={styles.roleCount}>
                    {selected.length} selected • {workersForRole.length} available
                  </Text>
                </View>

                {workersForRole.length === 0 ? (
                  <Text style={styles.noWorkersText}>No {role}s available</Text>
                ) : (
                  <View style={styles.workersList}>
                    {workersForRole.map((worker) => {
                      const isSelected = selected.includes(worker.id);
                      const declineWarning = worker.total_declines_60_days >= 2;
                      
                      return (
                        <TouchableOpacity
                          key={worker.id}
                          style={[
                            styles.workerItem,
                            isSelected && styles.workerItemSelected
                          ]}
                          onPress={() => toggleWorkerSelection(role, worker.id)}
                        >
                          <View style={styles.workerItemContent}>
                            <Text style={[
                              styles.workerItemName,
                              isSelected && styles.workerItemNameSelected
                            ]}>
                              {worker.name}
                            </Text>
                            <Text style={styles.workerItemStats}>
                              {worker.completed_assignments} events • {worker.total_declines_60_days} declines
                            </Text>
                          </View>
                          
                          {declineWarning && (
                            <Ionicons name="warning" size={18} color="#FFA500" />
                          )}
                          
                          <View style={[
                            styles.checkbox,
                            isSelected && styles.checkboxSelected
                          ]}>
                            {isSelected && (
                              <Ionicons name="checkmark" size={16} color="#FFF" />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#FFF" />
                <Text style={styles.submitButtonText}>
                  Assign & Notify Workers
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  scrollView: {
    flex: 1,
  },
  eventInfo: {
    backgroundColor: '#FFF',
    padding: 20,
    marginBottom: 2,
  },
  eventName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  eventMetaText: {
    fontSize: 14,
    color: '#666',
  },
  requirementsCard: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    marginBottom: 2,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
    marginBottom: 8,
  },
  requirementsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  rolesContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  roleSection: {
    marginBottom: 24,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  roleCount: {
    fontSize: 12,
    color: '#666',
  },
  noWorkersText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  workersList: {
    gap: 8,
  },
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  workerItemSelected: {
    borderColor: '#FF6B35',
    borderWidth: 2,
    backgroundColor: '#FFF5F0',
  },
  workerItemContent: {
    flex: 1,
    marginRight: 12,
  },
  workerItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  workerItemNameSelected: {
    color: '#FF6B35',
  },
  workerItemStats: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  submitContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
});
