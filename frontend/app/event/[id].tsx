import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UpgradeModal from '../../components/UpgradeModal';
import { API_URL } from '../../utils/api';



export default function EventDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  // Event & User State
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tierLimits, setTierLimits] = useState<any>(null);
  
  // RSVP State
  const [hasRSVPd, setHasRSVPd] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  
  // Waitlist State
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  
  // UI State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    loadEvent();
    loadUserProfile();
  }, [id]);

  const loadUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;
      
      const [profileRes, tierLimitsRes, rsvpStatusRes, waitlistStatusRes] = await Promise.all([
        axios.get(`${API_URL}/api/profile`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/profile/tier-limits`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/events/${id}/rsvp-status`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { has_rsvpd: false } })),
        axios.get(`${API_URL}/api/events/${id}/waitlist-status`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { on_waitlist: false, position: null } }))
      ]);
      
      setUserProfile(profileRes.data);
      setTierLimits(tierLimitsRes.data);
      setHasRSVPd(rsvpStatusRes.data?.has_rsvpd || false);
      setIsOnWaitlist(waitlistStatusRes.data?.on_waitlist || false);
      setWaitlistPosition(waitlistStatusRes.data?.position || null);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadEvent = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${API_URL}/api/events/${id}`, { headers });
      setEvent(response.data);
    } catch (error: any) {
      console.error('Error loading event:', error);
      Alert.alert('Error', 'Could not load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async () => {
    if (!userProfile) {
      Alert.alert('Login Required', 'Please log in to RSVP for events');
      router.push('/(auth)/login');
      return;
    }

    if (userProfile.user_type !== 'general_public') {
      Alert.alert('Info', 'RSVPs are for General Public members.');
      return;
    }

    setRsvpLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (hasRSVPd) {
        // Cancel RSVP
        await axios.delete(`${API_URL}/api/events/${id}/rsvp`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setHasRSVPd(false);
        
        // Reload tier limits and event to update counts
        const [tierLimitsRes, eventRes] = await Promise.all([
          axios.get(`${API_URL}/api/profile/tier-limits`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/api/events/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        setTierLimits(tierLimitsRes.data);
        setEvent(eventRes.data);
        
        Alert.alert('RSVP cancelled', 'Your spot is open and your count has been updated.');
      } else {
        // Create RSVP
        await axios.post(`${API_URL}/api/events/${id}/rsvp`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setHasRSVPd(true);
        
        // Reload tier limits and event
        const [tierLimitsRes, eventRes] = await Promise.all([
          axios.get(`${API_URL}/api/profile/tier-limits`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/api/events/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        setTierLimits(tierLimitsRes.data);
        setEvent(eventRes.data);
        
        Alert.alert('RSVP confirmed', 'You\'re locked in for this event. Check My Events to see all your RSVP\'d events.');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to RSVP';
      const codeMatch = errorMsg.match(/^\[([A-Z_]+)\]\s*(.+)$/);
      const errorCode = codeMatch ? codeMatch[1] : null;
      const cleanMessage = codeMatch ? codeMatch[2] : errorMsg;
      
      // Handle known business logic errors
      if (errorCode === 'EVENT_FULL') {
        Alert.alert(
          'This event is full',
          'All spots for this event have been taken. Check out other events going on near you.',
          [{ text: 'Browse Other Events', onPress: () => router.push('/events') }]
        );
      } else if (errorCode === 'EVENT_FULL_WAITLIST') {
        Alert.alert(
          'This event is currently full',
          'You can join the waitlist and we\'ll let you know if a spot opens up.',
          [
            { text: 'Browse Other Events', onPress: () => router.push('/events') },
            { text: 'Join Waitlist', onPress: () => handleJoinWaitlist() }
          ]
        );
      } else if (errorCode === 'MONTHLY_LIMIT') {
        Alert.alert(
          'RSVP limit reached',
          "You've used all 3 RSVPs for this month on your Basic plan. Upgrade to Appreciation for unlimited RSVPs and more flexibility.",
          [
            { text: 'Maybe Later', style: 'cancel' },
            { text: 'Upgrade to Appreciation', onPress: () => setShowUpgradeModal(true) }
          ]
        );
      } else if (errorCode === 'VIP_EARLY_ACCESS') {
        Alert.alert(
          'VIP early access',
          cleanMessage,
          [
            { text: 'Back to Events', onPress: () => router.push('/events') },
            { text: 'See Appreciation Benefits', onPress: () => setShowUpgradeModal(true) }
          ]
        );
      } else if (errorCode === 'RSVP_NOT_OPEN') {
        Alert.alert('RSVPs not yet open', cleanMessage);
      } else {
        console.error('Unexpected RSVP error:', error);
        Alert.alert('Error', cleanMessage);
      }
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!userProfile) {
      Alert.alert('Login Required', 'Please log in to join the waitlist');
      return;
    }

    setWaitlistLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.post(`${API_URL}/api/events/${id}/waitlist`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIsOnWaitlist(true);
      setWaitlistPosition(response.data.position);

      Alert.alert(
        'You\'re on the waitlist',
        'You\'re in line for this event. We\'ll notify you if a spot opens up so you can confirm your RSVP.'
      );
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to join waitlist';
      
      if (errorMsg.includes('ALREADY_ON_WAITLIST')) {
        Alert.alert(
          'Already on waitlist',
          'You\'re already on the waitlist for this event. We\'ll let you know if a spot opens up.'
        );
      } else {
        Alert.alert('Error', errorMsg.replace(/^\[([A-Z_]+)\]\s*/, ''));
      }
    } finally {
      setWaitlistLoading(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    Alert.alert(
      'Leave waitlist?',
      'You\'ll lose your spot in line. You can join again later if you change your mind.',
      [
        { text: 'Stay on Waitlist', style: 'cancel' },
        {
          text: 'Leave Waitlist',
          style: 'destructive',
          onPress: async () => {
            setWaitlistLoading(true);
            try {
              const token = await AsyncStorage.getItem('auth_token');
              await axios.delete(`${API_URL}/api/events/${id}/waitlist`, {
                headers: { Authorization: `Bearer ${token}` }
              });

              setIsOnWaitlist(false);
              setWaitlistPosition(null);

              Alert.alert(
                'You\'ve left the waitlist',
                'You\'re no longer in line for this event. You can join the waitlist again if you change your mind.'
              );
              
              // Reload event to get updated capacity
              loadEvent();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to leave waitlist');
            } finally {
              setWaitlistLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleGetTickets = () => {
    if (event.price === 0) {
      Alert.alert('Free Event', 'This is a free event. Just show up!');
    } else {
      Alert.alert('Get Tickets', 'Ticket purchase system coming soon!');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Event not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Determine button state based on priority
  const isGP = userProfile?.user_type === 'general_public';
  const isEventFull = event.is_full || false;
  const isAlmostFull = event.is_almost_full || false;
  const waitlistEnabled = event.waitlist_enabled || false;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Event Image */}
        {event.image && (
          <Image source={{ uri: event.image }} style={styles.eventImage} />
        )}

        {/* Event Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>

          {/* Date & Time */}
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {new Date(event.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>

          {/* Venue */}
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{event.venue}</Text>
          </View>

          {/* Price */}
          <View style={styles.infoRow}>
            <Ionicons name="pricetag-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {event.price === 0 ? 'Free Event' : `$${event.price}`}
            </Text>
          </View>

          {/* Capacity Info (for GP users) */}
          {isGP && event.capacity && (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={20} color="#666" />
              <Text style={styles.infoText}>
                Spots available: {event.remaining_spots || 0}/{event.rsvp_limit || event.capacity}
              </Text>
            </View>
          )}

          {/* Almost Full Warning */}
          {isGP && isAlmostFull && !isEventFull && !hasRSVPd && (
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={20} color="#FF9800" />
              <View style={styles.warningTextContainer}>
                <Text style={styles.warningTitle}>Almost full</Text>
                <Text style={styles.warningText}>
                  This event is filling up fast. RSVP now to make sure you don't miss out.
                </Text>
              </View>
            </View>
          )}

          {/* Waitlist Position Info */}
          {isGP && isOnWaitlist && (
            <View style={styles.waitlistBanner}>
              <Ionicons name="time-outline" size={20} color="#FF9800" />
              <View style={styles.waitlistTextContainer}>
                <Text style={styles.waitlistTitle}>You're on the waitlist</Text>
                <Text style={styles.waitlistText}>
                  Your position on the waitlist: #{waitlistPosition}
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          <Text style={styles.descriptionTitle}>About this event</Text>
          <Text style={styles.description}>{event.description}</Text>

          {/* Organizer */}
          <Text style={styles.organizerText}>Organized by {event.organizer}</Text>
        </View>
      </ScrollView>

      {/* Footer with Action Buttons */}
      <View style={styles.footer}>
        {isGP && (
          <View style={styles.actionButtonsContainer}>
            {/* Priority 1: User has RSVP'd */}
            {hasRSVPd ? (
              <TouchableOpacity 
                style={[styles.primaryButton, styles.rsvpdButton]} 
                onPress={handleRSVP}
                disabled={rsvpLoading}
              >
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={[styles.primaryButtonText, styles.rsvpdButtonText]}>
                  {rsvpLoading ? 'Cancelling...' : 'RSVP\'d'}
                </Text>
                {tierLimits?.usage?.rsvps && (
                  <Text style={styles.rsvpCounter}>
                    {tierLimits.usage.rsvps.current}/{tierLimits.usage.rsvps.limit >= 999 ? '∞' : tierLimits.usage.rsvps.limit}
                  </Text>
                )}
              </TouchableOpacity>
            ) : isOnWaitlist ? (
              // Priority 2: User is on waitlist
              <TouchableOpacity 
                style={[styles.primaryButton, styles.waitlistLeaveButton]} 
                onPress={handleLeaveWaitlist}
                disabled={waitlistLoading}
              >
                <Ionicons name="exit-outline" size={20} color="#ff4444" />
                <Text style={[styles.primaryButtonText, styles.waitlistLeaveButtonText]}>
                  {waitlistLoading ? 'Loading...' : 'Leave Waitlist'}
                </Text>
              </TouchableOpacity>
            ) : isEventFull && waitlistEnabled ? (
              // Priority 3: Event full with waitlist
              <TouchableOpacity 
                style={[styles.primaryButton, styles.waitlistJoinButton]} 
                onPress={handleJoinWaitlist}
                disabled={waitlistLoading}
              >
                <Ionicons name="list-outline" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {waitlistLoading ? 'Joining...' : 'Join Waitlist'}
                </Text>
              </TouchableOpacity>
            ) : (
              // Priority 4: Normal RSVP
              <TouchableOpacity 
                style={[
                  styles.primaryButton,
                  isEventFull && styles.disabledButton
                ]} 
                onPress={handleRSVP}
                disabled={rsvpLoading || isEventFull}
              >
                <Ionicons name="calendar" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {rsvpLoading ? 'Loading...' : isEventFull ? 'Event Full' : 'RSVP'}
                </Text>
                {tierLimits?.usage?.rsvps && !isEventFull && (
                  <Text style={styles.rsvpCounter}>
                    {tierLimits.usage.rsvps.current}/{tierLimits.usage.rsvps.limit >= 999 ? '∞' : tierLimits.usage.rsvps.limit}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Get Tickets Button */}
        <TouchableOpacity 
          style={[styles.secondaryButton, isGP && styles.secondaryButtonSmall]} 
          onPress={handleGetTickets}
        >
          <Text style={styles.secondaryButtonText}>
            {event.price === 0 ? 'Get Free Ticket' : 'Get Tickets'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        userType="general_public"
      />
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
  eventImage: {
    width: '100%',
    height: 200,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
    gap: 10,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
  },
  waitlistBanner: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
    gap: 10,
  },
  waitlistTextContainer: {
    flex: 1,
  },
  waitlistTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1565FF',
    marginBottom: 4,
  },
  waitlistText: {
    fontSize: 13,
    color: '#1565FF',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 24,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 16,
  },
  organizerText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    gap: 12,
  },
  actionButtonsContainer: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#1565FF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  rsvpdButton: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  rsvpdButtonText: {
    color: '#4CAF50',
  },
  waitlistJoinButton: {
    backgroundColor: '#FF9800',
  },
  waitlistLeaveButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ff4444',
  },
  waitlistLeaveButtonText: {
    color: '#ff4444',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  rsvpCounter: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
  },
  secondaryButton: {
    backgroundColor: '#1565FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonSmall: {
    opacity: 0.8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
