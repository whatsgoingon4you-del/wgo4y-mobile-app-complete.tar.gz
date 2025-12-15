import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

interface Message {
  id: string;
  from_user: string;
  to_user: string;
  content: string;
  read: boolean;
  timestamp: string;
}

interface ContactInfo {
  id: string;
  username: string;
  full_name: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const contactId = params.id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [contactName, setContactName] = useState('User');
  const flatListRef = useRef<FlatList>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadContactInfo();
    loadMessages();
    loadCurrentUser();
    
    // Start polling for new messages every 5 seconds
    pollIntervalRef.current = setInterval(() => {
      loadMessages(true); // Silent reload
    }, 5000);

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      // Trigger badge refresh when leaving chat
      AsyncStorage.setItem('refresh_unread_badge', 'true');
    };
  }, [contactId]);

  const loadContactInfo = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/users/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const contact = response.data;
      // Use username as primary display
      setContactName(contact.username || contact.full_name || 'User');
    } catch (error) {
      console.error('Error loading contact info:', error);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadMessages = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/messages/thread/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(response.data);
      
      // Scroll to bottom on initial load
      if (!silent) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      if (!silent) {
        if (Platform.OS === 'web') {
          alert('Error loading messages');
        } else {
          Alert.alert('Error', 'Failed to load messages');
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.post(
        `${API_URL}/api/messages`,
        {
          to_user: contactId,
          content: newMessage.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Add new message to list
      setMessages([...messages, response.data]);
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      if (Platform.OS === 'web') {
        alert('Error: ' + (error.response?.data?.detail || 'Failed to send message'));
      } else {
        Alert.alert('Error', error.response?.data?.detail || 'Failed to send message');
      }
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Function to detect and render URLs as clickable links
  const renderMessageContent = (content: string, isMyMessage: boolean) => {
    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlPattern);

    return parts.map((part, index) => {
      if (part.match(urlPattern)) {
        return (
          <Text
            key={index}
            style={[styles.linkText, isMyMessage && styles.myLinkText]}
            onPress={() => {
              Linking.openURL(part).catch((err) => {
                console.error('Failed to open URL:', err);
                Alert.alert('Error', 'Could not open the link');
              });
            }}
          >
            {part}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.from_user === currentUserId;
    
    return (
      <View style={[styles.messageContainer, isMyMessage && styles.myMessageContainer]}>
        <View style={[styles.messageBubble, isMyMessage && styles.myMessageBubble]}>
          <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
            {renderMessageContent(item.content, isMyMessage)}
          </Text>
          <Text style={[styles.timestamp, isMyMessage && styles.myTimestamp]}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{contactName}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{contactName}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Send a message to start the conversation</Text>
            </View>
          }
        />

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    padding: 12,
  },
  myMessageBubble: {
    backgroundColor: '#1565FF',
  },
  messageText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  myTimestamp: {
    color: '#E3F2FD',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1565FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  linkText: {
    color: '#1565FF',
    textDecorationLine: 'underline',
  },
  myLinkText: {
    color: '#E3F2FD',
    textDecorationLine: 'underline',
  },
});
