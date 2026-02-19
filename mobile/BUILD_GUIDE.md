# GoRigo Mobile App - Build & Deploy Guide

## Prerequisites

1. **Node.js 18+** installed on your local machine
2. **Expo CLI**: `npm install -g expo-cli`
3. **EAS CLI**: `npm install -g eas-cli`
4. **Expo Account**: Sign up at https://expo.dev
5. For iOS builds: An Apple Developer account ($99/year)
6. For Android builds: A Google Play Developer account ($25 one-time)

## Quick Start - Test on Your Phone

### Option A: Expo Go (Fastest - No Build Required)

1. Install **Expo Go** from App Store (iOS) or Play Store (Android)
2. Open terminal in the `mobile/` directory
3. Run: `npx expo login` (log into your Expo account)
4. Run: `npm run dev` (starts with tunnel for remote access)
5. Scan the QR code shown in terminal with your phone camera
6. The app opens directly in Expo Go

### Option B: Development Build (Full Native Features)

Development builds include all native modules (biometrics, secure storage, etc.) that Expo Go doesn't support:

```bash
cd mobile
npx expo login
eas build --profile development --platform android   # Android APK
eas build --profile development --platform ios        # iOS (requires Apple Developer account)
```

Install the resulting APK/IPA on your device, then run `npm run dev` to connect.

## Building for Testing (Preview)

Preview builds are standalone apps you can share with testers:

```bash
# Android APK (direct install)
npm run build:preview:android

# iOS (requires Ad Hoc provisioning)
npm run build:preview:ios

# Both platforms
npm run build:preview:all
```

Android: Download the APK from the EAS dashboard and install directly.
iOS: Testers need their device UDID registered in your Apple Developer portal.

## Building for Production

### Android (Google Play)

```bash
# Build an AAB (Android App Bundle) for Play Store
npm run build:prod:android
```

Then submit to Google Play:
1. Set up `submit.production.android.serviceAccountKeyPath` in `eas.json` with your Google Play service account JSON
2. Run: `npm run submit:android`

Or manually upload the AAB from the EAS dashboard to Google Play Console.

### iOS (App Store)

```bash
# Build for App Store
npm run build:prod:ios
```

Then submit to App Store:
1. Set your Apple credentials in `eas.json` under `submit.production.ios`
   - `appleId`: Your Apple ID email
   - `ascAppId`: App Store Connect app ID
   - `appleTeamId`: Your team ID
2. Run: `npm run submit:ios`

Or manually upload via Transporter app.

## Configuration Checklist

Before your first build, update these in `eas.json`:

- [ ] `submit.production.ios.appleId` - Your Apple ID
- [ ] `submit.production.ios.ascAppId` - App Store Connect ID
- [ ] `submit.production.ios.appleTeamId` - Apple Team ID
- [ ] `submit.production.android.serviceAccountKeyPath` - Path to Google service account JSON

And in `app.json`:

- [ ] `extra.eas.projectId` - Set after running `eas init` (auto-generated)
- [ ] `updates.url` - Set after running `eas update:configure` (auto-generated)
- [ ] `owner` - Your Expo account username

## One-Time Setup

Run these once after cloning:

```bash
cd mobile
npm install
npx expo login
eas init          # Links to your Expo project, sets projectId
eas update:configure  # Sets up OTA updates URL
```

## Over-the-Air Updates

Push JS/asset updates without a new App Store/Play Store release:

```bash
npm run update:preview      # Update preview channel
npm run update:production   # Update production channel
```

OTA updates work for JavaScript and asset changes only. Native module changes require a full rebuild.

## Available Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with tunnel |
| `npm run dev:lan` | Start dev server on LAN |
| `npm run build:dev:android` | Development APK |
| `npm run build:dev:ios` | Development iOS build |
| `npm run build:dev:simulator` | iOS Simulator build |
| `npm run build:preview:android` | Preview APK for testing |
| `npm run build:preview:ios` | Preview iOS for testing |
| `npm run build:preview:all` | Preview both platforms |
| `npm run build:prod:android` | Production AAB for Play Store |
| `npm run build:prod:ios` | Production IPA for App Store |
| `npm run build:prod:all` | Production both platforms |
| `npm run submit:ios` | Submit to App Store |
| `npm run submit:android` | Submit to Google Play |
| `npm run submit:all` | Submit to both stores |
| `npm run doctor` | Check for configuration issues |

## App Identifiers

- **iOS Bundle ID**: `ai.gorigo.app`
- **Android Package**: `ai.gorigo.app`
- **URL Scheme**: `gorigo://`
- **Deep Links**: `https://gorigo.ai/mobile/*`

## Environment Configuration

The API base URL is configured per build profile in `eas.json`:
- Development: Uses `EXPO_PUBLIC_API_BASE_URL` or falls back to `localhost:5000`
- Preview/Production: Uses `https://gorigo.ai`

## Troubleshooting

- **Build fails**: Run `npm run doctor` to check for issues
- **Expo Go can't connect**: Use `npm run dev` (tunnel mode) instead of LAN
- **iOS provisioning issues**: Run `eas credentials` to manage certificates
- **Android signing issues**: EAS manages keystores automatically
