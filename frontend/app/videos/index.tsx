import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../utils/api';

interface FeaturedVideo {
  video: {
    url: string;
    title: string;
    platform: string;
    videoId: string;
    thumbnailUrl: string;
    featured_approved: boolean;
  };
  user: {
    id: string;
    username: string;
    full_name: string;
    user_type: string;
    membership_tier: string;
    location: string;
  };
}

export default function FeaturedVideosPage() {
  const [videos, setVideos] = useState<FeaturedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(`${API_URL}/api/videos/featured`, { headers });
      setVideos(response.data);
    } catch (error) {
      console.error('Error loading featured videos:', error);
      Alert.alert('Error', 'Failed to load featured videos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVideos();
  };

  const handleVideoPress = (video: FeaturedVideo) => {
    Linking.openURL(video.video.url).catch(() =>
      Alert.alert('Error', 'Could not open video')
    );
  };

  const getMembershipBadge = (tier: string) => {
    const badges = {
      gold: { emoji: '🥇', color: '#FFD700', text: 'GOLD' },
      silver: { emoji: '🥈', color: '#C0C0C0', text: 'SILVER' },
      free: { emoji: '', color: '#999', text: '' }
    };
    return badges[tier as keyof typeof badges] || badges.free;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Featured Videos</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading featured videos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Featured Videos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Ionicons name="star" size={48} color="#FFD700" />
          <Text style={styles.heroTitle}>Featured Videos</Text>
          <Text style={styles.heroSubtitle}>
            Discover amazing content from top WGO4Y members
          </Text>
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>{videos.length} Featured Videos</Text>
          </View>
        </View>

        {/* Videos Grid */}
        {videos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-off-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Featured Videos Yet</Text>
            <Text style={styles.emptyText}>
              Check back soon for featured content from our community
            </Text>
          </View>
        ) : (
          <View style={styles.videosGrid}>
            {videos.map((item, index) => {
              const badge = getMembershipBadge(item.user.membership_tier);
              return (
                <TouchableOpacity
                  key={`${item.user.id}-${index}`}
                  style={styles.videoCard}
                  onPress={() => handleVideoPress(item)}
                  activeOpacity={0.7}
                >
                  {/* Video Thumbnail */}
                  <View style={styles.thumbnailContainer}>
                    <Image
                      source={{ uri: item.video.thumbnailUrl }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                    
                    {/* Play Button Overlay */}
                    <View style={styles.playOverlay}>
                      <View style={styles.playButton}>
                        <Ionicons name="play" size={32} color="#fff" />
                      </View>
                    </View>

                    {/* Platform Badge */}
                    <View style={[
                      styles.platformBadge,
                      item.video.platform === 'youtube' ? styles.youtubeBadge : styles.vimeoBadge
                    ]}>
                      <Ionicons 
                        name={item.video.platform === 'youtube' ? 'logo-youtube' : 'logo-vimeo'} 
                        size={14} 
                        color="#fff" 
                      />
                    </View>

                    {/* Featured Badge */}
                    <View style={styles.featuredBadge}>
                      <Ionicons name="star" size={12} color="#fff" />
                      <Text style={styles.featuredBadgeText}>FEATURED</Text>
                    </View>
                  </View>

                  {/* Video Info */}
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {item.video.title}
                    </Text>
                    
                    <View style={styles.creatorInfo}>
                      <Text style={styles.creatorName} numberOfLines={1}>
                        {item.user.full_name || item.user.username}
                      </Text>
                      {badge.emoji && (
                        <View style={styles.membershipBadge}>
                          <Text style={styles.membershipEmoji}>{badge.emoji}</Text>
                          <Text style={[styles.membershipText, { color: badge.color }]}>
                            {badge.text}
                          </Text>
                        </View>
                      )}
                    </View>

                    {item.user.location && (
                      <View style={styles.locationContainer}>
                        <Ionicons name="location-outline" size={14} color="#666" />
                        <Text style={styles.locationText} numberOfLines={1}>
                          {item.user.location}
                        </Text>
                      </View>
                    )}

                    <View style={styles.userTypeBadge}>
                      <Text style={styles.userTypeText}>
                        {item.user.user_type === 'business' ? 'Business' : 'Entrepreneur'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8f9fa',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  statsContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565FF',
  },
  videosGrid: {
    padding: 16,
  },
  videoCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  thumbnailContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  youtubeBadge: {
    backgroundColor: '#FF0000',
  },
  vimeoBadge: {
    backgroundColor: '#1AB7EA',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    gap: 4,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  membershipEmoji: {
    fontSize: 14,
  },
  membershipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
  },
  userTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  userTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});
