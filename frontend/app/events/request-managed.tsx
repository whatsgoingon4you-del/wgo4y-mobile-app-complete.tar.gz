import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function RequestManagedEventScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState('Party/Nightlife');
  const [eventDate, setEventDate] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SC');
  const [zipCode, setZipCode] = useState('');
  const [budget, setBudget] = useState('');
  const [requirements, setRequirements] = useState('');
  const [estimatedAttendees, setEstimatedAttendees] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const eventTypes = [
    'Party/Nightlife',
    'Wedding',
    'Corporate Event',
    'Festival',
    'Concert',
    'Private Event',
    'Other',
  ];

  const states = ['SC', 'NC', 'GA', 'FL', 'TN', 'AL', 'VA'];

  const validateForm = () => {
    if (!eventName.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter an event name');
      } else {
        Alert.alert('Required', 'Please enter an event name');
      }
      return false;
    }

    if (!eventDate.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter an event date');
      } else {
        Alert.alert('Required', 'Please enter an event date (YYYY-MM-DD)');
      }
      return false;
    }

    if (!address.trim() || !city.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter a complete address');
      } else {
        Alert.alert('Required', 'Please enter a complete address');
      }
      return false;
    }

    if (!budget.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter your budget');
      } else {
        Alert.alert('Required', 'Please enter your budget');
      }
      return false;
    }

    if (!requirements.trim()) {
      if (Platform.OS === 'web') {
        alert('Please describe your requirements');
      } else {
        Alert.alert('Required', 'Please describe your requirements');
      }
      return false;
    }

    if (!estimatedAttendees || parseInt(estimatedAttendees) <= 0) {
      if (Platform.OS === 'web') {
        alert('Please enter estimated number of attendees');
      } else {
        Alert.alert('Required', 'Please enter estimated number of attendees');
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Show confirmation
    const confirmMsg = `Submit managed event request for "${eventName}"? WGO4Y will review and assemble a team for your event.`;
    
    if (Platform.OS === 'web') {
      if (!confirm(confirmMsg)) return;
    } else {
      Alert.alert(
        'Confirm Request',
        confirmMsg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: () => performSubmit() }
        ]
      );
      return;
    }

    await performSubmit();
  };

  const performSubmit = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Parse date (simple YYYY-MM-DD format)
      const parsedDate = new Date(eventDate + 'T12:00:00');
      
      const requestData = {
        event_name: eventName,
        event_type: eventType,
        event_date: parsedDate.toISOString(),
        location: {
          address,
          city,
          state,
          zip_code: zipCode || null,
        },
        budget,
        requirements,
        estimated_attendees: parseInt(estimatedAttendees),
        special_notes: specialNotes || null,
        is_public: isPublic,
      };

      console.log('📤 Submitting managed event request:', requestData);
      const response = await axios.post(
        `${API_URL}/api/managed-events/request`,
        requestData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('✅ Request submitted:', response.data);

      if (Platform.OS === 'web') {
        alert('Success! Your managed event request has been submitted. WGO4Y will review and contact you shortly.');
      } else {
        Alert.alert(
          'Success!',
          'Your managed event request has been submitted. WGO4Y will review and contact you shortly.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }
      
      router.back();
    } catch (error: any) {
      console.error('❌ Error submitting request:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to submit request. Please try again.';
      
      if (Platform.OS === 'web') {
        alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Managed Event</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#FF6B35" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Let WGO4Y Handle Your Event</Text>
            <Text style={styles.infoText}>
              We'll assemble a team of our top in-house professionals (DJs, security, promoters, etc.) 
              to deliver a seamless event experience.
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Event Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Event Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., New Year's Eve Party"
              value={eventName}
              onChangeText={setEventName}
              placeholderTextColor="#999"
            />
          </View>

          {/* Event Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Event Type *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={eventType}
                onValueChange={(value) => setEventType(value)}
                style={styles.picker}
              >
                {eventTypes.map((type) => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Event Date */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Event Date * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2025-12-31"
              value={eventDate}
              onChangeText={setEventDate}
              placeholderTextColor="#999"
            />
          </View>

          {/* Location Header */}
          <Text style={styles.sectionTitle}>Location</Text>

          {/* Address */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="123 Main Street"
              value={address}
              onChangeText={setAddress}
              placeholderTextColor="#999"
            />
          </View>

          {/* City */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              placeholder="Charleston"
              value={city}
              onChangeText={setCity}
              placeholderTextColor="#999"
            />
          </View>

          {/* State & Zip */}
          <View style={styles.row}>
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>State *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={state}
                  onValueChange={(value) => setState(value)}
                  style={styles.picker}
                >
                  {states.map((s) => (
                    <Picker.Item key={s} label={s} value={s} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>Zip Code</Text>
              <TextInput
                style={styles.input}
                placeholder="29401"
                value={zipCode}
                onChangeText={setZipCode}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Details Header */}
          <Text style={styles.sectionTitle}>Event Details</Text>

          {/* Budget */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Budget *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., $5,000-$10,000 or Flexible"
              value={budget}
              onChangeText={setBudget}
              placeholderTextColor="#999"
            />
          </View>

          {/* Estimated Attendees */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Estimated Attendees *</Text>
            <TextInput
              style={styles.input}
              placeholder="200"
              value={estimatedAttendees}
              onChangeText={setEstimatedAttendees}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* Requirements */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Requirements *</Text>
            <Text style={styles.helpText}>
              What services do you need? (DJ, security, promoters, etc.)
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., Need 1 DJ, 2 security guards, 1 promoter"
              value={requirements}
              onChangeText={setRequirements}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
          </View>

          {/* Special Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Special Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any additional details, special requirements, or preferences"
              value={specialNotes}
              onChangeText={setSpecialNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
          </View>

          {/* Public Event Toggle */}
          <View style={styles.toggleContainer}>
            <View style={styles.toggleLabel}>
              <Text style={styles.label}>Create Public Event Page</Text>
              <Text style={styles.helpText}>
                Allow public to discover and RSVP to your event
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: '#DDD', true: '#FF6B35' }}
              thumbColor={isPublic ? '#FFF' : '#FFF'}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.submitButtonText}>Submit Request</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info Footer */}
          <View style={styles.footerInfo}>
            <Ionicons name="help-circle-outline" size={20} color="#666" />
            <Text style={styles.footerInfoText}>
              After submission, our team will review your request and contact you to 
              confirm details and finalize the arrangement.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 24,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  pickerContainer: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
  },
  toggleLabel: {
    flex: 1,
    marginRight: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  footerInfo: {
    flexDirection: 'row',
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    gap: 12,
  },
  footerInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});
