# GoRigo Mobile App - Quick Start

## Test on Your Phone in 5 Minutes

### Step 1: Install Expo Go on your phone
- **Android**: Search "Expo Go" on Google Play Store
- **iPhone**: Search "Expo Go" on App Store

### Step 2: Run setup (one time only)
Open a terminal on your computer (or the Replit Shell tab) and run:

```bash
cd mobile
bash setup.sh
```

This will:
- Install all dependencies
- Walk you through creating/linking your Expo account
- Automatically configure your project ID and update URL in `app.json`

### Step 3: Start the app
```bash
cd mobile
npx expo start --tunnel
```

Scan the QR code that appears with your phone camera. The app opens in Expo Go.

---

## Build for Testing (APK - install directly on Android)

```bash
cd mobile
npx eas build --profile preview --platform android
```

Download the APK from the link EAS gives you. Send it to anyone — they can install it directly on their Android phone. No Play Store needed.

---

## Build for Play Store (AAB - required format for Google Play)

Google Play requires an AAB (Android App Bundle), not an APK.

### Prerequisites
1. Create a Google Play Developer account ($25 one-time): https://play.google.com/console
2. Create your app listing in Google Play Console
3. Download your Google Play service account JSON key (for automated submission)
4. Add the key path to `mobile/eas.json` under `submit.production.android.serviceAccountKeyPath`

### Build and submit
```bash
cd mobile
npx eas build --profile production --platform android
npx eas submit --platform android
```

---

## Build for App Store (iOS)

### Prerequisites
1. Apple Developer account ($99/year): https://developer.apple.com
2. Add your Apple credentials to `mobile/eas.json` under `submit.production.ios`

### Build and submit
```bash
cd mobile
npx eas build --profile production --platform ios
npx eas submit --platform ios
```

---

## Making Changes & Iterating

**During development** (while `npx expo start` is running):
Just save the file — it hot-reloads on your phone automatically.

**For published apps** (already on Play Store/App Store):
Push an over-the-air update — no new store review needed:
```bash
cd mobile
npx eas update --channel production
```

OTA updates work for code and asset changes. If you add new native modules, you need a full rebuild.

---

## Accounts You Need

| Account | Cost | When needed |
|---------|------|-------------|
| Expo (required for all) | Free | Always |
| Google Play Developer | $25 one-time | Play Store submission |
| Apple Developer | $99/year | App Store submission |

---

## App Details

| Field | Value |
|-------|-------|
| App Name | GoRigo |
| Android Package | ai.gorigo.app |
| iOS Bundle ID | ai.gorigo.app |
| API Server | https://gorigo.ai |
| URL Scheme | gorigo:// |
| Deep Links | https://gorigo.ai/mobile/* |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Expo Go can't connect | Use `npx expo start --tunnel` instead of LAN mode |
| Build fails | Run `npx expo-doctor` to check for issues |
| iOS provisioning issues | Run `npx eas credentials` to manage certificates |
| API errors in app | Make sure your backend is published and accessible |
| "Something went wrong" on login | Check the API server URL matches your published domain |
