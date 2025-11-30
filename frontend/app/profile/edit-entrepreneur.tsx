import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { ALL_SERVICES } from '../onboarding/entrepreneur/servicesData';
import { BROAD_OCCUPATIONS, ALL_BROAD_OCCUPATIONS, ORDERED_OCCUPATIONS, PRIORITY_OCCUPATIONS } from '../onboarding/entrepreneur/broadOccupations';
import { getServicesForCategories, getCategoryDisplayNames } from '../onboarding/entrepreneur/categoryMapping';
import { getServicesForOccupation, hasServicesForOccupation } from './occupationServices';
import { formatServicePrice } from '../../utils/priceFormatter';
import { PhoneInput } from '../../components/PhoneInput';
import { isValidPhoneNumber } from '../../utils/phoneFormatter';
import { parseVideoUrl, isValidVideoUrl } from '../../utils/videoUtils';
import { parseMusicUrl, isValidMusicUrl, getMusicPlatformIcon, getMusicPlatformColor, getMusicPlatformName } from '../../utils/musicUtils';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function EditEntrepreneurProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Basic Info
  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Services - filtered by selected categories
  const availableServices = useMemo(() => {
    return getServicesForCategories(selectedCategories);
  }, [selectedCategories]);

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');

  // Services Offered (with pricing)
  interface ServiceOffered {
    service_name: string;
    price: string;
    price_type: 'fixed' | 'range' | 'quote';
  }
  const [servicesOffered, setServicesOffered] = useState<ServiceOffered[]>([]);
  const [customServices, setCustomServices] = useState<string[]>([]);
  const [customServiceInput, setCustomServiceInput] = useState('');

  // Portfolio
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>([]);
  
  // Portfolio Videos
  interface PortfolioVideo {
    url: string;
    title?: string;
    platform?: string;
    videoId?: string;
    thumbnailUrl?: string;
  }
  const [portfolioVideos, setPortfolioVideos] = useState<PortfolioVideo[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  
  // Music Tracks
  interface MusicTrack {
    url: string;
    title: string;
    platform: string;
    embedUrl?: string;
  }
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [newMusicUrl, setNewMusicUrl] = useState('');
  const [newMusicTitle, setNewMusicTitle] = useState('');
  
  // Membership & Featured Videos
  const [membershipTier, setMembershipTier] = useState('basic');
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [featuringVideoIndex, setFeaturingVideoIndex] = useState<number | null>(null);
  const [featuredVideosThisWeek, setFeaturedVideosThisWeek] = useState(0);
  const [weeklyVideoLimit, setWeeklyVideoLimit] = useState(0);
  const [lastFeaturedVideoReset, setLastFeaturedVideoReset] = useState<string | null>(null);

  // Tier Limits
  const [tierLimits, setTierLimits] = useState<any>(null);
  const [photoLimit, setPhotoLimit] = useState<number | string>(0);
  const [videoLimit, setVideoLimit] = useState<number | string>(0);
  const [canAddPhoto, setCanAddPhoto] = useState(true);
  const [nearPhotoLimit, setNearPhotoLimit] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitType, setLimitType] = useState<'photo' | 'video'>('photo');

  // Rates & Pricing
  const [pricingInfo, setPricingInfo] = useState('');

  // Social Links (all 11 platforms)
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [website, setWebsite] = useState('');
  const [yelp, setYelp] = useState('');
  const [googleBusiness, setGoogleBusiness] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [snapchat, setSnapchat] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [youtube, setYoutube] = useState('');
  const [pinterest, setPinterest] = useState('');

  // UI State
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));
  const [showAllOccupations, setShowAllOccupations] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Load profile and tier limits in parallel
      const [profileRes, tierLimitsRes] = await Promise.all([
        axios.get(`${API_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/profile/tier-limits`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const profile = profileRes.data;
      const limitsData = tierLimitsRes.data;
      
      console.log('===== PROFILE LOAD DEBUG =====');
      console.log('Raw profile data:', JSON.stringify(profile, null, 2));
      console.log('Tier limits data:', limitsData);
      console.log('==============================');
      
      // Set tier limits
      setTierLimits(limitsData);
      if (limitsData.usage?.portfolio_photos) {
        setPhotoLimit(limitsData.usage.portfolio_photos.limit);
        setCanAddPhoto(limitsData.usage.portfolio_photos.can_add);
        setNearPhotoLimit(limitsData.usage.portfolio_photos.near_limit);
      }
      if (limitsData.usage?.featured_videos) {
        setVideoLimit(limitsData.usage.featured_videos.limit);
      }
      
      console.log('📸 Photo limit:', limitsData.usage?.portfolio_photos);
      console.log('🎬 Video limit:', limitsData.usage?.featured_videos);
      
      // Categories (load first for filtering)
      setSelectedCategories(profile.selected_categories || []);
      
      // Basic Info
      setDisplayName(profile.full_name || '');
      setLocation(profile.location || '');
      setBio(profile.bio || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
      setProfilePhoto(profile.profile_photo);
      
      // Membership Tier & Weekly Limits
      const tier = profile.membership_tier || 'basic';
      setMembershipTier(tier);
      setFeaturedVideosThisWeek(profile.featured_videos_this_week || 0);
      setLastFeaturedVideoReset(profile.last_featured_video_reset || null);
      
      // Set weekly limit based on tier
      const limit = tier === 'networking' ? 3 : tier === 'silver' ? 1 : 0;
      setWeeklyVideoLimit(limit);

      // Services/Occupations (these are the occupations selected in onboarding)
      let occupations = profile.services || [];
      
      console.log('Initial occupations from profile.services:', occupations);
      
      // DATA MIGRATION: Normalize legacy occupation names
      occupations = occupations.map((occ: string) => {
        // Map legacy occupation names to correct ones
        const legacyMappings: { [key: string]: string } = {
          'Photographer (Marketing)': 'Photographer',
          'Videographer (Marketing)': 'Videographer',
          'Video Producer': 'Video Producer', // Keep as is, services mapped in occupationServices.ts
        };
        
        if (legacyMappings[occ]) {
          console.log(`🔄 MIGRATING: "${occ}" → "${legacyMappings[occ]}"`);
          return legacyMappings[occ];
        }
        return occ;
      });
      
      // DATA MIGRATION: Handle old structure where occupations were in services_offered
      if (occupations.length === 0 && profile.services_offered) {
        console.log('Occupations empty, checking services_offered for migration...');
        // Check if services_offered contains simple strings (old occupations)
        const firstService = profile.services_offered[0];
        console.log('First services_offered item:', firstService, 'Type:', typeof firstService);
        
        if (firstService && typeof firstService === 'string') {
          // Old structure: services_offered was array of strings (occupations)
          occupations = profile.services_offered;
          console.log('🔄 MIGRATED: Moved occupations from services_offered:', occupations);
        } else if (firstService && firstService.service_name) {
          console.log('services_offered has correct structure (objects), no migration needed');
        }
      }
      
      console.log('FINAL occupations to display:', occupations);
      console.log('Setting selectedServices state to:', occupations);
      setSelectedServices(occupations);
      
      // Services Offered (with pricing) - should be array of objects
      let servicesWithPricing = [];
      if (profile.services_offered && profile.services_offered.length > 0) {
        const firstService = profile.services_offered[0];
        if (firstService && typeof firstService === 'object' && firstService.service_name) {
          // Correct structure: array of service objects
          servicesWithPricing = profile.services_offered;
        }
      }
      console.log('Setting services offered:', servicesWithPricing);
      setServicesOffered(servicesWithPricing);

      // Portfolio
      setPortfolioPhotos(profile.portfolio_photos || []);
      setPortfolioVideos(profile.portfolio_videos || []);
      setMusicTracks(profile.music_tracks || []);

      // Pricing
      setPricingInfo(profile.pricing_info || '');

      // Social Links
      if (profile.social_links) {
        setInstagram(profile.social_links.instagram || '');
        setFacebook(profile.social_links.facebook || '');
        setWebsite(profile.social_links.website || '');
        setYelp(profile.social_links.yelp || '');
        setGoogleBusiness(profile.social_links.google_business || '');
        setTiktok(profile.social_links.tiktok || '');
        setSnapchat(profile.social_links.snapchat || '');
        setLinkedin(profile.social_links.linkedin || '');
        setTwitter(profile.social_links.twitter || '');
        setYoutube(profile.social_links.youtube || '');
        setPinterest(profile.social_links.pinterest || '');
      }

    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // Load profile data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [])
  );

  const toggleSection = (section: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Filter services based on search
  const filteredServicesList = useMemo(() => {
    if (!serviceSearch.trim()) return availableServices;
    return availableServices.filter(service => 
      service.toLowerCase().includes(serviceSearch.toLowerCase())
    );
  }, [serviceSearch, availableServices]);

  const toggleService = (service: string) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter(s => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  // Photo functions
  const pickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setProfilePhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const removeProfilePhoto = () => {
    Alert.alert('Remove Photo', 'Remove profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setProfilePhoto(null) }
    ]);
  };

  const addPortfolioPhoto = async () => {
    // Check tier limits before allowing photo upload
    if (!canAddPhoto) {
      const isUnlimited = photoLimit >= 999;
      const upgradeMsg = membershipTier === 'basic' 
        ? 'Upgrade to Silver for 10 photos or Networking for unlimited.'
        : 'Upgrade to Networking for unlimited photos.';
      
      const msg = isUnlimited 
        ? 'An error occurred. Please try again.'
        : `You've reached your ${membershipTier.toUpperCase()} tier limit of ${photoLimit} photos. ${upgradeMsg}`;
      
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert(
          'Photo Limit Reached', 
          msg,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => setShowLimitModal(true) }
          ]
        );
      }
      return;
    }

    // Show warning if near limit
    if (nearPhotoLimit && photoLimit < 999) {
      const remaining = typeof photoLimit === 'number' ? photoLimit - portfolioPhotos.length : 0;
      console.log(`⚠️ Near photo limit: ${remaining} remaining`);
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const newPhoto = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const updatedPhotos = [...portfolioPhotos, newPhoto];
      setPortfolioPhotos(updatedPhotos);
      
      // Update can_add status
      if (typeof photoLimit === 'number' && photoLimit < 999 && updatedPhotos.length >= photoLimit) {
        setCanAddPhoto(false);
      }
      
      // Check if near limit after adding
      if (typeof photoLimit === 'number' && photoLimit < 999 && photoLimit - updatedPhotos.length <= 2) {
        setNearPhotoLimit(true);
      }
    }
  };

  const removePortfolioPhoto = (index: number) => {
    Alert.alert('Remove Photo', 'Remove this photo from portfolio?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Remove', 
        style: 'destructive', 
        onPress: () => {
          const updatedPhotos = portfolioPhotos.filter((_, i) => i !== index);
          setPortfolioPhotos(updatedPhotos);
          
          // Update limit states after removal
          if (typeof photoLimit === 'number' && photoLimit < 999) {
            // If we were at limit, we can now add photos
            if (updatedPhotos.length < photoLimit) {
              setCanAddPhoto(true);
            }
            
            // Update near-limit warning
            if (photoLimit - updatedPhotos.length <= 2 && updatedPhotos.length < photoLimit) {
              setNearPhotoLimit(true);
            } else {
              setNearPhotoLimit(false);
            }
          }
          
          console.log(`📸 Photo removed. New count: ${updatedPhotos.length}/${photoLimit}`);
        }
      }
    ]);
  };

  // Portfolio Video Handlers
  const addPortfolioVideo = () => {
    // Tier-based video limits for Entrepreneurs
    const videoLimits: { [key: string]: number } = {
      'basic': 0,  // Basic tier cannot add videos
      'silver': 2,
      'networking': 8,
    };
    
    const limit = videoLimits[membershipTier] || 0; // Default to Basic (no videos)
    
    if (limit === 0) {
      const msg = 'Video uploads are not available on the Basic tier. Upgrade to Silver for 2 videos or Networking for 8 videos.';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Videos Locked', msg, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push({ pathname: '/onboarding/tier-selection', params: { upgrade: 'true', preselect: 'silver' } }) }
        ]);
      }
      return;
    }
    
    if (portfolioVideos.length >= limit) {
      const msg = `You've reached your ${membershipTier.toUpperCase()} tier limit of ${limit} video${limit > 1 ? 's' : ''}. ${membershipTier === 'silver' ? 'Upgrade to Networking for 8 videos.' : ''}`;
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Video Limit Reached', msg);
      }
      return;
    }

    if (!newVideoUrl.trim()) {
      console.error('URL Required: Please enter a video URL');
      if (Platform.OS === 'web') {
        alert('URL Required: Please enter a video URL');
      } else {
        Alert.alert('URL Required', 'Please enter a video URL');
      }
      return;
    }

    if (!isValidVideoUrl(newVideoUrl)) {
      console.error('Invalid URL: Please enter a valid YouTube or Vimeo URL');
      if (Platform.OS === 'web') {
        alert('Invalid URL: Please enter a valid YouTube or Vimeo URL');
      } else {
        Alert.alert('Invalid URL', 'Please enter a valid YouTube or Vimeo URL');
      }
      return;
    }

    const videoInfo = parseVideoUrl(newVideoUrl);
    const newVideo: PortfolioVideo = {
      url: newVideoUrl,
      title: newVideoTitle.trim() || 'Untitled Video',
      platform: videoInfo.platform,
      videoId: videoInfo.videoId || undefined,
      thumbnailUrl: videoInfo.thumbnailUrl || undefined,
    };

    setPortfolioVideos([...portfolioVideos, newVideo]);
    setNewVideoUrl('');
    setNewVideoTitle('');
    console.log('✅ Video added to portfolio:', newVideo);
    if (Platform.OS === 'web') {
      alert('Success: Video added to portfolio');
    } else {
      Alert.alert('Success', 'Video added to portfolio');
    }
  };

  const removePortfolioVideo = (index: number) => {
    Alert.alert('Remove Video', 'Remove this video from portfolio?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setPortfolioVideos(portfolioVideos.filter((_, i) => i !== index))
      }
    ]);
  };

  // Music Track Handlers
  const addMusicTrack = () => {
    // Tier-based limits
    const musicLimits: { [key: string]: number } = {
      'basic': 1,
      'silver': 3,
      'networking': 10,
      'gold': 10,
    };
    
    const limit = musicLimits[membershipTier] || 1;
    
    if (musicTracks.length >= limit) {
      const msg = `Maximum ${limit} music tracks allowed for ${membershipTier} tier. Upgrade for more tracks!`;
      if (Platform.OS === 'web') {
        alert('Limit Reached: ' + msg);
      } else {
        Alert.alert('Limit Reached', msg);
      }
      return;
    }

    if (!newMusicUrl.trim()) {
      const msg = 'Please enter a music track URL';
      if (Platform.OS === 'web') {
        alert('URL Required: ' + msg);
      } else {
        Alert.alert('URL Required', msg);
      }
      return;
    }

    if (!isValidMusicUrl(newMusicUrl)) {
      const msg = 'Please enter a valid URL from SoundCloud, Spotify, Apple Music, YouTube Music, Bandcamp, or Audiomack';
      if (Platform.OS === 'web') {
        alert('Invalid URL: ' + msg);
      } else {
        Alert.alert('Invalid URL', msg);
      }
      return;
    }

    const musicInfo = parseMusicUrl(newMusicUrl);
    const newTrack: MusicTrack = {
      url: newMusicUrl,
      title: newMusicTitle.trim() || 'Untitled Track',
      platform: musicInfo.platform,
      embedUrl: musicInfo.embedUrl || undefined,
    };

    setMusicTracks([...musicTracks, newTrack]);
    setNewMusicUrl('');
    setNewMusicTitle('');
    
    const successMsg = 'Music track added to your profile!';
    if (Platform.OS === 'web') {
      alert('Success: ' + successMsg);
    } else {
      Alert.alert('Success', successMsg);
    }
  };

  const removeMusicTrack = (index: number) => {
    Alert.alert('Remove Track', 'Remove this music track from your profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setMusicTracks(musicTracks.filter((_, i) => i !== index))
      }
    ]);
  };

  // Helper function to calculate days until weekly reset
  const getDaysUntilReset = (): number => {
    if (!lastFeaturedVideoReset) return 7;
    const resetDate = new Date(lastFeaturedVideoReset);
    const nextReset = new Date(resetDate);
    nextReset.setDate(nextReset.getDate() + 7);
    const now = new Date();
    const diffTime = nextReset.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Feature/Unfeature Video Handler
  const handleFeatureVideo = async (index: number) => {
    // Check membership tier
    const tier = membershipTier.toLowerCase();
    if (tier !== 'silver' && tier !== 'networking') {
      // Show upgrade modal for basic tier users
      setFeaturingVideoIndex(index);
      setUpgradeModalVisible(true);
      return;
    }

    // Check if profile has been saved (videos exist in backend)
    // If video is newly added and not saved, it won't exist in the backend yet
    const video = portfolioVideos[index];
    
    // Simple check: if video doesn't have a featured status, it's likely not saved yet
    // Better UX: Show message to save first
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.post(
        `${API_URL}/api/profile/videos/${index}/feature`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      const updatedVideos = [...portfolioVideos];
      updatedVideos[index] = {
        ...updatedVideos[index],
        featured: response.data.featured,
        featured_approved: response.data.featured_approved
      };
      setPortfolioVideos(updatedVideos);

      const message = response.data.featured 
        ? 'Video submitted for featuring! Pending admin approval.' 
        : 'Video unfeatured successfully.';
      
      console.log('✅ Feature video success:', message);
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Success', message);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to feature video';
      console.error('❌ Feature video error:', errorMsg);
      
      // Better error message if video not found
      if (errorMsg.includes('Video not found')) {
        const helpMsg = 'Please save your profile first before featuring videos. After saving, you can feature your videos.';
        if (Platform.OS === 'web') {
          alert(helpMsg);
        } else {
          Alert.alert('Save Profile First', helpMsg);
        }
      } else {
        if (Platform.OS === 'web') {
          alert('Error: ' + errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    }
  };

  const handleSave = async () => {
    // Validation
    if (!displayName.trim()) {
      console.error('Required Field: Please enter your display name');
      if (Platform.OS === 'web') {
        alert('Required Field: Please enter your display name');
      } else {
        Alert.alert('Required Field', 'Please enter your display name');
      }
      return;
    }

    // Occupation validation - DEBUG
    console.log('Validating occupations:', {
      selectedServices,
      length: selectedServices.length
    });
    
    if (selectedServices.length === 0) {
      console.error('Required Field: Please select at least one occupation');
      if (Platform.OS === 'web') {
        alert('Required Field: Please select at least one occupation');
      } else {
        Alert.alert('Required Field', 'Please select at least one occupation');
      }
      return;
    }

    // Email validation
    if (email.trim() && !isValidEmail(email)) {
      console.error('Invalid Email: Please enter a valid email address');
      if (Platform.OS === 'web') {
        alert('Invalid Email: Please enter a valid email address');
      } else {
        Alert.alert('Invalid Email', 'Please enter a valid email address');
      }
      return;
    }

    // Phone validation
    if (phone.trim() && !isValidPhoneNumber(phone)) {
      console.error('Invalid Phone: Please enter a valid phone number (10 digits)');
      if (Platform.OS === 'web') {
        alert('Invalid Phone: Please enter a valid phone number (10 digits)');
      } else {
        Alert.alert('Invalid Phone', 'Please enter a valid phone number (10 digits)');
      }
      return;
    }

    // REMOVED: Services offered validation - allow saving without services
    // Users can add services later

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      console.log('💾 Saving profile with API_URL:', API_URL);
      console.log('💾 Full endpoint:', `${API_URL}/api/profile`);

      const response = await axios.put(
        `${API_URL}/api/profile`,
        {
          full_name: displayName,
          location: location || null,
          bio: bio || null,
          phone: phone || null,
          email: email || null,
          profile_photo: profilePhoto,
          selected_categories: selectedCategories,
          services: selectedServices,
          services_offered: servicesOffered,
          portfolio_photos: portfolioPhotos,
          portfolio_videos: portfolioVideos,
          music_tracks: musicTracks,
          pricing_info: pricingInfo || null,
          social_links: {
            instagram: instagram.trim(),
            facebook: facebook.trim(),
            website: website.trim(),
            yelp: yelp.trim(),
            google_business: googleBusiness.trim(),
            tiktok: tiktok.trim(),
            snapchat: snapchat.trim(),
            linkedin: linkedin.trim(),
            twitter: twitter.trim(),
            youtube: youtube.trim(),
            pinterest: pinterest.trim(),
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const updatedUser = { ...user, ...response.data };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }

      console.log('✅ Profile updated successfully');
      if (Platform.OS === 'web') {
        if (confirm('Success! Your profile has been updated successfully. Go back to profile?')) {
          router.back();
        }
      } else {
        Alert.alert('Success! 🎉', 'Your profile has been updated successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update profile. Please try again.';
      if (Platform.OS === 'web') {
        alert('Error: ' + errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  // Helper validation functions
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const toggleCategory = (categoryId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (selectedCategories.includes(categoryId)) {
      // Don't allow removing if it's the last category
      if (selectedCategories.length === 1) {
        Alert.alert('Minimum Required', 'You must have at least one category selected');
        return;
      }
      setSelectedCategories(selectedCategories.filter(c => c !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const toggleOccupation = (occupation: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (selectedServices.includes(occupation)) {
      // Don't allow removing if it's the last occupation
      if (selectedServices.length === 1) {
        Alert.alert('Minimum Required', 'You must have at least one occupation selected');
        return;
      }
      setSelectedServices(selectedServices.filter(o => o !== occupation));
    } else {
      setSelectedServices([...selectedServices, occupation]);
    }
  };

  const toggleServiceOffered = (serviceName: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const exists = servicesOffered.find(s => s.service_name === serviceName);
    if (exists) {
      setServicesOffered(servicesOffered.filter(s => s.service_name !== serviceName));
    } else {
      setServicesOffered([...servicesOffered, {
        service_name: serviceName,
        price: '',
        price_type: 'quote'
      }]);
    }
  };

  const updateServicePrice = (serviceName: string, price: string) => {
    setServicesOffered(servicesOffered.map(s => 
      s.service_name === serviceName 
        ? { ...s, price }
        : s
    ));
  };

  const updateServicePriceType = (serviceName: string, price_type: 'fixed' | 'hourly' | 'quote') => {
    setServicesOffered(servicesOffered.map(s => 
      s.service_name === serviceName 
        ? { ...s, price_type, price: price_type === 'quote' ? '' : s.price }
        : s
    ));
  };

  const addCustomService = () => {
    if (customServiceInput.trim() && customServices.length < 10) {
      const newService = customServiceInput.trim();
      if (!customServices.includes(newService)) {
        setCustomServices([...customServices, newService]);
        setServicesOffered([...servicesOffered, {
          service_name: newService,
          price: '',
          price_type: 'quote'
        }]);
        setCustomServiceInput('');
      } else {
        Alert.alert('Duplicate', 'This service already exists');
      }
    }
  };

  const removeCustomService = (serviceName: string) => {
    setCustomServices(customServices.filter(s => s !== serviceName));
    setServicesOffered(servicesOffered.filter(s => s.service_name !== serviceName));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1565FF" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            disabled={saving}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#1565FF" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Basic Information Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('basic')}
          >
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <Ionicons 
              name={expandedSections.has('basic') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('basic') && (
            <View style={styles.sectionContent}>
              {/* Profile Photo */}
              <Text style={styles.label}>Profile Photo</Text>
              <TouchableOpacity 
                onPress={pickProfilePhoto} 
                style={styles.photoContainer}
                accessibilityLabel="Profile photo"
                accessibilityHint="Tap to change your profile photo"
              >
                {profilePhoto ? (
                  <>
                    <Image source={{ uri: profilePhoto }} style={styles.photo} />
                    <View style={styles.photoOverlay}>
                      <Ionicons name="camera" size={24} color="#fff" />
                    </View>
                  </>
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="person" size={50} color="#999" />
                    <Text style={styles.placeholderText}>Tap to add photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {profilePhoto && (
                <TouchableOpacity 
                  onPress={removeProfilePhoto} 
                  style={styles.removeButton}
                  accessibilityLabel="Remove profile photo"
                  accessibilityHint="Tap to remove your profile photo"
                >
                  <Text style={styles.removeButtonText}>Remove Photo</Text>
                </TouchableOpacity>
              )}

              {/* Display Name */}
              <Text style={styles.label}>Display Name *</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your display name"
                placeholderTextColor="#999"
                accessibilityLabel="Display name input"
                accessibilityHint="Enter your professional display name"
              />

              {/* Phone */}
              <PhoneInput
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="(555) 555-5555"
                showValidation={true}
              />

              {/* Email */}
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your.email@example.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel="Email address input"
                accessibilityHint="Enter your contact email address"
              />

              {/* Location */}
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="City, State"
                placeholderTextColor="#999"
                accessibilityLabel="Location input"
                accessibilityHint="Enter your city and state"
              />

              {/* Bio */}
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={(text) => text.length <= 300 && setBio(text)}
                placeholder="Tell us about yourself and your services..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                accessibilityLabel="Bio text area"
                accessibilityHint="Describe yourself and your services in up to 300 characters"
              />
              <Text style={styles.charCount}>{bio.length}/300</Text>
            </View>
          )}

          {/* My Occupations Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('occupations')}
          >
            <Text style={styles.sectionTitle}>My Occupations</Text>
            <Ionicons 
              name={expandedSections.has('occupations') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
          
          {expandedSections.has('occupations') && (
            <View style={styles.sectionContent}>
              {/* Selected Occupations Count & Display */}
              {selectedServices.length > 0 ? (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.helperText, { fontWeight: '600', marginBottom: 8 }]}>
                    Selected Occupations ({selectedServices.length})
                  </Text>
                  <View style={styles.chipContainer}>
                    {selectedServices.map((occupation, index) => (
                      <View key={index} style={[styles.chip, styles.chipSelected]}>
                        <Text style={styles.chipTextSelected}>{occupation}</Text>
                        <TouchableOpacity onPress={() => toggleOccupation(occupation)}>
                          <Ionicons name="close-circle" size={18} color="#fff" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.warningBox}>
                  <Ionicons name="alert-circle" size={24} color="#FF9800" />
                  <Text style={styles.warningText}>
                    Please select at least one occupation to continue
                  </Text>
                </View>
              )}

              {/* Add Another Prompt */}
              <Text style={[styles.helperText, { marginBottom: 12 }]}>
                Add Another Professional Occupation. These will determine your available services.
              </Text>

              {/* Add More Occupations Toggle Button */}
              <TouchableOpacity 
                style={styles.addMoreButton}
                onPress={() => setShowAllOccupations(!showAllOccupations)}
              >
                <Ionicons name="add-circle-outline" size={24} color="#1565FF" />
                <Text style={styles.addMoreButtonText}>
                  {showAllOccupations ? 'Hide Occupations' : 'Add More Occupations'}
                </Text>
              </TouchableOpacity>

              {/* Available Occupations List (when expanded) */}
              {showAllOccupations && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.helperText, { fontWeight: '600', marginBottom: 8 }]}>
                    Popular Entertainment & Service Occupations:
                  </Text>
                  <View style={styles.chipContainer}>
                    {ORDERED_OCCUPATIONS.map((occupation) => {
                      const isSelected = selectedServices.includes(occupation);
                      if (isSelected) return null; // Don't show already selected
                      return (
                        <TouchableOpacity
                          key={occupation}
                          style={[styles.chip, styles.chipUnselected]}
                          onPress={() => toggleOccupation(occupation)}
                        >
                          <Text style={styles.chipText}>{occupation}</Text>
                          <Ionicons name="add-circle" size={16} color="#1565FF" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          )}

 

          {/* Services, Rates & Pricing Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('services_offered')}
          >
            <Text style={styles.sectionTitle}>
              Services, Rates & Pricing ({servicesOffered.length})
            </Text>
            <Ionicons 
              name={expandedSections.has('services_offered') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('services_offered') && (
            <View style={styles.sectionContent}>
              <Text style={styles.helperText}>
                Select services you offer and set pricing for each
              </Text>
              
              {/* Selected Services with Pricing */}
              {servicesOffered.length > 0 && (
                <View style={styles.selectedServicesSection}>
                  <Text style={styles.occupationLabel}>Your Services</Text>
                  {servicesOffered.map((service, index) => (
                    <View key={index} style={styles.serviceRowContainer}>
                      {/* Service Name - Left Side (Shorter Width) */}
                      <View style={styles.serviceNameBox}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.serviceName} numberOfLines={1}>{service.service_name}</Text>
                          <Text style={styles.servicePriceLabel} numberOfLines={1}>
                            {formatServicePrice(service)}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          onPress={() => toggleServiceOffered(service.service_name)}
                          style={styles.removeServiceIconButton}
                        >
                          <Ionicons name="close-circle" size={20} color="#ff3b30" />
                        </TouchableOpacity>
                      </View>
                      
                      {/* Pricing Box - Right Side (Dynamic) */}
                      <View style={styles.pricingBox}>
                        {/* Price Type Dropdown */}
                        <View style={styles.priceTypeRow}>
                          <TouchableOpacity
                            style={[styles.priceTypeButtonCompact, service.price_type === 'fixed' && styles.priceTypeButtonActive]}
                            onPress={() => updateServicePriceType(service.service_name, 'fixed')}
                          >
                            <Text style={[styles.priceTypeTextCompact, service.price_type === 'fixed' && styles.priceTypeTextActive]}>
                              Set Price
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.priceTypeButtonCompact, service.price_type === 'hourly' && styles.priceTypeButtonActive]}
                            onPress={() => updateServicePriceType(service.service_name, 'hourly')}
                          >
                            <Text style={[styles.priceTypeTextCompact, service.price_type === 'hourly' && styles.priceTypeTextActive]}>
                              Hourly
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.priceTypeButtonCompact, service.price_type === 'quote' && styles.priceTypeButtonActive]}
                            onPress={() => updateServicePriceType(service.service_name, 'quote')}
                          >
                            <Text style={[styles.priceTypeTextCompact, service.price_type === 'quote' && styles.priceTypeTextActive]}>
                              Quote
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Price Input (only for fixed and hourly) */}
                        {service.price_type !== 'quote' && (
                          <TextInput
                            style={styles.priceInputCompact}
                            placeholder={service.price_type === 'hourly' ? "$100" : "$500"}
                            placeholderTextColor="#999"
                            value={service.price}
                            onChangeText={(price) => updateServicePrice(service.service_name, price)}
                            keyboardType="numeric"
                          />
                        )}
                        
                        {service.price_type === 'quote' && (
                          <Text style={styles.quoteTextCompact}>Contact for quote</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Available Services to Select */}
              <View style={styles.serviceSelectionArea}>
                <Text style={styles.helperText}>
                  Select from standard services below or add your own custom service
                </Text>
                
                {/* Services by Occupation */}
                {selectedServices.map((occupation) => {
                  console.log(`🔍 Checking occupation: "${occupation}"`);
                  console.log(`   hasServicesForOccupation("${occupation}"): ${hasServicesForOccupation(occupation)}`);
                  
                  if (!hasServicesForOccupation(occupation)) {
                    console.log(`   ⚠️ No services found for "${occupation}" - skipping`);
                    return null;
                  }
                  
                  const services = getServicesForOccupation(occupation);
                  console.log(`   ✅ Found ${services.length} services for "${occupation}":`, services.slice(0, 3));
                  
                  return (
                    <View key={occupation} style={styles.occupationGroup}>
                      <Text style={styles.occupationLabel}>{occupation} Services</Text>
                      
                      {services.map((service) => {
                        const isAlreadySelected = servicesOffered.find(s => s.service_name === service);
                        
                        if (isAlreadySelected) return null; // Don't show already selected
                        
                        return (
                          <TouchableOpacity
                            key={service}
                            style={styles.availableServiceChip}
                            onPress={() => toggleServiceOffered(service)}
                          >
                            <Text style={styles.availableServiceText}>{service}</Text>
                            <Ionicons name="add-circle" size={20} color="#1565FF" />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
                
                {/* Add Custom Service */}
                {customServices.length < 10 && (
                  <View style={styles.customServiceArea}>
                    <Text style={styles.occupationLabel}>Add Custom Service</Text>
                    <View style={styles.addCustomService}>
                      <TextInput
                        style={styles.customServiceInput}
                        placeholder="Enter custom service name..."
                        placeholderTextColor="#999"
                        value={customServiceInput}
                        onChangeText={setCustomServiceInput}
                        onSubmitEditing={addCustomService}
                      />
                      <TouchableOpacity onPress={addCustomService} style={styles.addButton}>
                        <Ionicons name="add-circle" size={32} color="#1565FF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                
                {customServices.length >= 10 && (
                  <Text style={styles.helperText}>Maximum 10 custom services reached</Text>
                )}
              </View>
            </View>
          )}

          {/* Portfolio Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('portfolio')}
          >
            <Text style={styles.sectionTitle}>
              Portfolio Photos ({portfolioPhotos.length}/{photoLimit >= 999 ? '∞' : photoLimit})
            </Text>
            <Ionicons 
              name={expandedSections.has('portfolio') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('portfolio') && (
            <View style={styles.sectionContent}>
              {/* Near limit warning */}
              {nearPhotoLimit && photoLimit < 999 && (
                <View style={styles.warningBanner}>
                  <Ionicons name="warning" size={20} color="#FF9800" />
                  <Text style={styles.warningText}>
                    Only {typeof photoLimit === 'number' ? photoLimit - portfolioPhotos.length : 0} photos remaining
                  </Text>
                </View>
              )}
              
              <Text style={styles.helperText}>
                Showcase your work with portfolio photos
                {membershipTier === 'basic' && ' (Upgrade to Silver for 10 photos or Networking for unlimited)'}
              </Text>
              <View style={styles.photosGrid}>
                {portfolioPhotos.map((photo, index) => (
                  <View key={index} style={styles.photoItem}>
                    <Image 
                      source={{ uri: photo }} 
                      style={styles.portfolioPhoto}
                      accessibilityLabel={`Portfolio photo ${index + 1}`}
                    />
                    <TouchableOpacity 
                      onPress={() => removePortfolioPhoto(index)}
                      style={styles.removePhotoButton}
                      accessibilityLabel={`Remove portfolio photo ${index + 1}`}
                      accessibilityHint="Double tap to remove this photo"
                    >
                      <Ionicons name="close-circle" size={24} color="#ff3b30" />
                    </TouchableOpacity>
                  </View>
                ))}
                {/* Show add button only if under limit */}
                {canAddPhoto && (
                  <TouchableOpacity 
                    onPress={addPortfolioPhoto} 
                    style={styles.addPhotoButton}
                    accessibilityLabel="Add portfolio photo"
                  >
                    <Ionicons name="add" size={40} color="#1565FF" />
                    <Text style={styles.addPhotoText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
                {!canAddPhoto && photoLimit < 999 && (
                  <View style={styles.limitReachedBanner}>
                    <Ionicons name="lock-closed" size={24} color="#999" />
                    <Text style={styles.limitReachedText}>Limit Reached</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        setLimitType('photo');
                        setShowLimitModal(true);
                      }}
                      style={styles.upgradeLink}
                    >
                      <Text style={styles.upgradeLinkText}>Upgrade</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('portfolio_videos')}
          >
            <Text style={styles.sectionTitle}>
              Portfolio Videos ({portfolioVideos.length}/
              {membershipTier === 'networking' ? '8' : membershipTier === 'silver' ? '2' : '0'})
            </Text>
            <Ionicons 
              name={expandedSections.has('portfolio_videos') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('portfolio_videos') && (
            <View style={styles.sectionContent}>
              <Text style={styles.helperText}>
                Add YouTube or Vimeo links to showcase your work (Max 5)
              </Text>

              {/* Featured Videos Status Info Card */}
              {(membershipTier === 'silver' || membershipTier === 'networking') && (
                <View style={styles.featuredStatusCard}>
                  <View style={styles.featuredStatusHeader}>
                    <Ionicons name="star" size={20} color="#FFD700" />
                    <Text style={styles.featuredStatusTitle}>Featured Videos Status</Text>
                  </View>
                  <View style={styles.featuredStatusContent}>
                    <View style={styles.featuredStatusRow}>
                      <Text style={styles.featuredStatusLabel}>Weekly Limit:</Text>
                      <Text style={styles.featuredStatusValue}>
                        {featuredVideosThisWeek} / {weeklyVideoLimit} used
                      </Text>
                    </View>
                    <View style={styles.featuredStatusRow}>
                      <Text style={styles.featuredStatusLabel}>Resets in:</Text>
                      <Text style={styles.featuredStatusValue}>
                        {getDaysUntilReset()} {getDaysUntilReset() === 1 ? 'day' : 'days'}
                      </Text>
                    </View>
                  </View>
                  {featuredVideosThisWeek >= weeklyVideoLimit && (
                    <View style={styles.featuredStatusWarning}>
                      <Ionicons name="alert-circle" size={16} color="#FF9800" />
                      <Text style={styles.featuredStatusWarningText}>
                        Weekly limit reached. Resets in {getDaysUntilReset()} {getDaysUntilReset() === 1 ? 'day' : 'days'}.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Add Video Form */}
              <View style={styles.videoInputContainer}>
                <Text style={styles.label}>Video URL *</Text>
                <TextInput
                  style={styles.input}
                  value={newVideoUrl}
                  onChangeText={setNewVideoUrl}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  keyboardType="url"
                />

                <Text style={styles.label}>Video Title (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={newVideoTitle}
                  onChangeText={setNewVideoTitle}
                  placeholder="e.g., DJ Performance at XYZ Event"
                  placeholderTextColor="#999"
                  maxLength={60}
                />

                <TouchableOpacity 
                  onPress={addPortfolioVideo} 
                  style={[
                    styles.addVideoButton,
                    portfolioVideos.length >= 5 && styles.addVideoButtonDisabled
                  ]}
                  disabled={portfolioVideos.length >= 5}
                >
                  <Ionicons name="add-circle" size={24} color="#fff" />
                  <Text style={styles.addVideoButtonText}>Add Video</Text>
                </TouchableOpacity>
              </View>

              {/* Video List */}
              {portfolioVideos.length > 0 && (
                <View style={styles.videoList}>
                  <Text style={styles.videoListTitle}>Added Videos:</Text>
                  {portfolioVideos.map((video, index) => (
                    <View key={index} style={styles.videoItem}>
                      <View style={styles.videoInfo}>
                        <View style={styles.platformBadge}>
                          <Ionicons 
                            name={video.platform === 'youtube' ? 'logo-youtube' : 'logo-vimeo'} 
                            size={16} 
                            color="#fff" 
                          />
                          <Text style={styles.platformBadgeText}>
                            {video.platform === 'youtube' ? 'YouTube' : 'Vimeo'}
                          </Text>
                        </View>
                        
                        {/* Featured Status Badge */}
                        {video.featured && (
                          <View style={[
                            styles.featuredBadge,
                            video.featured_approved ? styles.featuredApproved : styles.featuredPending
                          ]}>
                            <Ionicons 
                              name={video.featured_approved ? 'star' : 'time-outline'} 
                              size={12} 
                              color="#fff" 
                            />
                            <Text style={styles.featuredBadgeText}>
                              {video.featured_approved ? 'FEATURED' : 'PENDING'}
                            </Text>
                          </View>
                        )}
                        
                        <Text style={styles.videoTitle} numberOfLines={2}>
                          {video.title}
                        </Text>
                        <Text style={styles.videoUrl} numberOfLines={1}>
                          {video.url}
                        </Text>
                        
                        {/* Feature Video Button */}
                        <TouchableOpacity 
                          onPress={() => handleFeatureVideo(index)}
                          style={styles.featureButton}
                        >
                          <Ionicons 
                            name={video.featured ? 'star' : 'star-outline'} 
                            size={16} 
                            color={video.featured ? '#FFD700' : '#666'} 
                          />
                          <Text style={[
                            styles.featureButtonText,
                            video.featured && styles.featureButtonTextActive
                          ]}>
                            {video.featured ? 'Featured' : 'Feature This Video'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      <TouchableOpacity 
                        onPress={() => removePortfolioVideo(index)}
                        style={styles.removeVideoButton}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}


          {/* Music Tracks Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('music_tracks')}
          >
            <Text style={styles.sectionTitle}>🎵 Music Tracks ({musicTracks.length}/{membershipTier === 'basic' ? 1 : membershipTier === 'silver' ? 3 : 10})</Text>
            <Ionicons 
              name={expandedSections.has('music_tracks') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('music_tracks') && (
            <View style={styles.sectionContent}>
              <Text style={styles.helperText}>
                Showcase your music! Paste links from SoundCloud, Spotify, Apple Music, and more. Fans and venues can listen right from your profile.
              </Text>

              {/* Tier Limit Info */}
              <View style={styles.tierLimitInfo}>
                <Ionicons name="information-circle" size={20} color="#1565FF" />
                <Text style={styles.tierLimitText}>
                  {membershipTier === 'basic' 
                    ? 'Basic tier: 1 track. Upgrade for more!'
                    : membershipTier === 'silver'
                    ? `Silver tier: ${musicTracks.length} of 3 tracks used`
                    : `${membershipTier === 'networking' ? 'Networking' : 'Gold'} tier: ${musicTracks.length} of 10 tracks used`}
                </Text>
              </View>

              {/* Add Music Form */}
              <View style={styles.musicInputContainer}>
                <Text style={styles.label}>Track URL *</Text>
                <View style={styles.urlInputWithBadge}>
                  <TextInput
                    style={styles.input}
                    value={newMusicUrl}
                    onChangeText={setNewMusicUrl}
                    placeholder="Paste SoundCloud/Spotify/Apple Music/etc. link..."
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  {newMusicUrl && isValidMusicUrl(newMusicUrl) && (
                    <View style={[styles.platformBadge, { backgroundColor: getMusicPlatformColor(parseMusicUrl(newMusicUrl).platform) }]}>
                      <Ionicons 
                        name={getMusicPlatformIcon(parseMusicUrl(newMusicUrl).platform) as any} 
                        size={14} 
                        color="#fff" 
                      />
                      <Text style={styles.platformBadgeText}>
                        {getMusicPlatformName(parseMusicUrl(newMusicUrl).platform)}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.label}>Track Title *</Text>
                <TextInput
                  style={styles.input}
                  value={newMusicTitle}
                  onChangeText={setNewMusicTitle}
                  placeholder="e.g., Summer Vibes 2025 - DJ Mix"
                  placeholderTextColor="#999"
                  maxLength={60}
                />

                <TouchableOpacity 
                  onPress={addMusicTrack} 
                  style={[
                    styles.addMusicButton,
                    (!newMusicUrl.trim() || !newMusicTitle.trim() || musicTracks.length >= (membershipTier === 'basic' ? 1 : membershipTier === 'silver' ? 3 : 10)) && styles.addMusicButtonDisabled
                  ]}
                  disabled={!newMusicUrl.trim() || !newMusicTitle.trim() || musicTracks.length >= (membershipTier === 'basic' ? 1 : membershipTier === 'silver' ? 3 : 10)}
                >
                  <Ionicons name="add-circle" size={24} color="#fff" />
                  <Text style={styles.addMusicButtonText}>Add Track</Text>
                </TouchableOpacity>
              </View>

              {/* Music Track List */}
              {musicTracks.length > 0 && (
                <View style={styles.musicList}>
                  <Text style={styles.musicListTitle}>Your Music Tracks:</Text>
                  {musicTracks.map((track, index) => (
                    <View key={index} style={styles.musicTrackCard}>
                      <View style={styles.musicTrackInfo}>
                        {/* Platform Badge */}
                        <View style={[styles.platformBadge, { backgroundColor: getMusicPlatformColor(track.platform) }]}>
                          <Ionicons 
                            name={getMusicPlatformIcon(track.platform) as any} 
                            size={16} 
                            color="#fff" 
                          />
                          <Text style={styles.platformBadgeText}>
                            {getMusicPlatformName(track.platform)}
                          </Text>
                        </View>
                        
                        <Text style={styles.musicTrackTitle} numberOfLines={2}>
                          {track.title}
                        </Text>
                        <Text style={styles.musicTrackUrl} numberOfLines={1}>
                          {track.url}
                        </Text>
                        
                        {/* Listen Button */}
                        <TouchableOpacity 
                          onPress={() => {
                            if (Platform.OS === 'web') {
                              window.open(track.url, '_blank');
                            } else {
                              // On mobile, open in default browser
                              import('expo-linking').then(({ default: Linking }) => {
                                Linking.openURL(track.url);
                              });
                            }
                          }}
                          style={[styles.listenButton, { backgroundColor: getMusicPlatformColor(track.platform) }]}
                        >
                          <Ionicons name="play" size={16} color="#fff" />
                          <Text style={styles.listenButtonText}>Listen</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <TouchableOpacity 
                        onPress={() => removeMusicTrack(index)}
                        style={styles.removeMusicButton}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Upgrade prompt if limit reached */}
              {musicTracks.length >= (membershipTier === 'basic' ? 1 : membershipTier === 'silver' ? 3 : 10) && (membershipTier === 'basic' || membershipTier === 'silver') && (
                <View style={styles.upgradePrompt}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Ionicons name="star" size={24} color="#FFD700" />
                      <Text style={[styles.upgradePromptText, { marginLeft: 8, marginBottom: 0, fontWeight: '700' }]}>
                        Upgrade for More Tracks!
                      </Text>
                    </View>
                    <Text style={styles.upgradePromptText}>
                      {membershipTier === 'basic' 
                        ? 'Upgrade to Silver (3 tracks) or Networking (10 tracks) to showcase more of your music!'
                        : 'Upgrade to Networking tier for up to 10 music tracks!'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.upgradeButtonCompact}
                    onPress={() => {
                      router.push('/upgrade');
                    }}
                  >
                    <Ionicons name="arrow-up-circle" size={20} color="#fff" />
                    <Text style={styles.upgradeButtonCompactText}>Upgrade</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Social Media Links Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('social')}
          >
            <Text style={styles.sectionTitle}>Social Media Links</Text>
            <Ionicons 
              name={expandedSections.has('social') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('social') && (
            <View style={styles.sectionContent}>
              <View style={styles.socialLinkRow}>
                <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                <TextInput
                  style={styles.socialInput}
                  value={instagram}
                  onChangeText={setInstagram}
                  placeholder="Instagram username"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.socialLinkRow}>
                <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                <TextInput
                  style={styles.socialInput}
                  value={facebook}
                  onChangeText={setFacebook}
                  placeholder="Facebook profile URL"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.socialLinkRow}>
                <Ionicons name="globe-outline" size={24} color="#666" />
                <TextInput
                  style={styles.socialInput}
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="Website URL"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.socialLinkRow}>
                <Ionicons name="star-outline" size={24} color="#FF1A1A" />
                <TextInput
                  style={styles.socialInput}
                  value={yelp}
                  onChangeText={setYelp}
                  placeholder="Yelp profile URL"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.socialLinkRow}>
                <Ionicons name="business-outline" size={24} color="#4285F4" />
                <TextInput
                  style={styles.socialInput}
                  value={googleBusiness}
                  onChangeText={setGoogleBusiness}
                  placeholder="Google Business Profile URL"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.socialLinkRow}>
                <Ionicons name="logo-tiktok" size={24} color="#000" />
                <TextInput
                  style={styles.socialInput}
                  value={tiktok}
                  onChangeText={setTiktok}
                  placeholder="TikTok username"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.socialLinkRow}>
                <Ionicons name="logo-snapchat" size={24} color="#FFFC00" />
                <TextInput
                  style={styles.socialInput}
                  value={snapchat}
                  onChangeText={setSnapchat}
                  placeholder="Snapchat username"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.socialLinkRow}>
                <Ionicons name="logo-linkedin" size={24} color="#0A66C2" />
                <TextInput
                  style={styles.socialInput}
                  value={linkedin}
                  onChangeText={setLinkedin}
                  placeholder="LinkedIn profile URL"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.socialLinkRow}>
                <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
                <TextInput
                  style={styles.socialInput}
                  value={twitter}
                  onChangeText={setTwitter}
                  placeholder="Twitter/X username"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.socialLinkRow}>
                <Ionicons name="logo-youtube" size={24} color="#FF0000" />
                <TextInput
                  style={styles.socialInput}
                  value={youtube}
                  onChangeText={setYoutube}
                  placeholder="YouTube channel URL"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.socialLinkRow}>
                <Ionicons name="logo-pinterest" size={24} color="#E60023" />
                <TextInput
                  style={styles.socialInput}
                  value={pinterest}
                  onChangeText={setPinterest}
                  placeholder="Pinterest profile URL"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            </View>
          )}
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Upgrade Modal */}
      <Modal
        visible={upgradeModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setUpgradeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.upgradeModal}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setUpgradeModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            
            <View style={styles.modalIconContainer}>
              <Ionicons name="star" size={60} color="#FFD700" />
            </View>
            
            <Text style={styles.modalTitle}>Feature Your Videos</Text>
            <Text style={styles.modalDescription}>
              Showcase your best work on the WGO4Y homepage! Featured videos get maximum visibility and help you attract more clients.
            </Text>
            
            <View style={styles.tierBadgesContainer}>
              <View style={styles.tierBadge}>
                <Text style={styles.tierBadgeName}>Silver</Text>
                <Ionicons name="checkmark-circle" size={20} color="#C0C0C0" />
                <Text style={styles.tierLimit}>1 video/week</Text>
              </View>
              <View style={styles.tierBadge}>
                <Text style={styles.tierBadgeName}>Networking</Text>
                <Ionicons name="checkmark-circle" size={20} color="#FFD700" />
                <Text style={styles.tierLimit}>3 videos/week</Text>
              </View>
            </View>
            
            <Text style={styles.modalFeaturesList}>
              ✨ Featured on homepage{'\n'}
              📍 Local homepage visibility{'\n'}
              ⭐ Priority placement{'\n'}
              📈 Increased profile views
            </Text>
            
            <TouchableOpacity 
              style={styles.upgradeButton}
              onPress={() => {
                setUpgradeModalVisible(false);
                router.push('/upgrade');
              }}
            >
              <Text style={styles.upgradeButtonText}>Upgrade Membership</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setUpgradeModalVisible(false)}
            >
              <Text style={styles.modalCancelButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Tier Limit Upgrade Modal */}
      <Modal
        visible={showLimitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLimitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="lock-closed" size={48} color="#FF9800" />
            <Text style={styles.modalTitle}>
              {limitType === 'photo' ? 'Photo' : 'Video'} Limit Reached
            </Text>
            <Text style={styles.modalMessage}>
              {limitType === 'photo' 
                ? `You've used all ${photoLimit} photos on your ${membershipTier.toUpperCase()} tier.`
                : `You've used all ${videoLimit} featured videos on your ${membershipTier.toUpperCase()} tier.`
              }
            </Text>
            <Text style={styles.modalUpgradeInfo}>
              {membershipTier === 'basic' && limitType === 'photo' 
                ? 'Upgrade to Silver for 10 photos or Networking for unlimited'
                : membershipTier === 'silver' && limitType === 'photo'
                ? 'Upgrade to Networking for unlimited photos'
                : membershipTier === 'basic' && limitType === 'video'
                ? 'Upgrade to Silver for 2 videos or Networking for 8 videos'
                : 'Upgrade to Networking for 8 featured videos'
              }
            </Text>
            
            <TouchableOpacity 
              style={styles.modalUpgradeButton}
              onPress={() => {
                setShowLimitModal(false);
                router.push({ 
                  pathname: '/onboarding/tier-selection', 
                  params: { 
                    upgrade: 'true', 
                    preselect: membershipTier === 'basic' ? 'silver' : 'networking' 
                  } 
                });
              }}
            >
              <Text style={styles.upgradeButtonText}>View Upgrade Options</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowLimitModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565FF',
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sectionContent: {
    padding: 16,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  photoContainer: {
    alignSelf: 'center',
    marginVertical: 16,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1565FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  removeButton: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  removeButtonText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipSelected: {
    backgroundColor: '#1565FF',
    borderColor: '#1565FF',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  noResults: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoItem: {
    position: 'relative',
  },
  portfolioPhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1565FF',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    marginTop: 4,
    fontSize: 12,
    color: '#1565FF',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
  },
  limitReachedBanner: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  limitReachedText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  upgradeLink: {
    marginTop: 4,
  },
  upgradeLinkText: {
    fontSize: 12,
    color: '#1565FF',
    fontWeight: '700',
  },
  socialLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  socialInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  categoriesGrid: {
    gap: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    gap: 12,
  },
  categoryCardSelected: {
    borderColor: '#1565FF',
    backgroundColor: '#F0F7FF',
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  categoryNameSelected: {
    color: '#1565FF',
  },
  categoryCheck: {
    width: 24,
    height: 24,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 16,
  },
  categoryInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#1565FF',
    lineHeight: 20,
  },
  occupationGroup: {
    marginBottom: 24,
  },
  occupationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565FF',
    marginBottom: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  serviceCheckbox: {
    paddingTop: 2,
  },
  serviceContent: {
    flex: 1,
  },
  serviceLabel: {
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
  },
  servicePriceInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  customServicesSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  addCustomService: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  customServiceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1565FF',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  addButton: {
    padding: 4,
  },
  limitText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  selectedServicesSection: {
    marginBottom: 24,
  },
  selectedServiceItem: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1565FF',
  },
  selectedServiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedServiceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  removeServiceButton: {
    padding: 4,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1565FF',
    gap: 8,
    marginTop: 16,
  },
  addMoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565FF',
  },
  serviceSelectionArea: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  availableServiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  availableServiceText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  customServiceArea: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  chipUnselected: {
    backgroundColor: '#F0F7FF',
    borderColor: '#1565FF',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1565FF',
    backgroundColor: '#F0F7FF',
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565FF',
    marginRight: 6,
  },
  priceTypeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  priceTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  priceTypeButtonActive: {
    backgroundColor: '#1565FF',
    borderColor: '#1565FF',
  },
  priceTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  priceTypeTextActive: {
    color: '#fff',
  },
  quoteText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 12,
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  serviceRowContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  serviceNameBox: {
    flex: 0.4,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1565FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565FF',
  },
  servicePriceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 4,
  },
  removeServiceIconButton: {
    marginLeft: 8,
  },
  pricingBox: {
    flex: 0.6,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  priceTypeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  priceTypeButtonCompact: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  priceTypeTextCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  priceInputCompact: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  quoteTextCompact: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  // Portfolio Videos Styles
  videoInputContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  addVideoButton: {
    backgroundColor: '#1565FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  addVideoButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addVideoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Music Tracks Styles
  tierLimitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  tierLimitText: {
    flex: 1,
    fontSize: 13,
    color: '#1565FF',
    fontWeight: '500',
  },
  musicInputContainer: {
    marginBottom: 16,
  },
  urlInputWithBadge: {
    position: 'relative',
  },
  addMusicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1DB954',
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  addMusicButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  addMusicButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  musicList: {
    marginTop: 16,
  },
  musicListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  musicTrackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  musicTrackInfo: {
    flex: 1,
    marginRight: 12,
  },
  musicTrackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 8,
    marginBottom: 4,
  },
  musicTrackUrl: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
    alignSelf: 'flex-start',
  },
  listenButtonText: {
    color: '#fff',
  upgradeButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  upgradeButtonCompactText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

    fontSize: 14,
    fontWeight: '600',
  },
  removeMusicButton: {
    padding: 8,
  },
  upgradePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  upgradePromptText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    fontWeight: '500',
    lineHeight: 20,
  },

  videoList: {
    marginTop: 16,
  },
  videoListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  videoInfo: {
    flex: 1,
    marginRight: 12,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  platformBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  videoUrl: {
    fontSize: 12,
    color: '#666',
  },
  removeVideoButton: {
    padding: 8,
  },
  // Featured Video Styles
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 4,
  },
  featuredApproved: {
    backgroundColor: '#4CAF50',
  },
  featuredPending: {
    backgroundColor: '#FF9800',
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  featureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  featureButtonText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  featureButtonTextActive: {
    color: '#FFD700',
    fontWeight: '600',
  },
  // Featured Status Card Styles
  featuredStatusCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1565FF',
  },
  featuredStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  featuredStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565FF',
  },
  featuredStatusContent: {
    gap: 8,
  },
  featuredStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredStatusLabel: {
    fontSize: 14,
    color: '#666',
  },
  featuredStatusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  featuredStatusWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 6,
  },
  featuredStatusWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '500',
  },
  // Upgrade Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  upgradeModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 10,
  },
  modalIconContainer: {
    marginBottom: 16,
    marginTop: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  tierBadgesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tierBadgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  tierLimit: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  modalFeaturesList: {
    fontSize: 14,
    color: '#333',
    textAlign: 'left',
    lineHeight: 24,
    marginBottom: 24,
    alignSelf: 'stretch',
    paddingLeft: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565FF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  modalCancelButton: {
    paddingVertical: 12,
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
});

