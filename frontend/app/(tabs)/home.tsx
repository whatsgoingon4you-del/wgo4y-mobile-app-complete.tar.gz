import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  Linking,
  Alert,
  BackHandler,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import ProfileCompletionModal from '../../components/ProfileCompletionModal';
import { API_URL } from '../../utils/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;


interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Event {
  id: string;
  title: string;
  image: string;
  date: string;
  venue: string;
  price: number;
}

interface Venue {
  id: string;
  name: string;
  image: string;
  type: string;
  rating: number;
}

interface Service {
  id: string;
  name: string;
  image: string;
  description: string;
  price: number;
}

interface FeaturedPortfolioVideo {
  video: {
    url: string;
    title?: string;
    platform?: string;
    videoId?: string;
    thumbnailUrl?: string;
    featured: boolean;
    featured_approved: boolean;
  };
  user: {
    id: string;
    username: string;
    full_name: string;
    profile_photo: string;
    user_type: string;
    membership_tier: string;
    location: string;
  };
}

export default function Home() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [popularVenues, setPopularVenues] = useState<Venue[]>([]);
  const [featuredServices, setFeaturedServices] = useState<Service[]>([]);
  const [featuredPortfolioVideos, setFeaturedPortfolioVideos] = useState<FeaturedPortfolioVideo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(true);
  const [modalShownThisSession, setModalShownThisSession] = useState(false);

  // Check profile completion status - only show modal once per session
  useFocusEffect(
    React.useCallback(() => {
      const checkProfileStatus = async () => {
        const userType = user?.user_type;
        
        // Only show for entrepreneur or business users
        if ((userType === 'entrepreneur' || userType === 'business') && !modalShownThisSession) {
          try {
            const token = await AsyncStorage.getItem('auth_token');
            
            // Check if modal was already dismissed this session
            const modalDismissed = await AsyncStorage.getItem('profile_modal_dismissed_session');
            
            if (modalDismissed === 'true') {
              // User dismissed it this session, don't show again
              setModalShownThisSession(true);
              return;
            }
            
            const response = await axios.get(`${API_URL}/api/profile`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const profileData = response.data;
            
            let needsEnhancement = false;
            
            if (userType === 'entrepreneur') {
              // Check if profile needs enhancement (services_offered or portfolio missing)
              needsEnhancement = !profileData.has_services_with_pricing || !profileData.has_portfolio;
            } else if (userType === 'business') {
              // For business: Check if they have amenities, entertainment categories, or social links
              // These are optional but encouraged for better profile
              const hasAmenities = profileData.amenities && profileData.amenities.length > 0;
              const hasEntertainment = profileData.entertainment_categories && profileData.entertainment_categories.length > 0;
              const hasSocialLinks = profileData.social_links && (
                profileData.social_links.instagram ||
                profileData.social_links.facebook ||
                profileData.social_links.website ||
                profileData.social_links.yelp ||
                profileData.social_links.google_business
              );
              
              // Show modal if missing all optional enhancements
              needsEnhancement = !hasAmenities && !hasEntertainment && !hasSocialLinks;
            }
            
            setProfileCompleted(!needsEnhancement);
            
            // Only show modal if needs enhancement and hasn't been shown yet
            if (needsEnhancement && !modalShownThisSession) {
              setShowProfileModal(true);
              setModalShownThisSession(true);
            }
          } catch (error) {
            console.error('Error checking profile status:', error);
          }
        }
      };

      checkProfileStatus();
    }, [user?.user_type, modalShownThisSession])
  );

  useEffect(() => {
    loadData();
  }, []);

  // Handle back button press on home screen - show logout confirmation
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Show logout confirmation
        if (Platform.OS === 'web') {
          if (confirm('Are you sure you want to log out?')) {
            handleLogout();
          }
        } else {
          Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log Out', style: 'destructive', onPress: handleLogout }
            ]
          );
        }
        return true; // Prevent default back behavior
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      return () => backHandler.remove();
    }, [])
  );

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const loadData = async () => {
    try {
      console.log('🏠 Home: Starting to load data...');
      const token = await AsyncStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      console.log('🏠 Home: Token exists:', !!token);

      // Get user location for local filtering (if available)
      let userLocation = '';
      try {
        const profileRes = await axios.get(`${API_URL}/api/profile`, { headers });
        userLocation = profileRes.data?.location || '';
        console.log('🏠 Home: User location:', userLocation);
      } catch (err) {
        console.log('🏠 Home: No profile data (user may not be logged in)');
        // User not logged in or no profile, skip location filtering
      }

      console.log('🏠 Home: Fetching all data in parallel...');
      const [categoriesRes, eventsRes, venuesRes, servicesRes, featuredPortfolioRes] = await Promise.all([
        axios.get(`${API_URL}/api/categories`, { headers }),
        axios.get(`${API_URL}/api/events`, { headers }),
        axios.get(`${API_URL}/api/venues?popular=true`, { headers }),
        axios.get(`${API_URL}/api/services?featured=true`, { headers }),
        axios.get(`${API_URL}/api/videos/featured${userLocation ? `?location=${encodeURIComponent(userLocation)}` : ''}`, { headers }),
      ]);

      console.log('🏠 Home: Featured videos response:', featuredPortfolioRes.data.length, 'videos');
      console.log('🏠 Home: Featured videos data:', JSON.stringify(featuredPortfolioRes.data, null, 2));

      setCategories(categoriesRes.data);
      setFeaturedEvents(eventsRes.data.slice(0, 5)); // Show only 5 events in carousel
      setPopularVenues(venuesRes.data.slice(0, 5)); // Show only 5 venues in carousel
      setFeaturedServices(servicesRes.data.slice(0, 5)); // Show only 5 services in carousel
      setFeaturedPortfolioVideos(featuredPortfolioRes.data.slice(0, 6)); // Show up to 6 featured portfolio videos
      
      console.log('🏠 Home: State updated. Featured videos count:', featuredPortfolioRes.data.slice(0, 6).length);
    } catch (error) {
      console.error('❌ Home: Error loading data:', error);
      if (error.response) {
        console.error('❌ Home: Error response:', error.response.status, error.response.data);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const quickActions = [
    { id: '1', title: 'Browse Events', icon: 'calendar', route: '/events' },
    { id: '2', title: 'Find Venues', icon: 'location', route: '/venues' },
    { id: '3', title: 'Get Coupons', icon: 'pricetag', route: '/coupons' },
    { id: '4', title: 'VIP Access', icon: 'star', route: '/vip' },
    { id: '5', title: 'Raffles', icon: 'gift', route: '/raffles' },
    { id: '6', title: 'Services', icon: 'briefcase', route: '/services' },
  ];

  const handleModalClose = () => {
    // Modal closed temporarily but will reappear on next focus if profile still incomplete
    setShowProfileModal(false);
    // Mark as dismissed for this session
    AsyncStorage.setItem('profile_modal_dismissed_session', 'true');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Profile Completion Modal */}
      <ProfileCompletionModal 
        visible={showProfileModal} 
        onComplete={handleModalClose}
        userType={user?.user_type}
      />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>WGO4Y</Text>
          <Text style={styles.headerSubtitle}>Discover Amazing Experiences</Text>
        </View>

        {/* Featured Portfolio Videos - PROMINENT SECTION */}
        {featuredPortfolioVideos.length > 0 && (
          <View style={[styles.section, styles.featuredVideosSection]}>
            <View style={styles.featuredHeaderContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.featuredHeader}>
                  <Ionicons name="star" size={24} color="#FFD700" />
                  <Text style={styles.featuredSectionTitle}>Featured Videos</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/videos')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.featuredSubtitle}>Watch videos from top WGO4Y members</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredCarousel}>
              {featuredPortfolioVideos.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.featuredVideoCard}
                  onPress={() => {
                    Linking.openURL(item.video.url).catch(() =>
                      Alert.alert('Error', 'Could not open video')
                    );
                  }}
                >
                  {/* Video Thumbnail */}
                  <View style={styles.featuredThumbnailContainer}>
                    {item.video.thumbnailUrl ? (
                      <Image 
                        source={{ uri: item.video.thumbnailUrl }} 
                        style={styles.featuredThumbnail}
                      />
                    ) : (
                      <View style={[styles.featuredThumbnail, styles.featuredThumbnailPlaceholder]}>
                        <Ionicons 
                          name={item.video.platform === 'youtube' ? 'logo-youtube' : 'logo-vimeo'} 
                          size={50} 
                          color="#fff" 
                        />
                      </View>
                    )}
                    {/* Play button overlay */}
                    <View style={styles.featuredPlayOverlay}>
                      <Ionicons name="play-circle" size={60} color="rgba(255, 255, 255, 0.95)" />
                    </View>
                    {/* Platform badge */}
                    <View style={[
                      styles.featuredPlatformBadge,
                      item.video.platform === 'youtube' ? styles.youtubeBadge : styles.vimeoBadge
                    ]}>
                      <Ionicons 
                        name={item.video.platform === 'youtube' ? 'logo-youtube' : 'logo-vimeo'} 
                        size={14} 
                        color="#fff" 
                      />
                    </View>
                    {/* Featured star badge */}
                    <View style={styles.featuredStarBadge}>
                      <Ionicons name="star" size={16} color="#FFD700" />
                    </View>
                  </View>
                  
                  {/* Video Info */}
                  <View style={styles.featuredVideoInfo}>
                    <Text style={styles.featuredVideoTitle} numberOfLines={2}>
                      {item.video.title || 'Featured Video'}
                    </Text>
                    {/* User info */}
                    <View style={styles.featuredUserInfo}>
                      {item.user.profile_photo ? (
                        <Image 
                          source={{ uri: item.user.profile_photo }} 
                          style={styles.featuredUserPhoto}
                        />
                      ) : (
                        <View style={[styles.featuredUserPhoto, styles.featuredUserPhotoPlaceholder]}>
                          <Ionicons name="person" size={16} color="#999" />
                        </View>
                      )}
                      <View style={styles.featuredUserDetails}>
                        <Text style={styles.featuredUserName} numberOfLines={1}>
                          {item.user.full_name || item.user.username}
                        </Text>
                        <View style={styles.featuredTierContainer}>
                          <View style={[
                            styles.featuredTierBadge,
                            item.user.membership_tier === 'gold' && styles.goldTierBadge,
                            item.user.membership_tier === 'silver' && styles.silverTierBadge
                          ]}>
                            <Text style={styles.featuredTierText}>
                              {item.user.membership_tier?.toUpperCase() || 'MEMBER'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Explore Categories</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
            {categories.length > 0 ? (
              categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryCard}
                  onPress={() => router.push(`/events?category=${encodeURIComponent(category.name)}`)}
                >
                  <View style={styles.categoryIcon}>
                    <Ionicons name={category.icon as any} size={32} color="#1565FF" />
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>No categories available</Text>
            )}
          </ScrollView>
        </View>

        {/* Featured Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Events</Text>
            <TouchableOpacity onPress={() => router.push('/events')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
            {featuredEvents.length > 0 ? (
              featuredEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => router.push(`/event/${event.id}`)}
                >
                  <Image
                    source={{ uri: event.image }}
                    style={styles.eventImage}
                    defaultSource={require('../../assets/images/app-image.png')}
                  />
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {event.title}
                    </Text>
                    <Text style={styles.eventVenue} numberOfLines={1}>
                      {event.venue}
                    </Text>
                    <View style={styles.eventFooter}>
                      <Text style={styles.eventPrice}>${event.price}</Text>
                      <View style={styles.eventDate}>
                        <Ionicons name="calendar-outline" size={14} color="#666" />
                        <Text style={styles.eventDateText}>
                          {new Date(event.date).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No events available yet</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Popular Venues */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Venues</Text>
            <TouchableOpacity onPress={() => router.push('/venues')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
            {popularVenues.length > 0 ? (
              popularVenues.map((venue) => (
                <TouchableOpacity
                  key={venue.id}
                  style={styles.venueCard}
                  onPress={() => router.push(`/venue/${venue.id}`)}
                >
                  <Image source={{ uri: venue.image }} style={styles.venueImage} />
                  <View style={styles.venueInfo}>
                    <Text style={styles.venueName} numberOfLines={1}>
                      {venue.name}
                    </Text>
                    <Text style={styles.venueType} numberOfLines={1}>
                      {venue.type}
                    </Text>
                    <View style={styles.venueRating}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={styles.venueRatingText}>{venue.rating}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No venues available yet</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* WGO4Y Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>WGO4Y Services</Text>
            <TouchableOpacity onPress={() => router.push('/services')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
            {featuredServices.length > 0 ? (
              featuredServices.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={styles.serviceCard}
                  onPress={() => router.push(`/service/${service.id}`)}
                >
                  <Image source={{ uri: service.image }} style={styles.serviceImage} />
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName} numberOfLines={2}>
                      {service.name}
                    </Text>
                    <Text style={styles.serviceDescription} numberOfLines={2}>
                      {service.description}
                    </Text>
                    <Text style={styles.servicePrice}>${service.price}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No services available yet</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => router.push(action.route as any)}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name={action.icon as any} size={28} color="#1565FF" />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
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
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1565FF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  seeAllText: {
    fontSize: 14,
    color: '#1565FF',
    fontWeight: '600',
  },
  carousel: {
    paddingLeft: 24,
  },
  categoryCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 16,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  eventCard: {
    width: CARD_WIDTH,
    marginRight: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  eventImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  eventInfo: {
    padding: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  eventVenue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565FF',
  },
  eventDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDateText: {
    fontSize: 12,
    color: '#666',
  },
  venueCard: {
    width: 200,
    marginRight: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  venueImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  venueInfo: {
    padding: 12,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  venueType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  venueRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  venueRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  videoCard: {
    width: CARD_WIDTH,
    marginRight: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  videoThumbnail: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  playButton: {
    position: 'absolute',
    top: 76,
    left: '50%',
    marginLeft: -24,
  },
  videoInfo: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  videoCreator: {
    fontSize: 14,
    color: '#666',
  },
  serviceCard: {
    width: 220,
    marginRight: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceImage: {
    width: '100%',
    height: 140,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  serviceInfo: {
    padding: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565FF',
  },
  actionCard: {
    width: 120,
    padding: 16,
    marginRight: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  // Featured Portfolio Videos Styles
  featuredVideosSection: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 24,
    marginBottom: 8,
  },
  featuredHeaderContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  featuredSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  featuredSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  featuredCarousel: {
    marginTop: 16,
  },
  featuredVideoCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featuredThumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  featuredThumbnail: {
    width: '100%',
    height: '100%',
  },
  featuredThumbnailPlaceholder: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  featuredPlatformBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  youtubeBadge: {
    backgroundColor: '#FF0000',
  },
  vimeoBadge: {
    backgroundColor: '#1ab7ea',
  },
  featuredStarBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 6,
  },
  featuredVideoInfo: {
    padding: 12,
  },
  featuredVideoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    lineHeight: 22,
  },
  featuredUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredUserPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  featuredUserPhotoPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredUserDetails: {
    flex: 1,
  },
  featuredUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featuredTierContainer: {
    flexDirection: 'row',
  },
  featuredTierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  goldTierBadge: {
    backgroundColor: '#FFD700',
  },
  silverTierBadge: {
    backgroundColor: '#C0C0C0',
  },
  featuredTierText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
});

