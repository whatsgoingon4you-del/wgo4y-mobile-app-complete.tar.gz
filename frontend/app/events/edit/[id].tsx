import React, { useState, useEffect, useMemo } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EVENT_CATEGORIES } from '../eventCategories';
import { API_URL } from '../../../utils/api';



export default function EditEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [venueId, setVenueId] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('100');
  const [status, setStatus] = useState('published');
  const [visibility, setVisibility] = useState('public');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [venues, setVenues] = useState<any[]>([]);

  // Filter event categories based on search
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return EVENT_CATEGORIES;
    return EVENT_CATEGORIES.filter(cat => 
      cat.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categorySearch]);

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  useEffect(() => {
    loadVenues();
    loadEventData();
  }, []);

  const loadVenues = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/venues`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVenues(response.data);
    } catch (error) {
      console.error('Error loading venues:', error);
    }
  };

  const loadEventData = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const event = response.data;
      setTitle(event.title || '');
      setDescription(event.description || '');
      setVenue(event.venue || '');
      setVenueId(event.venue_id || '');
      setOrganizer(event.organizer || '');
      
      // Handle both old single category format and new array format
      if (event.categories && Array.isArray(event.categories)) {
        setSelectedCategories(event.categories);
      } else if (event.category) {
        // Convert old single category to array
        setSelectedCategories([event.category]);
      }
      
      setPrice(event.price?.toString() || '0');
      setCapacity(event.capacity?.toString() || '100');
      setStatus(event.status || 'published');
      setVisibility(event.visibility || 'public');
      setDate(new Date(event.date));
      setImage(event.image || null);
    } catch (error: any) {
      console.error('Error loading event:', error);
      Alert.alert('Error', 'Failed to load event data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to upload images');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,  // Allow full flyer without cropping
      quality: 0.7,  // Higher quality for flyers with text
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleUpdate = async () => {
    if (!title || !description || !venue || !organizer || !price || !capacity) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    if (selectedCategories.length === 0) {
      Alert.alert('Category Required', 'Please select at least one event category');
      return;
    }

    if (!image) {
      Alert.alert('Image Required', 'Please add an event flyer/image');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');

      await axios.put(
        `${API_URL}/api/events/${eventId}`,
        {
          title,
          description,
          image,
          date: date.toISOString(),
          venue,
          venue_id: venueId || null,
          price: parseFloat(price),
          organizer,
          categories: selectedCategories,
          capacity: parseInt(capacity),
          status,
          visibility,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert('Success', 'Event updated successfully!', [
        { text: 'OK', onPress: () => router.push('/my-events') }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update event');
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>Edit Event</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Event Flyer/Image */}
          <Text style={styles.sectionTitle}>Event Flyer *</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.imagePreview} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={48} color="#999" />
                <Text style={styles.imageText}>Upload Event Flyer</Text>
                <Text style={styles.imageHint}>16:9 aspect ratio recommended</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Event Title */}
          <Text style={styles.label}>Event Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Summer Jazz Festival 2025"
            value={title}
            onChangeText={setTitle}
          />

          {/* Description */}
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your event..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          {/* Category */}
          <Text style={styles.label}>Event Categories * ({selectedCategories.length} selected)</Text>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search categories..."
              value={categorySearch}
              onChangeText={setCategorySearch}
              autoCapitalize="none"
            />
            {categorySearch.length > 0 && (
              <TouchableOpacity onPress={() => setCategorySearch('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Chips */}
          <View style={styles.chipsContainer}>
            {filteredCategories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  selectedCategories.includes(cat) && styles.chipSelected
                ]}
                onPress={() => toggleCategory(cat)}
              >
                <Text style={[
                  styles.chipText,
                  selectedCategories.includes(cat) && styles.chipTextSelected
                ]}>
                  {cat}
                </Text>
                {selectedCategories.includes(cat) && (
                  <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            ))}
            {filteredCategories.length === 0 && (
              <Text style={styles.noResults}>No categories found</Text>
            )}
          </View>

          {/* Venue */}
          <Text style={styles.label}>Venue *</Text>
          {venues.length > 0 ? (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={venueId}
                onValueChange={(value) => {
                  setVenueId(value);
                  const selectedVenue = venues.find(v => v.id === value);
                  if (selectedVenue) {
                    setVenue(selectedVenue.name);
                  }
                }}
                style={styles.picker}
              >
                <Picker.Item label="Select a venue..." value="" />
                <Picker.Item label="Custom venue (enter below)" value="custom" />
                {venues.map((v) => (
                  <Picker.Item key={v.id} label={v.name} value={v.id} />
                ))}
              </Picker>
            </View>
          ) : null}
          
          {(!venueId || venueId === 'custom') && (
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Enter venue name"
              value={venue}
              onChangeText={setVenue}
            />
          )}

          {/* Organizer */}
          <Text style={styles.label}>Organizer *</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name or business name"
            value={organizer}
            onChangeText={setOrganizer}
          />

          {/* Date & Time */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={styles.dateText}>
                  {date.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>Time *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.dateText}>
                  {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}

          {/* Price & Capacity */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Price ($) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>Capacity *</Text>
              <TextInput
                style={styles.input}
                placeholder="100"
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Status & Visibility */}
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Status *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={status}
                  onValueChange={setStatus}
                  style={styles.picker}
                >
                  <Picker.Item label="Published" value="published" />
                  <Picker.Item label="Draft" value="draft" />
                  <Picker.Item label="Cancelled" value="cancelled" />
                </Picker>
              </View>
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>Visibility *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={visibility}
                  onValueChange={setVisibility}
                  style={styles.picker}
                >
                  <Picker.Item label="Public" value="public" />
                  <Picker.Item label="Private" value="private" />
                </Picker>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleUpdate}
            disabled={saving}
          >
            <Text style={styles.submitButtonText}>
              {saving ? 'Updating...' : 'Update Event'}
            </Text>
            {!saving && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    marginTop: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  imagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  imageHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    marginBottom: 16,
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
});
