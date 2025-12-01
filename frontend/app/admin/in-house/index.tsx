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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface InHouseWorker {
  id: string;
  user_id: string;
  name: string;
  role: string;
  in_house_since: string;
  total_declines_60_days: number;
  decline_history_count: number;
  total_assignments: number;
  completed_assignments: number;
  profile_photo?: string;
}

export default function AdminInHouseWorkersScreen() {
  const router = useRouter();
  const [workers, setWorkers] = useState<InHouseWorker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<InHouseWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    loadInHouseWorkers();
  }, []);

  useEffect(() => {
    filterWorkers();
  }, [searchQuery, roleFilter, workers]);

  const loadInHouseWorkers = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      console.log('📋 Loading in-house workers...');
      const response = await axios.get(`${API_URL}/api/admin/in-house/workers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Loaded in-house workers:', response.data.workers.length);
      setWorkers(response.data.workers);
    } catch (error: any) {
      console.error('❌ Error loading in-house workers:', error);
      if (error.response?.status === 403) {
        if (Platform.OS === 'web') {
          alert('Access Denied: Admin permissions required.');
        } else {
          Alert.alert('Access Denied', 'Admin permissions required.');
        }
        router.back();
      } else {
        if (Platform.OS === 'web') {
          alert('Error: Failed to load in-house workers');
        } else {
          Alert.alert('Error', 'Failed to load in-house workers');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const filterWorkers = () => {
    let filtered = workers;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(w => 
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.role.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(w => w.role === roleFilter);
    }

    setFilteredWorkers(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInHouseWorkers();
    setRefreshing(false);
  };

  const handleRemoveInHouse = async (workerId: string, workerName: string) => {
    const confirmMsg = `Remove ${workerName} from in-house status? They will no longer receive managed event assignments.`;
    
    if (Platform.OS === 'web') {
      if (!confirm(confirmMsg)) return;
    } else {
      Alert.alert(
        'Confirm Removal',
        confirmMsg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => performRemove(workerId) }
        ]
      );
      return;
    }

    await performRemove(workerId);
  };

  const performRemove = async (workerId: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.delete(`${API_URL}/api/admin/in-house/workers/${workerId}/remove`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (Platform.OS === 'web') {
        alert('Success: Worker removed from in-house status');
      } else {
        Alert.alert('Success', 'Worker removed from in-house status');
      }
      
      await loadInHouseWorkers();
    } catch (error: any) {
      console.error('❌ Error removing worker:', error);
      if (Platform.OS === 'web') {
        alert('Error: Failed to remove worker');
      } else {
        Alert.alert('Error', 'Failed to remove worker');
      }
    }
  };

  const handleViewStats = (workerId: string) => {
    router.push(`/admin/in-house/workers/${workerId}`);
  };

  const getDeclineStatusColor = (declines: number) => {
    if (declines >= 3) return '#FF4444'; // Red - removed or at risk
    if (declines === 2) return '#FFA500'; // Orange - warning
    return '#4CAF50'; // Green - good standing
  };

  const getDeclineStatusText = (declines: number) => {
    if (declines >= 3) return 'At Risk';
    if (declines === 2) return 'Warning';
    return 'Good';
  };

  const roles = ['all', 'DJ', 'Security', 'Event Staff', 'Lighting', 'Sound', 'Promoter'];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading in-house workers...</Text>
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
        <Text style={styles.headerTitle}>In-House Workers</Text>
        <TouchableOpacity 
          onPress={() => router.push('/admin/in-house/add-worker')} 
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search workers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {/* Role Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        {roles.map((role) => (
          <TouchableOpacity
            key={role}
            style={[
              styles.filterChip,
              roleFilter === role && styles.filterChipActive
            ]}
            onPress={() => setRoleFilter(role)}
          >
            <Text style={[
              styles.filterChipText,
              roleFilter === role && styles.filterChipTextActive
            ]}>
              {role === 'all' ? 'All Roles' : role}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{workers.length}</Text>
          <Text style={styles.statLabel}>Total Workers</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {workers.filter(w => w.total_declines_60_days === 0).length}
          </Text>
          <Text style={styles.statLabel}>Perfect Record</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {workers.filter(w => w.total_declines_60_days >= 2).length}
          </Text>
          <Text style={styles.statLabel}>At Risk</Text>
        </View>
      </View>

      {/* Workers List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredWorkers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No in-house workers found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || roleFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Add workers to get started'}
            </Text>
          </View>
        ) : (
          filteredWorkers.map((worker) => (
            <View key={worker.id} style={styles.workerCard}>
              {/* Worker Header */}
              <View style={styles.workerHeader}>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>{worker.name}</Text>
                  <Text style={styles.workerRole}>{worker.role}</Text>
                </View>
                <View style={[
                  styles.declineBadge,
                  { backgroundColor: getDeclineStatusColor(worker.total_declines_60_days) }
                ]}>
                  <Text style={styles.declineBadgeText}>
                    {worker.total_declines_60_days} Declines
                  </Text>
                </View>
              </View>

              {/* Worker Stats */}
              <View style={styles.workerStats}>
                <View style={styles.workerStatItem}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.workerStatText}>
                    {worker.completed_assignments}/{worker.total_assignments} completed
                  </Text>
                </View>
                <View style={styles.workerStatItem}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.workerStatText}>
                    Since {new Date(worker.in_house_since).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {/* Status Indicator */}
              {worker.total_declines_60_days >= 2 && (
                <View style={styles.warningContainer}>
                  <Ionicons name="warning-outline" size={16} color="#FFA500" />
                  <Text style={styles.warningText}>
                    {worker.total_declines_60_days === 2 
                      ? 'Warning: One more decline will remove in-house status'
                      : 'At risk of removal'}
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.workerActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleViewStats(worker.id)}
                >
                  <Ionicons name="stats-chart-outline" size={18} color="#FF6B35" />
                  <Text style={styles.actionButtonText}>View Stats</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonDanger]}
                  onPress={() => handleRemoveInHouse(worker.id, worker.name)}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#FF4444" />
                  <Text style={[styles.actionButtonText, styles.actionButtonDangerText]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
  addButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#000',
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
  },
  workerCard: {
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
  workerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  workerRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  declineBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  declineBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  workerStats: {
    marginBottom: 12,
  },
  workerStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  workerStatText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 12,
    color: '#FFA500',
    marginLeft: 8,
    flex: 1,
  },
  workerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  actionButtonDanger: {
    borderColor: '#FF4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
    marginLeft: 6,
  },
  actionButtonDangerText: {
    color: '#FF4444',
  },
});
