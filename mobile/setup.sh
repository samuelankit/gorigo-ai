#!/bin/bash
set -e

echo ""
echo "======================================"
echo "  GoRigo Mobile App - Setup"
echo "======================================"
echo ""

cd "$(dirname "$0")"

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 18+ first."
    echo "Download from: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "ERROR: Node.js 18+ required. You have $(node -v)."
    exit 1
fi

echo "[1/5] Installing dependencies..."
npm install
echo "Done."
echo ""

echo "[2/5] Installing EAS CLI..."
if ! command -v eas &> /dev/null; then
    npm install -g eas-cli
    echo "EAS CLI installed."
else
    echo "EAS CLI already installed ($(eas --version))."
fi
echo ""

echo "[3/5] Log into your Expo account"
echo "  (Create a free account at https://expo.dev/signup if you don't have one)"
echo ""
npx expo login || {
    echo ""
    echo "If login failed, you can also set EXPO_TOKEN environment variable."
    echo "Get a token from: https://expo.dev/settings/access-tokens"
}
echo ""

echo "[4/5] Linking project to your Expo account..."
echo "  This sets your project ID in app.json automatically."
eas init || {
    echo "WARNING: eas init failed. You may need to run it manually later."
}
echo ""

echo "[5/5] Configuring over-the-air updates..."
echo "  This sets the update URL in app.json automatically."
eas update:configure || {
    echo "WARNING: eas update:configure failed. OTA updates can be set up later."
}
echo ""

echo "======================================"
echo "  Verifying configuration..."
echo "======================================"

if grep -q "SET_AFTER_RUNNING" app.json 2>/dev/null; then
    echo ""
    echo "WARNING: app.json still contains placeholder values."
    echo "  The 'eas init' or 'eas update:configure' commands may not have"
    echo "  updated app.json automatically. Check these fields:"
    echo "  - extra.eas.projectId"
    echo "  - updates.url"
    echo ""
else
    echo "Configuration verified - app.json looks good."
fi

echo ""
echo "======================================"
echo "  Setup complete!"
echo "======================================"
echo ""
echo "NEXT STEPS:"
echo ""
echo "  Test on your phone:"
echo "    1. Install 'Expo Go' from Play Store or App Store"
echo "    2. Run: npx expo start --tunnel"
echo "    3. Scan the QR code with your phone camera"
echo ""
echo "  Build a test APK (install directly on Android):"
echo "    npx eas build --profile preview --platform android"
echo ""
echo "  Build for Play Store (AAB format):"
echo "    npx eas build --profile production --platform android"
echo ""
