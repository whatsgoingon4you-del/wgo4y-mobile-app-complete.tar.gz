import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

export default function RaffleDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [raffle, setRaffle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    loadRaffle();
  }, [id]);

  const loadRaffle = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${API_URL}/api/raffles/${id}`, { headers });
      setRaffle(response.data);
    } catch (error: any) {
      console.error('Error loading raffle:', error);
      Alert.alert('Error', 'Could not load raffle details');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterRaffle = () => {
    if (!raffle) return;
    
    Alert.alert(
      'Enter Raffle',
      `You're about to purchase a raffle entry for $${raffle.ticket_price}. You'll be redirected to Stripe checkout to complete payment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue to Checkout',
          onPress: async () => {
            setEntering(true);
            try {
              const token = await AsyncStorage.getItem('auth_token');
              
              const response = await axios.post(
                `${API_URL}/api/raffles/${id}/enter`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              
              // Check if response has checkout_url (Stripe) or is mock
              if (response.data.checkout_url) {
                // Real Stripe checkout - open in browser
                if (Platform.OS === 'web') {
                  window.location.href = response.data.checkout_url;
                } else {
                  // For mobile, use WebBrowser
                  const { WebBrowser } = await import('expo-web-browser');
                  await WebBrowser.openBrowserAsync(response.data.checkout_url);
                  
                  // After returning from browser, reload raffle
                  // Note: In production, you'd use webhooks to confirm payment
                  // For now, just reload to show updated count
                  setTimeout(() => {
                    loadRaffle();
                  }, 2000);
                }
              } else if (response.data.mock) {
                // Mock payment (fallback)
                const newEntryCount = response.data.user_entry_count || 1;
                
                Alert.alert(
                  'Success! (Test Mode)',
                  `You now have ${newEntryCount} ${newEntryCount === 1 ? 'entry' : 'entries'} in this raffle. Good luck!`
                );
                
                // Reload raffle to update counts
                loadRaffle();
              }
            } catch (error: any) {
              const errorMsg = error.response?.data?.detail || 'Failed to enter raffle';
              Alert.alert('Error', errorMsg);
            } finally {
              setEntering(false);
            }
          }
        }
      ]
    );
  };

  const getTimeRemaining = () => {
    if (!raffle) return '';
    
    const end = new Date(raffle.end_date);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Raffle has ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 1) return `${days} days remaining`;
    if (days === 1) return `1 day, ${hours} hours remaining`;
    if (hours > 0) return `${hours} hours, ${minutes} minutes remaining`;
    return `${minutes} minutes remaining`;
  };

  const isRaffleEnded = () => {
    if (!raffle) return false;
    return new Date(raffle.end_date) < new Date();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
          <Text style={styles.loadingText}>Loading raffle...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!raffle) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Raffle not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isSoldOut = raffle.max_tickets && raffle.total_entries >= raffle.max_tickets;
  const canEnter = raffle.status === 'active' && !isRaffleEnded() && !isSoldOut;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Raffle Image */}
        {raffle.image && (
          <Image source={{ uri: raffle.image }} style={styles.raffleImage} />
        )}

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{raffle.title}</Text>

          {/* Prize */}
          <View style={styles.prizeSection}>
            <Ionicons name="gift" size={28} color="#FF9800" />
            <View style={styles.prizeInfo}>
              <Text style={styles.prizeLabel}>Prize</Text>
              <Text style={styles.prizeText}>{raffle.prize}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.descriptionTitle}>About this raffle</Text>
          <Text style={styles.description}>{raffle.description}</Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Ionicons name="ticket-outline" size={24} color="#1565FF" />
              <Text style={styles.statValue}>${raffle.ticket_price}</Text>
              <Text style={styles.statLabel}>Per Entry</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="people-outline" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>
                {raffle.total_entries}{raffle.max_tickets ? `/${raffle.max_tickets}` : ''}
              </Text>
              <Text style={styles.statLabel}>Total Entries</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="trophy-outline" size={24} color="#FF9800" />
              <Text style={styles.statValue}>{raffle.user_entry_count}</Text>
              <Text style={styles.statLabel}>Your Entries</Text>
            </View>
          </View>

          {/* Time Remaining */}
          <View style={styles.timeContainer}>
            <Ionicons name="time" size={20} color="#666" />
            <Text style={styles.timeText}>{getTimeRemaining()}</Text>
          </View>

          {/* Winner Announcement */}
          {raffle.winner_user_id && (
            <View style={styles.winnerContainer}>
              <Ionicons name="trophy" size={32} color="#FFD700" />
              <Text style={styles.winnerTitle}>Winner Announced!</Text>
              <Text style={styles.winnerText}>
                This raffle has ended and a winner has been selected.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Enter Button */}
      {canEnter && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.enterButton, entering && styles.enterButtonDisabled]}
            onPress={handleEnterRaffle}
            disabled={entering}
          >
            <Ionicons name="ticket" size={20} color="#fff" />
            <Text style={styles.enterButtonText}>
              {entering ? 'Processing...' : 'Enter Raffle'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status Messages */}
      {isSoldOut && (
        <View style={styles.footer}>
          <View style={styles.statusButton}>
            <Text style={styles.statusButtonText}>Sold Out</Text>
          </View>
        </View>
      )}

      {isRaffleEnded() && !raffle.winner_user_id && (
        <View style={styles.footer}>
          <View style={styles.statusButton}>
            <Text style={styles.statusButtonText}>Raffle Ended - Drawing Winner Soon</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#1565FF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  raffleImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#f0f0f0',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  prizeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  prizeInfo: {
    flex: 1,
  },
  prizeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E65100',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  prizeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E65100',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    marginBottom: 20,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1565FF',
  },
  winnerContainer: {
    backgroundColor: '#FFF9C4',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  winnerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F57C00',
    marginTop: 12,
    marginBottom: 8,
  },
  winnerText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  enterButton: {
    backgroundColor: '#1565FF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  enterButtonDisabled: {
    backgroundColor: '#ccc',
  },
  enterButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statusButton: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});
