import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../utils/api';



export default function VenueDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [venue, setVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenue();
  }, [id]);

  const loadVenue = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_URL}/api/venues/${id}`, { headers });
      setVenue(response.data);
    } catch (error) {
      console.error('Error loading venue:', error);
      Alert.alert('Error', 'Could not load venue details');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (venue.contact_phone) {
      Linking.openURL(`tel:${venue.contact_phone}`);
    } else {
      Alert.alert('No Phone', 'Phone number not available');
    }
  };

  const handleEmail = () => {
    if (venue.contact_email) {
      Linking.openURL(`mailto:${venue.contact_email}`);
    } else {
      Alert.alert('No Email', 'Email address not available');
    }
  };

  const handleWebsite = () => {
    if (venue.website) {
      Linking.openURL(venue.website);
    } else {
      Alert.alert('No Website', 'Website not available');
    }
  };

  const handleBooking = () => {
    if (venue.booking_price === 0) {
      Alert.alert('Free Booking', 'This venue offers free booking!');
    } else {
      Alert.alert(
        'Book Venue',
        `Booking Fee: $${venue.booking_price}\n\nStripe payment integration will be implemented here.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Book Now', onPress: () => Alert.alert('Success', 'Venue booked!') },
        ]
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!venue) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Venue not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Image source={{ uri: venue.image }} style={styles.venueImage} />

        <View style={styles.content}>
          <Text style={styles.title}>{venue.name}</Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={20} color="#FFD700" />
            <Text style={styles.ratingText}>{venue.rating}</Text>
            <Text style={styles.venueType}> • {venue.type}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{venue.description}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesContainer}>
            {venue.amenities?.map((amenity: string, index: number) => (
              <View key={index} style={styles.amenityItem}>
                <Ionicons name="checkmark-circle" size={20} color="#1565FF" />
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
          </View>

          {venue.address && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={20} color="#1565FF" />
                <Text style={styles.infoText}>{venue.address}</Text>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.contactButtons}>
            {venue.contact_phone && (
              <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
                <Ionicons name="call" size={20} color="#1565FF" />
                <Text style={styles.contactButtonText}>Call</Text>
              </TouchableOpacity>
            )}
            {venue.contact_email && (
              <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
                <Ionicons name="mail" size={20} color="#1565FF" />
                <Text style={styles.contactButtonText}>Email</Text>
              </TouchableOpacity>
            )}
            {venue.website && (
              <TouchableOpacity style={styles.contactButton} onPress={handleWebsite}>
                <Ionicons name="globe" size={20} color="#1565FF" />
                <Text style={styles.contactButtonText}>Website</Text>
              </TouchableOpacity>
            )}
          </View>

          {venue.booking_price !== undefined && (
            <>
              <View style={styles.divider} />
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Booking Fee</Text>
                <Text style={styles.priceValue}>
                  {venue.booking_price === 0 ? 'FREE' : `$${venue.booking_price}`}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.bookButton} onPress={handleBooking}>
          <Text style={styles.bookButtonText}>Book This Venue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  venueImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  venueType: {
    fontSize: 16,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  amenitiesContainer: {
    gap: 12,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amenityText: {
    fontSize: 16,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565FF',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 18,
    color: '#666',
  },
  priceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1565FF',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  bookButton: {
    backgroundColor: '#1565FF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
