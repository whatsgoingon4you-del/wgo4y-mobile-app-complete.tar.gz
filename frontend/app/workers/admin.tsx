import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://test-ready-preview.preview.emergentagent.com';

export default function WorkersAdminScreen() {
  const router = useRouter();
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'applicant' | 'approved'>('applicant');

  useFocusEffect(
    React.useCallback(() => {
      loadWorkers();
    }, [filter])
  );

  const loadWorkers = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await axios.get(`${API_URL}/api/workers?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setWorkers(response.data);
      console.log(`✅ Loaded ${response.data.length} ${filter} workers`);
    } catch (error) {
      console.error('Error loading workers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkers();
  };

  const renderWorker = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.workerCard}
      onPress={() => router.push(`/workers/${item.id}`)}
    >
      <View style={styles.workerHeader}>
        <View>
          <Text style={styles.workerName}>{item.user_name}</Text>
          <Text style={styles.workerRole}>{item.role}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{filter.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={16} color="#666" />
        <Text style={styles.metaText}>
          {item.city}, {item.state}
        </Text>
      </View>

      <Text style={styles.experiencePreview} numberOfLines={2}>
        {item.experience}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>
          Applied {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>
        No {filter} workers
      </Text>
      <Text style={styles.emptySubtext}>
        {filter === 'applicant'
          ? 'New applications will appear here'
          : 'Approved workers will appear here'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workers & Applications</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, filter === 'applicant' && styles.tabActive]}
          onPress={() => setFilter('applicant')}
        >
          <Text style={[styles.tabText, filter === 'applicant' && styles.tabTextActive]}>
            Applicants
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, filter === 'approved' && styles.tabActive]}
          onPress={() => setFilter('approved')}
        >
          <Text style={[styles.tabText, filter === 'approved' && styles.tabTextActive]}>
            Approved
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={workers}
          renderItem={renderWorker}
          keyExtractor={(item) => item.id}
          contentContainerStyle={workers.length === 0 ? styles.emptyListContainer : styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={renderEmptyState}
        />
      )}
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1565FF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#1565FF',
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
  workerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  workerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  workerRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565FF',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1565FF',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  experiencePreview: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
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
});
