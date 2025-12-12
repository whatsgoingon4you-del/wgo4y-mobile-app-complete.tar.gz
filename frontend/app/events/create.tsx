import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function CreateEventScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<string>('');
  
  // Category data from backend
  const [eventCategories, setEventCategories] = useState<any[]>([]);
  const [usStates, setUsStates] = useState<any[]>([]);
  
  // Basic fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // New category fields
  const [selectedEventCategories, setSelectedEventCategories] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [county, setCounty] = useState('');
  const [city, setCity] = useState('');
  const [familyFriendly, setFamilyFriendly] = useState(false);
  const [priceType, setPriceType] = useState('free');
  const [price, setPrice] = useState('0');
  
  // RSVP/Capacity fields
  const [capacity, setCapacity] = useState('100');
  const [overbookingPercentage, setOverbookingPercentage] = useState('10');
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);
  const [vipEarlyAccessHours, setVipEarlyAccessHours] = useState('24');
  
  // Publishing
  const [status, setStatus] = useState('published');
  const [visibility, setVisibility] = useState('public');

  useEffect(() => {
    loadCategoryData();
    loadUserData();
  }, []);

  const loadCategoryData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/event-categories`);
      setEventCategories(response.data.categories || []);
      setUsStates(response.data.states || []);
    } catch (error) {
      console.error('Error loading category data:', error);
    }
  };

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;
      
      // Fetch full profile to get user_type and names
      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const profile = response.data;
      const accountType = profile.user_type;
      setUserType(accountType);
      
      if (accountType === 'business') {
        // Business/Venue account:
        // - Venue = their business name (auto-filled, user shouldn't need to change)
        // - Organizer = free text (promoter, MC, brand, etc.)
        if (profile.business_name) {
          setVenue(profile.business_name);
          console.log('✅ Auto-filled Venue with business name:', profile.business_name);
        }
        // Leave Organizer empty for user to enter (promoter, host, etc.)
        
      } else if (accountType === 'entrepreneur') {
        // Entrepreneur account:
        // - Organizer = their public name (service_name > username, NOT full_name)
        // - Venue = free text (where the event is happening)
        const publicName = profile.service_name || profile.username;
        if (publicName) {
          setOrganizer(publicName);
          console.log('✅ Auto-filled Organizer with public profile name:', publicName);
        }
        // Leave Venue empty for user to enter (venue name)
        
      } else {
        // General public or other: Leave both fields empty
        console.log('ℹ️ General public or unknown user type - no auto-fill');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permissions are required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const toggleEventCategory = (categoryId: string) => {
    if (selectedEventCategories.includes(categoryId)) {
      setSelectedEventCategories(selectedEventCategories.filter(c => c !== categoryId));
    } else {
      // Limit to 2 selections
      if (selectedEventCategories.length < 2) {
        setSelectedEventCategories([...selectedEventCategories, categoryId]);
      } else {
        Alert.alert('Maximum Categories', 'You can select up to 2 event categories');
      }
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!title || !description || !venue || !organizer) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    if (selectedEventCategories.length === 0) {
      Alert.alert('Category Required', 'Please select at least one event category (up to 2)');
      return;
    }

    if (!selectedState) {
      Alert.alert('State Required', 'Please select a state');
      return;
    }

    if (!city.trim()) {
      Alert.alert('City Required', 'Please enter a city');
      return;
    }

    if (!image) {
      Alert.alert('Image Required', 'Please add an event flyer/image');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');

      await axios.post(
        `${API_URL}/api/events`,
        {
          title,
          description,
          image,
          date: date.toISOString(),
          venue,
          organizer,
          
          // New category fields
          event_categories: selectedEventCategories,
          state: selectedState,
          county: county.trim() || null,
          city: city.trim(),
          family_friendly: familyFriendly,
          price_type: priceType,
          
          // Price
          price: parseFloat(price) || 0,
          
          // RSVP/Capacity
          capacity: parseInt(capacity),
          overbooking_percentage: parseInt(overbookingPercentage),
          waitlist_enabled: waitlistEnabled,
          vip_early_access_hours: parseInt(vipEarlyAccessHours),
          
          // Publishing
          status,
          visibility,
          featured: false,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Show success message
      if (Platform.OS === 'web') {
        alert('Success! Event created successfully.');
      } else {
        Alert.alert('Success', 'Event created successfully!');
      }
      
      // Navigate to my-events page after successful creation
      router.push('/my-events');
    } catch (error: any) {
      console.error('Error creating event:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDate(newDate);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Event</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Event Image */}
          <TouchableOpacity style={styles.imagePickerContainer} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.eventImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={48} color="#999" />
                <Text style={styles.imagePlaceholderText}>Add Event Flyer</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Basic Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Event Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Summer Night Party"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell people what to expect..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {userType === 'business' ? 'Venue * (Your Venue)' : 'Venue/Location Name *'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={userType === 'business' ? 'Auto-filled with your business' : 'e.g., Blue Moon Lounge'}
                value={venue}
                onChangeText={setVenue}
                placeholderTextColor="#999"
                editable={userType !== 'business'} // Lock field for businesses
              />
              {userType === 'business' && venue && (
                <Text style={styles.helperText}>✓ Using your venue profile</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {userType === 'business' ? 'Event Host/Promoter *' : userType === 'entrepreneur' ? 'Organizer * (You)' : 'Organizer *'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={
                  userType === 'business' 
                    ? 'e.g., DJ Mike, Red Bull Promo Team' 
                    : userType === 'entrepreneur'
                    ? 'Auto-filled with your name'
                    : 'Your name or business name'
                }
                value={organizer}
                onChangeText={setOrganizer}
                placeholderTextColor="#999"
                editable={userType !== 'entrepreneur'} // Lock field for entrepreneurs
              />
              {userType === 'entrepreneur' && organizer && (
                <Text style={styles.helperText}>✓ Using your profile name</Text>
              )}
            </View>
          </View>

          {/* Category Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Vibe (1-2 selections) *</Text>
            <Text style={styles.sectionSubtitle}>Choose the vibe(s) that best match your event</Text>
            
            <View style={styles.categoryGrid}>
              {eventCategories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    selectedEventCategories.includes(cat.id) && styles.categoryCardActive
                  ]}
                  onPress={() => toggleEventCategory(cat.id)}
                >
                  <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                  <Text style={[
                    styles.categoryName,
                    selectedEventCategories.includes(cat.id) && styles.categoryNameActive
                  ]}>
                    {cat.name}
                  </Text>
                  {selectedEventCategories.includes(cat.id) && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>State *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedState}
                  onValueChange={(value) => setSelectedState(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select State..." value="" />
                  {usStates.map(state => (
                    <Picker.Item key={state.id} label={state.name} value={state.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Charleston"
                value={city}
                onChangeText={setCity}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>County (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Charleston County"
                value={county}
                onChangeText={setCounty}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Date & Time Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date & Time</Text>
            
            <View style={styles.dateTimeRow}>
              <TouchableOpacity 
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#1565FF" />
                <Text style={styles.dateTimeText}>
                  {date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color="#1565FF" />
                <Text style={styles.dateTimeText}>
                  {date.toLocaleTimeString('en-US', { 
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}

            {showTimePicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={date}
                mode="time"
                display="default"
                onChange={onTimeChange}
              />
            )}
            
            {/* Web fallback for date picker */}
            {Platform.OS === 'web' && showDatePicker && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Event Date</Text>
                <input
                  type="date"
                  value={date.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    newDate.setHours(date.getHours());
                    newDate.setMinutes(date.getMinutes());
                    setDate(newDate);
                    setShowDatePicker(false);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    padding: '12px',
                    fontSize: '16px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    width: '100%'
                  }}
                />
              </View>
            )}
            
            {/* Web fallback for time picker */}
            {Platform.OS === 'web' && showTimePicker && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Event Time</Text>
                <input
                  type="time"
                  value={`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':');
                    const newDate = new Date(date);
                    newDate.setHours(parseInt(hours));
                    newDate.setMinutes(parseInt(minutes));
                    setDate(newDate);
                    setShowTimePicker(false);
                  }}
                  style={{
                    padding: '12px',
                    fontSize: '16px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    width: '100%'
                  }}
                />
              </View>
            )}
          </View>

          {/* Price Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            
            <View style={styles.priceTypeRow}>
              <TouchableOpacity
                style={[
                  styles.priceTypeButton,
                  priceType === 'free' && styles.priceTypeButtonActive
                ]}
                onPress={() => {
                  setPriceType('free');
                  setPrice('0');
                }}
              >
                <Text style={[
                  styles.priceTypeText,
                  priceType === 'free' && styles.priceTypeTextActive
                ]}>
                  Free Event
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.priceTypeButton,
                  priceType === 'paid' && styles.priceTypeButtonActive
                ]}
                onPress={() => setPriceType('paid')}
              >
                <Text style={[
                  styles.priceTypeText,
                  priceType === 'paid' && styles.priceTypeTextActive
                ]}>
                  Paid Event
                </Text>
              </TouchableOpacity>
            </View>

            {priceType === 'paid' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ticket Price</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.dollarSign}>$</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0.00"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Event Attributes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Attributes</Text>
            
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="people" size={20} color="#666" />
                <Text style={styles.toggleLabel}>Family-Friendly Event</Text>
              </View>
              <Switch
                value={familyFriendly}
                onValueChange={setFamilyFriendly}
                trackColor={{ false: '#ccc', true: '#1565FF' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Ionicons name="list-outline" size={20} color="#666" />
                <Text style={styles.toggleLabel}>Enable Waitlist</Text>
              </View>
              <Switch
                value={waitlistEnabled}
                onValueChange={setWaitlistEnabled}
                trackColor={{ false: '#ccc', true: '#1565FF' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Capacity Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Capacity & RSVP Settings</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Event Capacity</Text>
              <TextInput
                style={styles.input}
                placeholder="100"
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="number-pad"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Overbooking % (e.g., 10 for 10%)</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                value={overbookingPercentage}
                onChangeText={setOverbookingPercentage}
                keyboardType="number-pad"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>VIP Early Access (hours)</Text>
              <TextInput
                style={styles.input}
                placeholder="24"
                value={vipEarlyAccessHours}
                onChangeText={setVipEarlyAccessHours}
                keyboardType="number-pad"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Publishing Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Publishing</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={status}
                  onValueChange={(value) => setStatus(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Published (visible to all)" value="published" />
                  <Picker.Item label="Draft (only you can see)" value="draft" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Visibility</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={visibility}
                  onValueChange={(value) => setVisibility(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Public (everyone)" value="public" />
                  <Picker.Item label="Private (invite only)" value="private" />
                </Picker>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Fixed Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.submitButtonText}>Creating...</Text>
            ) : (
              <Text style={styles.submitButtonText}>Create Event</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 6,
    fontWeight: '600',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imagePickerContainer: {
    marginBottom: 12,
  },
  eventImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
    fontSize: 32,
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  priceTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  priceTypeButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  priceTypeButtonActive: {
    borderColor: '#1565FF',
    backgroundColor: '#F0F7FF',
  },
  priceTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  priceTypeTextActive: {
    color: '#1565FF',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  priceInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: '#1565FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
