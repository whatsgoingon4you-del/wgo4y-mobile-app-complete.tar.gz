import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface ProfileCompletionModalProps {
  visible: boolean;
  onComplete: () => void;
  userType?: string;
}

export default function ProfileCompletionModal({ visible, onComplete, userType = 'entrepreneur' }: ProfileCompletionModalProps) {
  const router = useRouter();

  const handleCompleteProfile = () => {
    // Route based on user type
    if (userType === 'business') {
      router.push('/profile/edit-business' as any);
    } else {
      router.push('/profile/edit-entrepreneur' as any);
    }
    onComplete();
  };

  const handleDismiss = () => {
    onComplete(); // Just dismiss, user can browse
  };

  // Customize content based on user type
  const getContent = () => {
    if (userType === 'business') {
      return {
        icon: 'business-outline' as const,
        title: 'Complete Your Business Profile',
        description: 'Add optional details to attract more customers and stand out.',
        features: [
          { icon: 'checkmark-circle' as const, text: 'Essential info already saved', locked: false },
          { icon: 'add-circle-outline' as const, text: 'Add amenities and features', locked: false },
          { icon: 'add-circle-outline' as const, text: 'Specify entertainment types', locked: false },
          { icon: 'add-circle-outline' as const, text: 'Connect social media', locked: false },
        ],
      };
    } else {
      return {
        icon: 'person-circle-outline' as const,
        title: 'Complete Your Profile',
        description: 'To unlock all features and start booking, please complete your profile.',
        features: [
          { icon: 'checkmark-circle' as const, text: 'Browse public events and venues', locked: false },
          { icon: 'lock-closed' as const, text: 'Create events and bookings', locked: true },
          { icon: 'lock-closed' as const, text: 'Send and receive messages', locked: true },
          { icon: 'lock-closed' as const, text: 'Manage your services', locked: true },
        ],
      };
    }
  };

  const content = getContent();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleDismiss}
            accessibilityLabel="Close modal"
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name={content.icon} size={64} color="#1565FF" />
          </View>

          {/* Title */}
          <Text style={styles.title}>{content.title}</Text>

          {/* Description */}
          <Text style={styles.description}>
            {content.description}
          </Text>

          {/* Features List */}
          <View style={styles.featuresList}>
            {content.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons 
                  name={feature.icon} 
                  size={20} 
                  color={feature.locked ? '#FF9800' : '#4CAF50'} 
                />
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleCompleteProfile}
            accessibilityLabel="Complete your profile"
            accessibilityHint="Navigate to profile editing screen"
          >
            <Text style={styles.ctaButtonText}>
              {userType === 'business' ? 'Enhance Profile' : 'Complete Your Profile'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
          </TouchableOpacity>

          {/* Subtle note */}
          <Text style={styles.note}>
            {userType === 'business' ? 'Optional but recommended' : 'This will only take a few minutes'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: width > 400 ? 380 : width - 40,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: 16,
    marginTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  featuresList: {
    width: '100%',
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565FF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    marginBottom: 12,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
