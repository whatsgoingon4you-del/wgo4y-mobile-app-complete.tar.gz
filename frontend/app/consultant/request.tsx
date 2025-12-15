import React, { useState, useEffect } from 'react';
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
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

// Topics by user type
const BUSINESS_TOPICS = [
  'Promoting my events',
  'Improving my coupons',
  'Attracting more customers',
  'Social media strategy',
  'Analytics & insights',
  'Pricing & packages',
  'Event planning',
  'Marketing campaigns',
  'Other'
];

const ENTREPRENEUR_TOPICS = [
  'Getting more bookings through WGO4Y',
  'Improving my entrepreneur profile',
  'Showcasing my services and portfolio',
  'Collaborating with venues and other entrepreneurs',
  'Promoting my events or appearances',
  'Setting up and using coupons or special offers',
  'Building my personal brand and social media',
  'Understanding my analytics and performance',
  'Other questions about growing my business on WGO4Y'
];

const GP_TOPICS = [
  'Learning how to navigate the app',
  'Finding events that match my vibe',
  'Using filters to see only what I like',
  'Saving and managing my favorite events/places',
  'Understanding coupons and raffles',
  'Setting up my VIP group / friends group',
  'Managing messages and notifications',
  'Planning a night out or weekend',
  'Other questions about using WGO4Y'
];

export default function ConsultingRequestForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [preferredSchedule, setPreferredSchedule] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadUserType();
  }, []);

  const loadUserType = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUserType(response.data.user_type);
    } catch (error) {
      console.error('Error loading user type:', error);
    }
  };

  const getTopics = () => {
    if (userType === 'business') return BUSINESS_TOPICS;
    if (userType === 'entrepreneur') return ENTREPRENEUR_TOPICS;
    return GP_TOPICS;
  };

  const getIntroText = () => {
    if (userType === 'business') {
      return 'Get expert advice and guidance for your events, planning, and entertainment needs. Our team will help you maximize your success on WGO4Y.';
    }
    if (userType === 'entrepreneur') {
      return 'Grow your brand and bookings with WGO4Y.\n\nOur team will help you use your profile, events, and promotions to get more clients, collaborations, and repeat business.';
    }
    return 'Need help using WGO4Y?\n\nOur team will help you learn the app, find the right entertainment, and get the most out of your WGO4Y membership.';
  };

  const getNotesPlaceholder = () => {
    if (userType === 'business') {
      return 'Tell us more about what you&apos;d like to achieve...';
    }
    if (userType === 'entrepreneur') {
      return 'Tell us about your business, the services you offer, and what you&apos;d like to improve.';
    }
    return 'Tell us what you like to do, the cities you visit, and anything else that will help us guide you.';
  };

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (selectedTopics.length === 0) {
      Alert.alert('Required', 'Please select at least one topic');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');

      await axios.post(
        `${API_URL}/api/consulting/request`,
        {
          topics: selectedTopics,
          preferred_schedule: preferredSchedule.trim() || null,
          notes: notes.trim() || null
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert(
        'Request Submitted',
        'Your consulting request has been submitted. Our team will reach out to schedule a session soon!',
        [
          { 
            text: 'OK', 
            onPress: () => router.back()
          }
        ]
      );
    } catch (error: any) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit consulting request');
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
          <Text style={styles.headerTitle}>Request Consulting</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={24} color="#1565FF" />
            <Text style={styles.infoBannerText}>
              {getIntroText()}
            </Text>
          </View>

          {/* Topics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What do you need help with? *</Text>
            <Text style={styles.sectionSubtitle}>Select all that apply</Text>
            
            <View style={styles.topicsGrid}>
              {getTopics().map(topic => (
                <TouchableOpacity
                  key={topic}
                  style={[
                    styles.topicChip,
                    selectedTopics.includes(topic) && styles.topicChipActive
                  ]}
                  onPress={() => toggleTopic(topic)}
                >
                  <Text style={[
                    styles.topicText,
                    selectedTopics.includes(topic) && styles.topicTextActive
                  ]}>
                    {topic}
                  </Text>
                  {selectedTopics.includes(topic) && (
                    <Ionicons name="checkmark-circle" size={18} color="#1565FF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Schedule */}
          <View style={styles.section}>
            <Text style={styles.label}>Preferred contact times (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Weekdays 2-5pm, or Saturdays"
              value={preferredSchedule}
              onChangeText={setPreferredSchedule}
              placeholderTextColor="#999"
            />
            <Text style={styles.helperText}>
              When are you usually available for a quick call, text, or email?
            </Text>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Goals & Additional Info (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={getNotesPlaceholder()}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={5}
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
              <Text style={styles.submitButtonText}>Submit Request</Text>
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
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
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    gap: 6,
  },
  topicChipActive: {
    borderColor: '#1565FF',
    backgroundColor: '#F0F7FF',
  },
  topicText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  topicTextActive: {
    color: '#1565FF',
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
