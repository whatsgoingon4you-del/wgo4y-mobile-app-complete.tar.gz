import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { ALL_SERVICES } from '../onboarding/entrepreneur/servicesData';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
];

export default function PostJobScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [role, setRole] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [showEventDatePicker, setShowEventDatePicker] = useState(false);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pay, setPay] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a job title');
      return;
    }

    if (!role.trim()) {
      Alert.alert('Required', 'Please enter the role');
      return;
    }

    if (!city.trim()) {
      Alert.alert('Required', 'Please enter the city');
      return;
    }

    if (!state) {
      Alert.alert('Required', 'Please select a state');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Required', 'Please enter a job description');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');

      await axios.post(
        `${API_URL}/api/jobs`,
        {
          title: title.trim(),
          role: role.trim(),
          event_date: eventDate ? eventDate.toLocaleDateString() : null,
          city: city.trim(),
          state,
          pay: pay.trim() || null,
          description: description.trim(),
          status: status,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Show success message
      if (Platform.OS === 'web') {
        alert('Success! Job posted successfully.');
      } else {
        Alert.alert('Success', 'Job posted successfully!');
      }
      
      // Navigate back to jobs list
      router.replace('/jobs');
    } catch (error: any) {
      console.error('Error posting job:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post a Job</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Job Title */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Job Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., DJ for Wedding Reception"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role/Position *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowRolePicker(!showRolePicker)}
              >
                <Text style={{ color: role ? '#000' : '#999' }}>
                  {role || 'Select a role (e.g., DJ, Photographer, Bartender)'}
                </Text>
              </TouchableOpacity>
              
              {showRolePicker && (
                <View style={styles.rolePickerContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search roles..."
                    value={roleSearch}
                    onChangeText={setRoleSearch}
                    placeholderTextColor="#999"
                  />
                  <ScrollView style={styles.roleList} nestedScrollEnabled>
                    {ALL_SERVICES
                      .filter(r => r.toLowerCase().includes(roleSearch.toLowerCase()))
                      .slice(0, 50)
                      .map((r) => (
                        <TouchableOpacity
                          key={r}
                          style={styles.roleItem}
                          onPress={() => {
                            setRole(r);
                            setShowRolePicker(false);
                            setRoleSearch('');
                          }}
                        >
                          <Text style={styles.roleItemText}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Event Date (Optional)</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={eventDate ? eventDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setEventDate(e.target.value ? new Date(e.target.value) : null)}
                  style={{
                    padding: '12px',
                    fontSize: '16px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    width: '100%',
                    backgroundColor: '#fff',
                    cursor: 'pointer'
                  }}
                />
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Jan 15, 2025 or Jan 15-17"
                  value={eventDate ? eventDate.toLocaleDateString() : ''}
                  onFocus={() => setShowEventDatePicker(true)}
                  placeholderTextColor="#999"
                />
              )}
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            
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
              <Text style={styles.label}>State *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={state}
                  onValueChange={(value) => setState(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select State" value="" />
                  {US_STATES.map(s => (
                    <Picker.Item key={s.code} label={s.name} value={s.code} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Compensation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compensation (Optional)</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pay/Budget</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., $500, $50/hr, Negotiable"
                value={pay}
                onChangeText={setPay}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Job Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the job, requirements, expectations, etc."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                placeholderTextColor="#999"
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Post Job</Text>
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
  textArea: {
    height: 120,
    textAlignVertical: 'top',
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
