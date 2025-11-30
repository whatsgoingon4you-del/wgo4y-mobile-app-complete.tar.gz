import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function CouponDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [coupon, setCoupon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    loadCoupon();
  }, [id]);

  const loadCoupon = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${API_URL}/api/coupons/${id}`, { headers });
      setCoupon(response.data);
    } catch (error: any) {
      console.error('Error loading coupon:', error);
      Alert.alert('Error', 'Could not load coupon details');
    } finally {
      setLoading(false);
    }
  };

  const handleUseCoupon = () => {
    if (!coupon) return;
    
    const limitReached = coupon.user_redemption_count >= coupon.usage_limit_per_user;
    
    if (limitReached) {
      Alert.alert(
        'Limit Reached',
        `You&apos;ve already used this coupon ${coupon.user_redemption_count}/${coupon.usage_limit_per_user} times.`
      );
      return;
    }
    
    Alert.alert(
      'Use Coupon',
      'Show this screen to the venue/service provider to redeem your discount.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Used',
          onPress: async () => {
            setRedeeming(true);
            try {
              const token = await AsyncStorage.getItem('auth_token');
              
              const response = await axios.post(
                `${API_URL}/api/coupons/${id}/redeem`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              
              const newCount = response.data.user_redemption_count || 1;
              const limit = response.data.usage_limit_per_user || 1;
              
              Alert.alert(
                'Coupon Used!',
                `You&apos;ve used this coupon ${newCount}/${limit} time${newCount > 1 ? 's' : ''}. Enjoy your discount!`
              );
              
              // Reload coupon to update counts
              loadCoupon();
            } catch (error: any) {
              const errorMsg = error.response?.data?.detail || 'Failed to redeem coupon';
              Alert.alert('Error', errorMsg);
            } finally {
              setRedeeming(false);
            }
          }
        }
      ]
    );
  };

  const getDiscountDisplay = () => {
    if (!coupon) return '';
    
    switch (coupon.discount_type) {
      case 'amount_off':
        return `$${coupon.discount_value} OFF`;
      case 'percent_off':
        return `${coupon.discount_value}% OFF`;
      case 'bogo':
        return 'BUY 1 GET 1 FREE';
      case 'free_item':
        return 'FREE ITEM';
      default:
        return 'SPECIAL OFFER';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
          <Text style={styles.loadingText}>Loading coupon...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!coupon) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Coupon not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isValidDay = () => {
    if (!coupon || !coupon.days_of_week || coupon.days_of_week.length === 0) {
      return true; // No day restriction = valid any day
    }
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return coupon.days_of_week.includes(today);
  };

  const limitReached = coupon.user_redemption_count >= coupon.usage_limit_per_user;
  const isExpired = new Date(coupon.valid_until) < new Date();
  const validDay = isValidDay();
  const canUse = !limitReached && !isExpired && validDay && coupon.status === 'active';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Discount Display */}
        <View style={styles.discountSection}>
          <Text style={styles.discountAmount}>{getDiscountDisplay()}</Text>
          <Text style={styles.couponTitle}>{coupon.title}</Text>
        </View>

        {/* Coupon Code */}
        <View style={styles.codeSection}>
          <Text style={styles.codeLabel}>Coupon Code</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{coupon.code || 'Show at venue'}</Text>
          </View>
          <Text style={styles.codeHint}>Show this code to the venue/service provider</Text>
        </View>

        {/* Details */}
        <View style={styles.content}>
          {/* Owner */}
          <View style={styles.infoRow}>
            <Ionicons name="business" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Offered by</Text>
              <Text style={styles.infoValue}>{coupon.owner_name}</Text>
            </View>
          </View>

          {/* Location */}
          {(coupon.owner_city || coupon.owner_state) && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>
                  {coupon.owner_city && coupon.owner_state
                    ? `${coupon.owner_city}, ${coupon.owner_state}`
                    : coupon.owner_city || coupon.owner_state}
                </Text>
              </View>
            </View>
          )}

          {/* Valid Dates */}
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Valid Period</Text>
              <Text style={styles.infoValue}>
                {new Date(coupon.valid_from).toLocaleDateString()} - {new Date(coupon.valid_until).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Days of Week */}
          {coupon.days_of_week && coupon.days_of_week.length > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Valid Days</Text>
                <Text style={styles.infoValue}>{coupon.days_of_week.join(', ')}</Text>
              </View>
            </View>
          )}

          {/* Usage Stats */}
          <View style={styles.statsSection}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {coupon.user_redemption_count}/{coupon.usage_limit_per_user}
              </Text>
              <Text style={styles.statLabel}>Your Uses</Text>
            </View>
            
            {coupon.usage_limit_total && (
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {coupon.total_redemptions}/{coupon.usage_limit_total}
                </Text>
                <Text style={styles.statLabel}>Total Uses</Text>
              </View>
            )}
          </View>

          {/* Description / Fine Print */}
          <Text style={styles.descriptionTitle}>Details & Fine Print</Text>
          <Text style={styles.description}>{coupon.description}</Text>
        </View>
      </ScrollView>

      {/* Use Coupon Button */}
      {canUse ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.useButton, redeeming && styles.useButtonDisabled]}
            onPress={handleUseCoupon}
            disabled={redeeming}
          >
            <Ionicons name="pricetag" size={20} color="#fff" />
            <Text style={styles.useButtonText}>
              {redeeming ? 'Processing...' : 'Use Coupon'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : !validDay && coupon.days_of_week && coupon.days_of_week.length > 0 ? (
        <View style={styles.footer}>
          <View style={styles.statusButton}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.statusButtonText}>
              Only valid on {coupon.days_of_week.join(', ')}
            </Text>
          </View>
        </View>
      ) : limitReached ? (
        <View style={styles.footer}>
          <View style={styles.statusButton}>
            <Text style={styles.statusButtonText}>You&apos;ve reached the usage limit</Text>
          </View>
        </View>
      ) : isExpired ? (
        <View style={styles.footer}>
          <View style={styles.statusButton}>
            <Text style={styles.statusButtonText}>This coupon has expired</Text>
          </View>
        </View>
      ) : (
        <View style={styles.footer}>
          <View style={styles.statusButton}>
            <Text style={styles.statusButtonText}>This coupon is not active</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#1565FF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  discountSection: {
    backgroundColor: '#4CAF50',
    padding: 32,
    alignItems: 'center',
  },
  discountAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  couponTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  codeSection: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  codeBox: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1565FF',
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1565FF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
  },
  codeHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  statsSection: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1565FF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 20,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  useButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  useButtonDisabled: {
    backgroundColor: '#ccc',
  },
  useButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statusButton: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});
