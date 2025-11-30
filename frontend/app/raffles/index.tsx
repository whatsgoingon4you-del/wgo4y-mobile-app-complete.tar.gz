import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function RafflesPage() {
  const router = useRouter();
  const [raffles, setRaffles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadRaffles();
    }, [])
  );

  const loadRaffles = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Load ALL raffles (active and closed) - sort by end date
      const response = await axios.get(`${API_URL}/api/raffles`, { headers });
      setRaffles(response.data);
      
      console.log(`✅ Raffles: Loaded ${response.data.length} raffles (active + closed)`);
    } catch (error) {
      console.error('Error loading raffles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRaffles();
  };

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
    return 'Ending soon';
  };

  const renderRaffle = ({ item }: { item: any }) => {
    const hasEntered = item.user_entry_count > 0;
    const isClosed = item.status === 'closed';
    const hasWinner = item.winner_user_id !== null;
    
    return (
      <TouchableOpacity
        style={styles.raffleCard}
        onPress={() => router.push(`/raffle/${item.id}`)}
      >
        <Image source={{ uri: item.image }} style={styles.raffleImage} />
        
        {/* Status Badge - Closed/Winner */}
        {isClosed && hasWinner && (
          <View style={styles.closedBadge}>
            <Ionicons name="trophy" size={14} color="#FFD700" />
            <Text style={styles.closedBadgeText}>Winner Announced</Text>
          </View>
        )}
        
        {/* User Entry Badge */}
        {hasEntered && !isClosed && (
          <View style={styles.entryBadge}>
            <Ionicons name="ticket" size={14} color="#fff" />
            <Text style={styles.entryBadgeText}>
              {item.user_entry_count} {item.user_entry_count === 1 ? 'Entry' : 'Entries'}
            </Text>
          </View>
        )}
        
        <View style={styles.raffleInfo}>
          <Text style={styles.raffleTitle} numberOfLines={2}>
            {item.title}
          </Text>
          
          {/* Prize */}
          <View style={styles.prizeContainer}>
            <Ionicons name="gift-outline" size={18} color="#FF9800" />
            <Text style={styles.prizeText} numberOfLines={1}>
              {item.prize}
            </Text>
          </View>
          
          {/* Time Remaining or Closed Status */}
          <View style={styles.metaRow}>
            <Ionicons name={isClosed ? "checkmark-circle-outline" : "time-outline"} size={16} color={isClosed ? "#4CAF50" : "#666"} />
            <Text style={[styles.metaText, isClosed && styles.closedText]}>
              {isClosed ? 'Raffle Closed' : getTimeRemaining(item.end_date)}
            </Text>
          </View>
          
          <View style={styles.raffleFooter}>
            <Text style={styles.ticketPrice}>${item.ticket_price}/entry</Text>
            <Text style={styles.entriesCount}>
              {item.total_entries} {item.max_tickets ? `/ ${item.max_tickets}` : ''} entries
            </Text>
          </View>
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="gift-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No active raffles</Text>
      <Text style={styles.emptySubtext}>
        Check back soon for new raffle campaigns!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Raffles</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={raffles}
          renderItem={renderRaffle}
          keyExtractor={(item) => item.id}
          contentContainerStyle={raffles.length === 0 ? styles.emptyListContainer : styles.listContent}
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
  listContent: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  entryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  entryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
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
  closedText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  raffleInfo: {
    flex: 1,
    padding: 16,
  },
  raffleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  prizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  prizeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF9800',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  raffleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  ticketPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565FF',
  },
  entriesCount: {
    fontSize: 13,
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
