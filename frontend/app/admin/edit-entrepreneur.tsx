import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

export default function AdminEditEntrepreneur() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entrepreneurs, setEntrepreneurs] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [bio, setBio] = useState('');
  const [occupations, setOccupations] = useState<string[]>([]);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [flyerUrls, setFlyerUrls] = useState<string[]>([]);
  
  // Media picker
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaType, setMediaType] = useState<'profile' | 'gallery' | 'flyer'>('profile');
  const [r2Media, setR2Media] = useState<any[]>([]);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaPage, setMediaPage] = useState(1);
  const [originalAdminToken, setOriginalAdminToken] = useState<string | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    loadEntrepreneurs();
  }, []);

  const loadEntrepreneurs = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // For now, get all users and filter entrepreneurs
      const response = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Mock: Load entrepreneurs (in production, you'd have an admin endpoint)
      // For now, manually list the 3 priority ones
      const priorityUsers = [
        { id: 'dboy-id', name: 'Dboy Stackalini - Rap/Producer/Song Writer Profile' },
        { id: 'lace-id', name: 'The Lace Nerd' },
        { id: 'petty-id', name: 'D.Petty' }
      ];
      
      setEntrepreneurs(priorityUsers);
    } catch (error) {
      console.error('Error loading entrepreneurs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/workers/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const profile = response.data;
      setSelectedUser(profile);
      setFullName(profile.user_name || '');
      setCity(profile.city || '');
      setState(profile.state || '');
      setBio(profile.bio || '');
      setOccupations(profile.occupations || [profile.role] || []);
      setProfilePhotoUrl(profile.profile_photo || '');
      setGalleryUrls(profile.portfolio_photos || profile.gallery_urls || []);
      setFlyerUrls(profile.flyer_urls || []);
      
      console.log('✅ Profile loaded:', profile.user_name);
    } catch (error) {
      console.error('Error loading profile:', error);
      alert('Error loading profile');
    }
  };

  const handleImpersonate = async (userId: string, userName: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      // Save current admin token
      setOriginalAdminToken(token);
      await AsyncStorage.setItem('admin_original_token', token || '');
      
      // Call impersonate endpoint
      const response = await axios.post(
        `${API_URL}/api/admin/impersonate/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Switch to impersonated user
      await AsyncStorage.setItem('auth_token', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      await AsyncStorage.setItem('is_impersonating', 'true');
      await AsyncStorage.setItem('impersonated_name', userName);
      
      setIsImpersonating(true);
      
      // Navigate to profile editor
      router.replace('/profile/edit-entrepreneur');
    } catch (error: any) {
      console.error('Error impersonating:', error);
      alert('Error: ' + (error.response?.data?.detail || 'Failed to impersonate'));
    }
  };
    try {
      console.log('📥 Loading R2 media...');
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/admin/r2-media`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: mediaSearch, page: mediaPage }
      });
      
      console.log('✅ R2 media loaded:', response.data.media?.length || 0);
      setR2Media(response.data.media || []);
    } catch (error: any) {
      console.error('❌ Error loading R2 media:', error);
      alert('Error loading R2 media: ' + (error.response?.data?.detail || error.message));
      setR2Media([]);
    }
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      await axios.put(
        `${API_URL}/admin/entrepreneurs/${selectedUser.id}`,
        {
          full_name: fullName,
          city,
          state,
          bio,
          occupations,
          profile_photo_url: profilePhotoUrl,
          gallery_urls: galleryUrls,
          flyer_urls: flyerUrls
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error saving:', error);
      alert('Error: ' + (error.response?.data?.detail || 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const openMediaPicker = (type: 'profile' | 'gallery' | 'flyer') => {
    setMediaType(type);
    setShowMediaPicker(true);
    loadR2Media();
  };

  const selectMedia = (mediaUrl: string) => {
    if (mediaType === 'profile') {
      setProfilePhotoUrl(mediaUrl);
    } else if (mediaType === 'gallery') {
      if (!galleryUrls.includes(mediaUrl)) {
        setGalleryUrls([...galleryUrls, mediaUrl]);
      }
    } else {
      if (!flyerUrls.includes(mediaUrl)) {
        setFlyerUrls([...flyerUrls, mediaUrl]);
      }
    }
    setShowMediaPicker(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#1565FF" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (!selectedUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Entrepreneur Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Select Entrepreneur to Edit</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          
          {/* Priority profiles */}
          <View style={styles.prioritySection}>
            <Text style={styles.priorityTitle}>⭐ Priority Profiles</Text>
            <TouchableOpacity style={styles.userCard} onPress={() => loadUserProfile('a7b57c11-e0ef-4ea7-bf43-a271879f6cc3')}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>Dboy Stackalini</Text>
              </View>
              <TouchableOpacity
                style={styles.impersonateButton}
                onPress={() => handleImpersonate('a7b57c11-e0ef-4ea7-bf43-a271879f6cc3', 'Dboy Stackalini')}
              >
                <Text style={styles.impersonateButtonText}>Login as User</Text>
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.userCard} onPress={() => loadUserProfile('82b44d84-a9cc-4f09-b7ed-28a6daea548a')}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>The Lace Nerd</Text>
              </View>
              <TouchableOpacity
                style={styles.impersonateButton}
                onPress={() => handleImpersonate('82b44d84-a9cc-4f09-b7ed-28a6daea548a', 'The Lace Nerd')}
              >
                <Text style={styles.impersonateButtonText}>Login as User</Text>
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.userCard} onPress={() => loadUserProfile('d13c88af-f5e1-4f27-9dfc-6f3287583b13')}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>D.Petty</Text>
              </View>
              <TouchableOpacity
                style={styles.impersonateButton}
                onPress={() => handleImpersonate('d13c88af-f5e1-4f27-9dfc-6f3287583b13', 'D.Petty')}
              >
                <Text style={styles.impersonateButtonText}>Login as User</Text>
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelectedUser(null)}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit: {selectedUser.user_name}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Full name"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="City"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={state}
                onChangeText={setState}
                placeholder="SC"
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Professional bio..."
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Media Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Media</Text>
          
          {/* Profile Photo */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Profile Photo</Text>
            <View style={styles.mediaRow}>
              {profilePhotoUrl ? (
                <Image source={{ uri: profilePhotoUrl }} style={styles.mediaThumbnail} />
              ) : (
                <View style={styles.mediaPlaceholder}>
                  <Ionicons name="person" size={32} color="#999" />
                </View>
              )}
              <TouchableOpacity style={styles.pickButton} onPress={() => openMediaPicker('profile')}>
                <Text style={styles.pickButtonText}>Pick from R2</Text>
              </TouchableOpacity>
              {profilePhotoUrl && (
                <TouchableOpacity onPress={() => setProfilePhotoUrl('')}>
                  <Ionicons name="close-circle" size={24} color="#ff3b30" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Gallery */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Gallery ({galleryUrls.length})</Text>
              <TouchableOpacity style={styles.addButton} onPress={() => openMediaPicker('gallery')}>
                <Ionicons name="add-circle" size={20} color="#4CAF50" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.mediaGrid}>
              {(galleryUrls || []).map((url, idx) => (
                <View key={idx} style={styles.mediaItem}>
                  <Image source={{ uri: url }} style={styles.gridThumbnail} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => setGalleryUrls(galleryUrls.filter((_, i) => i !== idx))}
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Flyers */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Flyers ({flyerUrls.length})</Text>
              <TouchableOpacity style={styles.addButton} onPress={() => openMediaPicker('flyer')}>
                <Ionicons name="add-circle" size={20} color="#FF9800" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.mediaGrid}>
              {(flyerUrls || []).map((url, idx) => (
                <View key={idx} style={styles.mediaItem}>
                  <Image source={{ uri: url }} style={styles.gridThumbnail} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => setFlyerUrls(flyerUrls.filter((_, i) => i !== idx))}
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* R2 Media Picker Modal */}
      <Modal visible={showMediaPicker} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Select {mediaType === 'profile' ? 'Profile Photo' : mediaType === 'gallery' ? 'Gallery Image' : 'Flyer'}
            </Text>
            <TouchableOpacity onPress={() => setShowMediaPicker(false)}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.modalSearch}
            placeholder="Search R2 media..."
            value={mediaSearch}
            onChangeText={(text) => {
              setMediaSearch(text);
              loadR2Media();
            }}
          />

          <ScrollView style={styles.mediaList}>
            {(r2Media || []).map((media, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.mediaListItem}
                onPress={() => selectMedia(media.url)}
              >
                <Image source={{ uri: media.url }} style={styles.listThumbnail} />
                <Text style={styles.mediaName}>{media.name}</Text>
                <Ionicons name="add-circle" size={24} color="#4CAF50" />
              </TouchableOpacity>
            ))}
            {(!r2Media || r2Media.length === 0) && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#999' }}>No media found</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  saveText: { fontSize: 16, fontWeight: '600', color: '#4CAF50' },
  saveTextDisabled: { color: '#ccc' },
  content: { flex: 1, padding: 16 },
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: { height: 100 },
  row: { flexDirection: 'row' },
  mediaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mediaThumbnail: { width: 80, height: 80, borderRadius: 8 },
  mediaPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickButton: { backgroundColor: '#1565FF', padding: 10, borderRadius: 8 },
  pickButtonText: { color: '#fff', fontWeight: '600' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addButtonText: { fontSize: 14, fontWeight: '600', color: '#4CAF50' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mediaItem: { position: 'relative' },
  gridThumbnail: { width: 100, height: 100, borderRadius: 8 },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
  },
  prioritySection: { marginTop: 16 },
  priorityTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  userName: { fontSize: 16, fontWeight: '500' },
  impersonateButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  impersonateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  searchInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
  },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalSearch: {
    margin: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 16,
  },
  mediaList: { flex: 1 },
  mediaListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  listThumbnail: { width: 60, height: 60, borderRadius: 8 },
  mediaName: { flex: 1, fontSize: 14 },
});
