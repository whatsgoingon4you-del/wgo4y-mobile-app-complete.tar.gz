import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENTREPRENEUR_CATEGORIES } from '../onboarding/entrepreneur/step0';
import { getCategoryDisplayNames } from '../onboarding/entrepreneur/categoryMapping';
import { formatServicePrice } from '../../utils/priceFormatter';
import { WebView } from 'react-native-webview';
import { parseVideoUrl } from '../../utils/videoUtils';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

interface ProfileData {
  id: string;
  username: string;
  email: string;
  user_type: string;
  full_name?: string;
  location?: string;
  bio?: string;
  phone?: string;
  profile_photo?: string;
  venue_categories: string[];
  entrepreneur_categories: string[];
  selected_categories?: string[];
  venue_preferences?: string[];
  service_preferences?: string[];
  profile_completed: boolean;
  membership_tier: string;
  // Business fields
  business_name?: string;
  business_type?: string;
  business_logo?: string;
  business_photos?: string[];
  business_address?: string;
  business_phone?: string;
  business_description?: string;
  amenities?: string[];
  entertainment_categories?: string[];
  social_links?: {
    instagram?: string;
    facebook?: string;
    website?: string;
    yelp?: string;
    google_business?: string;
    tiktok?: string;
    snapchat?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    pinterest?: string;
  };
  // Entrepreneur fields
  services?: string[];
  services_offered?: string[];
  portfolio_photos?: string[];
  portfolio_videos?: Array<{
    url: string;
    title?: string;
    platform?: string;
    videoId?: string;
    thumbnailUrl?: string;
  }>;
  music_tracks?: Array<{
    url: string;
    title: string;
    platform: string;
    embedUrl?: string;
  }>;
  pricing_info?: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState(true);
  
  // Video player modal state
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{
    url: string;
    embedUrl: string;
    title?: string;
    platform?: string;
  } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  // Refresh profile when screen comes into focus (e.g., after editing)
  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Profile data:', JSON.stringify(response.data).substring(0, 500)); // Debug log
      console.log('Business logo:', response.data.business_logo ? response.data.business_logo.substring(0, 100) : 'No logo');
      setProfile(response.data);
      
      // Check profile completion status
      let needsEnhancement = false;
      
      if (user?.user_type === 'entrepreneur') {
        needsEnhancement = !response.data.has_services_with_pricing || !response.data.has_portfolio;
      } else if (user?.user_type === 'business') {
        const hasAmenities = response.data.amenities && response.data.amenities.length > 0;
        const hasEntertainment = response.data.entertainment_categories && response.data.entertainment_categories.length > 0;
        const hasSocialLinks = response.data.social_links && (
          response.data.social_links.instagram ||
          response.data.social_links.facebook ||
          response.data.social_links.website ||
          response.data.social_links.yelp ||
          response.data.social_links.google_business
        );
        needsEnhancement = !hasAmenities && !hasEntertainment && !hasSocialLinks;
      }
      
