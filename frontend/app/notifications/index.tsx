import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

interface Notification {
  id: string;
  type: string;
  event_id: string | null;
  raffle_id: string | null;
  consulting_request_id: string | null;  // Add consulting request ID
  worker_id: string | null;  // Add worker ID
  requester_id: string | null;  // Add requester ID for contact requests
  event_title: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
    }, [])
  );

  const loadNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        Alert.alert('Authentication Required', 'Please log in to view notifications', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') }
        ]);
        return;
      }

      const response = await axios.get(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifications(response.data);
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please log in again', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') }
        ]);
      } else {
        Alert.alert('Error', 'Failed to load notifications');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        await axios.patch(
          `${API_URL}/api/notifications/${notification.id}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Update local state
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on notification type
    if (notification.type === 'RAFFLE_WINNER' && notification.raffle_id) {
      // Navigate to raffle detail for winner notifications
      router.push(`/raffle/${notification.raffle_id}`);
    } else if (notification.type === 'CONSULTING_MESSAGE') {
      // Navigate to messages for consulting reply notifications
      router.push('/messages');
    } else if (notification.type === 'CONSULTING_REQUEST' || notification.type === 'CONSULTING_COMPLETED') {
      // Navigate to consulting request detail
      if (notification.consulting_request_id) {
        router.push(`/consultant/${notification.consulting_request_id}`);
      }
    } else if (notification.type === 'WORKER_CONTACT_REQUEST') {
      // Navigate directly to message thread with the requester
      if (notification.requester_id) {
        router.push(`/chat/${notification.requester_id}`);
      } else {
        // Fallback to messages if no requester_id
        router.push('/messages');
      }
    } else if (notification.type === 'WORKER_APPLICATION') {
      // Navigate to worker detail for admin to review application
      if (notification.worker_id) {
        router.push(`/workers/${notification.worker_id}`);
      }
    } else if (notification.type === 'WORKER_APPROVED') {
      // Navigate to worker profile when approved
      if (notification.worker_id) {
        router.push(`/workers/${notification.worker_id}`);
      }
    } else if (notification.event_id) {
      // Navigate to event for RSVP/waitlist notifications
      router.push(`/event/${notification.event_id}`);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.delete(`${API_URL}/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'WAITLIST_JOINED':
        return { name: 'list-outline', color: '#FF9800' };
      case 'WAITLIST_POSITION_CHANGED':
        return { name: 'trending-up-outline', color: '#4CAF50' };
      case 'WAITLIST_PROMOTED':
        return { name: 'checkmark-circle-outline', color: '#4CAF50' };
      case 'RSVP_CANCELLED':
        return { name: 'close-circle-outline', color: '#F44336' };
      case 'RAFFLE_WINNER':
        return { name: 'trophy-outline', color: '#FFD700' };
      case 'CONSULTING_REQUEST':
      case 'CONSULTING_IN_PROGRESS':
      case 'CONSULTING_COMPLETED':
      case 'CONSULTING_MESSAGE':
        return { name: 'chatbubble-ellipses-outline', color: '#1565FF' };
      case 'WORKER_APPLICATION':
      case 'WORKER_APPROVED':
      case 'WORKER_CONTACT_REQUEST':
        return { name: 'briefcase-outline', color: '#2196F3' };
      default:
        return { name: 'notifications-outline', color: '#1565FF' };
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins} min ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const iconData = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => {
          Alert.alert(
            'Delete Notification',
            'Remove this notification?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => handleDeleteNotification(item.id)
              }
            ]
          );
        }}
      >
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: `${iconData.color}20` }]}>
            <Ionicons name={iconData.name as any} size={24} color={iconData.color} />
          </View>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, !item.is_read && styles.unreadText]}>
            {item.title}
          </Text>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.notificationTime}>
            {getRelativeTime(item.created_at)}
          </Text>
        </View>

        {(item.event_id || item.raffle_id || item.consulting_request_id || item.worker_id || item.type === 'CONSULTING_MESSAGE') && (
          <Ionicons name="chevron-forward" size={20} color="#999" />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptyText}>
        We&apos;ll let you know when something important happens with your RSVPs and waitlist.
      </Text>
    </View>
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          notifications.length === 0 && styles.emptyListContainer
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
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
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#F0F7FF',
    borderLeftWidth: 4,
    borderLeftColor: '#1565FF',
  },
  iconContainer: {
    marginRight: 12,
    position: 'relative',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1565FF',
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '700',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
