#!/bin/bash

# Clear AsyncStorage data for fresh app testing
# This script helps clear cached authentication tokens

echo "================================"
echo "WGO4Y Development Utility"
echo "================================"
echo ""
echo "To test the app with fresh login flow:"
echo ""
echo "Option 1 - Clear App Data on Android Device:"
echo "  1. Long press the WGO4Y app icon"
echo "  2. Tap 'App info'"
echo "  3. Tap 'Storage'"
echo "  4. Tap 'Clear Data' or 'Clear Storage'"
echo "  5. Reopen the app - you'll see the login screen"
echo ""
echo "Option 2 - Uninstall and Reinstall:"
echo "  1. Uninstall the Expo Go app from your device"
echo "  2. Reinstall Expo Go from the Play Store"
echo "  3. Scan the QR code again"
echo ""
echo "Option 3 - Add Logout Button (Recommended):"
echo "  The app already has a logout function in AuthContext."
echo "  Add a logout button in your profile/settings screen."
echo ""
echo "================================"
