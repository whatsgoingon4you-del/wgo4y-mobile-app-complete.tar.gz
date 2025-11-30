import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatPhoneNumber, isValidPhoneNumber, getPhoneDigits } from '../utils/phoneFormatter';

interface PhoneInputProps {
  value: string;
  onChangeText: (formatted: string) => void;
  placeholder?: string;
  label?: string;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  showValidation?: boolean;
  required?: boolean;
  editable?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChangeText,
  placeholder = '(555) 555-5555',
  label = 'Phone Number',
  style,
  inputStyle,
  showValidation = true,
  required = false,
  editable = true,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasBlurred, setHasBlurred] = useState(false);

  const handleChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    onChangeText(formatted);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setHasBlurred(true);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const digits = getPhoneDigits(value);
  const isValid = isValidPhoneNumber(value);
  const showError = hasBlurred && !isValid && digits.length > 0;
  const showSuccess = hasBlurred && isValid;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            inputStyle,
            isFocused && styles.inputFocused,
            showError && styles.inputError,
            showSuccess && styles.inputSuccess,
            !editable && styles.inputDisabled,
          ]}
          value={value}
          onChangeText={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          maxLength={14} // (XXX) XXX-XXXX
          editable={editable}
        />
        {showValidation && (
          <View style={styles.validationIcon}>
            {showSuccess && (
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            )}
            {showError && (
              <Ionicons name="alert-circle" size={20} color="#f44336" />
            )}
          </View>
        )}
      </View>
      {showValidation && showError && (
        <Text style={styles.errorText}>
          Please enter a valid 10-digit phone number
        </Text>
      )}
      {showValidation && digits.length > 0 && digits.length < 10 && !hasBlurred && (
        <Text style={styles.helperText}>
          {digits.length}/10 digits
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#f44336',
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    paddingRight: 40,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  inputFocused: {
    borderColor: '#1565FF',
    borderWidth: 2,
  },
  inputError: {
    borderColor: '#f44336',
  },
  inputSuccess: {
    borderColor: '#4CAF50',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  validationIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    height: 24,
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
