import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  LayoutAnimation,
  UIManager,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { POPULAR_VENUE_CATEGORIES } from './popularVenueCategories';
import { VENUE_CATEGORIES } from './venueCategories';
import { PhoneInput } from '../../../components/PhoneInput';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BUSINESS_TYPES = [
  'Restaurant', 'Bar/Nightclub', 'Event Venue', 'Lounge', 'Bowling Alley',
  'Hotel/Resort', 'Banquet Hall', 'Cleaning Service', 'Transportation Service',
  'Security Company', 'Catering Company', 'Equipment Rental', 'Event Promotion Agency',
  'Family Entertainment Center', 'Outdoor Event Space', 'Community Center',
  'Church/Religious Venue', 'Art Gallery/Museum', 'Food Truck/Vendor', 'Other'
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const HOURS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'];

interface DayHours {
  open: boolean;
  openHour: string;
  openMinute: string;
  openPeriod: string;
  closeHour: string;
  closeMinute: string;
  closePeriod: string;
}

export default function BusinessStep2() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Restaurant');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('CA');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState<Record<string, DayHours>>({
    Monday: { open: true, openHour: '9', openMinute: '00', openPeriod: 'AM', closeHour: '5', closeMinute: '00', closePeriod: 'PM' },
    Tuesday: { open: true, openHour: '9', openMinute: '00', openPeriod: 'AM', closeHour: '5', closeMinute: '00', closePeriod: 'PM' },
    Wednesday: { open: true, openHour: '9', openMinute: '00', openPeriod: 'AM', closeHour: '5', closeMinute: '00', closePeriod: 'PM' },
    Thursday: { open: true, openHour: '9', openMinute: '00', openPeriod: 'AM', closeHour: '5', closeMinute: '00', closePeriod: 'PM' },
    Friday: { open: true, openHour: '9', openMinute: '00', openPeriod: 'AM', closeHour: '5', closeMinute: '00', closePeriod: 'PM' },
    Saturday: { open: true, openHour: '10', openMinute: '00', openPeriod: 'AM', closeHour: '6', closeMinute: '00', closePeriod: 'PM' },
    Sunday: { open: false, openHour: '10', openMinute: '00', openPeriod: 'AM', closeHour: '6', closeMinute: '00', closePeriod: 'PM' },
  });
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [selectedVenueCategories, setSelectedVenueCategories] = useState<string[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  useEffect(() => {
    loadUserData();
    loadSavedProgress();
  }, []);

  // Save progress to AsyncStorage periodically
  useEffect(() => {
    const saveProgress = async () => {
      try {
        const progressData = {
          businessName,
          businessType,
          street,
          city,
          state,
          zipCode,
          phone,
          description,
          hours,
          selectedVenueCategories,
        };
        await AsyncStorage.setItem('onboarding_step2_progress', JSON.stringify(progressData));
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    };

    // Debounce save - only save if user stops typing for 1 second
    const timeoutId = setTimeout(saveProgress, 1000);
    return () => clearTimeout(timeoutId);
  }, [businessName, businessType, street, city, state, zipCode, phone, description, hours, selectedVenueCategories]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.full_name) {
          setBusinessName(user.full_name);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadSavedProgress = async () => {
    try {
      const savedProgress = await AsyncStorage.getItem('onboarding_step2_progress');
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        setBusinessName(progress.businessName || '');
        setBusinessType(progress.businessType || 'Restaurant');
        setStreet(progress.street || '');
        setCity(progress.city || '');
        setState(progress.state || 'CA');
        setZipCode(progress.zipCode || '');
        setPhone(progress.phone || '');
        setDescription(progress.description || '');
        if (progress.hours) {
          setHours(progress.hours);
        }
        if (progress.selectedVenueCategories) {
          setSelectedVenueCategories(progress.selectedVenueCategories);
        }
        console.log('Loaded saved onboarding progress');
      }
    } catch (error) {
      console.error('Error loading saved progress:', error);
    }
  };

  const formatPhone = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      let formatted = '';
      if (match[1]) formatted = '(' + match[1];
      if (match[2]) formatted += ') ' + match[2];
      if (match[3]) formatted += '-' + match[3];
      return formatted;
    }
    return text;
  };

  const toggleDay = (day: string) => {
    setHours({
      ...hours,
      [day]: { ...hours[day], open: !hours[day].open }
    });
  };

  const toggleDayExpanded = (day: string) => {
    // Configure smooth animation with error handling
    try {
      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
    } catch (error) {
      console.log('LayoutAnimation not supported or failed:', error);
    }
    setExpandedDays({
      ...expandedDays,
      [day]: !expandedDays[day]
    });
  };

  const updateDayTime = (day: string, field: keyof DayHours, value: string) => {
    setHours({
      ...hours,
      [day]: { ...hours[day], [field]: value }
    });
  };

  const toggleVenueCategory = (category: string) => {
    if (selectedVenueCategories.includes(category)) {
      setSelectedVenueCategories(selectedVenueCategories.filter(c => c !== category));
    } else {
      setSelectedVenueCategories([...selectedVenueCategories, category]);
    }
  };

  const handleAddCustomCategory = () => {
    if (customCategory.trim()) {
      // Check if it matches an existing category
      const matchedCategory = VENUE_CATEGORIES.find(
        cat => cat.toLowerCase() === customCategory.trim().toLowerCase()
      );
      
      if (matchedCategory) {
        toggleVenueCategory(matchedCategory);
      } else {
        // Add as "Other"
        toggleVenueCategory('Other');
      }
      setCustomCategory('');
      setShowAllCategories(false);
    }
  };

  const convertTo24Hour = (hour: string, minute: string, period: string): string => {
    let hour24 = parseInt(hour);
    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  const convertHoursForBackend = () => {
    const converted: Record<string, { open: string; close: string; isOpen: boolean }> = {};
    Object.entries(hours).forEach(([day, dayHours]) => {
      converted[day] = {
        open: convertTo24Hour(dayHours.openHour, dayHours.openMinute, dayHours.openPeriod),
        close: convertTo24Hour(dayHours.closeHour, dayHours.closeMinute, dayHours.closePeriod),
        isOpen: dayHours.open,
      };
    });
    return converted;
  };

  const handleContinue = async () => {
    if (!businessName.trim()) {
      Alert.alert('Required', 'Please enter business name');
      return;
    }
    if (!street.trim()) {
      Alert.alert('Required', 'Please enter street address');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Required', 'Please enter city');
      return;
    }
    if (!zipCode.trim() || zipCode.length !== 5) {
      Alert.alert('Invalid Input', 'Please enter valid 5-digit ZIP code');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length !== 10) {
      Alert.alert('Invalid Input', 'Please enter valid phone number');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please enter short description');
      return;
    }
    if (selectedVenueCategories.length === 0) {
      Alert.alert('Required', 'Please select at least one venue category');
      return;
    }

    const fullAddress = `${street}, ${city}, ${state} ${zipCode}`;
    const hoursString = JSON.stringify(convertHoursForBackend());

    router.push({
      pathname: '/onboarding/business/step3',
      params: {
        businessLogo: params.businessLogo,
        businessName: businessName.trim(),
        businessType,
        address: fullAddress,
        phone: phone.trim(),
        hours: hoursString,
        description: description.trim(),
        venueCategories: JSON.stringify(selectedVenueCategories),
      }
    });
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotComplete]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
          </View>
          <Text style={styles.stepText}>Step 2 of 3</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Business Information</Text>
          <Text style={styles.subtitle}>Tell us about your business</Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter business name"
                value={businessName}
                onChangeText={setBusinessName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Type *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={businessType}
                  onValueChange={setBusinessType}
                  style={styles.picker}
                >
                  {BUSINESS_TYPES.map((type) => (
                    <Picker.Item key={type} label={type} value={type} />
                  ))}
                </Picker>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Address *</Text>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="Street Address"
                value={street}
                onChangeText={setStreet}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  value={city}
                  onChangeText={setCity}
                  autoCapitalize="words"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={state}
                    onValueChange={setState}
                    style={styles.picker}
                  >
                    {US_STATES.map((st) => (
                      <Picker.Item key={st} label={st} value={st} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="ZIP Code"
                value={zipCode}
                onChangeText={setZipCode}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>

            <PhoneInput
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 555-5555"
              showValidation={true}
              required={true}
            />

            <Text style={styles.sectionTitle}>Operating Hours</Text>
            {DAYS.map((day) => (
              <View key={day} style={styles.dayRow}>
                <TouchableOpacity 
                  style={styles.dayHeader}
                  onPress={() => toggleDayExpanded(day)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dayHeaderLeft}>
                    <Ionicons 
                      name={expandedDays[day] ? 'chevron-down' : 'chevron-forward'} 
                      size={20} 
                      color="#666" 
                    />
                    <Text style={styles.dayName}>{day}</Text>
                    {hours[day].open && !expandedDays[day] && (
                      <Text style={styles.dayPreview}>
                        {`${hours[day].openHour}:${hours[day].openMinute} ${hours[day].openPeriod} - ${hours[day].closeHour}:${hours[day].closeMinute} ${hours[day].closePeriod}`}
                      </Text>
                    )}
                    {!hours[day].open && !expandedDays[day] && (
                      <Text style={styles.closedText}>Closed</Text>
                    )}
                  </View>
                  <Switch
                    value={hours[day].open}
                    onValueChange={() => toggleDay(day)}
                    trackColor={{ false: '#ddd', true: '#1565FF' }}
                    onTouchStart={(e) => e.stopPropagation()}
                  />
                </TouchableOpacity>
                
                {expandedDays[day] && hours[day].open && (
                  <View style={styles.timePickerContainer}>
                    <Text style={styles.timeLabel}>Open:</Text>
                    <View style={styles.timePickerRow}>
                      <View style={styles.smallPickerContainer}>
                        <Picker
                          selectedValue={hours[day].openHour}
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
                          selectedValue={hours[day].openMinute}
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
                          selectedValue={hours[day].openPeriod}
                          onValueChange={(value) => updateDayTime(day, 'openPeriod', value)}
                          style={styles.smallPicker}
                        >
                          {PERIODS.map((p) => (
                            <Picker.Item key={p} label={p} value={p} />
                          ))}
                        </Picker>
                      </View>
                    </View>

                    <Text style={styles.timeLabel}>Close:</Text>
                    <View style={styles.timePickerRow}>
                      <View style={styles.smallPickerContainer}>
                        <Picker
                          selectedValue={hours[day].closeHour}
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
                          selectedValue={hours[day].closeMinute}
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
                          selectedValue={hours[day].closePeriod}
                          onValueChange={(value) => updateDayTime(day, 'closePeriod', value)}
                          style={styles.smallPicker}
                        >
                          {PERIODS.map((p) => (
                            <Picker.Item key={p} label={p} value={p} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ))}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Short Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your business and what makes it unique..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={300}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{description.length}/300</Text>
            </View>

            {/* Venue Categories Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Venue Category *</Text>
              <Text style={styles.sectionSubtitle}>
                What type of venue is your business? ({selectedVenueCategories.length} selected)
              </Text>
              
              <View style={styles.chipsContainer}>
                {POPULAR_VENUE_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      selectedVenueCategories.includes(category) && styles.categoryChipSelected
                    ]}
                    onPress={() => toggleVenueCategory(category)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      selectedVenueCategories.includes(category) && styles.categoryChipTextSelected
                    ]}>
                      {category}
                    </Text>
                    {selectedVenueCategories.includes(category) && (
                      <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginLeft: 4 }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={styles.seeMoreButton} 
                onPress={() => setShowAllCategories(true)}
              >
                <Text style={styles.seeMoreText}>See More Categories</Text>
                <Ionicons name="chevron-forward" size={20} color="#1565FF" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.continueButton, 
              (!businessName.trim() || !street.trim() || !city.trim() || !zipCode.trim() || !phone.trim() || !description.trim() || selectedVenueCategories.length === 0) && styles.buttonDisabled
            ]} 
            onPress={handleContinue}
            disabled={!businessName.trim() || !street.trim() || !city.trim() || !zipCode.trim() || !phone.trim() || !description.trim() || selectedVenueCategories.length === 0}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Full Categories Modal */}
      <Modal
        visible={showAllCategories}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Venue Categories</Text>
            <TouchableOpacity onPress={() => setShowAllCategories(false)}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.chipsContainer}>
              {VENUE_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    selectedVenueCategories.includes(category) && styles.categoryChipSelected
                  ]}
                  onPress={() => toggleVenueCategory(category)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    selectedVenueCategories.includes(category) && styles.categoryChipTextSelected
                  ]}>
                    {category}
                  </Text>
                  {selectedVenueCategories.includes(category) && (
                    <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Other Option */}
            <View style={styles.otherSection}>
              <Text style={styles.otherLabel}>Don't see your category?</Text>
              <View style={styles.otherInputRow}>
                <TextInput
                  style={styles.otherInput}
                  placeholder="Enter custom category"
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  autoCapitalize="words"
                />
                <TouchableOpacity 
                  style={styles.otherAddButton}
                  onPress={handleAddCustomCategory}
                >
                  <Text style={styles.otherAddText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.modalDoneButton}
              onPress={() => setShowAllCategories(false)}
            >
              <Text style={styles.modalDoneText}>Done ({selectedVenueCategories.length} selected)</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  progressDotComplete: {
    backgroundColor: '#4CAF50',
    width: 24,
  },
  progressDotActive: {
    backgroundColor: '#1565FF',
    width: 24,
  },
  stepText: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    marginBottom: 24,
  },
  section: {
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    marginTop: 8,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  dayRow: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  dayPreview: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  closedText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  timePickerContainer: {
    marginTop: 12,
    gap: 8,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  smallPickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  periodPickerContainer: {
    flex: 0.8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  smallPicker: {
    height: 50,
  },
  timeSeparator: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    paddingHorizontal: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  categoryChipSelected: {
    backgroundColor: '#1565FF',
    borderColor: '#1565FF',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    gap: 8,
  },
  seeMoreText: {
    fontSize: 14,
    color: '#1565FF',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  otherSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  otherLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  otherInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  otherInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  otherAddButton: {
    backgroundColor: '#1565FF',
    paddingHorizontal: 24,
    justifyContent: 'center',
    borderRadius: 8,
  },
  otherAddText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalDoneButton: {
    backgroundColor: '#1565FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 24,
  },
  continueButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1565FF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});