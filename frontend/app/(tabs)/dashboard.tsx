import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profileCompleted, setProfileCompleted] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tierLimits, setTierLimits] = useState<any>(null);
  const [showUsageWidget, setShowUsageWidget] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Check profile completion status for entrepreneurs and businesses
  useFocusEffect(
    React.useCallback(() => {
      const checkProfileStatus = async () => {
        if (!user) {
          setLoadingProfile(false);
          return;
        }
        
        try {
          setLoadingProfile(true);
          const token = await AsyncStorage.getItem('auth_token');
          
          // Load profile, tier limits, and unread notifications in parallel
          const [profileRes, tierLimitsRes, notificationsRes] = await Promise.all([
            axios.get(`${API_URL}/api/profile`, {
              headers: { Authorization: `Bearer ${token}` }
            }),
            axios.get(`${API_URL}/api/profile/tier-limits`, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => ({ data: null })), // Gracefully handle if endpoint fails
            axios.get(`${API_URL}/api/notifications?unread_only=true`, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => ({ data: [] })) // Gracefully handle if endpoint fails
          ]);
          
          const response = profileRes.data;
          const limitsData = tierLimitsRes.data;
          const notificationsData = notificationsRes.data;
          
          // Set unread notification count
          setUnreadNotifications(Array.isArray(notificationsData) ? notificationsData.length : 0);
          
          // Set tier limits for usage widget
          if (limitsData && (user?.user_type === 'entrepreneur' || user?.user_type === 'business')) {
            setTierLimits(limitsData);
            setShowUsageWidget(true);
          }
          
          // Check if user is admin (for all user types)
          console.log('📋 Dashboard: Profile response is_admin:', response.is_admin);
          console.log('📋 Dashboard: User type:', user?.user_type);
          setIsAdmin(response.is_admin || false);
          
          let needsEnhancement = false;
          
          if (user?.user_type === 'entrepreneur') {
            // Check if profile needs enhancement (services_offered or portfolio missing)
            needsEnhancement = !response.has_services_with_pricing || !response.has_portfolio;
          } else if (user?.user_type === 'business') {
            // For business: Check if they have amenities, entertainment categories, or social links
            const hasAmenities = response.amenities && response.amenities.length > 0;
            const hasEntertainment = response.entertainment_categories && response.entertainment_categories.length > 0;
            const hasSocialLinks = response.social_links && (
              response.social_links.instagram ||
              response.social_links.facebook ||
              response.social_links.website ||
              response.social_links.yelp ||
              response.social_links.google_business
            );
            
            // Show banner if missing all optional enhancements
            needsEnhancement = !hasAmenities && !hasEntertainment && !hasSocialLinks;
          }
          
          setProfileCompleted(!needsEnhancement);
        } catch (error: any) {
          // Gracefully handle errors - don't show banner if we can't check status
          console.error('Error checking profile status:', error);
          // Default to completed to avoid showing banner on error
          setProfileCompleted(true);
        } finally {
          setLoadingProfile(false);
        }
      };

      checkProfileStatus();
    }, [user?.user_type])
  );

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to logout?')) {
        try {
          await logout();
          router.replace('/login');
        } catch (error) {
          console.error('Logout error:', error);
          alert('Error: Failed to logout. Please try again.');
        }
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]);
    }
  };

  const getMenuItems = () => {
    const commonItems = [
      { id: 'profile', title: 'Profile', icon: 'person', route: '/profile' },
      { id: 'coupons', title: 'Coupons', icon: 'pricetag', route: '/coupons' },
      { id: 'raffles', title: 'Raffles', icon: 'gift', route: '/raffles' },
    ];
    
    // Add admin item at the top if user is admin
    const adminItems = isAdmin ? [
      { id: 'admin', title: '👑 Admin Dashboard', icon: 'shield-checkmark', route: '/admin/featured-videos' },
      { id: 'consulting_admin', title: '💼 Consulting Requests', icon: 'people', route: '/consultant' },
      { id: 'workers_admin', title: '👷 Worker Applications', icon: 'construct', route: '/workers/admin' },
    ] : [];

    if (user?.user_type === 'business') {
      return [
        ...adminItems,
        ...commonItems,
        { id: 'events', title: 'My Events', icon: 'calendar', route: '/my-events' },
        { id: 'consultant', title: 'Consulting', icon: 'people', route: '/consultant' },
        { id: 'workers', title: 'Find Workers', icon: 'construct', route: '/workers' },
        { id: 'jobs', title: 'Jobs', icon: 'briefcase', route: '/jobs' },
        { id: 'menu', title: 'Menu Management', icon: 'restaurant', route: '/menu' },
        { id: 'analytics', title: 'Analytics', icon: 'stats-chart', route: '/analytics' },
        { id: 'services', title: 'My Services', icon: 'construct', route: '/my-services' },
      ];
    } else if (user?.user_type === 'entrepreneur') {
      return [
        ...adminItems,
        ...commonItems,
        { id: 'events', title: 'My Events', icon: 'calendar', route: '/my-events' },
        { id: 'consultant', title: 'Consulting', icon: 'people', route: '/consultant' },
        { id: 'workers', title: 'Find Workers', icon: 'construct', route: '/workers' },
        { id: 'bookings', title: 'My Bookings', icon: 'calendar-outline', route: '/my-bookings' },
        { id: 'services', title: 'My Services', icon: 'construct', route: '/my-services' },
        { id: 'portfolio', title: 'Portfolio', icon: 'images', route: '/portfolio' },
      ];
    }

    // General Public - Can view and manage events they're interested in
    return [
      ...adminItems,
      ...commonItems,
      { id: 'events', title: 'My Events', icon: 'calendar', route: '/my-events' },
      { id: 'venues', title: 'Saved Venues', icon: 'location', route: '/saved-venues' },
      { id: 'vip', title: 'VIP Access', icon: 'star', route: '/vip' },
      { id: 'consultant', title: 'Consultant', icon: 'people', route: '/consultant' },
      { id: 'contacts', title: 'Saved Contacts', icon: 'people-outline', route: '/saved-contacts' },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Completion Banner for Entrepreneurs and Businesses */}
        {(user?.user_type === 'entrepreneur' || user?.user_type === 'business') && !loadingProfile && !profileCompleted && (
          <View style={styles.completionBanner}>
            <View style={styles.bannerIconContainer}>
              <Ionicons name="alert-circle" size={28} color="#FF9800" />
            </View>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>
                {user?.user_type === 'business' ? 'Enhance your business profile' : 'Finish creating your profile'}
              </Text>
              <Text style={styles.bannerSubtitle}>
                {user?.user_type === 'business' 
                  ? 'Add amenities, entertainment types, and social links to attract more customers' 
                  : 'Complete your profile to start getting bookings and unlock all platform features!'}
              </Text>
              <TouchableOpacity 
                style={styles.bannerButton}
                onPress={() => router.push(user?.user_type === 'business' ? '/profile/edit-business' : '/profile/edit-entrepreneur' as any)}
                accessibilityLabel="Complete your profile"
                accessibilityHint="Navigate to profile edit screen to complete your profile"
              >
                <Text style={styles.bannerButtonText}>Complete Profile</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tier Usage Widget for Entrepreneurs & Businesses */}
        {showUsageWidget && tierLimits && tierLimits.usage && (
          <View style={styles.usageWidget}>
            <View style={styles.usageHeader}>
              <Ionicons name="stats-chart" size={20} color="#1565FF" />
              <Text style={styles.usageTitle}>Tier Usage</Text>
              <View style={styles.tierBadge}>
                <Text style={styles.tierBadgeText}>{tierLimits.membership_tier?.toUpperCase()}</Text>
              </View>
            </View>

            {/* Photo Usage */}
            {user?.user_type === 'entrepreneur' && tierLimits.usage.portfolio_photos && (
              <View style={styles.usageItem}>
                <View style={styles.usageItemHeader}>
                  <Ionicons name="images" size={18} color="#666" />
                  <Text style={styles.usageLabel}>Portfolio Photos</Text>
                </View>
                <View style={styles.usageBar}>
                  <View style={styles.usageBarBg}>
                    <View 
                      style={[
                        styles.usageBarFill, 
                        { 
                          width: `${Math.min(
                            (tierLimits.usage.portfolio_photos.current / 
                            (tierLimits.usage.portfolio_photos.limit >= 999 ? 100 : tierLimits.usage.portfolio_photos.limit)) * 100,
                            100
                          )}%` 
                        },
                        tierLimits.usage.portfolio_photos.near_limit && styles.usageBarWarning
                      ]} 
                    />
                  </View>
                  <Text style={styles.usageCount}>
                    {tierLimits.usage.portfolio_photos.current}/{tierLimits.usage.portfolio_photos.limit >= 999 ? '∞' : tierLimits.usage.portfolio_photos.limit}
                  </Text>
                </View>
              </View>
            )}

            {/* Business Photo Usage */}
            {user?.user_type === 'business' && tierLimits.usage.business_photos && (
              <View style={styles.usageItem}>
                <View style={styles.usageItemHeader}>
                  <Ionicons name="images" size={18} color="#666" />
                  <Text style={styles.usageLabel}>Business Photos</Text>
                </View>
                <View style={styles.usageBar}>
                  <View style={styles.usageBarBg}>
                    <View 
                      style={[
                        styles.usageBarFill, 
                        { 
                          width: `${Math.min(
                            (tierLimits.usage.business_photos.current / 
                            (tierLimits.usage.business_photos.limit >= 999 ? 100 : tierLimits.usage.business_photos.limit)) * 100,
                            100
                          )}%` 
                        },
                        tierLimits.usage.business_photos.near_limit && styles.usageBarWarning
                      ]} 
                    />
                  </View>
                  <Text style={styles.usageCount}>
                    {tierLimits.usage.business_photos.current}/{tierLimits.usage.business_photos.limit >= 999 ? '∞' : tierLimits.usage.business_photos.limit}
                  </Text>
                </View>
              </View>
            )}

            {/* Featured Video Usage */}
            {tierLimits.usage.featured_videos && (
              <View style={styles.usageItem}>
                <View style={styles.usageItemHeader}>
                  <Ionicons name="videocam" size={18} color="#666" />
                  <Text style={styles.usageLabel}>Featured Videos</Text>
                </View>
                <View style={styles.usageBar}>
                  <View style={styles.usageBarBg}>
                    <View 
                      style={[
                        styles.usageBarFill,
                        { 
                          width: `${Math.min(
                            (tierLimits.usage.featured_videos.current / 
                            (tierLimits.usage.featured_videos.limit >= 999 ? 100 : tierLimits.usage.featured_videos.limit)) * 100,
                            100
                          )}%` 
                        },
                        tierLimits.usage.featured_videos.near_limit && styles.usageBarWarning
                      ]} 
                    />
                  </View>
                  <Text style={styles.usageCount}>
                    {tierLimits.usage.featured_videos.current}/{tierLimits.usage.featured_videos.limit >= 999 ? '∞' : tierLimits.usage.featured_videos.limit}
                  </Text>
                </View>
              </View>
            )}

            {/* RSVP Usage (GP only) */}
            {tierLimits.usage.rsvps && (
              <View style={styles.usageItem}>
                <View style={styles.usageItemHeader}>
                  <Ionicons name="calendar" size={18} color="#666" />
                  <Text style={styles.usageLabel}>RSVPs This Month</Text>
                </View>
                <View style={styles.usageBar}>
                  <View style={styles.usageBarBg}>
                    <View 
                      style={[
                        styles.usageBarFill,
                        { 
                          width: `${Math.min(
                            (tierLimits.usage.rsvps.current / 
                            (tierLimits.usage.rsvps.limit >= 999 ? 100 : tierLimits.usage.rsvps.limit)) * 100,
                            100
                          )}%` 
                        },
                        tierLimits.usage.rsvps.near_limit && styles.usageBarWarning
                      ]} 
                    />
                  </View>
                  <Text style={styles.usageCount}>
                    {tierLimits.usage.rsvps.current}/{tierLimits.usage.rsvps.limit >= 999 ? '∞' : tierLimits.usage.rsvps.limit}
                  </Text>
                </View>
                <Text style={styles.usageMonth}>{tierLimits.usage.rsvps.month}</Text>
              </View>
            )}

            {/* Upgrade Link */}
            {tierLimits.limits && !tierLimits.limits.unlimited_photos && (
              <TouchableOpacity 
                style={styles.upgradeWidgetLink}
                onPress={() => router.push('/onboarding/tier-selection?upgrade=true' as any)}
              >
                <Text style={styles.upgradeWidgetText}>Upgrade for more features</Text>
                <Ionicons name="arrow-forward" size={16} color="#1565FF" />
              </TouchableOpacity>
            )}
          </View>
        )}


        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              {user?.full_name || user?.username}
            </Text>
            <View style={styles.userTypeBadge}>
              <Text style={styles.userTypeText}>
                {user?.user_type?.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          
          {/* Notification Bell */}
          <TouchableOpacity 
            style={styles.notificationButton} 
            onPress={() => router.push('/notifications')}
            accessibilityLabel="Notifications"
            accessibilityHint={`You have ${unreadNotifications} unread notification${unreadNotifications !== 1 ? 's' : ''}`}
          >
            <Ionicons name={unreadNotifications > 0 ? 'notifications' : 'notifications-outline'} size={28} color="#000" />
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                {unreadNotifications === 1 ? (
                  <View style={styles.notificationDot} />
                ) : (
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name={item.icon as any} size={24} color="#1565FF" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          ))}

          {/* Logout */}
          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="log-out" size={24} color="#ff4444" />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, styles.logoutText]}>Logout</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  completionBanner: {
    backgroundColor: '#FFF3E0',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerIconContainer: {
    marginRight: 12,
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#5D4037',
    lineHeight: 20,
    marginBottom: 12,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginRight: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  userTypeBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1565FF',
    borderRadius: 16,
  },
  userTypeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  menuContainer: {
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  logoutItem: {
    marginTop: 16,
  },
  logoutText: {
    color: '#ff4444',
  },
  usageWidget: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  usageTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  tierBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1565FF',
  },
  usageItem: {
    marginBottom: 16,
  },
  usageItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  usageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  usageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  usageBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    backgroundColor: '#1565FF',
    borderRadius: 4,
  },
  usageBarWarning: {
    backgroundColor: '#FF9800',
  },
  usageCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    minWidth: 50,
  },
  usageMonth: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  upgradeWidgetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 6,
  },
  upgradeWidgetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565FF',
  },
});

