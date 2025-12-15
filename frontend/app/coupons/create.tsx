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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

const DISCOUNT_TYPES = [
  { id: 'amount_off', label: 'Dollar Amount Off', example: 'e.g., $5 off' },
  { id: 'percent_off', label: 'Percentage Off', example: 'e.g., 20% off' },
  { id: 'bogo', label: 'Buy One Get One', example: 'BOGO' },
  { id: 'free_item', label: 'Free Item', example: 'Free appetizer' },
  { id: 'other', label: 'Other/Custom', example: 'Custom offer' }
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function CreateCouponScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Basic fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  
  // Discount
  const [discountType, setDiscountType] = useState('amount_off');
  const [discountValue, setDiscountValue] = useState('');
  
  // Dates
  const [validFrom, setValidFrom] = useState(new Date());
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days from now
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showUntilPicker, setShowUntilPicker] = useState(false);
  
  // Restrictions
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [usageLimitPerUser, setUsageLimitPerUser] = useState('1');
  const [usageLimitTotal, setUsageLimitTotal] = useState('');
  const [hasUnlimitedTotal, setHasUnlimitedTotal] = useState(true);
  const [ageRestriction, setAgeRestriction] = useState('');
  const [exclusions, setExclusions] = useState('');

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter coupon title');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Required', 'Please enter coupon description');
      return;
    }

    if (!discountValue || parseFloat(discountValue) <= 0) {
      Alert.alert('Required', 'Please enter a valid discount value');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');

      await axios.post(
        `${API_URL}/api/coupons`,
        {
          title: title.trim(),
          description: description.trim(),
          code: code.trim() || null, // Auto-generate if empty
          discount_type: discountType,
          discount_value: parseFloat(discountValue),
          valid_from: validFrom.toISOString(),
          valid_until: validUntil.toISOString(),
          days_of_week: selectedDays.length > 0 ? selectedDays : null,
          usage_limit_per_user: parseInt(usageLimitPerUser) || 1,
          usage_limit_total: hasUnlimitedTotal ? null : (parseInt(usageLimitTotal) || null),
          age_restriction: ageRestriction.trim() || null,
          exclusions: exclusions.trim() || null,
          status: 'active'
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Show success message
      if (Platform.OS === 'web') {
        alert('Success! Coupon created successfully.');
      } else {
        Alert.alert('Success', 'Coupon created successfully!');
      }
      
      // Navigate back after successful creation
      router.back();
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create coupon');
    } finally {
      setLoading(false);
    }
  };

  const onFromDateChange = (event: any, selectedDate?: Date) => {
    setShowFromPicker(false);
    if (selectedDate) {
      setValidFrom(selectedDate);
    }
  };

  const onUntilDateChange = (event: any, selectedDate?: Date) => {
    setShowUntilPicker(false);
    if (selectedDate) {
      setValidUntil(selectedDate);
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
          <Text style={styles.headerTitle}>Create Coupon</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Coupon Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Buy One Entrée, Get One Free"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description / Fine Print *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Explain the offer and any restrictions..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Coupon Code (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Leave blank for auto-generated code"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Discount */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Discount Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Discount Type *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={discountType}
                  onValueChange={(value) => setDiscountType(value)}
                  style={styles.picker}
                >
                  {DISCOUNT_TYPES.map(type => (
                    <Picker.Item key={type.id} label={type.label} value={type.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {discountType === 'amount_off' ? 'Dollar Amount *' : 
                 discountType === 'percent_off' ? 'Percentage *' : 
                 'Value *'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={
                  discountType === 'amount_off' ? '5.00' :
                  discountType === 'percent_off' ? '20' :
                  '1'
                }
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="decimal-pad"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Valid Dates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Valid Period</Text>
            
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Valid From</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowFromPicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#1565FF" />
                  <Text style={styles.dateText}>
                    {validFrom.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.label}>Valid Until</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowUntilPicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#1565FF" />
                  <Text style={styles.dateText}>
                    {validUntil.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showFromPicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={validFrom}
                mode="date"
                display="default"
                onChange={onFromDateChange}
                minimumDate={new Date()}
              />
            )}

            {showUntilPicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={validUntil}
                mode="date"
                display="default"
                onChange={onUntilDateChange}
                minimumDate={validFrom}
              />
            )}
            
            {/* Web fallback for date pickers */}
            {Platform.OS === 'web' && showFromPicker && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Valid From Date</Text>
                <input
                  type="date"
                  value={validFrom.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    setValidFrom(newDate);
                    setShowFromPicker(false);
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
            
            {Platform.OS === 'web' && showUntilPicker && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Valid Until Date</Text>
                <input
                  type="date"
                  value={validUntil.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    setValidUntil(newDate);
                    setShowUntilPicker(false);
                  }}
                  min={validFrom.toISOString().split('T')[0]}
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

          {/* Day Restrictions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Day of Week Restrictions (Optional)</Text>
            <Text style={styles.sectionSubtitle}>
              Leave unselected for all days, or choose specific days
            </Text>
            
            <View style={styles.daysGrid}>
              {DAYS_OF_WEEK.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    selectedDays.includes(day) && styles.dayChipActive
                  ]}
                  onPress={() => toggleDay(day)}
                >
                  <Text style={[
                    styles.dayText,
                    selectedDays.includes(day) && styles.dayTextActive
                  ]}>
                    {day.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Usage Limits */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Usage Limits & Restrictions</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Age Restriction (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Must be 21+ or 18+"
                value={ageRestriction}
                onChangeText={setAgeRestriction}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Exclusions / Terms (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g., Not valid with other offers, One per customer, etc."
                value={exclusions}
                onChangeText={setExclusions}
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Uses Per Person *</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                value={usageLimitPerUser}
                onChangeText={setUsageLimitPerUser}
                keyboardType="number-pad"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.label}>Unlimited Total Uses</Text>
              <Switch
                value={hasUnlimitedTotal}
                onValueChange={setHasUnlimitedTotal}
                trackColor={{ false: '#ccc', true: '#1565FF' }}
                thumbColor="#fff"
              />
            </View>

            {!hasUnlimitedTotal && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Total Usage Limit</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 100"
                  value={usageLimitTotal}
                  onChangeText={setUsageLimitTotal}
                  keyboardType="number-pad"
                  placeholderTextColor="#999"
                />
              </View>
            )}
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
              <Text style={styles.submitButtonText}>Creating...</Text>
            ) : (
              <Text style={styles.submitButtonText}>Create Coupon</Text>
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  dateRow: {
    flexDirection: 'row',
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
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    width: '13%',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  dayChipActive: {
    borderColor: '#1565FF',
    backgroundColor: '#F0F7FF',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  dayTextActive: {
    color: '#1565FF',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 16,
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
