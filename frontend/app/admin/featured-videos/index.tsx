import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

interface PendingVideo {
  video_index: number;
  video: {
    url: string;
    title?: string;
    platform?: string;
    videoId?: string;
    thumbnailUrl?: string;
    featured: boolean;
    featured_approved: boolean;
    featured_date?: string;
  };
  user: {
    id: string;
    username: string;
    full_name: string;
    email: string;
    membership_tier: string;
    location: string;
  };
}

export default function AdminFeaturedVideosScreen() {
  const router = useRouter();
  const [pendingVideos, setPendingVideos] = useState<PendingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingVideoId, setProcessingVideoId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingVideos();
  }, []);

  const loadPendingVideos = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      console.log('📋 Loading pending featured videos...');
      const response = await axios.get(`${API_URL}/api/admin/featured-videos/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Loaded pending videos:', response.data.length);
      setPendingVideos(response.data);
    } catch (error: any) {
      console.error('❌ Error loading pending videos:', error);
      if (error.response?.status === 403) {
        if (Platform.OS === 'web') {
          alert('Access Denied: You do not have admin permissions.');
        } else {
          Alert.alert('Access Denied', 'You do not have admin permissions.');
        }
        router.back();
      } else {
        if (Platform.OS === 'web') {
          alert('Error: Failed to load pending videos');
        } else {
          Alert.alert('Error', 'Failed to load pending videos');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPendingVideos();
    setRefreshing(false);
  };

  const handleApprove = async (userId: string, videoIndex: number) => {
    const confirmApprove = Platform.OS === 'web' 
      ? confirm('Approve Featured Video: This video will be displayed on the homepage. Approve?')
      : true; // On mobile, show Alert.alert
    
    if (Platform.OS === 'web' && !confirmApprove) {
      return;
    }
    
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Approve Featured Video',
        'This video will be displayed on the homepage. Approve?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Approve',
            onPress: () => executeApproval(userId, videoIndex)
          }
        ]
      );
    } else {
      executeApproval(userId, videoIndex);
    }
  };

  const executeApproval = async (userId: string, videoIndex: number) => {
    setProcessingVideoId(`${userId}-${videoIndex}`);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      console.log('🎬 Approving video:', { userId, videoIndex });
      await axios.post(
        `${API_URL}/api/admin/featured-videos/${userId}/${videoIndex}/approve?approved=true`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ Video approved successfully');
      
      if (Platform.OS === 'web') {
        alert('Success: Video approved and featured!');
      } else {
        Alert.alert('Success', 'Video approved and featured!');
      }
      
      // Remove from pending list
      setPendingVideos(pendingVideos.filter(
        (item) => !(item.user.id === userId && item.video_index === videoIndex)
      ));
    } catch (error: any) {
      console.error('❌ Error approving video:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to approve video';
      
      if (Platform.OS === 'web') {
        alert('Error: ' + errorMessage);
      } else {
        Alert.alert('Error', String(errorMessage));
      }
    } finally {
      setProcessingVideoId(null);
    }
  };

  const handleReject = async (userId: string, videoIndex: number) => {
    const confirmReject = Platform.OS === 'web' 
      ? confirm('Reject Featured Video: This video will be unfeatured. Reject?')
      : true;
    
    if (Platform.OS === 'web' && !confirmReject) {
      return;
    }
    
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Reject Featured Video',
        'This video will be unfeatured. Reject?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reject',
            style: 'destructive',
            onPress: () => executeRejection(userId, videoIndex)
          }
        ]
      );
    } else {
      executeRejection(userId, videoIndex);
    }
  };

  const executeRejection = async (userId: string, videoIndex: number) => {
    setProcessingVideoId(`${userId}-${videoIndex}`);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      console.log('🚫 Rejecting video:', { userId, videoIndex });
      await axios.post(
        `${API_URL}/api/admin/featured-videos/${userId}/${videoIndex}/approve?approved=false`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ Video rejected successfully');
      
      if (Platform.OS === 'web') {
        alert('Success: Video rejected');
      } else {
        Alert.alert('Success', 'Video rejected');
      }
      
      // Remove from pending list
      setPendingVideos(pendingVideos.filter(
        (item) => !(item.user.id === userId && item.video_index === videoIndex)
      ));
    } catch (error: any) {
      console.error('❌ Error rejecting video:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to reject video';
      
      if (Platform.OS === 'web') {
        alert('Error: ' + errorMessage);
      } else {
        Alert.alert('Error', String(errorMessage));
      }
    } finally {
      setProcessingVideoId(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
          <Text style={styles.loadingText}>Loading pending videos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Featured Videos</Text>
          <Text style={styles.headerSubtitle}>Admin Dashboard</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{pendingVideos.length}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {pendingVideos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={80} color="#4CAF50" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>
              No pending featured video requests at the moment.
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>Pending Approvals</Text>
            {pendingVideos.map((item, index) => {
              const isProcessing = processingVideoId === `${item.user.id}-${item.video_index}`;
              return (
                <View key={index} style={styles.videoCard}>
                  {/* Video Thumbnail */}
                  <View style={styles.thumbnailSection}>
                    {item.video.thumbnailUrl ? (
                      <Image 
                        source={{ uri: item.video.thumbnailUrl }} 
                        style={styles.thumbnail}
                      />
                    ) : (
                      <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                        <Ionicons 
                          name={item.video.platform === 'youtube' ? 'logo-youtube' : 'logo-vimeo'} 
                          size={40} 
                          color="#fff" 
                        />
                      </View>
                    )}
                    <View style={[
                      styles.platformBadge,
                      item.video.platform === 'youtube' ? styles.youtubeBadge : styles.vimeoBadge
                    ]}>
                      <Ionicons 
                        name={item.video.platform === 'youtube' ? 'logo-youtube' : 'logo-vimeo'} 
                        size={12} 
                        color="#fff" 
                      />
                      <Text style={styles.platformBadgeText}>
                        {item.video.platform === 'youtube' ? 'YouTube' : 'Vimeo'}
                      </Text>
                    </View>
                  </View>

                  {/* Video & User Info */}
                  <View style={styles.infoSection}>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {item.video.title || 'Untitled Video'}
                    </Text>
                    
                    <View style={styles.userInfo}>
                      <Ionicons name="person-circle-outline" size={16} color="#666" />
                      <Text style={styles.userName}>{item.user.full_name || item.user.username}</Text>
                      <View style={[
                        styles.tierBadge,
                        item.user.membership_tier === 'gold' && styles.goldBadge,
                        item.user.membership_tier === 'silver' && styles.silverBadge
                      ]}>
                        <Text style={styles.tierText}>
                          {item.user.membership_tier?.toUpperCase() || 'MEMBER'}
                        </Text>
                      </View>
                    </View>

                    {item.user.location && (
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color="#666" />
                        <Text style={styles.locationText}>{item.user.location}</Text>
                      </View>
                    )}

                    {item.video.featured_date && (
                      <View style={styles.dateRow}>
                        <Ionicons name="time-outline" size={14} color="#666" />
                        <Text style={styles.dateText}>
                          Submitted {new Date(item.video.featured_date).toLocaleDateString()}
                        </Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.approveButton, isProcessing && styles.buttonDisabled]}
                        onPress={() => handleApprove(item.user.id, item.video_index)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.approveButtonText}>Approve</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.rejectButton, isProcessing && styles.buttonDisabled]}
                        onPress={() => handleReject(item.user.id, item.video_index)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#ff3b30" />
                        ) : (
                          <>
                            <Ionicons name="close-circle" size={20} color="#ff3b30" />
                            <Text style={styles.rejectButtonText}>Reject</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  countBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  listContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  videoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnailSection: {
    position: 'relative',
    marginRight: 12,
  },
  thumbnail: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  youtubeBadge: {
    backgroundColor: '#FF0000',
  },
  vimeoBadge: {
    backgroundColor: '#1ab7ea',
  },
  platformBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  infoSection: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 22,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  userName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  tierBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  goldBadge: {
    backgroundColor: '#FFD700',
  },
  silverBadge: {
    backgroundColor: '#C0C0C0',
  },
  tierText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff3b30',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  rejectButtonText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
