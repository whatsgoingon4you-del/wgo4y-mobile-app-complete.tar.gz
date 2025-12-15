import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
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

export default function MyEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [rsvpdEvents, setRsvpdEvents] = useState<any[]>([]);
  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  const [waitlistEvents, setWaitlistEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'rsvpd' | 'saved' | 'waitlist' | 'created' | 'published' | 'draft' | 'cancelled' | null>(null); // Start as null, will be set based on user type
  const [userType, setUserType] = useState<string>('');

  useEffect(() => {
    loadUserType();
  }, []);

  useEffect(() => {
    // Set correct default filter based on user type
    if (userType === 'general_public') {
      setFilter('rsvpd'); // Default to RSVP'd for GP
    } else if (userType === 'business' || userType === 'entrepreneur') {
      setFilter('created'); // Default to All for organizers
    }
  }, [userType]);

  useEffect(() => {
    // Only load events if both userType and filter are set
    if (userType && filter) {
      loadMyEvents();
    }
  }, [filter, userType]);

  // Refresh events when screen comes into focus (always reload to show latest data)
  useFocusEffect(
    React.useCallback(() => {
      if (userType && filter) {
        console.log('🔄 My Events: Reloading events on screen focus, filter:', filter);
        loadMyEvents();
      }
    }, [userType, filter]) // Depend on both to ensure proper loading
  );

  const loadUserType = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;
      
      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const accountType = response.data.user_type;
      setUserType(accountType);
      
      // Set correct default filter based on user type
      if (accountType === 'general_public') {
        setFilter('rsvpd'); // Default to RSVP'd tab for GP
        console.log('🎯 My Events: Setting default filter to "rsvpd" for General Public');
      } else if (accountType === 'business' || accountType === 'entrepreneur') {
        setFilter('created'); // Default to All tab for organizers
        console.log('🎯 My Events: Setting default filter to "created" (All) for organizers');
      }
    } catch (error) {
      console.error('Error loading user type:', error);
    }
  };

  const loadMyEvents = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        Alert.alert('Authentication Required', 'Please log in to view your events', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') }
        ]);
        return;
      }

      // For GP users: Load RSVP'd, saved, and waitlist events
      if (userType === 'general_public') {
        if (filter === 'rsvpd') {
          const response = await axios.get(`${API_URL}/api/my-rsvps`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setRsvpdEvents(response.data);
        } else if (filter === 'saved') {
          // Saved events will be implemented later
          setSavedEvents([]);
        } else if (filter === 'waitlist') {
          const response = await axios.get(`${API_URL}/api/my-waitlist`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setWaitlistEvents(response.data);
        }
      } else {
        // For entrepreneurs/businesses: Load created events
        // "created" filter = All events (no status filter)
        // Other filters = specific status (published, draft, cancelled)
        let url = `${API_URL}/api/events/my-events`;
        
        // Only add status filter if NOT "created" (All)
        if (filter !== 'created') {
          url += `?status=${filter}`;
        }
        
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setEvents(response.data);
      }
    } catch (error: any) {
      console.error('Error loading events:', error);
      
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please log in again', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') }
        ]);
      } else {
        Alert.alert('Error', error.response?.data?.detail || 'Failed to load events');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancelRSVP = async (eventId: string, eventTitle: string) => {
    Alert.alert(
      'Cancel RSVP',
      `Cancel your RSVP for "${eventTitle}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              await axios.delete(`${API_URL}/api/events/${eventId}/rsvp`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              Alert.alert("RSVP Cancelled", "You can now use this RSVP slot for another event.");
              loadMyEvents();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to cancel RSVP');
            }
          },
        },
      ]
    );
  };

  const handleLeaveWaitlist = async (eventId: string, eventTitle: string) => {
    Alert.alert(
      'Leave Waitlist',
      `Leave the waitlist for "${eventTitle}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              await axios.delete(`${API_URL}/api/events/${eventId}/waitlist`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              Alert.alert("Left Waitlist", "You've been removed from the waitlist.");
              loadMyEvents();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to leave waitlist');
            }
          },
        },
      ]
    );
  };

  const renderRSVPEvent = ({ item }: { item: any }) => (
    <View style={styles.eventCard}>
      {item.image && <Image source={{ uri: item.image }} style={styles.eventImage} />}
      
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
        
        <View style={styles.eventInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>{item.venue}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/event/${item.id}`)}
          >
            <Ionicons name="eye-outline" size={20} color="#1565FF" />
            <Text style={styles.actionText}>View Event</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleCancelRSVP(item.id, item.title)}
          >
            <Ionicons name="close-circle-outline" size={20} color="#ff4444" />
            <Text style={[styles.actionText, styles.cancelText]}>Cancel RSVP</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderWaitlistEvent = ({ item }: { item: any }) => (
    <View style={styles.eventCard}>
      {item.image && <Image source={{ uri: item.image }} style={styles.eventImage} />}
      
      <View style={styles.eventContent}>
        <View style={styles.waitlistHeader}>
          <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.positionBadge}>
            <Text style={styles.positionText}>#{item.waitlist_position}</Text>
          </View>
        </View>
        
        <View style={styles.eventInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>{item.venue}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#FF9800" />
            <Text style={[styles.infoText, styles.waitlistInfoText]}>
              Position #{item.waitlist_position} in line
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/event/${item.id}`)}
          >
            <Ionicons name="eye-outline" size={20} color="#1565FF" />
            <Text style={styles.actionText}>View Event</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleLeaveWaitlist(item.id, item.title)}
          >
            <Ionicons name="exit-outline" size={20} color="#ff4444" />
            <Text style={[styles.actionText, styles.cancelText]}>Leave Waitlist</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMyEvents();
  };

  const handleDelete = (eventId: string, eventTitle: string) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${eventTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              await axios.delete(`${API_URL}/api/events/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              Alert.alert('Success', 'Event deleted successfully');
              loadMyEvents();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  const renderEvent = ({ item }: { item: any }) => (
    <View style={styles.eventCard}>
      <Image source={{ uri: item.image }} style={styles.eventImage} />
      
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
          <View style={[
            styles.statusBadge,
            item.status === 'published' && styles.statusPublished,
            item.status === 'draft' && styles.statusDraft,
            item.status === 'cancelled' && styles.statusCancelled,
          ]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.eventInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>{item.venue}</Text>
          </View>
        </View>

        <View style={styles.eventStats}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={18} color="#1565FF" />
            <Text style={styles.statText}>{item.tickets_available}/{item.capacity}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={18} color="#4CAF50" />
            <Text style={styles.statText}>${item.price}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/event/${item.id}`)}
          >
            <Ionicons name="eye-outline" size={20} color="#1565FF" />
            <Text style={styles.actionText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/events/edit/${item.id}`)}
          >
            <Ionicons name="create-outline" size={20} color="#FF9800" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item.id, item.title)}
          >
            <Ionicons name="trash-outline" size={20} color="#F44336" />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Events Yet</Text>
      <Text style={styles.emptyText}>
        Create your first event to get started!
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => router.push('/events/create')}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Create Event</Text>
      </TouchableOpacity>
    </View>
  );


  const renderGPEmptyRSVPd = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No upcoming events yet</Text>
      <Text style={styles.emptyText}>
        You haven&apos;t RSVP&apos;d to any events. Browse what&apos;s going on and lock in your spot when you&apos;re ready.
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => router.push('/events')}
      >
        <Text style={styles.browseButtonText}>Browse Events</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGPEmptyWaitlist = () => (
    <View style={styles.emptyState}>
      <Ionicons name="time-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No waitlisted events</Text>
      <Text style={styles.emptyText}>
        You&apos;re not on any waitlists. When an event fills up, you can join the waitlist and we&apos;ll let you know if a spot opens.
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => router.push('/events')}
      >
        <Text style={styles.browseButtonText}>Browse Events</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGPEmptySaved = () => (
    <View style={styles.emptyState}>
      <Ionicons name="bookmark-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No saved events yet</Text>
      <Text style={styles.emptyText}>
        See something you might want to check out later? Tap Save on an event and it'll show up here.
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => router.push('/events')}
      >
        <Text style={styles.browseButtonText}>Find Events to Save</Text>
      </TouchableOpacity>
    </View>
  );


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Events</Text>
        {/* Only show create button for organizers */}
        {userType !== 'general_public' && (
          <TouchableOpacity onPress={() => router.push('/events/create')} style={styles.addButton}>
            <Ionicons name="add-circle" size={28} color="#1565FF" />
          </TouchableOpacity>
        )}
        {userType === 'general_public' && <View style={{ width: 28 }} />}
      </View>

      {/* Filter Tabs - Different for GP vs Organizers */}
      <View style={styles.filterContainer}>
        {userType === 'general_public' ? (
          // GP Users: RSVP'd | Waitlist | Saved
          <>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'rsvpd' && styles.filterTabActive]}
              onPress={() => setFilter('rsvpd')}
            >
              <Text style={[styles.filterText, filter === 'rsvpd' && styles.filterTextActive]}>
                RSVP'd
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filter === 'waitlist' && styles.filterTabActive]}
              onPress={() => setFilter('waitlist')}
            >
              <Text style={[styles.filterText, filter === 'waitlist' && styles.filterTextActive]}>
                Waitlist
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filter === 'saved' && styles.filterTabActive]}
              onPress={() => setFilter('saved')}
            >
              <Text style={[styles.filterText, filter === 'saved' && styles.filterTextActive]}>
                Saved
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          // Organizers: All | Published | Drafts | Canceled
          <>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'created' && styles.filterTabActive]}
              onPress={() => setFilter('created')}
            >
              <Text style={[styles.filterText, filter === 'created' && styles.filterTextActive]}>
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filter === 'published' && styles.filterTabActive]}
              onPress={() => setFilter('published')}
            >
              <Text style={[styles.filterText, filter === 'published' && styles.filterTextActive]}>
                Published
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filter === 'draft' && styles.filterTabActive]}
              onPress={() => setFilter('draft')}
            >
              <Text style={[styles.filterText, filter === 'draft' && styles.filterTextActive]}>
                Drafts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filter === 'cancelled' && styles.filterTabActive]}
              onPress={() => setFilter('cancelled')}
            >
              <Text style={[styles.filterText, filter === 'cancelled' && styles.filterTextActive]}>
                Canceled
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Event List */}
      <FlatList
        data={userType === 'general_public' ? (filter === 'rsvpd' ? rsvpdEvents : filter === 'waitlist' ? waitlistEvents : savedEvents) : events}
        renderItem={userType === 'general_public' ? (filter === 'waitlist' ? renderWaitlistEvent : renderRSVPEvent) : renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          userType === 'general_public' 
            ? (filter === 'rsvpd' 
                ? renderGPEmptyRSVPd() 
                : filter === 'waitlist'
                ? renderGPEmptyWaitlist()
                : renderGPEmptySaved())
            : renderEmptyState()
        }
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
  addButton: {
    padding: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#1565FF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventImage: {
    width: '100%',
    height: 150,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusPublished: {
    backgroundColor: '#4CAF50',
  },
  statusDraft: {
    backgroundColor: '#FF9800',
  },
  statusCancelled: {
    backgroundColor: '#F44336',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  eventInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  eventStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  browseButton: {
    backgroundColor: '#1565FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderColor: '#ff4444',
  },
  cancelText: {
    color: '#ff4444',
  },
  waitlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  positionBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  positionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  waitlistInfoText: {
    color: '#FF9800',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
});

