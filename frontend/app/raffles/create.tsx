import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

export default function CreateRaffleScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prize, setPrize] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [maxTickets, setMaxTickets] = useState('');
  const [terms, setTerms] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [status, setStatus] = useState('draft');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'web') {
        alert('Camera roll permissions are required');
      } else {
        Alert.alert('Permission Denied', 'Camera roll permissions are required');
      }
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

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter raffle title');
      } else {
        Alert.alert('Required', 'Please enter raffle title');
      }
      return;
    }

    if (!description.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter raffle description');
      } else {
        Alert.alert('Required', 'Please enter raffle description');
      }
      return;
    }

    if (!prize.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter prize description');
      } else {
        Alert.alert('Required', 'Please enter prize description');
      }
      return;
    }

    if (!ticketPrice || parseFloat(ticketPrice) <= 0) {
      if (Platform.OS === 'web') {
        alert('Please enter a valid ticket price');
      } else {
        Alert.alert('Required', 'Please enter a valid ticket price');
      }
      return;
    }

    if (!image) {
      if (Platform.OS === 'web') {
        alert('Please add a raffle image');
      } else {
        Alert.alert('Required', 'Please add a raffle image');
      }
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');

      await axios.post(
        `${API_URL}/api/raffles`,
        {
          title: title.trim(),
          description: description.trim(),
          prize: prize.trim(),
          ticket_price: parseFloat(ticketPrice),
          currency: 'USD',
          status: status,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          max_tickets: maxTickets ? parseInt(maxTickets) : null,
          terms: terms.trim() || null,
          image: image,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Show success message
      if (Platform.OS === 'web') {
        alert('Success! Raffle created successfully.');
      } else {
        Alert.alert('Success', 'Raffle created successfully!');
      }
      
      // Navigate to my-raffles
      router.replace('/my-raffles');
    } catch (error: any) {
      console.error('Error creating raffle:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to create raffle';
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/my-raffles')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Raffle</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Raffle Image */}
          <TouchableOpacity style={styles.imagePickerContainer} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.raffleImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={48} color="#999" />
                <Text style={styles.imagePlaceholderText}>Add Raffle Image</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Raffle Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Raffle Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Win a VIP Night Out"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the raffle and what's included..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Prize *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., $500 Gift Card, Free Bottle Service"
                value={prize}
                onChangeText={setPrize}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Terms & Exclusions (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g., Must be 21+, Prize redeemable within 60 days, No cash value"
                value={terms}
                onChangeText={setTerms}
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entry Pricing</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ticket Price *</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="5.00"
                  value={ticketPrice}
                  onChangeText={setTicketPrice}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Max Tickets (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Leave blank for unlimited"
                value={maxTickets}
                onChangeText={setMaxTickets}
                keyboardType="number-pad"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Dates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Raffle Period</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Start Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={startDate.toISOString().split('T')[0]}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  min={new Date().toISOString().split('T')[0]}
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
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#1565FF" />
                  <Text style={styles.dateText}>
                    {startDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>End Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={endDate.toISOString().split('T')[0]}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                  min={startDate.toISOString().split('T')[0]}
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
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#1565FF" />
                  <Text style={styles.dateText}>
                    {endDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Publish Status</Text>
            <Text style={styles.sectionSubtitle}>
              Draft: Not visible to users | Active: Live and accepting entries
            </Text>
            
            <View style={styles.statusButtons}>
              <TouchableOpacity
                style={[styles.statusButton, status === 'draft' && styles.statusButtonActive]}
                onPress={() => setStatus('draft')}
              >
                <Text style={[styles.statusButtonText, status === 'draft' && styles.statusButtonTextActive]}>
                  Save as Draft
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusButton, status === 'active' && styles.statusButtonActive]}
                onPress={() => setStatus('active')}
              >
                <Text style={[styles.statusButtonText, status === 'active' && styles.statusButtonTextActive]}>
                  Publish Active
                </Text>
              </TouchableOpacity>
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
              <Text style={styles.submitButtonText}>Create Raffle</Text>
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
  imagePickerContainer: {
    marginBottom: 12,
  },
  raffleImage: {
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  statusButtonActive: {
    borderColor: '#1565FF',
    backgroundColor: '#F0F7FF',
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  statusButtonTextActive: {
    color: '#1565FF',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
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
