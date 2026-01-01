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
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { GROUPED_VENUE_CATEGORIES } from '../onboarding/business/groupedVenueCategories';
import { COMPREHENSIVE_AMENITIES } from '../onboarding/business/comprehensiveAmenities';
import { GROUPED_ENTERTAINMENT_CATEGORIES } from '../onboarding/business/groupedEntertainmentCategories';
import { PhoneInput } from '../../components/PhoneInput';
import { parseVideoUrl, isValidVideoUrl } from '../../utils/videoUtils';
import { API_URL } from '../../utils/api';



// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Operating Hours Interface
interface DayHours {
  isOpen: boolean;
  openHour: string;
  openMinute: string;
  openPeriod: string;
  closeHour: string;
  closeMinute: string;
  closePeriod: string;
}

export default function EditBusinessProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Account Information (consolidated)
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [businessType, setBusinessType] = useState('');
  
  // Business Info
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [businessPhotos, setBusinessPhotos] = useState<string[]>([]);
  
  // New venue categorization fields
  const [venueType, setVenueType] = useState('');
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
  const [county, setCounty] = useState('');
  const [venueTypes, setVenueTypes] = useState<any[]>([]);
  const [useCaseTags, setUseCaseTags] = useState<any[]>([]);
  const [targetStates, setTargetStates] = useState<any[]>([]);

  // Operating Hours - 12-hour format with AM/PM
  const [hours, setHours] = useState<Record<string, DayHours>>({
    Monday: { isOpen: true, openHour: '9', openMinute: '00', openPeriod: 'AM', closeHour: '5', closeMinute: '00', closePeriod: 'PM' },
    Tuesday: { isOpen: true, openHour: '9', openMinute: '00', openPeriod: 'AM', closeHour: '5', closeMinute: '00', closePeriod: 'PM' },
    Wednesday: { isOpen: true, openHour: '9', openMinute: '00', openPeriod: 'AM', closeHour: '5', closeMinute: '00', closePeriod: 'PM' },
    Thursday: { isOpen: true, openHour: '9', openMinute: '00', openPeriod: 'AM', closeHour: '5', closeMinute: '00', closePeriod: 'PM' },
    Friday: { isOpen: true, openHour: '9', openMinute: '00', openPeriod: 'AM', closeHour: '5', closeMinute: '00', closePeriod: 'PM' },
    Saturday: { isOpen: true, openHour: '10', openMinute: '00', openPeriod: 'AM', closeHour: '6', closeMinute: '00', closePeriod: 'PM' },
    Sunday: { isOpen: false, openHour: '10', openMinute: '00', openPeriod: 'AM', closeHour: '6', closeMinute: '00', closePeriod: 'PM' },
  });
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Categories & Amenities
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [selectedEntertainment, setSelectedEntertainment] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [openToAllEntertainment, setOpenToAllEntertainment] = useState(false);
  const [expandedVenueGroups, setExpandedVenueGroups] = useState<Set<string>>(new Set());
  const [expandedEntertainmentGroups, setExpandedEntertainmentGroups] = useState<Set<string>>(new Set());
  const [expandedAmenityGroups, setExpandedAmenityGroups] = useState<Set<string>>(new Set());
  const [customVenueCategory, setCustomVenueCategory] = useState('');
  const [venueSearch, setVenueSearch] = useState('');
  const [entertainmentSearch, setEntertainmentSearch] = useState('');
  const [amenitySearch, setAmenitySearch] = useState('');

  // Social Links
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [website, setWebsite] = useState('');
  
  // Portfolio Videos
  interface PortfolioVideo {
    url: string;
    title: string;
    platform: string;
    videoId: string;
    thumbnailUrl: string;
    featured?: boolean;
    featured_approved?: boolean;
  }
  const [portfolioVideos, setPortfolioVideos] = useState<PortfolioVideo[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [membershipTier, setMembershipTier] = useState('basic');
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
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
  
  // Social Links
  const [yelp, setYelp] = useState('');
  const [googleBusiness, setGoogleBusiness] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [snapchat, setSnapchat] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [youtube, setYoutube] = useState('');
  const [pinterest, setPinterest] = useState('');

  // UI State
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['account']));

  // Helper Functions for Time Conversion
  const convertTo24Hour = (hour: string, minute: string, period: string): string => {
    let hour24 = parseInt(hour);
    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  const convertFrom24Hour = (time24: string): { hour: string; minute: string; period: string } => {
    // Safety check: if time24 is undefined or empty, return default values
    if (!time24 || typeof time24 !== 'string') {
      return { hour: '9', minute: '00', period: 'AM' };
    }
    
    const parts = time24.split(':');
    if (parts.length !== 2) {
      // Invalid format, return default
      return { hour: '9', minute: '00', period: 'AM' };
    }
    
    const [hourStr, minute] = parts;
    let hour = parseInt(hourStr);
    const period = hour >= 12 ? 'PM' : 'AM';
    
    if (hour === 0) hour = 12;
    else if (hour > 12) hour -= 12;
    
    return { hour: hour.toString(), minute: minute || '00', period };
  };

  const convertHoursForBackend = () => {
    const converted: Record<string, { open: string; close: string; isOpen: boolean }> = {};
    Object.entries(hours).forEach(([day, dayHours]) => {
      converted[day] = {
        open: convertTo24Hour(dayHours.openHour, dayHours.openMinute, dayHours.openPeriod),
        close: convertTo24Hour(dayHours.closeHour, dayHours.closeMinute, dayHours.closePeriod),
        isOpen: dayHours.isOpen,
      };
    });
    return converted;
  };

  const updateDayTime = (day: string, field: string, value: string) => {
    console.log(`⏰ Updating ${day} ${field} to ${value}`);
    setHours({
      ...hours,
      [day]: { ...hours[day], [field]: value }
    });
    console.log(`✅ Hours updated for ${day}`);
  };

  // Entertainment Group Helpers
  const toggleEntertainmentGroup = (groupName: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newExpanded = new Set(expandedEntertainmentGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedEntertainmentGroups(newExpanded);
  };

  const selectEntireGroup = (groupItems: string[]) => {
    const allSelected = groupItems.every(item => selectedEntertainment.includes(item));
    if (allSelected) {
      // Deselect all items in group
      setSelectedEntertainment(selectedEntertainment.filter(item => !groupItems.includes(item)));
    } else {
      // Select all items in group
      const newSelection = [...selectedEntertainment];
      groupItems.forEach(item => {
        if (!newSelection.includes(item)) {
          newSelection.push(item);
        }
      });
      setSelectedEntertainment(newSelection);
    }
  };

  const toggleAmenityGroup = (groupName: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newExpanded = new Set(expandedAmenityGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedAmenityGroups(newExpanded);
  };

  const selectEntireAmenityGroup = (groupItems: string[]) => {
    const allSelected = groupItems.every(item => selectedAmenities.includes(item));
    if (allSelected) {
      setSelectedAmenities(selectedAmenities.filter(item => !groupItems.includes(item)));
    } else {
      const newSelection = [...selectedAmenities];
      groupItems.forEach(item => {
        if (!newSelection.includes(item)) {
          newSelection.push(item);
        }
      });
      setSelectedAmenities(newSelection);
    }
  };

  const toggleVenueGroup = (groupName: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newExpanded = new Set(expandedVenueGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedVenueGroups(newExpanded);
  };

  const selectEntireVenueGroup = (groupItems: string[]) => {
    const allSelected = groupItems.every(item => selectedVenues.includes(item));
    if (allSelected) {
      setSelectedVenues(selectedVenues.filter(item => !groupItems.includes(item)));
    } else {
      const newSelection = [...selectedVenues];
      groupItems.forEach(item => {
        if (!newSelection.includes(item)) {
          newSelection.push(item);
        }
      });
      setSelectedVenues(newSelection);
    }
  };

  // UI State

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
      
      console.log('🏢 Business profile loaded');
      console.log('📊 Tier limits:', limitsData);
      
      // Set tier limits
      setTierLimits(limitsData);
      if (limitsData.usage?.business_photos) {
        setPhotoLimit(limitsData.usage.business_photos.limit);
        setCanAddPhoto(limitsData.usage.business_photos.can_add);
        setNearPhotoLimit(limitsData.usage.business_photos.near_limit);
      }
      if (limitsData.usage?.featured_videos) {
        setVideoLimit(limitsData.usage.featured_videos.limit);
      }
      
      console.log('📸 Photo limit:', limitsData.usage?.business_photos);
      console.log('🎬 Video limit:', limitsData.usage?.featured_videos);
      
      // Account Information (consolidated)
      setUsername(profile.username || '');
      setEmail(profile.email || '');
      setBusinessName(profile.business_name || profile.full_name || '');
      setPhone(profile.business_phone || '');
      setBusinessType(profile.business_type || '');
      
      // Business Description & Media
      setBusinessDescription(profile.business_description || '');
      setBusinessLogo(profile.business_logo);
      
      // Handle business_photos - can be array of strings OR array of approval objects
      const photos = profile.business_photos || [];
      console.log('📸 Raw business_photos from API:', photos);
      console.log('📸 business_photos type:', typeof photos, 'is array:', Array.isArray(photos));
      
      const photoUrls = photos.map((photo: any, index: number) => {
        console.log(`📸 Photo ${index}:`, typeof photo, photo);
        
        // If it's an approval object with approval metadata
        if (typeof photo === 'object' && photo !== null && photo.url) {
          console.log(`📸 Photo ${index} is approval object, extracting URL:`, photo.url?.substring(0, 50));
          return photo.url;
        }
        // If it's a plain string URL
        if (typeof photo === 'string') {
          console.log(`📸 Photo ${index} is string:`, photo.substring(0, 50));
          return photo;
        }
        
        console.warn(`📸 Photo ${index} unexpected format:`, photo);
        return null;
      }).filter(Boolean); // Remove any null/undefined values
      
      console.log('📸 Processed photoUrls count:', photoUrls.length);
      console.log('📸 First photoUrl sample:', photoUrls[0]?.substring(0, 100));
      
      setBusinessPhotos(photoUrls);

      // Address
      if (profile.business_address) {
        const parts = profile.business_address.split(', ');
        if (parts.length >= 3) {
          setStreet(parts[0] || '');
          setCity(parts[1] || '');
          const stateZip = parts[2]?.split(' ') || [];
          setState(stateZip[0] || '');
          setZipCode(stateZip[1] || '');
        }
      }

      // Operating Hours - Convert from 24-hour to 12-hour format
      // Start with default hours for all days
      const defaultHours: Record<string, DayHours> = {
        Monday: { isOpen: true, openHour: '9', openMinute: '00', openPeriod: 'AM', closeHour: '5', closeMinute: '00', closePeriod: 'PM' },
        Tuesday: { isOpen: true, openHour: '9', openMinute: '00', openPeriod: 'AM', closeHour: '5', closeMinute: '00', closePeriod: 'PM' },
        Wednesday: { isOpen: true, openHour: '9', openMinute: '00', openPeriod: 'AM', closeHour: '5', closeMinute: '00', closePeriod: 'PM' },
        Thursday: { isOpen: true, openHour: '9', openMinute: '00', openPeriod: 'AM', closeHour: '5', closeMinute: '00', closePeriod: 'PM' },
        Friday: { isOpen: true, openHour: '9', openMinute: '00', openPeriod: 'AM', closeHour: '5', closeMinute: '00', closePeriod: 'PM' },
        Saturday: { isOpen: true, openHour: '10', openMinute: '00', openPeriod: 'AM', closeHour: '6', closeMinute: '00', closePeriod: 'PM' },
        Sunday: { isOpen: false, openHour: '10', openMinute: '00', openPeriod: 'AM', closeHour: '6', closeMinute: '00', closePeriod: 'PM' },
      };
      
      if (profile.business_hours) {
        const convertedHours: Record<string, DayHours> = { ...defaultHours }; // Start with defaults
        Object.entries(profile.business_hours).forEach(([day, dayData]: [string, any]) => {
          // Ensure we have valid time strings, default to 9 AM - 5 PM
          const openTimeStr = (dayData?.open && typeof dayData.open === 'string') ? dayData.open : '09:00';
          const closeTimeStr = (dayData?.close && typeof dayData.close === 'string') ? dayData.close : '17:00';
          
          const openTime = convertFrom24Hour(openTimeStr);
          const closeTime = convertFrom24Hour(closeTimeStr);
          convertedHours[day] = {
            isOpen: dayData?.isOpen !== undefined ? dayData.isOpen : true,
            openHour: openTime.hour,
            openMinute: openTime.minute,
            openPeriod: openTime.period,
            closeHour: closeTime.hour,
            closeMinute: closeTime.minute,
            closePeriod: closeTime.period,
          };
        });
        setHours(convertedHours);
      } else {
        // No business hours in profile - use defaults
        setHours(defaultHours);
      }

      // Categories & Amenities
      setSelectedVenues(profile.venue_categories || []);
      const entertainmentCats = profile.entertainment_categories || [];
      setSelectedEntertainment(entertainmentCats);
      // Check if "Open to All" is in the entertainment categories
      setOpenToAllEntertainment(entertainmentCats.includes('Open to All Entertainment'));
      setSelectedAmenities(profile.amenities || []);

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
      
      // Portfolio Videos
      setPortfolioVideos(profile.portfolio_videos || []);
      setMembershipTier(profile.membership_tier || 'basic');
      setFeaturedVideosThisWeek(profile.featured_videos_this_week || 0);
      setLastFeaturedVideoReset(profile.last_featured_video_reset || null);
      
      // New venue categorization fields
      setVenueType(profile.venue_type || '');
      setSelectedUseCases(profile.use_cases || []);
      setCounty(profile.county || '');
      // Note: state and city are already loaded from business_address above
      
      // Load venue types data
      try {
        const venueTypesRes = await axios.get(`${API_URL}/api/venue-types`);
        setVenueTypes(venueTypesRes.data.venue_types || []);
        setUseCaseTags(venueTypesRes.data.use_cases || []);
        setTargetStates(venueTypesRes.data.states || []);
        console.log('✅ Loaded venue types and use cases');
      } catch (error) {
        console.error('Error loading venue types:', error);
      }
      
      // Set weekly limit based on tier
      const tier = profile.membership_tier || 'basic';
      const limit = tier === 'gold' ? 3 : tier === 'silver' ? 1 : 0;
      setWeeklyVideoLimit(limit);
      
      console.log('📊 Business Profile Loaded:');
      console.log('  Username:', profile.username);
      console.log('  Membership Tier from API:', profile.membership_tier);
      console.log('  Set to state:', profile.membership_tier || 'basic');
      console.log('  Venue Type:', profile.venue_type);
      console.log('  Use Cases:', profile.use_cases);

    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

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

  const toggleDay = (day: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(day)) {
      newExpanded.delete(day);
    } else {
      newExpanded.add(day);
    }
    setExpandedDays(newExpanded);
  };

  // Filter functions removed - now using grouped categories directly
  
  const filteredAmenities = useMemo(() => {
    if (!amenitySearch.trim()) {
      return COMPREHENSIVE_AMENITIES.flatMap(cat => cat.amenities);
    }
    return COMPREHENSIVE_AMENITIES
      .flatMap(cat => cat.amenities)
      .filter(amenity => amenity.toLowerCase().includes(amenitySearch.toLowerCase()));
  }, [amenitySearch]);

  // Toggle functions
  const toggleVenue = (venue: string) => {
    if (selectedVenues.includes(venue)) {
      setSelectedVenues(selectedVenues.filter(v => v !== venue));
    } else {
      setSelectedVenues([...selectedVenues, venue]);
    }
  };

  const toggleEntertainment = (cat: string) => {
    if (selectedEntertainment.includes(cat)) {
      setSelectedEntertainment(selectedEntertainment.filter(c => c !== cat));
    } else {
      setSelectedEntertainment([...selectedEntertainment, cat]);
    }
  };

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter(a => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  // Image functions
  const pickLogo = async () => {
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
      setBusinessLogo(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const removeLogo = () => {
    Alert.alert('Remove Logo', 'Remove business logo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setBusinessLogo(null) }
    ]);
  };

  const addPhoto = async () => {
    // Check tier limits before allowing photo upload
    if (!canAddPhoto) {
      const isUnlimited = photoLimit >= 999;
      const upgradeMsg = membershipTier === 'basic' 
        ? 'Upgrade to Silver for 15 photos or Gold for unlimited.'
        : 'Upgrade to Gold for unlimited photos.';
      
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
      const remaining = typeof photoLimit === 'number' ? photoLimit - businessPhotos.length : 0;
      console.log(`⚠️ Near photo limit: ${remaining} remaining`);
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'web') {
        alert('Permission needed: Please grant photo library access');
      } else {
        Alert.alert('Permission needed', 'Please grant photo library access');
      }
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
      const updatedPhotos = [...businessPhotos, newPhoto];
      setBusinessPhotos(updatedPhotos);
      
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

  const removePhoto = (index: number) => {
    // Use confirm dialog for web, Alert for mobile
    const confirmRemove = () => {
      const updatedPhotos = businessPhotos.filter((_, i) => i !== index);
      setBusinessPhotos(updatedPhotos);
      
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
    };
    
    // Different confirmation for web vs mobile
    if (Platform.OS === 'web') {
      if (window.confirm('Remove this photo?')) {
        confirmRemove();
      }
    } else {
      Alert.alert('Remove Photo', 'Remove this photo?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: confirmRemove
        }
      ]);
    }
  };

  // Portfolio Video Handlers
  const addPortfolioVideo = () => {
    // Tier-based video limits for Business
    const videoLimits: { [key: string]: number } = {
      'basic': 1,
      'bronze': 1,  // Bronze is same as basic for business
      'silver': 5,
      'gold': 8,
    };
    
    const limit = videoLimits[membershipTier] || 1; // Default to basic limit
    
    if (portfolioVideos.length >= limit) {
      const msg = `You've reached your ${membershipTier.toUpperCase()} tier limit of ${limit} video${limit > 1 ? 's' : ''}. ${membershipTier === 'basic' || membershipTier === 'bronze' ? 'Upgrade to Silver for 5 videos or Gold for 8 videos.' : membershipTier === 'silver' ? 'Upgrade to Gold for 8 videos.' : ''}`;
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Video Limit Reached', msg);
      }
      return;
    }

    if (!newVideoUrl.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter a video URL');
      } else {
        Alert.alert('Missing URL', 'Please enter a video URL');
      }
      return;
    }

    if (!isValidVideoUrl(newVideoUrl)) {
      if (Platform.OS === 'web') {
        alert('Please enter a valid YouTube or Vimeo URL');
      } else {
        Alert.alert('Invalid URL', 'Please enter a valid YouTube or Vimeo URL');
      }
      return;
    }

    const parsedVideo = parseVideoUrl(newVideoUrl);
    if (!parsedVideo) {
      if (Platform.OS === 'web') {
        alert('Could not parse video URL');
      } else {
        Alert.alert('Invalid URL', 'Could not parse video URL');
      }
      return;
    }

    const newVideo: PortfolioVideo = {
      url: newVideoUrl,
      title: newVideoTitle || `${parsedVideo.platform === 'youtube' ? 'YouTube' : 'Vimeo'} Video`,
      platform: parsedVideo.platform,
      videoId: parsedVideo.videoId,
      thumbnailUrl: parsedVideo.thumbnailUrl,
      featured: false,
      featured_approved: false
    };

    setPortfolioVideos([...portfolioVideos, newVideo]);
    setNewVideoUrl('');
    setNewVideoTitle('');

    if (Platform.OS === 'web') {
      alert('Success! Video added successfully.');
    } else {
      Alert.alert('Success', 'Video added successfully');
    }
  };

  const removePortfolioVideo = (index: number) => {
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to remove this video?')) {
        setPortfolioVideos(portfolioVideos.filter((_, i) => i !== index));
      }
    } else {
      Alert.alert(
        'Remove Video',
        'Are you sure you want to remove this video?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => setPortfolioVideos(portfolioVideos.filter((_, i) => i !== index)) }
        ]
      );
    }
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

  const handleFeatureVideo = async (index: number) => {
    // Check membership tier
    const tier = membershipTier.toLowerCase();
    if (tier !== 'silver' && tier !== 'gold') {
      setUpgradeModalVisible(true);
      return;
    }

    // Check if already featured
    const video = portfolioVideos[index];
    const isFeatured = video.featured || false;

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
      
      // Update weekly counter if video was featured
      if (response.data.featured && !isFeatured) {
        setFeaturedVideosThisWeek(featuredVideosThisWeek + 1);
      } else if (!response.data.featured && isFeatured) {
        setFeaturedVideosThisWeek(Math.max(0, featuredVideosThisWeek - 1));
      }

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
      
      if (Platform.OS === 'web') {
        alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  const handleSave = async () => {
    // Validation
    if (!businessName.trim()) {
      Alert.alert('Required', 'Please enter business name');
      return;
    }

    if (selectedVenues.length === 0) {
      Alert.alert('Required', 'Please select at least one venue category');
      return;
    }

    setSaving(true);
    try {
      console.log('💾 Starting profile save...');
      const token = await AsyncStorage.getItem('auth_token');
      const fullAddress = `${street}, ${city}, ${state} ${zipCode}`;

      console.log('📤 Sending profile update to API...');
      const response = await axios.put(
        `${API_URL}/api/profile`,
        {
          email: email.trim(),  // Add email to payload
          business_name: businessName,
          business_type: businessType,
          business_description: businessDescription,
          business_logo: businessLogo,
          business_photos: businessPhotos,
          business_address: fullAddress,
          business_phone: phone,
          business_hours: convertHoursForBackend(), // Convert 12h to 24h format
          venue_categories: selectedVenues,
          entertainment_categories: selectedEntertainment,
          amenities: selectedAmenities,
          portfolio_videos: portfolioVideos,
          // New venue categorization fields
          venue_type: venueType || null,
          use_cases: selectedUseCases,
          state: state || null,
          county: county.trim() || null,
          city: city.trim() || null,
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

      console.log('✅ API response received:', response.status);

      // Update AsyncStorage with minimal user data (exclude large base64 fields)
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        // Strip large fields from response before storing
        const { 
          business_photos, 
          business_logo,
          portfolio_photos,
          portfolio_videos,
          profile_photo,
          ...minimalUpdate 
        } = response.data;
        
        const updatedUser = { ...user, ...minimalUpdate };
        
        try {
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          console.log('💾 Updated minimal user data in storage');
          
          // Also update localStorage for web with error handling
          if (Platform.OS === 'web') {
            try {
              localStorage.setItem('user', JSON.stringify(updatedUser));
            } catch (storageError: any) {
              if (storageError.name === 'QuotaExceededError') {
                console.warn('⚠️ localStorage quota exceeded - clearing old data');
                // Clear onboarding progress to free up space
                localStorage.removeItem('business_step3_progress');
                localStorage.removeItem('onboarding_step2_progress');
                localStorage.removeItem('entrepreneur_step1_progress');
                try {
                  localStorage.setItem('user', JSON.stringify(updatedUser));
                  console.log('💾 Retry successful after cleanup');
                } catch (retryError) {
                  console.error('❌ Still quota exceeded after cleanup');
                  // Continue anyway - user is logged in, just not persisted
                }
              }
            }
          }
        } catch (storageError) {
          console.error('❌ Error storing user data:', storageError);
          // Continue anyway - profile was saved on server
        }
      }

      console.log('✅ Business profile saved successfully');

      // Show success message
      if (Platform.OS === 'web') {
        alert('Success! Business profile updated.');
      } else {
        Alert.alert('Success', 'Business profile updated successfully!');
      }
      
      console.log('🔙 Navigating back to profile...');
      // Use replace instead of push to prevent navigation loop
      setTimeout(() => {
        router.replace('/profile');
      }, 100);
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      console.error('❌ Error details:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      // Format error message for display
      let errorMsg = 'Failed to update profile';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        // Check if detail is an array of validation errors
        if (Array.isArray(detail)) {
          console.error('❌ Validation errors:', JSON.stringify(detail, null, 2));
          
          // Format validation errors into readable message
          errorMsg = 'Validation errors:\n' + detail.map((err: any) => {
            const field = err.loc ? err.loc.join('.') : 'unknown';
            const message = err.msg || 'Invalid value';
            return `• ${field}: ${message}`;
          }).join('\n');
        } else if (typeof detail === 'string') {
          errorMsg = detail;
        } else {
          errorMsg = JSON.stringify(detail);
        }
      }
      
      if (Platform.OS === 'web') {
        alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      console.log('🏁 Save process complete');
      setSaving(false);
    }
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
          <TouchableOpacity 
            onPress={() => {
              console.log('🔙 Back button pressed');
              router.replace('/profile');
            }} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Business Profile</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            disabled={saving}
            style={styles.saveButton}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Account Information Section (Consolidated) */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('account')}
          >
            <Text style={styles.sectionTitle}>Account Information</Text>
            <Ionicons 
              name={expandedSections.has('account') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('account') && (
            <View style={styles.sectionContent}>
              {/* Username */}
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor="#999"
                autoCapitalize="none"
              />

              {/* Email */}
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Business Name */}
              <Text style={styles.label}>Business Name *</Text>
              <TextInput
                style={styles.input}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Enter business name"
                placeholderTextColor="#999"
              />

              {/* Phone Number */}
              <PhoneInput
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="(555) 555-5555"
                showValidation={true}
              />

              {/* Address */}
              <Text style={styles.label}>Street Address</Text>
              <TextInput
                style={styles.input}
                value={street}
                onChangeText={setStreet}
                placeholder="123 Main St"
                placeholderTextColor="#999"
              />

              <View style={styles.row}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={city}
                    onChangeText={setCity}
                    placeholder="City"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.label}>State</Text>
                  <TextInput
                    style={styles.input}
                    value={state}
                    onChangeText={(text) => setState(text.toUpperCase())}
                    placeholder="SC"
                    placeholderTextColor="#999"
                    maxLength={2}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.label}>ZIP</Text>
                  <TextInput
                    style={styles.input}
                    value={zipCode}
                    onChangeText={setZipCode}
                    placeholder="12345"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
              </View>

              {/* Website */}
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                value={website}
                onChangeText={setWebsite}
                placeholder="https://example.com"
                placeholderTextColor="#999"
                keyboardType="url"
                autoCapitalize="none"
              />

              {/* Business Type */}
              <Text style={styles.label}>Business Type</Text>
              <TextInput
                style={styles.input}
                value={businessType}
                onChangeText={setBusinessType}
                placeholder="e.g., Restaurant, Bar, Lounge"
                placeholderTextColor="#999"
              />

              {/* Business Logo */}
              <Text style={styles.label}>Business Logo</Text>
              <TouchableOpacity onPress={pickLogo} style={styles.logoContainer}>
                {businessLogo ? (
                  <>
                    <Image source={{ uri: businessLogo }} style={styles.logo} />
                    <View style={styles.logoOverlay}>
                      <Ionicons name="camera" size={24} color="#fff" />
                    </View>
                  </>
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Ionicons name="business" size={50} color="#999" />
                    <Text style={styles.placeholderText}>Tap to add logo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {businessLogo && (
                <TouchableOpacity onPress={removeLogo} style={styles.removeButton}>
                  <Text style={styles.removeButtonText}>Remove Logo</Text>
                </TouchableOpacity>
              )}

              {/* Business Description */}
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={businessDescription}
                onChangeText={(text) => text.length <= 300 && setBusinessDescription(text)}
                placeholder="Tell customers about your business..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{businessDescription.length}/300</Text>
            </View>
          )}

          {/* Venue Type & Category Section - NEW */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('venue_category')}
          >
            <Text style={styles.sectionTitle}>Venue Type & Category</Text>
            <Ionicons 
              name={expandedSections.has('venue_category') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('venue_category') && (
            <View style={styles.sectionContent}>
              {/* Venue Type */}
              <Text style={styles.label}>Venue Type *</Text>
              <Text style={styles.sublabel}>What type of venue/business are you?</Text>
              <View style={styles.categoryGrid}>
                {venueTypes.map(vtype => (
                  <TouchableOpacity
                    key={vtype.id}
                    style={[
                      styles.categoryCard,
                      venueType === vtype.id && styles.categoryCardActive
                    ]}
                    onPress={() => setVenueType(vtype.id)}
                  >
                    <Text style={styles.categoryEmoji}>{vtype.icon}</Text>
                    <Text style={[
                      styles.categoryName,
                      venueType === vtype.id && styles.categoryNameActive
                    ]}>
                      {vtype.name}
                    </Text>
                    {venueType === vtype.id && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Use Cases */}
              <Text style={[styles.label, { marginTop: 24 }]}>Use Cases (What&apos;s your venue good for?)</Text>
              <Text style={styles.sublabel}>Select all that apply</Text>
              <View style={styles.useCaseGrid}>
                {useCaseTags.map(useCase => (
                  <TouchableOpacity
                    key={useCase.id}
                    style={[
                      styles.useCaseChip,
                      selectedUseCases.includes(useCase.id) && styles.useCaseChipActive
                    ]}
                    onPress={() => {
                      if (selectedUseCases.includes(useCase.id)) {
                        setSelectedUseCases(selectedUseCases.filter(id => id !== useCase.id));
                      } else {
                        setSelectedUseCases([...selectedUseCases, useCase.id]);
                      }
                    }}
                  >
                    <Text style={styles.useCaseEmoji}>{useCase.icon}</Text>
                    <Text style={[
                      styles.useCaseText,
                      selectedUseCases.includes(useCase.id) && styles.useCaseTextActive
                    ]}>
                      {useCase.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Location Details */}
              <Text style={[styles.label, { marginTop: 24 }]}>Location Details</Text>
              
              <Text style={styles.label}>State *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={state}
                  onValueChange={(value) => setState(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select State..." value="" />
                  {targetStates.map(st => (
                    <Picker.Item key={st.id} label={st.name} value={st.id} />
                  ))}
                </Picker>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>City *</Text>
                  <TextInput
                    style={styles.input}
                    value={city}
                    onChangeText={setCity}
                    placeholder="e.g., Charleston"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.label}>County (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={county}
                    onChangeText={setCounty}
                    placeholder="e.g., Charleston County"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <Text style={styles.helperText}>
                💡 This helps people find your venue when filtering by location
              </Text>
            </View>
          )}

          {/* Business Photos Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('photos')}
          >
            <Text style={styles.sectionTitle}>
              Business Photos ({businessPhotos.length}/{photoLimit >= 999 ? '∞' : photoLimit})
            </Text>
            <Ionicons 
              name={expandedSections.has('photos') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('photos') && (
            <View style={styles.sectionContent}>
              {/* Near limit warning */}
              {nearPhotoLimit && photoLimit < 999 && (
                <View style={styles.warningBanner}>
                  <Ionicons name="warning" size={20} color="#FF9800" />
                  <Text style={styles.warningText}>
                    Only {typeof photoLimit === 'number' ? photoLimit - businessPhotos.length : 0} photos remaining
                  </Text>
                </View>
              )}
              
              <Text style={styles.sectionDescription}>
                Add photos to highlight your venue and showcase your staff or events.
                {membershipTier === 'basic' && ' (Upgrade to Silver for 15 photos or Gold for unlimited)'}
              </Text>
              <View style={styles.photosGrid}>
                {businessPhotos.map((photo, index) => {
                  // Ensure photo has proper format (base64 needs data URI prefix)
                  let photoUri = photo;
                  if (photo && !photo.startsWith('http') && !photo.startsWith('data:')) {
                    // Assume it's base64 without prefix
                    photoUri = `data:image/jpeg;base64,${photo}`;
                  }
                  
                  return (
                    <View key={index} style={styles.photoItem}>
                      <Image source={{ uri: photoUri }} style={styles.businessPhoto} />
                      <TouchableOpacity 
                        onPress={() => removePhoto(index)}
                        style={styles.removePhotoButton}
                      >
                        <Ionicons name="close-circle" size={24} color="#ff3b30" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {/* Show add button only if under limit */}
                {canAddPhoto && (
                  <TouchableOpacity onPress={addPhoto} style={styles.addPhotoButton}>
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

          {/* Portfolio Videos Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('portfolio_videos')}
          >
            <Text style={styles.sectionTitle}>
              Portfolio Videos ({portfolioVideos.length}/
              {membershipTier === 'gold' ? '8' : membershipTier === 'silver' ? '5' : '1'})
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
                Showcase your venue, menu highlights, or promotions with videos (Max 5)
              </Text>

              {/* Featured Videos Status Info Card */}
              {(membershipTier === 'silver' || membershipTier === 'gold') && (
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
                  placeholder="e.g., Grand Opening Event, New Menu Items"
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

          {/* Operating Hours Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('hours')}
          >
            <Text style={styles.sectionTitle}>Operating Hours</Text>
            <Ionicons 
              name={expandedSections.has('hours') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('hours') && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionDescription}>
                Let customers know when you're open for business. Set your hours for each day of the week.
              </Text>
              {DAYS.map((day) => (
                <View key={day} style={styles.dayContainer}>
                  <TouchableOpacity 
                    style={styles.dayHeader}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={styles.dayName}>{day}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.dayStatus}>
                        {hours[day]?.isOpen 
                          ? `${hours[day]?.openHour}:${hours[day]?.openMinute} ${hours[day]?.openPeriod} - ${hours[day]?.closeHour}:${hours[day]?.closeMinute} ${hours[day]?.closePeriod}` 
                          : 'Closed'}
                      </Text>
                      <Ionicons 
                        name={expandedDays.has(day) ? 'chevron-up' : 'chevron-down'} 
                        size={20} 
                        color="#666" 
                      />
                    </View>
                  </TouchableOpacity>

                  {expandedDays.has(day) && (
                    <View style={styles.dayDetails}>
                      <View style={styles.switchRow}>
                        <Text>Open this day</Text>
                        <TouchableOpacity
                          onPress={() => {
                            console.log(`🔄 Toggling ${day} - current: ${hours[day]?.isOpen}`);
                            // Defensive check - ensure hours[day] exists
                            if (!hours[day]) {
                              console.warn(`⚠️ hours[${day}] is undefined, initializing...`);
                              setHours({
                                ...hours,
                                [day]: { isOpen: true, openHour: '9', openMinute: '00', openPeriod: 'AM', closeHour: '5', closeMinute: '00', closePeriod: 'PM' }
                              });
                              return;
                            }
                            setHours({
                              ...hours,
                              [day]: { ...hours[day], isOpen: !hours[day].isOpen }
                            });
                            console.log(`✅ Toggled ${day} to ${!hours[day]?.isOpen}`);
                          }}
                          style={[styles.switch, hours[day]?.isOpen && styles.switchActive]}
                        >
                          <View style={[styles.switchThumb, hours[day]?.isOpen && styles.switchThumbActive]} />
                        </TouchableOpacity>
                      </View>

                      {hours[day]?.isOpen && (
                        <View style={styles.timePickerSection}>
                          <Text style={styles.timeLabel}>Open:</Text>
                          <View style={styles.timePickerRow}>
                            {Platform.OS === 'web' ? (
                              <>
                                <select
                                  value={hours[day]?.openHour}
                                  onChange={(e) => updateDayTime(day, 'openHour', e.target.value)}
                                  style={{
                                    padding: '8px',
                                    fontSize: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    backgroundColor: '#fff',
                                    width: '70px'
                                  }}
                                >
                                  {HOURS.map((h) => (
                                    <option key={h} value={h}>{h}</option>
                                  ))}
                                </select>
                                <Text style={styles.timeSeparator}>:</Text>
                                <select
                                  value={hours[day]?.openMinute}
                                  onChange={(e) => updateDayTime(day, 'openMinute', e.target.value)}
                                  style={{
                                    padding: '8px',
                                    fontSize: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    backgroundColor: '#fff',
                                    width: '70px'
                                  }}
                                >
                                  {MINUTES.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                  ))}
                                </select>
                                <select
                                  value={hours[day]?.openPeriod}
                                  onChange={(e) => updateDayTime(day, 'openPeriod', e.target.value)}
                                  style={{
                                    padding: '8px',
                                    fontSize: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    backgroundColor: '#fff',
                                    width: '70px',
                                    marginLeft: '8px'
                                  }}
                                >
                                  {PERIODS.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                              </>
                            ) : (
                              <>
                                <View style={styles.smallPickerContainer}>
                                  <Picker
                                    selectedValue={hours[day]?.openHour}
                                    onValueChange={(value) => updateDayTime(day, 'openHour', value)}
                                    style={styles.smallPicker}
                                  >
                                    {HOURS.map((h) => (
                                      <Picker.Item key={h} label={h} value={h} />
                                    ))}
                                  </Picker>
                                </View>
                                <Text style={styles.timeSeparator}>:</Text>
                                <View style={styles.smallPickerContainer}>
                                  <Picker
                                    selectedValue={hours[day]?.openMinute}
                                    onValueChange={(value) => updateDayTime(day, 'openMinute', value)}
                                    style={styles.smallPicker}
                                  >
                                    {MINUTES.map((m) => (
                                      <Picker.Item key={m} label={m} value={m} />
                                    ))}
                                  </Picker>
                                </View>
                                <View style={styles.periodPickerContainer}>
                                  <Picker
                                    selectedValue={hours[day]?.openPeriod}
                                    onValueChange={(value) => updateDayTime(day, 'openPeriod', value)}
                                    style={styles.smallPicker}
                                  >
                                    {PERIODS.map((p) => (
                                      <Picker.Item key={p} label={p} value={p} />
                                    ))}
                                  </Picker>
                                </View>
                              </>
                            )}
                          </View>

                          <Text style={styles.timeLabel}>Close:</Text>
                          <View style={styles.timePickerRow}>
                            {Platform.OS === 'web' ? (
                              <>
                                <select
                                  value={hours[day]?.closeHour}
                                  onChange={(e) => updateDayTime(day, 'closeHour', e.target.value)}
                                  style={{
                                    padding: '8px',
                                    fontSize: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    backgroundColor: '#fff',
                                    width: '70px'
                                  }}
                                >
                                  {HOURS.map((h) => (
                                    <option key={h} value={h}>{h}</option>
                                  ))}
                                </select>
                                <Text style={styles.timeSeparator}>:</Text>
                                <select
                                  value={hours[day]?.closeMinute}
                                  onChange={(e) => updateDayTime(day, 'closeMinute', e.target.value)}
                                  style={{
                                    padding: '8px',
                                    fontSize: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    backgroundColor: '#fff',
                                    width: '70px'
                                  }}
                                >
                                  {MINUTES.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                  ))}
                                </select>
                                <select
                                  value={hours[day]?.closePeriod}
                                  onChange={(e) => updateDayTime(day, 'closePeriod', e.target.value)}
                                  style={{
                                    padding: '8px',
                                    fontSize: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    backgroundColor: '#fff',
                                    width: '70px',
                                    marginLeft: '8px'
                                  }}
                                >
                                  {PERIODS.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                              </>
                            ) : (
                              <>
                                <View style={styles.smallPickerContainer}>
                                  <Picker
                                    selectedValue={hours[day]?.closeHour}
                                    onValueChange={(value) => updateDayTime(day, 'closeHour', value)}
                                    style={styles.smallPicker}
                                  >
                                    {HOURS.map((h) => (
                                      <Picker.Item key={h} label={h} value={h} />
                                    ))}
                                  </Picker>
                                </View>
                                <Text style={styles.timeSeparator}>:</Text>
                                <View style={styles.smallPickerContainer}>
                                  <Picker
                                    selectedValue={hours[day]?.closeMinute}
                                    onValueChange={(value) => updateDayTime(day, 'closeMinute', value)}
                                    style={styles.smallPicker}
                                  >
                                    {MINUTES.map((m) => (
                                      <Picker.Item key={m} label={m} value={m} />
                                    ))}
                                  </Picker>
                                </View>
                                <View style={styles.periodPickerContainer}>
                                  <Picker
                                    selectedValue={hours[day]?.closePeriod}
                                    onValueChange={(value) => updateDayTime(day, 'closePeriod', value)}
                                    style={styles.smallPicker}
                                  >
                                    {PERIODS.map((p) => (
                                      <Picker.Item key={p} label={p} value={p} />
                                    ))}
                                  </Picker>
                                </View>
                              </>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Venue Categories Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('venues')}
          >
            <Text style={styles.sectionTitle}>Venue Categories ({selectedVenues.length} selected)</Text>
            <Ionicons 
              name={expandedSections.has('venues') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('venues') && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionDescription}>
                Help customers find you by selecting relevant venue categories that describe your business.
              </Text>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search venues..."
                  value={venueSearch}
                  onChangeText={setVenueSearch}
                  autoCapitalize="none"
                />
                {venueSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setVenueSearch('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Grouped Venue Categories */}
              {GROUPED_VENUE_CATEGORIES.map((group) => {
                // Filter group items based on search
                const filteredGroupItems = venueSearch.trim()
                  ? group.items.filter(item => item.toLowerCase().includes(venueSearch.toLowerCase()))
                  : group.items;
                
                if (filteredGroupItems.length === 0 && venueSearch.trim()) return null;
                
                const isGroupExpanded = expandedVenueGroups.has(group.name);
                const selectedInGroup = filteredGroupItems.filter(item => selectedVenues.includes(item)).length;
                const allGroupSelected = filteredGroupItems.length > 0 && filteredGroupItems.every(item => selectedVenues.includes(item));
                
                return (
                  <View key={group.name} style={styles.entertainmentGroupContainer}>
                    <TouchableOpacity 
                      style={styles.entertainmentGroupHeader}
                      onPress={() => toggleVenueGroup(group.name)}
                    >
                      <View style={styles.groupHeaderLeft}>
                        <Ionicons 
                          name={isGroupExpanded ? 'chevron-down' : 'chevron-forward'} 
                          size={20} 
                          color="#666" 
                        />
                        <Text style={styles.entertainmentGroupTitle}>{group.name}</Text>
                        {selectedInGroup > 0 && (
                          <View style={styles.selectionBadge}>
                            <Text style={styles.selectionBadgeText}>{selectedInGroup}</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          selectEntireVenueGroup(filteredGroupItems);
                        }}
                        style={styles.selectAllButton}
                      >
                        <Ionicons 
                          name={allGroupSelected ? 'checkbox' : 'square-outline'} 
                          size={22} 
                          color={allGroupSelected ? '#1565FF' : '#999'} 
                        />
                        <Text style={[styles.selectAllText, allGroupSelected && styles.selectAllTextActive]}>
                          {allGroupSelected ? 'Deselect All' : 'Select All'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    
                    {isGroupExpanded && (
                      <View style={styles.groupItemsContainer}>
                        {filteredGroupItems.map((item) => (
                          <TouchableOpacity
                            key={item}
                            style={[styles.chip, selectedVenues.includes(item) && styles.chipSelected]}
                            onPress={() => toggleVenue(item)}
                          >
                            <Text style={[styles.chipText, selectedVenues.includes(item) && styles.chipTextSelected]}>
                              {item}
                            </Text>
                            {selectedVenues.includes(item) && (
                              <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginLeft: 4 }} />
                            )}
                          </TouchableOpacity>
                        ))}
                        
                        {/* Custom Category Input for "Other" group */}
                        {group.name.includes('Other') && (
                          <View style={styles.customInputContainer}>
                            <Text style={styles.customInputLabel}>Add Custom Venue Category:</Text>
                            <View style={styles.customInputRow}>
                              <TextInput
                                style={styles.customInput}
                                placeholder="Enter custom category..."
                                value={customVenueCategory}
                                onChangeText={setCustomVenueCategory}
                                placeholderTextColor="#999"
                              />
                              <TouchableOpacity
                                style={[styles.addCustomButton, !customVenueCategory.trim() && styles.addCustomButtonDisabled]}
                                disabled={!customVenueCategory.trim()}
                                onPress={() => {
                                  if (customVenueCategory.trim()) {
                                    if (!selectedVenues.includes(customVenueCategory.trim())) {
                                      setSelectedVenues([...selectedVenues, customVenueCategory.trim()]);
                                    }
                                    setCustomVenueCategory('');
                                  }
                                }}
                              >
                                <Ionicons name="add-circle" size={20} color={customVenueCategory.trim() ? '#1565FF' : '#999'} />
                                <Text style={[styles.addCustomText, customVenueCategory.trim() && styles.addCustomTextActive]}>
                                  Add
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Entertainment Categories Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('entertainment')}
          >
            <Text style={styles.sectionTitle}>Entertainment ({selectedEntertainment.length} selected)</Text>
            <Ionicons 
              name={expandedSections.has('entertainment') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('entertainment') && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionDescription}>
                Select the types of entertainment you offer or feature at your venue. Choose "Open to All" if you're flexible with all entertainment types.
              </Text>
              
              {/* Open to All Entertainment Toggle */}
              <View style={styles.openToAllContainer}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.openToAllTitle}>Open to All Entertainment</Text>
                  <Text style={styles.openToAllDescription}>
                    We welcome all types of entertainment and talent
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const newValue = !openToAllEntertainment;
                    setOpenToAllEntertainment(newValue);
                    
                    // Add or remove "Open to All Entertainment" from selected categories
                    if (newValue) {
                      if (!selectedEntertainment.includes('Open to All Entertainment')) {
                        setSelectedEntertainment([...selectedEntertainment, 'Open to All Entertainment']);
                      }
                    } else {
                      setSelectedEntertainment(selectedEntertainment.filter(cat => cat !== 'Open to All Entertainment'));
                    }
                  }}
                  style={[styles.toggle, openToAllEntertainment && styles.toggleActive]}
                >
                  <View style={[styles.toggleThumb, openToAllEntertainment && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search entertainment..."
                  value={entertainmentSearch}
                  onChangeText={setEntertainmentSearch}
                  autoCapitalize="none"
                />
                {entertainmentSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setEntertainmentSearch('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Grouped Entertainment Categories */}
              {GROUPED_ENTERTAINMENT_CATEGORIES.map((group) => {
                // Filter group items based on search
                const filteredGroupItems = entertainmentSearch.trim()
                  ? group.items.filter(item => item.toLowerCase().includes(entertainmentSearch.toLowerCase()))
                  : group.items;
                
                if (filteredGroupItems.length === 0 && entertainmentSearch.trim()) return null;
                
                const isGroupExpanded = expandedEntertainmentGroups.has(group.name);
                const selectedInGroup = filteredGroupItems.filter(item => selectedEntertainment.includes(item)).length;
                const allGroupSelected = filteredGroupItems.length > 0 && filteredGroupItems.every(item => selectedEntertainment.includes(item));
                
                return (
                  <View key={group.name} style={styles.entertainmentGroupContainer}>
                    <TouchableOpacity 
                      style={styles.entertainmentGroupHeader}
                      onPress={() => toggleEntertainmentGroup(group.name)}
                    >
                      <View style={styles.groupHeaderLeft}>
                        <Ionicons 
                          name={isGroupExpanded ? 'chevron-down' : 'chevron-forward'} 
                          size={20} 
                          color="#666" 
                        />
                        <Text style={styles.entertainmentGroupTitle}>{group.name}</Text>
                        {selectedInGroup > 0 && (
                          <View style={styles.selectionBadge}>
                            <Text style={styles.selectionBadgeText}>{selectedInGroup}</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          selectEntireGroup(filteredGroupItems);
                        }}
                        style={styles.selectAllButton}
                      >
                        <Ionicons 
                          name={allGroupSelected ? 'checkbox' : 'square-outline'} 
                          size={22} 
                          color={allGroupSelected ? '#1565FF' : '#999'} 
                        />
                        <Text style={[styles.selectAllText, allGroupSelected && styles.selectAllTextActive]}>
                          {allGroupSelected ? 'Deselect All' : 'Select All'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    
                    {isGroupExpanded && (
                      <View style={styles.groupItemsContainer}>
                        {filteredGroupItems.map((item) => (
                          <TouchableOpacity
                            key={item}
                            style={[styles.chip, selectedEntertainment.includes(item) && styles.chipSelected]}
                            onPress={() => toggleEntertainment(item)}
                          >
                            <Text style={[styles.chipText, selectedEntertainment.includes(item) && styles.chipTextSelected]}>
                              {item}
                            </Text>
                            {selectedEntertainment.includes(item) && (
                              <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginLeft: 4 }} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Amenities Section */}
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection('amenities')}
          >
            <Text style={styles.sectionTitle}>Amenities ({selectedAmenities.length} selected)</Text>
            <Ionicons 
              name={expandedSections.has('amenities') ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>

          {expandedSections.has('amenities') && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionDescription}>
                Select amenities available at your venue to help customers know what to expect.
              </Text>
              
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search amenities..."
                  value={amenitySearch}
                  onChangeText={setAmenitySearch}
                  autoCapitalize="none"
                />
                {amenitySearch.length > 0 && (
                  <TouchableOpacity onPress={() => setAmenitySearch('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Grouped Amenities */}
              {COMPREHENSIVE_AMENITIES.map((amenityGroup) => {
                // Filter group items based on search
                const filteredGroupItems = amenitySearch.trim()
                  ? amenityGroup.amenities.filter(item => item.toLowerCase().includes(amenitySearch.toLowerCase()))
                  : amenityGroup.amenities;
                
                if (filteredGroupItems.length === 0 && amenitySearch.trim()) return null;
                
                const isGroupExpanded = expandedAmenityGroups.has(amenityGroup.category);
                const selectedInGroup = filteredGroupItems.filter(item => selectedAmenities.includes(item)).length;
                const allGroupSelected = filteredGroupItems.length > 0 && filteredGroupItems.every(item => selectedAmenities.includes(item));
                
                return (
                  <View key={amenityGroup.category} style={styles.entertainmentGroupContainer}>
                    <TouchableOpacity 
                      style={styles.entertainmentGroupHeader}
                      onPress={() => toggleAmenityGroup(amenityGroup.category)}
                    >
                      <View style={styles.groupHeaderLeft}>
                        <Ionicons 
                          name={isGroupExpanded ? 'chevron-down' : 'chevron-forward'} 
                          size={20} 
                          color="#666" 
                        />
                        <Text style={styles.entertainmentGroupTitle}>{amenityGroup.category}</Text>
                        {selectedInGroup > 0 && (
                          <View style={styles.selectionBadge}>
                            <Text style={styles.selectionBadgeText}>{selectedInGroup}</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          selectEntireAmenityGroup(filteredGroupItems);
                        }}
                        style={styles.selectAllButton}
                      >
                        <Ionicons 
                          name={allGroupSelected ? 'checkbox' : 'square-outline'} 
                          size={22} 
                          color={allGroupSelected ? '#1565FF' : '#999'} 
                        />
                        <Text style={[styles.selectAllText, allGroupSelected && styles.selectAllTextActive]}>
                          {allGroupSelected ? 'Deselect All' : 'Select All'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    
                    {isGroupExpanded && (
                      <View style={styles.groupItemsContainer}>
                        {filteredGroupItems.map((item) => (
                          <TouchableOpacity
                            key={item}
                            style={[styles.chip, selectedAmenities.includes(item) && styles.chipSelected]}
                            onPress={() => toggleAmenity(item)}
                          >
                            <Text style={[styles.chipText, selectedAmenities.includes(item) && styles.chipTextSelected]}>
                              {item}
                            </Text>
                            {selectedAmenities.includes(item) && (
                              <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginLeft: 4 }} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
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
                  placeholder="Facebook page URL"
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
                  placeholder="Yelp business URL"
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
        transparent
        animationType="fade"
        onRequestClose={() => setUpgradeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="star" size={40} color="#FFD700" />
              <Text style={styles.modalTitle}>Upgrade to Feature Videos</Text>
            </View>
            
            <Text style={styles.modalText}>
              Feature your promotional videos on the WGO4Y homepage and reach thousands of potential customers!
            </Text>
            
            <View style={styles.tierContainer}>
              <View style={styles.tierCard}>
                <Text style={styles.tierName}>🥈 Silver</Text>
                <Text style={styles.tierPrice}>$9.99/month</Text>
                <Text style={styles.tierFeature}>• 1 video/week</Text>
                <Text style={styles.tierFeature}>• Priority listing</Text>
              </View>
              
              <View style={[styles.tierCard, styles.tierCardGold]}>
                <Text style={styles.tierBadge}>BEST VALUE</Text>
                <Text style={styles.tierName}>🥇 Gold</Text>
                <Text style={styles.tierPrice}>$19.99/month</Text>
                <Text style={styles.tierFeature}>• 3 videos/week</Text>
                <Text style={styles.tierFeature}>• Top priority</Text>
                <Text style={styles.tierFeature}>• Analytics</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => {
                setUpgradeModalVisible(false);
                Alert.alert('Coming Soon', 'Membership upgrades will be available soon!');
              }}
            >
              <Text style={styles.modalButtonText}>Upgrade Now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setUpgradeModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Maybe Later</Text>
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
                ? 'Upgrade to Silver for 15 photos or Gold for unlimited'
                : membershipTier === 'silver' && limitType === 'photo'
                ? 'Upgrade to Gold for unlimited photos'
                : membershipTier === 'basic' && limitType === 'video'
                ? 'Upgrade to Silver for 5 videos or Gold for 8 videos'
                : 'Upgrade to Gold for 8 featured videos'
              }
            </Text>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => {
                setShowLimitModal(false);
                router.push({ 
                  pathname: '/onboarding/tier-selection', 
                  params: { 
                    upgrade: 'true', 
                    preselect: membershipTier === 'basic' ? 'silver' : 'gold' 
                  } 
                });
              }}
            >
              <Text style={styles.modalButtonText}>View Upgrade Options</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowLimitModal(false)}
            >
              <Text style={styles.modalCloseText}>Maybe Later</Text>
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
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
    fontStyle: 'italic',
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
  readOnlyInput: {
    backgroundColor: '#f5f5f5',
    color: '#666',
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
  logoContainer: {
    alignSelf: 'center',
    marginVertical: 16,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOverlay: {
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
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoItem: {
    position: 'relative',
  },
  businessPhoto: {
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
  row: {
    flexDirection: 'row',
  },
  dayContainer: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8f8f8',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dayStatus: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  dayDetails: {
    padding: 12,
    backgroundColor: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ddd',
    padding: 2,
  },
  switchActive: {
    backgroundColor: '#34C759',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  switchThumbActive: {
    marginLeft: 22,
  },
  openToAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#1565FF',
  },
  openToAllTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565FF',
    marginBottom: 4,
  },
  openToAllDescription: {
    fontSize: 13,
    color: '#666',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ddd',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#1565FF',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    marginLeft: 22,
  },
  entertainmentGroupContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  entertainmentGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#F9FAFB',
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  entertainmentGroupTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  selectionBadge: {
    backgroundColor: '#1565FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  selectionBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
  },
  selectAllText: {
    fontSize: 13,
    color: '#999',
  },
  selectAllTextActive: {
    color: '#1565FF',
    fontWeight: '600',
  },
  groupItemsContainer: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#fff',
  },
  customInputContainer: {
    width: '100%',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  customInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1565FF',
  },
  addCustomButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  addCustomText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  addCustomTextActive: {
    color: '#1565FF',
  },
  timePickerSection: {
    marginTop: 12,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  smallPickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  periodPickerContainer: {
    flex: 0.8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  smallPicker: {
    height: 50,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
  },
  timeSeparator: {
    fontSize: 16,
    color: '#666',
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
  // New venue categorization styles
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  categoryCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
    position: 'relative',
  },
  categoryCardActive: {
    borderColor: '#1565FF',
    backgroundColor: '#F0F7FF',
  },
  categoryEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  categoryNameActive: {
    color: '#1565FF',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1565FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  useCaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  useCaseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    gap: 6,
  },
  useCaseChipActive: {
    borderColor: '#1565FF',
    backgroundColor: '#F0F7FF',
  },
  useCaseEmoji: {
    fontSize: 18,
  },
  useCaseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  useCaseTextActive: {
    color: '#1565FF',
  },
  sublabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  picker: {
    height: 50,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginTop: 12,
    fontStyle: 'italic',
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
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  tierContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tierCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  tierCardGold: {
    borderColor: '#FFD700',
    backgroundColor: '#FFFEF0',
  },
  tierBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 8,
  },
  tierName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  tierPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565FF',
    marginBottom: 12,
  },
  tierFeature: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  modalButton: {
    backgroundColor: '#1565FF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#666',
    fontSize: 14,
  },
});

