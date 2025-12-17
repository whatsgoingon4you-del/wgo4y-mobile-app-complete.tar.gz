import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../utils/api';



interface ProfileData {
  username: string;
  full_name?: string;
  user_type: string;
  membership_tier: string;
  profile_photo?: string;
  location?: string;
  bio?: string;
  phone?: string;
  email?: string;
  
  // Business fields
  business_name?: string;
  business_type?: string;
  business_address?: string;
  business_phone?: string;
  business_description?: string;
  business_logo?: string;
  business_photos?: string[];
  amenities?: string[];
  venue_categories?: string[];
  entertainment_categories?: string[];
  social_links?: any;
  
  // Entrepreneur fields
  services_offered?: any[];
  portfolio_photos?: string[];
  pricing_info?: string;
  services?: string[];
}

export default function UserProfile() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Fetch user profile by userId
      const response = await axios.get(`${API_URL}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProfile(response.data);
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Could not load user profile');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLink = (platform: string, value: string) => {
    let url = value;
    
    // Build proper URL if not already a full URL
    if (!value.startsWith('http')) {
      switch(platform) {
        case 'instagram':
          url = `https://instagram.com/${value.replace('@', '')}`;
          break;
        case 'facebook':
          url = `https://facebook.com/${value}`;
          break;
        case 'twitter':
          url = `https://twitter.com/${value.replace('@', '')}`;
          break;
        case 'linkedin':
          url = `https://linkedin.com/in/${value}`;
          break;
        case 'tiktok':
          url = `https://tiktok.com/@${value.replace('@', '')}`;
          break;
        default:
          url = value.startsWith('http') ? value : `https://${value}`;
      }
    }
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open link');
    });
  };

  const handleSendMessage = () => {
    if (userId) {
      router.push(`/chat/${userId}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Profile not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profile.business_name || profile.full_name || profile.username;
  const isEntrepreneur = profile.user_type === 'entrepreneur';
  const isBusiness = profile.user_type === 'business';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {(profile.profile_photo || profile.business_logo) ? (
            <Image
              source={{ uri: profile.profile_photo || profile.business_logo }}
              style={styles.profilePhoto}
            />
          ) : (
            <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
              <Ionicons name="person" size={50} color="#999" />
            </View>
          )}
          
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          
          {/* Tier Badge */}
          <View style={[
            styles.tierBadge,
            (profile.membership_tier === 'gold' || profile.membership_tier === 'networking') && styles.goldBadge,
            profile.membership_tier === 'silver' && styles.silverBadge,
          ]}>
            <Text style={styles.tierBadgeText}>
              {profile.membership_tier?.toUpperCase() || 'BASIC'}
            </Text>
          </View>

          {/* Location */}
          {profile.location && (
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.locationText}>{profile.location}</Text>
            </View>
          )}

          {/* Message Button */}
          <TouchableOpacity style={styles.messageButton} onPress={handleSendMessage}>
            <Ionicons name="chatbubble" size={20} color="#fff" />
            <Text style={styles.messageButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>

        {/* Bio/Description */}
        {(profile.bio || profile.business_description) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>
              {profile.bio || profile.business_description}
            </Text>
          </View>
        )}

        {/* Contact Information */}
        {(profile.phone || profile.email || profile.business_phone) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            {(profile.phone || profile.business_phone) && (
              <View style={styles.contactRow}>
                <Ionicons name="call" size={20} color="#1565FF" />
                <Text style={styles.contactText}>
                  {profile.phone || profile.business_phone}
                </Text>
              </View>
            )}
            {profile.email && (
              <View style={styles.contactRow}>
                <Ionicons name="mail" size={20} color="#1565FF" />
                <Text style={styles.contactText}>{profile.email}</Text>
              </View>
            )}
            {profile.business_address && (
              <View style={styles.contactRow}>
                <Ionicons name="location" size={20} color="#1565FF" />
                <Text style={styles.contactText}>{profile.business_address}</Text>
              </View>
            )}
          </View>
        )}

        {/* Services Offered (Entrepreneur) */}
        {isEntrepreneur && profile.services_offered && profile.services_offered.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services Offered</Text>
            {profile.services_offered.map((service: any, index: number) => (
              <View key={index} style={styles.serviceItem}>
                <Text style={styles.serviceName}>{service.service}</Text>
                <Text style={styles.servicePrice}>
                  {service.price_type === 'hourly' 
                    ? `$${service.price}/hour`
                    : service.price_type === 'quote'
                    ? 'Contact for quote'
                    : `$${service.price}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Pricing Info */}
        {isEntrepreneur && profile.pricing_info && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rates & Pricing</Text>
            <Text style={styles.pricingText}>{profile.pricing_info}</Text>
          </View>
        )}

        {/* Portfolio Photos (Entrepreneur) */}
        {isEntrepreneur && profile.portfolio_photos && profile.portfolio_photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <View style={styles.photoGrid}>
              {profile.portfolio_photos.map((photo, index) => (
                <Image
                  key={index}
                  source={{ uri: photo }}
                  style={styles.portfolioPhoto}
                />
              ))}
            </View>
          </View>
        )}

        {/* Business Photos */}
        {isBusiness && profile.business_photos && profile.business_photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.photoGrid}>
              {profile.business_photos.map((photo, index) => (
                <Image
                  key={index}
                  source={{ uri: photo }}
                  style={styles.portfolioPhoto}
                />
              ))}
            </View>
          </View>
        )}

        {/* Amenities (Business) */}
        {isBusiness && profile.amenities && profile.amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.tagsContainer}>
              {profile.amenities.map((amenity, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Social Links */}
        {profile.social_links && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social Media</Text>
            <View style={styles.socialLinksContainer}>
              {Object.entries(profile.social_links).map(([platform, value]) => {
                if (!value) return null;
                
                let iconName = 'link';
                switch(platform) {
                  case 'instagram': iconName = 'logo-instagram'; break;
                  case 'facebook': iconName = 'logo-facebook'; break;
                  case 'twitter': iconName = 'logo-twitter'; break;
                  case 'linkedin': iconName = 'logo-linkedin'; break;
                  case 'tiktok': iconName = 'logo-tiktok'; break;
                  case 'youtube': iconName = 'logo-youtube'; break;
                  case 'website': iconName = 'globe'; break;
                }
                
                return (
                  <TouchableOpacity
                    key={platform}
                    style={styles.socialButton}
                    onPress={() => handleSocialLink(platform, value as string)}
                  >
                    <Ionicons name={iconName as any} size={24} color="#1565FF" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  scrollView: {
    flex: 1,
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
    backgroundColor: '#1565FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profilePhotoPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  tierBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  goldBadge: {
    backgroundColor: '#fff3e0',
  },
  silverBadge: {
    backgroundColor: '#f5f5f5',
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1565FF',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  serviceName: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1565FF',
  },
  pricingText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  portfolioPhoto: {
    width: '31%',
    aspectRatio: 1,
    margin: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
  },
  tagText: {
    fontSize: 13,
    color: '#1565FF',
    fontWeight: '500',
  },
  socialLinksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
  },
});
