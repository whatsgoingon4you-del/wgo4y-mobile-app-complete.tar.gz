import { Tabs, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Fetch unread count periodically and on focus
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) return;
        
        const response = await axios.get(`${API_URL}/api/messages/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setUnreadCount(response.data.count || 0);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };
    
    // Initial fetch
    fetchUnreadCount();
    
    // Poll every 10 seconds (reduced from 30)
    const interval = setInterval(fetchUnreadCount, 10000);
    
    // Also check for manual refresh triggers
    const checkInterval = setInterval(async () => {
      const shouldRefresh = await AsyncStorage.getItem('refresh_unread_badge');
      if (shouldRefresh === 'true') {
        await AsyncStorage.removeItem('refresh_unread_badge');
        fetchUnreadCount();
      }
    }, 1000); // Check every second for refresh trigger
    
    return () => {
      clearInterval(interval);
      clearInterval(checkInterval);
    };
  }, []);
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1565FF',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="chatbubbles" size={size} color={color} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  {unreadCount === 1 ? (
                    <View style={styles.dot} />
                  ) : (
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  )}
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

