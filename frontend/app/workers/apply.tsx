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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

const WORKER_ROLES = [
  'Influencer',
  'Intern',
  'Lighting Technician',
  'Sound Engineer',
  'Security',
  'Event Staff',
  'Marketing & Promotion',
  'Photographer',
  'Videographer',
  'Other'
];

const US_STATES = [
  { id: 'SC', name: 'South Carolina' },
  { id: 'NC', name: 'North Carolina' },
  { id: 'GA', name: 'Georgia' },
  { id: 'TN', name: 'Tennessee' },
  { id: 'VA', name: 'Virginia' },
  { id: 'CT', name: 'Connecticut' }
];

export default function WorkerApplicationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [role, setRole] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [experience, setExperience] = useState('');
  const [bio, setBio] = useState('');
  const [whyJoin, setWhyJoin] = useState('');
  
  // Social links (for influencers mainly)
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');

  const handleSubmit = async () => {
    // Validation
    if (!role) {
      Alert.alert('Required', 'Please select a role');
      return;
    }

    if (!city.trim() || !state) {
      Alert.alert('Required', 'Please enter your city and state');
      return;
    }

    if (!experience.trim()) {
      Alert.alert('Required', 'Please describe your experience');
      return;
    }

    if (!whyJoin.trim()) {
      Alert.alert('Required', 'Please tell us why you want to work with WGO4Y');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');

      const socialLinks: any = {};
      if (instagram.trim()) socialLinks.instagram = instagram.trim();
      if (tiktok.trim()) socialLinks.tiktok = tiktok.trim();
      if (youtube.trim()) socialLinks.youtube = youtube.trim();

      await axios.post(
        `${API_URL}/api/workers/apply`,
        {
          role,
          city: city.trim(),
          state,
          experience: experience.trim(),
          bio: bio.trim() || null,
          social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
          why_join: whyJoin.trim()
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert(
        'Application Submitted!',
        'Thank you for applying to work with WGO4Y! Our team will review your application and get back to you soon.',
        [
          { 
            text: 'OK', 
            onPress: () => router.back()
          }
        ]
      );
    } catch (error: any) {
      console.error('Error submitting application:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to submit application';
      Alert.alert('Error', errorMsg);
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Work With WGO4Y</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="briefcase" size={24} color="#1565FF" />
            <Text style={styles.infoBannerText}>
              Join our team of influencers, interns, and event professionals. Help us create amazing experiences!
            </Text>
          </View>

          {/* Role */}
          <View style={styles.section}>
            <Text style={styles.label}>What role are you interested in? *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={role}
                onValueChange={(value) => setRole(value)}
                style={styles.picker}
              >
                <Picker.Item label="Select a role..." value="" />
                {WORKER_ROLES.map(r => (
                  <Picker.Item key={r} label={r} value={r} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>State *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={state}
                  onValueChange={(value) => setState(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select State..." value="" />
                  {US_STATES.map(s => (
                    <Picker.Item key={s.id} label={s.name} value={s.id} />
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
          </View>

          {/* Experience */}
          <View style={styles.section}>
            <Text style={styles.label}>Experience & Background *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about your relevant experience..."
              value={experience}
              onChangeText={setExperience}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
          </View>

          {/* Bio */}
          <View style={styles.section}>
            <Text style={styles.label}>Short Bio (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="A brief introduction about yourself..."
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
          </View>

          {/* Social Links */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social Media (Optional)</Text>
            <Text style={styles.sectionSubtitle}>Especially important for influencer roles</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Instagram</Text>
              <TextInput
                style={styles.input}
                placeholder="@username or URL"
                value={instagram}
                onChangeText={setInstagram}
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>TikTok</Text>
              <TextInput
                style={styles.input}
                placeholder="@username or URL"
                value={tiktok}
                onChangeText={setTiktok}
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>YouTube</Text>
              <TextInput
                style={styles.input}
                placeholder="Channel URL"
                value={youtube}
                onChangeText={setYoutube}
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Why Join */}
          <View style={styles.section}>
            <Text style={styles.label}>Why do you want to work with WGO4Y? *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us what excites you about joining our team..."
              value={whyJoin}
              onChangeText={setWhyJoin}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
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
              <Text style={styles.submitButtonText}>Submitting...</Text>
            ) : (
              <Text style={styles.submitButtonText}>Submit Application</Text>
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
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#1565FF',
    lineHeight: 20,
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
  textArea: {
    height: 100,
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
