import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="musical-notes" size={64} color="#1565FF" />
          </View>
          <Text style={styles.title}>Welcome to WGO4Y</Text>
          <Text style={styles.subtitle}>
            Your gateway to events, venues, and entertainment
          </Text>
        </View>

        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <Ionicons name="calendar" size={24} color="#1565FF" />
            <Text style={styles.featureText}>Discover Events</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="business" size={24} color="#1565FF" />
            <Text style={styles.featureText}>Find Venues</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="people" size={24} color="#1565FF" />
            <Text style={styles.featureText}>Connect with Talent</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.signInButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.signUpButton}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.signUpButtonText}>Create Account</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 64,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresSection: {
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 16,
    gap: 12,
  },
  signInButton: {
    backgroundColor: '#1565FF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  signUpButton: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1565FF',
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565FF',
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
});
