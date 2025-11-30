import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  feature: 'messaging' | 'contacts' | 'general';
  userType: 'general' | 'business' | 'entrepreneur';
}

export default function UpgradeModal({ visible, onClose, feature, userType }: UpgradeModalProps) {
  const router = useRouter();

  const getFeatureTitle = () => {
    switch (feature) {
      case 'messaging':
        return 'Unlock Messaging';
      case 'contacts':
        return 'Save Contacts';
      default:
        return 'Upgrade Your Account';
    }
  };

  const getFeatureDescription = () => {
    switch (feature) {
      case 'messaging':
        return 'Connect with businesses and entertainers directly through unlimited messaging.';
      case 'contacts':
        return 'Save your favorite venues and contacts for quick access.';
      default:
        return 'Unlock premium features to get the most out of WGO4Y.';
    }
  };

  const getTierName = () => {
    if (userType === 'general') return 'Appreciation';
    if (userType === 'business') return 'Silver';
    return 'Silver'; // entrepreneur
  };

  const getTierBenefits = () => {
    if (userType === 'general') {
      return [
        'Unlimited messaging with businesses & entertainers',
        'Save favorite venues and contacts',
        'Priority visibility in search results',
        'Access exclusive events and offers',
      ];
    }
    // Business and Entrepreneur benefits
    return [
      'Feature up to 3 portfolio videos weekly',
      'Unlimited business photos',
      'Priority placement in search results',
      'Advanced analytics and insights',
    ];
  };

  const handleUpgrade = () => {
    onClose();
    // Navigate to tier selection/checkout with pre-selected tier
    router.push({
      pathname: '/onboarding/tier-selection',
      params: { 
        upgrade: 'true',
        from: feature,
        preselect: getTierName().toLowerCase()
      }
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Ionicons 
                name={feature === 'messaging' ? 'chatbubbles' : 'star'} 
                size={48} 
                color="#1565FF" 
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>{getFeatureTitle()}</Text>
            <Text style={styles.description}>{getFeatureDescription()}</Text>

            {/* Tier Badge */}
            <View style={styles.tierBadge}>
              <Ionicons name="shield-checkmark" size={20} color="#1565FF" />
              <Text style={styles.tierBadgeText}>
                {getTierName()} Membership
              </Text>
            </View>

            {/* Benefits List */}
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>What You'll Get:</Text>
              {getTierBenefits().map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            {/* Upgrade Button */}
            <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
              <Text style={styles.upgradeButtonText}>
                Upgrade to {getTierName()}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>

            {/* Maybe Later Button */}
            <TouchableOpacity style={styles.laterButton} onPress={onClose}>
              <Text style={styles.laterButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 16,
    maxHeight: '90%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  iconContainer: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F7FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 24,
    gap: 6,
  },
  tierBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565FF',
  },
  benefitsContainer: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    backgroundColor: '#1565FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  laterButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  laterButtonText: {
    color: '#666',
    fontSize: 15,
  },
});
