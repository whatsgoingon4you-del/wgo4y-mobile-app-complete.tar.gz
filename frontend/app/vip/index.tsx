import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function VIPPage() {
  const router = useRouter();

  const vipFeatures = [
    'Priority event booking',
    'Exclusive VIP events access',
    'Special discounts on all services',
    'Early ticket releases',
    'Dedicated customer support',
    'Free venue consultations',
    'Monthly exclusive content',
    'VIP-only networking events',
  ];

  const handleJoinVIP = () => {
    Alert.alert(
      'Join VIP',
      'VIP Membership: $99/month\n\nStripe payment integration will be implemented here.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Join Now', onPress: () => Alert.alert('Success', 'Welcome to VIP!') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VIP Access</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <View style={styles.vipBadge}>
            <Ionicons name="star" size={48} color="#FFD700" />
          </View>
          <Text style={styles.heroTitle}>Become a VIP Member</Text>
          <Text style={styles.heroSubtitle}>
            Get exclusive access to premium events, services, and experiences
          </Text>
        </View>

        <View style={styles.pricingCard}>
          <Text style={styles.pricingAmount}>$99</Text>
          <Text style={styles.pricingPeriod}>/month</Text>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>VIP Benefits</Text>
          {vipFeatures.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark-circle" size={24} color="#1565FF" />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.guaranteeSection}>
          <Ionicons name="shield-checkmark" size={32} color="#4CAF50" />
          <Text style={styles.guaranteeText}>
            Cancel anytime • No hidden fees • Instant activation
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.joinButton} onPress={handleJoinVIP}>
          <Text style={styles.joinButtonText}>Join VIP Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  vipBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  pricingCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    backgroundColor: '#F0F7FF',
    padding: 24,
    borderRadius: 16,
    marginBottom: 32,
  },
  pricingAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1565FF',
  },
  pricingPeriod: {
    fontSize: 20,
    color: '#666',
    marginLeft: 4,
  },
  featuresSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  guaranteeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  guaranteeText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  joinButton: {
    backgroundColor: '#1565FF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});