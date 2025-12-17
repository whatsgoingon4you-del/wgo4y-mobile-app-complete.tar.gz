import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://test-ready-preview.preview.emergentagent.com';

export default function MyRafflesScreen() {
  const router = useRouter();
  const [raffles, setRaffles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadMyRaffles();
    }, [])
  );

  const loadMyRaffles = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Get user info to get their ID
      const profileRes = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userId = profileRes.data.id;
      
      // Get ALL raffles
      const rafflesRes = await axios.get(`${API_URL}/api/raffles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter to only show raffles created by this user
      const myRaffles = rafflesRes.data.filter((raffle: any) => {
        // Check if this raffle was created by current user
        // Demo raffles don't have owner_id, so they won't show here
        return raffle.owner_id === userId || raffle.created_by === userId;
      });
      
      setRaffles(myRaffles);
      console.log(`✅ Loaded ${myRaffles.length} raffles created by you (filtered from ${rafflesRes.data.length} total)`);
    } catch (error) {
      console.error('Error loading my raffles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMyRaffles();
  };

  const renderRaffle = ({ item }: { item: any }) => {
    const isClosed = item.status === 'closed';
    const hasWinner = item.winner_user_id !== null;
    
    return (
      <TouchableOpacity
        style={styles.raffleCard}
        onPress={() => router.push(`/raffle/${item.id}`)}
      >
        <Image source={{ uri: item.image }} style={styles.raffleImage} />
        
        {isClosed && hasWinner && (
          <View style={styles.closedBadge}>
            <Ionicons name="trophy" size={14} color="#FFD700" />
            <Text style={styles.closedBadgeText}>Winner Announced</Text>
          </View>
        )}
        
        <View style={styles.raffleInfo}>
          <Text style={styles.raffleTitle}>{item.title}</Text>
          <Text style={styles.rafflePrize}>🎁 {item.prize}</Text>
          
          <View style={styles.raffleStats}>
            <View style={styles.statItem}>
              <Ionicons name="ticket-outline" size={16} color="#666" />
              <Text style={styles.statText}>${item.ticket_price}/entry</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={16} color="#666" />
              <Text style={styles.statText}>{item.total_entries || 0} entries</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: isClosed ? '#999' : '#4CAF50' }]}>
              <Text style={styles.statusText}>{isClosed ? 'CLOSED' : 'ACTIVE'}</Text>
            </View>
            <Text style={styles.endDate}>
              {isClosed ? 'Ended' : `Ends ${new Date(item.end_date).toLocaleDateString()}`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="gift-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No raffles created yet</Text>
      <Text style={styles.emptySubtext}>
        Create your first raffle to engage customers
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => router.push('/raffles/create')}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Create Raffle</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/dashboard')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Raffles</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/dashboard')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Raffles</Text>
        <TouchableOpacity onPress={() => router.push('/raffles/create')} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color="#1565FF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={raffles}
        renderItem={renderRaffle}
        keyExtractor={(item) => item.id}
        contentContainerStyle={raffles.length === 0 ? styles.emptyListContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={renderEmpty}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
  },
  raffleCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  raffleImage: {
    width: 120,
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  closedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  closedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  raffleInfo: {
    flex: 1,
    padding: 12,
  },
  raffleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  rafflePrize: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  raffleStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  endDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
