import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../../utils/api';

interface QueueItem {
  content_type: string;
  content_id: string;
  user_id: string;
  user_name?: string;
  status: string;
  submitted_at: string;
  content_data: any;
  content_url?: string;
  metadata?: any;
}

interface Stats {
  pending: Record<string, number>;
  approved: Record<string, number>;
  rejected: Record<string, number>;
  total_pending: number;
}

export default function ApprovalDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('event');
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [currentActionItem, setCurrentActionItem] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const contentTabs = [
    { id: 'event', label: 'Events', icon: 'calendar' },
    { id: 'raffle', label: 'Raffles', icon: 'gift' },
    { id: 'coupon', label: 'Coupons', icon: 'pricetag' },
    { id: 'job', label: 'Jobs', icon: 'briefcase' },
  ];

  const statusTabs = [
    { id: 'pending', label: 'Pending', color: '#FF9500' },
    { id: 'approved', label: 'Approved', color: '#34C759' },
    { id: 'rejected', label: 'Rejected', color: '#FF3B30' },
  ];

  useEffect(() => {
    loadData();
  }, [selectedTab, selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');

      // Load stats and queue in parallel
      const [statsRes, queueRes] = await Promise.all([
        axios.get(`${API_URL}/admin/approval/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/admin/approval/queue`, {
          params: {
            content_type: selectedTab,
            status: selectedStatus,
          },
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setStats(statsRes.data);
      setQueueItems(queueRes.data.items || []);
    } catch (error: any) {
      console.error('Error loading approval data:', error);
      if (Platform.OS === 'web') {
        alert('Error: ' + (error.response?.data?.detail || 'Failed to load approval data'));
      } else {
        Alert.alert('Error', error.response?.data?.detail || 'Failed to load approval data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (contentId: string) => {
    try {
      setProcessing(true);
      const token = await AsyncStorage.getItem('auth_token');

      await axios.post(
        `${API_URL}/admin/approval/${selectedTab}/${contentId}/action`,
        { action: 'approve' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (Platform.OS === 'web') {
        alert('✅ Content approved successfully!');
      } else {
        Alert.alert('Success', 'Content approved successfully!');
      }

      loadData();
      setSelectedItems(new Set());
    } catch (error: any) {
      console.error('Error approving:', error);
      if (Platform.OS === 'web') {
        alert('Error: ' + (error.response?.data?.detail || 'Failed to approve'));
      } else {
        Alert.alert('Error', error.response?.data?.detail || 'Failed to approve');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = (contentId: string) => {
    setCurrentActionItem(contentId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!currentActionItem) return;

    try {
      setProcessing(true);
      const token = await AsyncStorage.getItem('auth_token');

      await axios.post(
        `${API_URL}/admin/approval/${selectedTab}/${currentActionItem}/action`,
        {
          action: 'reject',
          rejection_reason: rejectReason || 'Content does not meet quality standards',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowRejectModal(false);
      setCurrentActionItem(null);

      if (Platform.OS === 'web') {
        alert('✅ Content rejected successfully!');
      } else {
        Alert.alert('Success', 'Content rejected successfully!');
      }

      loadData();
      setSelectedItems(new Set());
    } catch (error: any) {
      console.error('Error rejecting:', error);
      if (Platform.OS === 'web') {
        alert('Error: ' + (error.response?.data?.detail || 'Failed to reject'));
      } else {
        Alert.alert('Error', error.response?.data?.detail || 'Failed to reject');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedItems.size === 0) {
      if (Platform.OS === 'web') {
        alert('Please select items first');
      } else {
        Alert.alert('No Selection', 'Please select items first');
      }
      return;
    }

    if (action === 'reject') {
      setShowRejectModal(true);
      return;
    }

    try {
      setProcessing(true);
      const token = await AsyncStorage.getItem('auth_token');

      await axios.post(
        `${API_URL}/admin/approval/bulk-action`,
        {
          content_type: selectedTab,
          content_ids: Array.from(selectedItems),
          action: action,
          rejection_reason: action === 'reject' ? rejectReason : undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (Platform.OS === 'web') {
        alert(`✅ ${selectedItems.size} item(s) ${action}d successfully!`);
      } else {
        Alert.alert('Success', `${selectedItems.size} item(s) ${action}d successfully!`);
      }

      loadData();
      setSelectedItems(new Set());
    } catch (error: any) {
      console.error('Error in bulk action:', error);
      if (Platform.OS === 'web') {
        alert('Error: ' + (error.response?.data?.detail || 'Failed to perform bulk action'));
      } else {
        Alert.alert('Error', error.response?.data?.detail || 'Failed to perform bulk action');
      }
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelectItem = (contentId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(contentId)) {
      newSelected.delete(contentId);
    } else {
      newSelected.add(contentId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    const allIds = queueItems.map((item) => item.content_id);
    setSelectedItems(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const filteredItems = queueItems.filter((item) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const title = item.content_data?.title || item.content_data?.full_name || '';
    const userName = item.user_name || '';
    return title.toLowerCase().includes(searchLower) || userName.toLowerCase().includes(searchLower);
  });

  const renderContentCard = (item: QueueItem) => {
    const isSelected = selectedItems.has(item.content_id);
    const contentData = item.content_data || {};

    return (
      <View key={item.content_id} style={[styles.card, isSelected && styles.cardSelected]}>
        {/* Selection Checkbox */}
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => toggleSelectItem(item.content_id)}
        >
          <View style={[styles.checkboxBox, isSelected && styles.checkboxChecked]}>
            {isSelected && <Ionicons name="checkmark" size={18} color="#fff" />}
          </View>
        </TouchableOpacity>

        {/* Content Preview */}
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.cardTitle}>
                {contentData.title || contentData.full_name || 'Untitled'}
              </Text>
              <View style={styles.statusBadgeContainer}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(item.status) + '20' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
                {item.status === 'pending' && (
                  <Text style={styles.visibilityLabel}>🔒 Hidden from public</Text>
                )}
              </View>
            </View>
          </View>

          {/* Details */}
          <View style={styles.cardDetails}>
            {item.user_name && (
              <Text style={styles.detailText}>
                <Ionicons name="person" size={14} color="#666" /> {item.user_name}
              </Text>
            )}
            {contentData.date && (
              <Text style={styles.detailText}>
                <Ionicons name="calendar" size={14} color="#666" />{' '}
                {new Date(contentData.date).toLocaleDateString()}
              </Text>
            )}
            {contentData.location && (
              <Text style={styles.detailText}>
                <Ionicons name="location" size={14} color="#666" /> {contentData.location}
              </Text>
            )}
            {contentData.description && (
              <Text style={styles.description} numberOfLines={2}>
                {contentData.description}
              </Text>
            )}
            <Text style={styles.submittedText}>
              Submitted: {new Date(item.submitted_at).toLocaleString()}
            </Text>
          </View>

          {/* Action Buttons */}
          {item.status === 'pending' && (
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleApprove(item.content_id)}
                disabled={processing}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleReject(item.content_id)}
                disabled={processing}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Rejection Info */}
          {item.status === 'rejected' && item.metadata?.rejection_reason && (
            <View style={styles.rejectionInfo}>
              <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
              <Text style={styles.rejectionReason}>{item.metadata.rejection_reason}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'approved':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      default:
        return '#999';
    }
  };

  if (loading && !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1565FF" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="shield-checkmark" size={28} color="#1565FF" />
          <Text style={styles.headerTitle}>Content Moderation</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            AsyncStorage.clear();
            router.replace('/');
          }}
          style={styles.logoutButton}
        >
          <Ionicons name="log-out-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total_pending}</Text>
            <Text style={styles.statLabel}>Pending Review</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#34C759' }]}>
              {Object.values(stats.approved).reduce((a, b) => a + b, 0)}
            </Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#FF3B30' }]}>
              {Object.values(stats.rejected).reduce((a, b) => a + b, 0)}
            </Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
        </View>
      )}

      {/* Content Type Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.contentTabsScroll}
        contentContainerStyle={styles.contentTabs}
      >
        {contentTabs.map((tab) => {
          const count = stats?.[selectedStatus]?.[tab.id] || 0;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.contentTab, selectedTab === tab.id && styles.contentTabActive]}
              onPress={() => {
                setSelectedTab(tab.id);
                setSelectedItems(new Set());
              }}
            >
              <Ionicons
                name={tab.icon as any}
                size={18}
                color={selectedTab === tab.id ? '#1565FF' : '#666'}
              />
              <Text
                style={[
                  styles.contentTabText,
                  selectedTab === tab.id && styles.contentTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Status Filter Tabs */}
      <View style={styles.statusTabs}>
        {statusTabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.statusTab,
              selectedStatus === tab.id && { borderBottomColor: tab.color },
            ]}
            onPress={() => {
              setSelectedStatus(tab.id);
              setSelectedItems(new Set());
            }}
          >
            <Text
              style={[
                styles.statusTabText,
                selectedStatus === tab.id && { color: tab.color, fontWeight: '600' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search & Bulk Actions */}
      <View style={styles.toolbarContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by title or user..."
            placeholderTextColor="#999"
          />
        </View>

        {selectedStatus === 'pending' && selectedItems.size > 0 && (
          <View style={styles.bulkActions}>
            <Text style={styles.bulkSelectedText}>{selectedItems.size} selected</Text>
            <TouchableOpacity
              style={[styles.bulkButton, styles.bulkApproveButton]}
              onPress={() => handleBulkAction('approve')}
              disabled={processing}
            >
              <Text style={styles.bulkButtonText}>Bulk Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkButton, styles.bulkRejectButton]}
              onPress={() => handleBulkAction('reject')}
              disabled={processing}
            >
              <Text style={styles.bulkButtonText}>Bulk Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deselectButton} onPress={deselectAll}>
              <Text style={styles.deselectButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {selectedStatus === 'pending' && queueItems.length > 0 && (
          <TouchableOpacity style={styles.selectAllButton} onPress={selectAll}>
            <Text style={styles.selectAllText}>Select All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Queue Items */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#1565FF" style={{ marginTop: 50 }} />
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>
              No {selectedStatus} {selectedTab}s found
            </Text>
          </View>
        ) : (
          filteredItems.map(renderContentCard)
        )}
      </ScrollView>

      {/* Reject Reason Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rejection Reason</Text>
            <Text style={styles.modalSubtitle}>
              Explain why this content is being rejected (optional but recommended)
            </Text>

            {Platform.OS === 'web' ? (
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Does not meet quality standards, inappropriate content, missing information..."
                rows={4}
                style={{
                  borderWidth: '1px',
                  borderColor: '#ddd',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  width: '100%',
                  resize: 'vertical',
                  marginTop: '16px',
                }}
              />
            ) : (
              <TextInput
                style={styles.modalTextArea}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="e.g., Does not meet quality standards..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setCurrentActionItem(null);
                  setRejectReason('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalRejectButton]}
                onPress={confirmReject}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalRejectText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    borderBottomColor: '#eee',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  logoutButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  statCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FF9500',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  contentTabsScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  contentTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  contentTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  contentTabActive: {
    backgroundColor: '#E3F2FD',
  },
  contentTabText: {
    fontSize: 14,
    color: '#666',
  },
  contentTabTextActive: {
    color: '#1565FF',
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  statusTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  statusTabText: {
    fontSize: 14,
    color: '#666',
  },
  toolbarContainer: {
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  bulkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkSelectedText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkApproveButton: {
    backgroundColor: '#34C759',
  },
  bulkRejectButton: {
    backgroundColor: '#FF3B30',
  },
  bulkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deselectButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deselectButtonText: {
    color: '#1565FF',
    fontSize: 14,
  },
  selectAllButton: {
    paddingVertical: 8,
  },
  selectAllText: {
    color: '#1565FF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: '#1565FF',
    borderWidth: 2,
  },
  checkbox: {
    padding: 16,
    justifyContent: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1565FF',
    borderColor: '#1565FF',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  visibilityLabel: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  cardDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  submittedText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectionInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF3F3',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  rejectionLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  rejectionReason: {
    fontSize: 14,
    color: '#FF3B30',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalTextArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f5f5f5',
  },
  modalRejectButton: {
    backgroundColor: '#FF3B30',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalRejectText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
