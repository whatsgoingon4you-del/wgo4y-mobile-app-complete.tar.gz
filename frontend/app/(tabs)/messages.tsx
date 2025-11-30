import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  TextInput,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import UpgradeModal from '../../components/UpgradeModal';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Contact {
  id: string;
  username: string;
  full_name: string;
  user_type: string;
  membership_tier: string;
  profile_photo?: string;
  has_messages: boolean;
  unread_count?: number;
  last_message?: string;
  last_message_time?: string;
}

interface Conversation {
  contact: Contact;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: Date;
}

type ContactFilter = 'all' | 'general_public' | 'entrepreneur' | 'business';

export default function Messages() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBasicTier, setIsBasicTier] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [contactFilter, setContactFilter] = useState<ContactFilter>('all');

  // Poll for updates every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isBasicTier) {
        loadConversations(true); // Silent refresh
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isBasicTier]);

  // Refresh when screen comes into focus (handles returning from chat)
  useFocusEffect(
    React.useCallback(() => {
      loadUserProfileAndMessages();
      
      // Also refresh when returning to this screen
      return () => {
        // Cleanup - could add logic here if needed
      };
    }, [])
  );

  const loadUserProfileAndMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const profile = response.data;
      const isFree = !profile.membership_tier || 
                     profile.membership_tier === 'basic' ||
                     profile.membership_tier === 'free';
      
      setIsBasicTier(isFree);

      if (!isFree) {
        await loadConversations();
        await loadAllContacts();
      }
    } catch (error: any) {
      // Handle 401 Unauthorized - user logged out
      if (error.response && error.response.status === 401) {
        console.log('🔒 401 Unauthorized - User logged out');
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user');
        router.replace('/auth/login');
        return;
      }
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user');
      const currentUserId = userData ? JSON.parse(userData)._id : null;
      
      // Get unread counts by contact FIRST (before fetching threads which mark as read)
      const unreadRes = await axios.get(`${API_URL}/api/messages/unread-by-contact`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const unreadByContact = unreadRes.data;
      
      console.log('📬 Unread messages by contact:', unreadByContact);
      
      // Get all contacts with message history
      const contactsRes = await axios.get(`${API_URL}/api/messages/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('👥 Contacts response:', contactsRes.data);
      
      // Safety check: Ensure contacts data exists
      if (!contactsRes.data || !Array.isArray(contactsRes.data)) {
        console.error('❌ Contacts data is null or not an array:', contactsRes.data);
        setConversations([]);
        return;
      }

      // Filter contacts who have message history
      const contactsWithMessages = contactsRes.data.filter((c: Contact) => c && c.has_messages);
      
      console.log(`💬 Contacts with messages: ${contactsWithMessages.length}`);

      // If no contacts with messages, return empty array
      if (contactsWithMessages.length === 0) {
        console.log('ℹ️ No conversations found');
        setConversations([]);
        return;
      }

      // Get last messages for each contact WITHOUT marking as read
      const conversationsData = await Promise.all(
        contactsWithMessages.map(async (contact: Contact) => {
          try {
            // Get message preview (does NOT mark as read)
            const previewRes = await axios.get(`${API_URL}/api/messages/preview/${contact.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            const preview = previewRes.data;
            
            // Use pre-fetched unread count
            const unreadData = unreadByContact[contact.id];
            const unreadCount = unreadData ? unreadData.count : 0;

            console.log(`💬 ${contact.username}: ${unreadCount} unread messages`);

            return {
              contact,
              unreadCount: unreadCount,
              lastMessage: preview.content || '',
              lastMessageTime: new Date(preview.timestamp || Date.now()),
            };
          } catch (error) {
            console.error(`Error loading preview for ${contact.username}:`, error);
            return null;
          }
        })
      );

      // Filter out nulls and sort by last message time
      const validConversations = (conversationsData || [])
        .filter((c) => c !== null)
        .sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());

      setConversations(validConversations);
      
      console.log('✅ Loaded conversations:', validConversations.length);
    } catch (error: any) {
      // Handle 401 Unauthorized - user logged out
      if (error.response && error.response.status === 401) {
        console.log('🔒 401 Unauthorized - User logged out, redirecting to login...');
        // Clear local storage
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user');
        // Clear conversations
        setConversations([]);
        // Redirect to login screen
        router.replace('/(auth)/login');
        return;
      }
      console.error('Error loading conversations:', error);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAllContacts = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/messages/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setAllContacts(response.data);
      setFilteredContacts(response.data);
    } catch (error: any) {
      // Handle 401 Unauthorized - user logged out
      if (error.response && error.response.status === 401) {
        console.log('🔒 401 Unauthorized - User logged out');
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user');
        router.replace('/auth/login');
        return;
      }
      console.error('Error loading contacts:', error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, contactFilter);
  };

  const handleFilterChange = (filter: ContactFilter) => {
    setContactFilter(filter);
    applyFilters(searchQuery, filter);
  };

  const applyFilters = (query: string, filter: ContactFilter) => {
    let filtered = [...allContacts];

    // Apply user type filter
    if (filter !== 'all') {
      filtered = filtered.filter(contact => contact.user_type === filter);
    }

    // Apply search query
    if (query.trim()) {
      const lowercaseQuery = query.toLowerCase();
      filtered = filtered.filter((contact) =>
        contact.username.toLowerCase().includes(lowercaseQuery) ||
        contact.full_name.toLowerCase().includes(lowercaseQuery)
      );
    }
    
    setFilteredContacts(filtered);
  };

  const handleNewMessage = () => {
    if (isBasicTier) {
      setShowUpgradeModal(true);
    } else {
      setShowContactsModal(true);
    }
  };

  // Restore filter state when modal opens and contacts are loaded
  useEffect(() => {
    if (showContactsModal && allContacts.length > 0) {
      loadAndApplySavedFilter();
    }
  }, [showContactsModal, allContacts]);

  const loadAndApplySavedFilter = async () => {
    try {
      const savedFilter = await AsyncStorage.getItem('contacts_filter');
      if (savedFilter && savedFilter !== 'all') {
        const filter = savedFilter as ContactFilter;
        console.log('📂 Restoring filter:', filter);
        setContactFilter(filter);
        // Apply the filter immediately
        applyFilters(searchQuery, filter);
        // Clear the saved filter after restoring
        await AsyncStorage.removeItem('contacts_filter');
      } else {
        // No saved filter, apply current filter
        applyFilters(searchQuery, contactFilter);
      }
    } catch (error) {
      console.error('Error loading saved filter:', error);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setShowContactsModal(false);
    setSearchQuery('');
    router.push(`/chat/${contact.id}`);
  };

  const handleOpenConversation = (contact: Contact) => {
    router.push(`/chat/${contact.id}`);
  };

  const handleViewProfile = (contact: Contact) => {
    // Save current filter before navigating
    AsyncStorage.setItem('contacts_filter', contactFilter);
    // Navigate to user's profile page
    router.push(`/profile/${contact.id}`);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
  };

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleArchiveConversation = async (contactId: string, contactName: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Optimistic update: Remove from UI immediately
      setConversations(prev => prev.filter(c => c.contact.id !== contactId));
      
      // Call backend to archive
      await axios.post(`${API_URL}/api/messages/archive/${contactId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Show success feedback
      Alert.alert('Archived', `Conversation with ${contactName} has been archived.`);
    } catch (error) {
      console.error('Error archiving conversation:', error);
      // Reload conversations if error occurs
      await loadConversations();
      Alert.alert('Error', 'Failed to archive conversation. Please try again.');
    }
  };

  const renderRightActions = (contactId: string, contactName: string) => {
    return (
      <TouchableOpacity
        style={styles.archiveButton}
        onPress={() => handleArchiveConversation(contactId, contactName)}
      >
        <Ionicons name="archive" size={24} color="#fff" />
        <Text style={styles.archiveButtonText}>Archive</Text>
      </TouchableOpacity>
    );
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const hasUnread = item.unreadCount > 0;

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item.contact.id, item.contact.username)}
        overshootRight={false}
        friction={2}
      >
        <TouchableOpacity
          style={[styles.conversationItem, hasUnread && styles.conversationItemUnread]}
          onPress={() => handleOpenConversation(item.contact)}
        >
          {/* Profile Photo - Clickable to view profile */}
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => handleViewProfile(item.contact)}
          >
            {item.contact.profile_photo ? (
              <Image source={{ uri: item.contact.profile_photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={24} color="#999" />
              </View>
            )}
            {hasUnread && <View style={styles.onlineDot} />}
          </TouchableOpacity>

          {/* Conversation Details */}
          <View style={styles.conversationDetails}>
            <View style={styles.conversationHeader}>
              <View style={styles.nameContainer}>
                <Text style={[styles.contactName, hasUnread && styles.unreadName]}>
                  {item.contact.username}
                </Text>
                {hasUnread && (
                  <View style={styles.unreadDot} />
                )}
              </View>
              <Text style={styles.messageTime}>
                {formatMessageTime(item.lastMessageTime)}
              </Text>
            </View>
            <View style={styles.messagePreviewContainer}>
              <Text
                style={[styles.messagePreview, hasUnread && styles.unreadPreview]}
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
              {hasUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleSelectContact(item)}
    >
      {/* Profile picture - clickable to view profile */}
      <TouchableOpacity onPress={() => handleViewProfile(item)}>
        {item.profile_photo ? (
          <Image source={{ uri: item.profile_photo }} style={styles.contactAvatar} />
        ) : (
          <View style={[styles.contactAvatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={20} color="#999" />
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.username}</Text>
        <Text style={styles.contactFullName}>{item.full_name}</Text>
      </View>
      <View style={[styles.tierBadge, 
        item.membership_tier === 'gold' || item.membership_tier === 'networking' ? styles.goldBadge :
        item.membership_tier === 'silver' ? styles.silverBadge : styles.basicBadge
      ]}>
        <Text style={styles.tierBadgeText}>{item.membership_tier.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isBasicTier) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={64} color="#999" />
          <Text style={styles.lockedTitle}>Messaging is Locked</Text>
          <Text style={styles.lockedSubtitle}>
            Upgrade to start messaging other members
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => setShowUpgradeModal(true)}
          >
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
          </TouchableOpacity>
        </View>
        <UpgradeModal
          visible={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          userType="general_public"
        />
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header with New Message Button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity style={styles.newMessageButton} onPress={handleNewMessage}>
            <Ionicons name="add-circle" size={28} color="#1565FF" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Conversations List */}
        {conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to start a new conversation
            </Text>
          </View>
        ) : (
          <FlatList
            data={searchQuery ? conversations.filter(c => 
              c.contact.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.contact.username.toLowerCase().includes(searchQuery.toLowerCase())
            ) : conversations}
            renderItem={renderConversationItem}
            keyExtractor={(item) => item.contact.id}
            contentContainerStyle={styles.listContainer}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        )}

        {/* Contacts Modal */}
        <Modal
          visible={showContactsModal}
          animationType="slide"
          onRequestClose={() => setShowContactsModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowContactsModal(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Message</Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search contacts..."
                value={searchQuery}
                onChangeText={handleSearch}
                placeholderTextColor="#999"
                autoFocus
              />
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[styles.filterTab, contactFilter === 'all' && styles.filterTabActive]}
                onPress={() => handleFilterChange('all')}
              >
                <Text style={[styles.filterTabText, contactFilter === 'all' && styles.filterTabTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, contactFilter === 'general_public' && styles.filterTabActive]}
                onPress={() => handleFilterChange('general_public')}
              >
                <Text style={[styles.filterTabText, contactFilter === 'general_public' && styles.filterTabTextActive]}>
                  General Public
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, contactFilter === 'entrepreneur' && styles.filterTabActive]}
                onPress={() => handleFilterChange('entrepreneur')}
              >
                <Text style={[styles.filterTabText, contactFilter === 'entrepreneur' && styles.filterTabTextActive]}>
                  Entrepreneurs
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterTab, contactFilter === 'business' && styles.filterTabActive]}
                onPress={() => handleFilterChange('business')}
              >
                <Text style={[styles.filterTabText, contactFilter === 'business' && styles.filterTabTextActive]}>
                  Businesses
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredContacts}
              renderItem={renderContactItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
            />
          </SafeAreaView>
        </Modal>

        <UpgradeModal
          visible={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          userType="general_public"
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  newMessageButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  listContainer: {
    paddingBottom: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  conversationItemUnread: {
    backgroundColor: '#f0f7ff',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1565FF',
    marginLeft: 6,
  },
  contactName: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  unreadName: {
    fontWeight: '700',
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messagePreview: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  unreadPreview: {
    fontWeight: '600',
    color: '#000',
  },
  unreadBadge: {
    backgroundColor: '#1565FF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
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
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 24,
  },
  lockedSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 32,
  },
  upgradeButton: {
    backgroundColor: '#1565FF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactFullName: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  contactUsername: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  tierBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  goldBadge: {
    backgroundColor: '#fff3e0',
  },
  silverBadge: {
    backgroundColor: '#f5f5f5',
  },
  basicBadge: {
    backgroundColor: '#e3f2fd',
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1565FF',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#1565FF',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  archiveButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
  },
  archiveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