      setProfileCompleted(!needsEnhancement);
    } catch (error: any) {
      // Gracefully handle errors - don't show banner if we can't check status
      console.error('Error loading profile:', error);
      // Default to completed to avoid showing banner on error
      setProfileCompleted(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to logout?')) {
        try {
          await logout();
          router.replace('/(auth)/login');
        } catch (error) {
          console.error('Logout error:', error);
          alert('Error: Failed to logout. Please try again.');
        }
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/(auth)/login');
            },
          },
        ]
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
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
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Profile Completion Banner for Entrepreneurs and Businesses */}
      {(user?.user_type === 'entrepreneur' || user?.user_type === 'business') && !loading && !profileCompleted && (
        <View style={styles.completionBanner}>
          <View style={styles.bannerIconContainer}>
            <Ionicons name="alert-circle" size={24} color="#FF9800" />
          </View>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>
              {user?.user_type === 'business' ? 'Enhance your business profile' : 'Finish creating your profile'}
            </Text>
            <Text style={styles.bannerDescription}>
              {user?.user_type === 'business' 
                ? 'Add amenities, entertainment types, and social links' 
                : 'Add services, pricing, and portfolio'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.bannerButton}
            onPress={() => router.push(user?.user_type === 'business' ? '/profile/edit-business' : '/profile/edit-entrepreneur')}
          >
            <Ionicons name="arrow-forward" size={18} color="#1565FF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Upgrade Banner for Basic Tier General Public Users */}
      {profile && profile.user_type === 'general_public' && (!profile.membership_tier || profile.membership_tier === 'basic') && (
        <View style={styles.upgradeBanner}>
          <View style={styles.upgradeIconContainer}>
            <Ionicons name="star" size={32} color="#FFD700" />
          </View>
          <View style={styles.upgradeBannerContent}>
            <Text style={styles.upgradeBannerTitle}>Upgrade to Appreciation</Text>
            <Text style={styles.upgradeBannerDescription}>
              Unlock unlimited messaging, save contacts, and get priority visibility
            </Text>
            <TouchableOpacity 
              style={styles.upgradeBannerButton}
              onPress={() => router.push({
                pathname: '/onboarding/tier-selection',
                params: { upgrade: 'true', preselect: 'appreciation' }
              })}
            >
              <Text style={styles.upgradeBannerButtonText}>Upgrade Now</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Upgrade Banner for Basic Tier Business Users */}
      {profile && profile.user_type === 'business' && (!profile.membership_tier || profile.membership_tier === 'basic') && (
        <View style={styles.upgradeBanner}>
          <View style={styles.upgradeIconContainer}>
            <Ionicons name="rocket" size={32} color="#FF9800" />
          </View>
          <View style={styles.upgradeBannerContent}>
            <Text style={styles.upgradeBannerTitle}>Upgrade to Silver or Gold</Text>
            <Text style={styles.upgradeBannerDescription}>
              Get featured videos, unlimited media, coupons & raffles, and business network access
            </Text>
            <TouchableOpacity 
              style={styles.upgradeBannerButton}
              onPress={() => router.push({
                pathname: '/onboarding/tier-selection',
                params: { upgrade: 'true', preselect: 'silver' }
              })}
            >
              <Text style={styles.upgradeBannerButtonText}>View Plans</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Upgrade Banner for Silver Tier Business Users */}
      {profile && profile.user_type === 'business' && profile.membership_tier === 'silver' && (
        <View style={[styles.upgradeBanner, { backgroundColor: '#FFF8E1', borderColor: '#FFB300' }]}>
          <View style={styles.upgradeIconContainer}>
            <Ionicons name="trophy" size={32} color="#FFD700" />
          </View>
          <View style={styles.upgradeBannerContent}>
            <Text style={styles.upgradeBannerTitle}>Upgrade to Gold</Text>
            <Text style={styles.upgradeBannerDescription}>
              Get 3 featured videos/week, unlimited media, VIP tools, and premium placement
            </Text>
            <TouchableOpacity 
              style={styles.upgradeBannerButton}
              onPress={() => router.push({
                pathname: '/onboarding/tier-selection',
                params: { upgrade: 'true', preselect: 'gold' }
              })}
            >
              <Text style={styles.upgradeBannerButtonText}>Upgrade to Gold</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Upgrade Banner for Basic Tier Entrepreneur Users */}
      {profile && profile.user_type === 'entrepreneur' && (!profile.membership_tier || profile.membership_tier === 'basic') && (
        <View style={styles.upgradeBanner}>
          <View style={styles.upgradeIconContainer}>
            <Ionicons name="rocket" size={32} color="#FF9800" />
          </View>
          <View style={styles.upgradeBannerContent}>
            <Text style={styles.upgradeBannerTitle}>Upgrade to Silver or Networking</Text>
            <Text style={styles.upgradeBannerDescription}>
              Get featured videos, unlimited media, networking tools, and full entrepreneur network access
            </Text>
            <TouchableOpacity 
              style={styles.upgradeBannerButton}
              onPress={() => router.push({
                pathname: '/onboarding/tier-selection',
                params: { upgrade: 'true', preselect: 'silver' }
              })}
            >
              <Text style={styles.upgradeBannerButtonText}>View Plans</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Upgrade Banner for Silver Tier Entrepreneur Users */}
      {profile && profile.user_type === 'entrepreneur' && profile.membership_tier === 'silver' && (
        <View style={[styles.upgradeBanner, { backgroundColor: '#FFF8E1', borderColor: '#FFB300' }]}>
          <View style={styles.upgradeIconContainer}>
            <Ionicons name="trophy" size={32} color="#FFD700" />
          </View>
          <View style={styles.upgradeBannerContent}>
            <Text style={styles.upgradeBannerTitle}>Upgrade to Networking</Text>
            <Text style={styles.upgradeBannerDescription}>
              Get 3 featured videos/week, VIP access, early notifications, and full entrepreneur network
            </Text>
            <TouchableOpacity 
              style={styles.upgradeBannerButton}
              onPress={() => router.push({
                pathname: '/onboarding/tier-selection',
                params: { upgrade: 'true', preselect: 'networking' }
              })}
            >
              <Text style={styles.upgradeBannerButtonText}>Upgrade to Networking</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <View style={[
            styles.avatarContainer, 
            profile?.membership_tier === 'gold' && styles.avatarContainerGold,
            profile?.membership_tier === 'silver' && styles.avatarContainerSilver,
            profile?.membership_tier === 'bronze' && styles.avatarContainerBronze
          ]}>
            {profile?.user_type === 'business' && profile?.business_logo && profile.business_logo !== 'default' ? (
              <Image 
                source={{ uri: profile.business_logo }} 
                style={styles.avatar}
                onError={(error) => console.log('Business logo load error:', error.nativeEvent.error)}
                onLoad={() => console.log('Business logo loaded successfully')}
              />
            ) : profile?.profile_photo && profile.profile_photo !== 'default' && !profile.profile_photo.includes('PHN2ZyB3aWR0aD0') ? (
              <Image 
                source={{ uri: profile.profile_photo }} 
                style={styles.avatar}
                onError={(error) => console.log('Profile photo load error:', error.nativeEvent.error)}
                onLoad={() => console.log('Profile photo loaded successfully')}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name={profile?.user_type === 'business' ? "business" : "person"} size={48} color="#1565FF" />
              </View>
            )}
          </View>
          <Text style={styles.name}>{profile?.user_type === 'business' ? profile?.business_name : (profile?.full_name || profile?.username)}</Text>
          {profile?.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.location}>{profile.location}</Text>
            </View>
          )}
          
          {/* Occupations Section for Entrepreneurs */}
          {profile && profile.user_type === 'entrepreneur' && profile.services && profile.services.length > 0 && (
            <View style={styles.occupationsContainer}>
              <Text style={styles.occupationsLabel}>Occupations</Text>
              <View style={styles.occupationsChips}>
                {profile.services.map((occupation, index) => (
                  <View key={index} style={styles.occupationChip}>
                    <Text style={styles.occupationChipText}>{occupation}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {/* Membership Badge */}
          <View style={styles.membershipBadgeContainer}>
            <View style={[
              styles.membershipBadge,
              profile?.membership_tier === 'gold' && styles.membershipBadgeGold,
              profile?.membership_tier === 'silver' && styles.membershipBadgeSilver,
              profile?.membership_tier === 'bronze' && styles.membershipBadgeBronze,
              (!profile?.membership_tier || profile?.membership_tier === 'basic') && styles.membershipBadgeBronze
            ]}>
              <Ionicons name="medal" size={16} color="#fff" />
              <Text style={styles.membershipText}>
                {profile?.membership_tier?.toUpperCase() || 'BASIC'}
              </Text>
            </View>
          </View>
          
          {profile?.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}
        </View>

        {/* Consolidated Account Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{profile?.username}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile?.email}</Text>
            </View>
            {profile && profile.user_type === 'business' && (
              <>
                {profile.business_name && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Business Name</Text>
                    <Text style={styles.infoValue}>{profile.business_name}</Text>
                  </View>
                )}
                {profile.business_phone && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{profile.business_phone}</Text>
                  </View>
                )}
                {profile.business_address && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Address</Text>
                    <Text style={styles.infoValue}>{profile.business_address}</Text>
                  </View>
                )}
                {profile.social_links?.website && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Website</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{profile.social_links.website}</Text>
                  </View>
                )}
                {profile.business_type && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Business Type</Text>
                    <Text style={styles.infoValue}>{profile.business_type}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* My Categories Section - For Entrepreneurs */}
        {profile && profile.user_type === 'entrepreneur' && profile.selected_categories && profile.selected_categories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="grid-outline" size={24} color="#1565FF" />
              <Text style={styles.sectionTitle}>My Categories</Text>
            </View>
            <View style={styles.chipContainer}>
              {ENTREPRENEUR_CATEGORIES
                .filter(cat => profile.selected_categories?.includes(cat.id))
                .map((category) => (
                  <View key={category.id} style={[styles.chip, {backgroundColor: '#F0F7FF', borderColor: '#1565FF'}]}>
                    <Text style={{fontSize: 16, marginRight: 4}}>{category.icon}</Text>
                    <Text style={[styles.chipText, {color: '#1565FF', fontWeight: '600'}]}>{category.name}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Services Offered Section - For Entrepreneurs */}
        {profile && profile.user_type === 'entrepreneur' && profile.services_offered && profile.services_offered.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="briefcase-outline" size={24} color="#1565FF" />
              <Text style={styles.sectionTitle}>Services Offered</Text>
            </View>
            <View style={styles.servicesGrid}>
              {profile.services_offered.map((service, index) => (
                <View key={index} style={styles.serviceCardTwoColumn}>
                  <Text style={styles.serviceName} numberOfLines={1}>{service.service_name}</Text>
                  <Text style={[
                    styles.servicePrice,
                    (!service.price || service.price_type === 'quote') && styles.quotePriceText
                  ]} numberOfLines={1}>
                    {formatServicePrice(service)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Contact Section - For Entrepreneurs */}
        {profile && profile.user_type === 'entrepreneur' && (profile.phone || profile.email || profile.social_links?.website) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="call-outline" size={24} color="#1565FF" />
              <Text style={styles.sectionTitle}>Contact Information</Text>
            </View>
            <View style={styles.contactCard}>
              {profile.phone && (
                <TouchableOpacity style={styles.contactRow}>
                  <View style={styles.contactIconContainer}>
                    <Ionicons name="call" size={20} color="#1565FF" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>Phone</Text>
                    <Text style={styles.contactValue}>{profile.phone}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              )}
              
              {profile.email && (
                <TouchableOpacity style={styles.contactRow}>
                  <View style={styles.contactIconContainer}>
                    <Ionicons name="mail" size={20} color="#1565FF" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={styles.contactValue}>{profile.email}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              )}

              {profile.social_links?.website && (
                <TouchableOpacity style={styles.contactRow}>
                  <View style={styles.contactIconContainer}>
                    <Ionicons name="globe" size={20} color="#1565FF" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>Website / Portfolio</Text>
                    <Text style={styles.contactValue} numberOfLines={1}>{profile.social_links.website}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* General Public - Venue Preferences */}
        {profile && profile.user_type === 'general_public' && profile.venue_preferences && profile.venue_preferences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Venue Preferences</Text>
            <View style={styles.chipContainer}>
              {profile.venue_preferences.map((venue, index) => (
                <View key={index} style={styles.chip}>
                  <Text style={styles.chipText}>{venue}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* General Public - Service Preferences */}
        {profile && profile.user_type === 'general_public' && profile.service_preferences && profile.service_preferences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Preferences</Text>
            <View style={styles.chipContainer}>
              {profile.service_preferences.map((service, index) => (
                <View key={index} style={[styles.chip, {backgroundColor: '#E8F5E9', borderColor: '#4CAF50'}]}>
                  <Text style={[styles.chipText, {color: '#4CAF50'}]}>{service}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* General Public - Entertainment Preferences */}
        {profile && profile.user_type === 'general_public' && profile.entertainment_preferences && profile.entertainment_preferences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entertainment Preferences</Text>
            <View style={styles.chipContainer}>
              {profile.entertainment_preferences.map((entertainment, index) => (
                <View key={index} style={[styles.chip, {backgroundColor: '#FFF3E0', borderColor: '#FF9800'}]}>
                  <Text style={[styles.chipText, {color: '#FF9800'}]}>{entertainment}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {profile && (profile.services_offered || profile.services) && ((profile.services_offered && profile.services_offered.length > 0) || (profile.services && profile.services.length > 0)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services Offered</Text>
            <View style={styles.chipContainer}>
              {(profile.services || profile.services_offered || []).map((service, index) => (
                <View key={index} style={[styles.chip, {backgroundColor: '#E8F5E9', borderColor: '#4CAF50'}]}>
                  <Text style={[styles.chipText, {color: '#4CAF50'}]}>{service}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {profile && profile.portfolio_photos && profile.portfolio_photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{flexDirection: 'row', gap: 12}}>
                {profile.portfolio_photos.map((photo, index) => (
                  <Image key={index} source={{ uri: photo }} style={{width: 100, height: 100, borderRadius: 8}} />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Portfolio Videos */}
        {profile && profile.portfolio_videos && profile.portfolio_videos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio Videos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{flexDirection: 'row', gap: 12}}>
                {profile.portfolio_videos.map((video, index) => (
                  <TouchableOpacity 
                    key={index}
                    onPress={() => {
                      // Open video in native app or browser
                      const { Linking } = require('react-native');
                      Alert.alert(
                        video.title || 'Portfolio Video',
                        'Open this video in YouTube/Vimeo?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Open',
                            onPress: () => {
                              Linking.openURL(video.url).catch((err) => {
                                Alert.alert('Error', 'Could not open video');
                                console.error('Error opening video:', err);
                              });
                            }
                          }
                        ]
                      );
                    }}
                    style={styles.videoThumbnailContainer}
                  >
                    {video.thumbnailUrl ? (
                      <Image 
                        source={{ uri: video.thumbnailUrl }} 
                        style={styles.videoThumbnail}
                      />
                    ) : (
                      <View style={[styles.videoThumbnail, styles.videoPlaceholder]}>
                        <Ionicons 
                          name={video.platform === 'youtube' ? 'logo-youtube' : 'logo-vimeo'} 
                          size={40} 
                          color="#fff" 
                        />
                      </View>
                    )}
                    {/* Play button overlay */}
                    <View style={styles.playButtonOverlay}>
                      <Ionicons name="play-circle" size={50} color="rgba(255, 255, 255, 0.9)" />
                    </View>
                    {/* Platform badge */}
                    <View style={[
                      styles.platformBadgeSmall,
                      video.platform === 'youtube' ? styles.youtubeBadge : styles.vimeoBadge
                    ]}>
                      <Ionicons 
                        name={video.platform === 'youtube' ? 'logo-youtube' : 'logo-vimeo'} 
                        size={12} 
                        color="#fff" 
                      />
                    </View>
                    {/* Featured Status Badge */}
                    {video.featured && (
                      <View style={[
                        styles.featuredVideoBadge,
                        video.featured_approved ? styles.featuredVideoApproved : styles.featuredVideoPending
                      ]}>
                        <Ionicons 
                          name={video.featured_approved ? 'star' : 'time-outline'} 
                          size={10} 
                          color="#fff" 
                        />
                        <Text style={styles.featuredVideoBadgeText}>
                          {video.featured_approved ? 'FEATURED' : 'PENDING'}
                        </Text>
                      </View>
                    )}
                    {video.title && (
                      <View style={styles.videoTitleOverlay}>
                        <Text style={styles.videoTitleText} numberOfLines={2}>
                          {video.title}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Music Tracks */}
        {profile && profile.music_tracks && profile.music_tracks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎵 Music Tracks</Text>
            <View style={{ gap: 12 }}>
              {profile.music_tracks.map((track, index) => {
                // Import music utils for platform info
                const getMusicPlatformColor = (platform: string): string => {
                  const colors: { [key: string]: string } = {
                    'soundcloud': '#FF5500',
                    'spotify': '#1DB954',
                    'apple_music': '#FA243C',
                    'youtube_music': '#FF0000',
                    'bandcamp': '#629AA9',
                    'audiomack': '#FFA200',
                  };
                  return colors[platform] || '#666';
                };

                const getMusicPlatformName = (platform: string): string => {
                  const names: { [key: string]: string } = {
                    'soundcloud': 'SoundCloud',
                    'spotify': 'Spotify',
                    'apple_music': 'Apple Music',
                    'youtube_music': 'YouTube Music',
                    'bandcamp': 'Bandcamp',
                    'audiomack': 'Audiomack',
                  };
                  return names[platform] || 'Music';
                };

                return (
                  <TouchableOpacity 
                    key={index}
                    style={styles.musicTrackCard}
                    onPress={() => {
                      const { Linking } = require('react-native');
                      if (Platform.OS === 'web') {
                        window.open(track.url, '_blank');
                      } else {
                        Alert.alert(
                          track.title,
                          `Listen on ${getMusicPlatformName(track.platform)}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Listen',
                              onPress: () => {
                                Linking.openURL(track.url).catch((err) => {
                                  Alert.alert('Error', 'Could not open music link');
                                  console.error('Error opening music:', err);
                                });
                              }
                            }
                          ]
                        );
                      }
                    }}
                  >
                    <View style={[styles.musicPlatformBadge, { backgroundColor: getMusicPlatformColor(track.platform) }]}>
                      <Ionicons name="musical-note" size={16} color="#fff" />
                      <Text style={styles.musicPlatformText}>
                        {getMusicPlatformName(track.platform)}
                      </Text>
                    </View>
                    <Text style={styles.musicTrackTitlePublic}>{track.title}</Text>
                    <View style={styles.listenButtonPublic}>
                      <Ionicons name="play" size={16} color="#1565FF" />
                      <Text style={styles.listenButtonTextPublic}>Listen</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}


        {profile && profile.user_type === 'business' && (
          <>
            {/* Business Logo */}
            {profile.business_logo && profile.business_logo !== 'default' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Business Logo</Text>
                <Image source={{ uri: profile.business_logo }} style={{width: 120, height: 120, borderRadius: 8}} />
              </View>
            )}

            {/* Business Photos */}
            {profile.business_photos && profile.business_photos.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Business Photos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{flexDirection: 'row', gap: 12}}>
                    {profile.business_photos.map((photo, index) => (
                      <Image key={index} source={{ uri: photo }} style={{width: 120, height: 120, borderRadius: 8}} />
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Amenities */}
            {profile.amenities && profile.amenities.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Amenities</Text>
                <View style={styles.chipContainer}>
                  {profile.amenities.map((amenity, index) => (
                    <View key={index} style={styles.chip}>
                      <Text style={styles.chipText}>{amenity}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Venue Categories */}
            {profile.venue_categories && profile.venue_categories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Venue Categories</Text>
                <View style={styles.chipContainer}>
                  {profile.venue_categories.map((cat, index) => (
                    <View key={index} style={styles.chip}>
                      <Text style={styles.chipText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Entertainment Categories */}
            {profile.entertainment_categories && profile.entertainment_categories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Entertainment Categories</Text>
                <View style={styles.chipContainer}>
                  {profile.entertainment_categories.map((cat, index) => (
                    <View key={index} style={styles.chip}>
                      <Text style={styles.chipText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {profile && profile.social_links && Object.keys(profile.social_links).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social Media & Links</Text>
            {profile.social_links.instagram && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <Ionicons name="logo-instagram" size={20} color="#E4405F" style={{marginRight: 12}} />
                <Text style={{fontSize: 14, color: '#333'}}>{profile.social_links.instagram}</Text>
              </View>
            )}
            {profile.social_links.facebook && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <Ionicons name="logo-facebook" size={20} color="#1877F2" style={{marginRight: 12}} />
                <Text style={{fontSize: 14, color: '#333'}}>{profile.social_links.facebook}</Text>
              </View>
            )}
            {profile.social_links.website && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <Ionicons name="globe-outline" size={20} color="#1565FF" style={{marginRight: 12}} />
                <Text style={{fontSize: 14, color: '#333'}}>{profile.social_links.website}</Text>
              </View>
            )}
            {profile.social_links.yelp && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <Ionicons name="star-outline" size={20} color="#FF0000" style={{marginRight: 12}} />
                <Text style={{fontSize: 14, color: '#333'}}>{profile.social_links.yelp}</Text>
              </View>
            )}
            {profile.social_links.google_business && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <Ionicons name="business-outline" size={20} color="#4285F4" style={{marginRight: 12}} />
                <Text style={{fontSize: 14, color: '#333'}}>{profile.social_links.google_business}</Text>
              </View>
            )}
            {profile.social_links.tiktok && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <Ionicons name="logo-tiktok" size={20} color="#000" style={{marginRight: 12}} />
                <Text style={{fontSize: 14, color: '#333'}}>{profile.social_links.tiktok}</Text>
              </View>
            )}
            {profile.social_links.snapchat && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <Ionicons name="logo-snapchat" size={20} color="#FFFC00" style={{marginRight: 12}} />
                <Text style={{fontSize: 14, color: '#333'}}>{profile.social_links.snapchat}</Text>
              </View>
            )}
            {profile.social_links.linkedin && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <Ionicons name="logo-linkedin" size={20} color="#0A66C2" style={{marginRight: 12}} />
                <Text style={{fontSize: 14, color: '#333'}}>{profile.social_links.linkedin}</Text>
              </View>
            )}
            {profile.social_links.twitter && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <Ionicons name="logo-twitter" size={20} color="#1DA1F2" style={{marginRight: 12}} />
                <Text style={{fontSize: 14, color: '#333'}}>{profile.social_links.twitter}</Text>
              </View>
            )}
            {profile.social_links.youtube && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <Ionicons name="logo-youtube" size={20} color="#FF0000" style={{marginRight: 12}} />
                <Text style={{fontSize: 14, color: '#333'}}>{profile.social_links.youtube}</Text>
              </View>
            )}
            {profile.social_links.pinterest && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <Ionicons name="logo-pinterest" size={20} color="#E60023" style={{marginRight: 12}} />
                <Text style={{fontSize: 14, color: '#333'}}>{profile.social_links.pinterest}</Text>
              </View>
            )}
          </View>
        )}

        {profile && profile.social_links && Array.isArray(profile.social_links) && profile.social_links.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social Media</Text>
            {profile.social_links.map((link, index) => {
              const [platform, handle] = link.split(':');
              const getIcon = () => {
                switch(platform) {
                  case 'instagram': return 'logo-instagram';
                  case 'facebook': return 'logo-facebook';
                  case 'tiktok': return 'logo-tiktok';
                  case 'youtube': return 'logo-youtube';
                  case 'linkedin': return 'logo-linkedin';
                  case 'website': return 'globe-outline';
                  default: return 'link-outline';
                }
              };
              return (
                <View key={index} style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                  <Ionicons name={getIcon()} size={20} color="#1565FF" style={{marginRight: 12}} />
                  <Text style={{fontSize: 14, color: '#333'}}>{handle}</Text>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => {
            if (profile?.user_type === 'business') {
              router.push('/profile/edit-business');
            } else if (profile?.user_type === 'entrepreneur') {
              router.push('/profile/edit-entrepreneur');
            } else {
              router.push('/profile/edit');
            }
          }}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButtonFull} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Video Player Modal */}
      <Modal
        visible={videoModalVisible}
        animationType="slide"
        onRequestClose={() => setVideoModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedVideo?.title || 'Video'}
            </Text>
            <TouchableOpacity 
              onPress={() => setVideoModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {selectedVideo?.embedUrl && (
            <WebView
              style={styles.webView}
              source={{ uri: selectedVideo.embedUrl }}
              allowsFullscreenVideo={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsInlineMediaPlayback={true}
            />
          )}
        </SafeAreaView>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
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
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB300',
    gap: 12,
  },
  bannerIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  bannerDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  bannerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Upgrade Banner Styles
  upgradeBanner: {
    flexDirection: 'row',
    backgroundColor: '#F0F7FF',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1565FF',
    gap: 16,
  },
  upgradeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeBannerContent: {
    flex: 1,
  },
  upgradeBannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565FF',
    marginBottom: 4,
  },
  upgradeBannerDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  upgradeBannerButton: {
    flexDirection: 'row',
    backgroundColor: '#1565FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  upgradeBannerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  bio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  // Avatar container with colored borders for membership tiers
  avatarContainerGold: {
    padding: 4,
    borderRadius: 52,
    borderWidth: 4,
    borderColor: '#FFD700', // Gold color
  },
  avatarContainerSilver: {
    padding: 4,
    borderRadius: 52,
    borderWidth: 4,
    borderColor: '#C0C0C0', // Silver color
  },
  avatarContainerBronze: {
    padding: 4,
    borderRadius: 52,
    borderWidth: 4,
    borderColor: '#CD7F32', // Bronze color
  },
  // Occupations display
  occupationsContainer: {
    marginTop: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  occupationsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  occupationsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  occupationChip: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1565FF',
  },
  occupationChipText: {
    fontSize: 14,
    color: '#1565FF',
    fontWeight: '600',
  },
  // Membership badge
  membershipBadgeContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#666',
  },
  membershipBadgeGold: {
    backgroundColor: '#FFD700',
  },
  membershipBadgeSilver: {
    backgroundColor: '#C0C0C0',
  },
  membershipBadgeBronze: {
    backgroundColor: '#CD7F32',
  },
  membershipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    backgroundColor: '#1565FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tierBadge: {
    backgroundColor: '#4CAF50',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1565FF',
  },
  chipText: {
    fontSize: 14,
    color: '#1565FF',
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    margin: 24,
    marginBottom: 12,
    backgroundColor: '#1565FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButtonFull: {
    flexDirection: 'row',
    marginHorizontal: 24,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontWeight: '500',
  },
  contactValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1565FF',
  },
  serviceCardTwoColumn: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1565FF',
    width: '48%', // Two columns with gap
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  servicePrice: {
    fontSize: 13,
    color: '#1565FF',
    fontWeight: '500',
  },
  // Music Tracks Public Profile Styles
  musicTrackCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  musicPlatformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
    marginBottom: 8,
  },
  musicPlatformText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  musicTrackTitlePublic: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  listenButtonPublic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F7FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#1565FF',
  },
  listenButtonTextPublic: {
    color: '#1565FF',
    fontSize: 14,
    fontWeight: '600',
  },

  quotePriceText: {
    fontStyle: 'italic',
    color: '#666',
  },
  // Portfolio Videos Styles
  videoThumbnailContainer: {
    position: 'relative',
    width: 150,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  videoPlaceholder: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  platformBadgeSmall: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  youtubeBadge: {
    backgroundColor: '#FF0000',
  },
  vimeoBadge: {
    backgroundColor: '#1ab7ea',
  },
  videoTitleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 6,
  },
  videoTitleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  // Video Player Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1a1a1a',
  },
  modalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 12,
  },
  closeButton: {
    padding: 8,
  },
  webView: {
    flex: 1,
  },
  // Featured Video Badge Styles
  featuredVideoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  featuredVideoApproved: {
    backgroundColor: '#4CAF50',
  },
  featuredVideoPending: {
    backgroundColor: '#FF9800',
  },
  featuredVideoBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});