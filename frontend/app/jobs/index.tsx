import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UpgradeModal from '../../components/UpgradeModal';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

export default function JobBoardScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userType, setUserType] = useState('');
  const [membershipTier, setMembershipTier] = useState('basic');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isWorker, setIsWorker] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      checkAccessAndLoad();
    }, [])
  );

  const checkAccessAndLoad = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const user = response.data;
      setUserType(user.user_type);
      
      const tier = user.membership_tier?.toLowerCase() || 'basic';
      setMembershipTier(tier);
      
      // Check if user is an approved worker
      const workerRes = await axios.get(`${API_URL}/api/workers`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => ({ data: [] }));
      
      const userWorkerProfile = workerRes.data.find((w: any) => w.user_id === user.id);
      setIsWorker(!!userWorkerProfile);
      
      // Check tier for Business/Entrepreneur
      if (user.user_type === 'business' || user.user_type === 'entrepreneur') {
        const hasPremiumTier = ['appreciation', 'networking', 'gold', 'silver'].includes(tier);
        if (!hasPremiumTier && !user.is_admin) {
          setShowUpgradeModal(true);
          setLoading(false);
          return;
        }
      }
      
      // Load jobs
      await loadJobs();
    } catch (error) {
      console.error('Error checking access:', error);
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setJobs(response.data);
      console.log(`✅ Loaded ${response.data.length} jobs`);
    } catch (error: any) {
      console.error('Error loading jobs:', error);
      if (error.response?.status === 403) {
        setShowUpgradeModal(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#4CAF50';
      case 'closed': return '#999';
      default: return '#FF9800';
    }
  };

  const renderJobCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => router.push(`/jobs/${item.id}`)}
    >
      <View style={styles.jobHeader}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        {item.application_count > 0 && (
          <View style={styles.applicantBadge}>
            <Ionicons name="people" size={14} color="#1565FF" />
            <Text style={styles.applicantCount}>{item.application_count}</Text>
          </View>
        )}
      </View>

      <Text style={styles.jobTitle}>{item.title}</Text>
      
      <View style={styles.jobMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="briefcase-outline" size={16} color="#666" />
          <Text style={styles.metaText}>{item.role}</Text>
        </View>
        
        {item.event_date && (
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.metaText}>{item.event_date}</Text>
          </View>
        )}
        
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.metaText}>{item.city}, {item.state}</Text>
        </View>
      </View>

      {item.pay && (
        <View style={styles.payContainer}>
          <Ionicons name="cash-outline" size={16} color="#4CAF50" />
          <Text style={styles.payText}>{item.pay}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.postedBy}>
          {isWorker ? `Posted by ${item.owner_name}` : `Posted ${new Date(item.created_at).toLocaleDateString()}`}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="briefcase-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>
        {isWorker ? 'No jobs available' : 'No jobs posted yet'}
      </Text>
      <Text style={styles.emptySubtext}>
        {isWorker 
          ? 'Check back soon for new opportunities'
          : 'Post your first job to find the perfect worker'}
      </Text>
      {!isWorker && (
        <TouchableOpacity
          style={styles.postButton}
          onPress={() => router.push('/jobs/post')}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.postButtonText}>Post New Job</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isWorker ? 'Browse Jobs' : 'Job Board'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/dashboard')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isWorker ? 'Browse Jobs' : 'My Jobs'}</Text>
        {!isWorker && (
          <TouchableOpacity onPress={() => router.push('/jobs/post')} style={styles.addButton}>
            <Ionicons name="add-circle" size={28} color="#1565FF" />
          </TouchableOpacity>
        )}
        {isWorker && <View style={{ width: 40 }} />}
      </View>

      {/* Jobs List */}
      <FlatList
        data={jobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={jobs.length === 0 ? styles.emptyListContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={renderEmptyState}
      />

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
  jobCard: {
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
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    flex: 1,
  },
  applicantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  applicantCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1565FF',
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  jobMeta: {
    gap: 8,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  payContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F8F4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  payText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  postedBy: {
    fontSize: 13,
    color: '#999',
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
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
