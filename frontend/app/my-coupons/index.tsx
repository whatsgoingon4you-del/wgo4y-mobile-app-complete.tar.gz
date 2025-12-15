import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

export default function MyCouponsScreen() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadMyCoupons();
    }, [])
  );

  const loadMyCoupons = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Get user info
      const profileRes = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userId = profileRes.data.id;
      
      // Get ALL coupons
      const couponsRes = await axios.get(`${API_URL}/api/coupons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter to only show coupons created by this user
      const myCoupons = couponsRes.data.filter((coupon: any) => {
        return coupon.owner_id === userId;
      });
      
      setCoupons(myCoupons);
      console.log(`✅ Loaded ${myCoupons.length} coupons created by you (filtered from ${couponsRes.data.length} total)`);
    } catch (error) {
      console.error('Error loading my coupons:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMyCoupons();
  };

  const getDiscountText = (coupon: any) => {
    switch (coupon.discount_type) {
      case 'amount_off':
        return `$${coupon.discount_value} off`;
      case 'percent_off':
        return `${coupon.discount_value}% off`;
      case 'bogo':
        return 'Buy One Get One';
      case 'free_item':
        return 'Free Item';
      default:
        return coupon.discount_type;
    }
  };

  const renderCoupon = ({ item }: { item: any }) => {
    const isExpired = new Date(item.valid_until) < new Date();
    const isActive = item.status === 'active' && !isExpired;
    
    return (
      <TouchableOpacity
        style={styles.couponCard}
        onPress={() => router.push(`/coupon/${item.id}`)}
      >
        <View style={styles.couponHeader}>
          <View style={[styles.statusDot, { backgroundColor: isActive ? '#4CAF50' : '#999' }]} />
          <Text style={styles.statusText}>{isActive ? 'ACTIVE' : isExpired ? 'EXPIRED' : 'INACTIVE'}</Text>
        </View>

        <Text style={styles.couponTitle}>{item.title}</Text>
        <Text style={styles.couponDiscount}>{getDiscountText(item)}</Text>
        
        <View style={styles.couponMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="code-outline" size={16} color="#666" />
            <Text style={styles.metaText}>{item.code}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.metaText}>Until {new Date(item.valid_until).toLocaleDateString()}</Text>
          </View>
        </View>

        {item.age_restriction && (
          <View style={styles.restrictionBadge}>
            <Ionicons name="alert-circle-outline" size={14} color="#FF9800" />
            <Text style={styles.restrictionText}>{item.age_restriction}</Text>
          </View>
        )}

        <View style={styles.redemptionStats}>
          <Text style={styles.redemptionText}>
            {item.total_redemptions || 0} redemptions
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="pricetag-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No coupons created yet</Text>
      <Text style={styles.emptySubtext}>
        Create your first coupon to offer deals to customers
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => router.push('/coupons/create')}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Create Coupon</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/dashboard')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Coupons</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/dashboard')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Coupons</Text>
        <TouchableOpacity onPress={() => router.push('/coupons/create')} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={coupons}
        renderItem={renderCoupon}
        keyExtractor={(item) => item.id}
        contentContainerStyle={coupons.length === 0 ? styles.emptyListContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={renderEmpty}
      />
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
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
  },
  couponCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  couponHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
  },
  couponTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  couponDiscount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 12,
  },
  couponMeta: {
    gap: 8,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  restrictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  restrictionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
  },
  redemptionStats: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  redemptionText: {
    fontSize: 13,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
