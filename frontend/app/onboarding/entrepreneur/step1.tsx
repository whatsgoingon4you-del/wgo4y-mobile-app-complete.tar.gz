import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHORT_OCCUPATIONS } from './shortOccupations';
import { useAuth } from '../../../contexts/AuthContext';

export default function EntrepreneurStep1() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedOccupation, setSelectedOccupation] = useState('');
  const [customOccupation, setCustomOccupation] = useState('');

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const saved = await AsyncStorage.getItem('entrepreneur_step1');
      if (saved) {
        const data = JSON.parse(saved);
        setSelectedOccupation(data.occupation || '');
        setCustomOccupation(data.customOccupation || '');
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const saveProgress = async () => {
    try {
      await AsyncStorage.setItem('entrepreneur_step1', JSON.stringify({
        occupation: selectedOccupation,
        customOccupation: selectedOccupation === 'Other' ? customOccupation : '',
      }));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleContinue = async () => {
    // Validation
    if (!selectedOccupation) {
      Alert.alert('Required Field', 'Please select your occupation');
      return;
    }

    if (selectedOccupation === 'Other' && !customOccupation.trim()) {
      Alert.alert('Required Field', 'Please enter your custom occupation');
      return;
    }

    await saveProgress();
    router.push('/onboarding/entrepreneur/step2');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
          </View>
        </View>

        {/* Welcome Message */}
        <Text style={styles.title}>Welcome, {user?.full_name?.split(' ')[0] || 'there'}!</Text>
        <Text style={styles.subtitle}>
          Let's get your profile started. What do you do professionally?
        </Text>

        {/* Occupation Selection */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Select Your Occupation *</Text>
          <Text style={styles.helperText}>Choose your primary role or profession</Text>
          <View style={styles.occupationGrid}>
            {SHORT_OCCUPATIONS.map((occupation) => (
              <TouchableOpacity
                key={occupation}
                style={[
                  styles.occupationChip,
                  selectedOccupation === occupation && styles.occupationChipSelected
                ]}
                onPress={() => setSelectedOccupation(occupation)}
                accessibilityLabel={`Select ${occupation}`}
                accessibilityRole="button"
              >
                <Text style={[
                  styles.occupationText,
                  selectedOccupation === occupation && styles.occupationTextSelected
                ]}>
                  {occupation}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Occupation Input (if "Other" selected) */}
        {selectedOccupation === 'Other' && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Specify Your Occupation *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your occupation"
              placeholderTextColor="#999"
              value={customOccupation}
              onChangeText={setCustomOccupation}
              autoCapitalize="words"
              accessibilityLabel="Custom occupation input"
            />
          </View>
        )}

        {/* Helper Text */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#1565FF" />
          <Text style={styles.infoText}>
            You can add more occupations and customize your profile later
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          accessibilityLabel="Continue to next step"
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  progressDotActive: {
    backgroundColor: '#1565FF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#F9F9F9',
  },
  occupationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  occupationChip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#F0F7FF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  occupationChipSelected: {
    backgroundColor: '#1565FF',
    borderColor: '#1565FF',
  },
  occupationText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1565FF',
  },
  occupationTextSelected: {
    color: '#fff',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1565FF',
    lineHeight: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565FF',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
