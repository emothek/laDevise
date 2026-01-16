---
description: Build Android App (APK/AAB) and Test on Device
---

# Build & Test for Android

This workflow explains how to build your app for a physical Android device.

## Option 1: Generate APK (Best for Direct Testing) 🧪
This creates an `.apk` file that you can install directly on your phone (drag-and-drop or `adb install`).

1. **Run the Build**:
   ```bash
   eas build -p android --profile preview
   ```
2. **Install**:
   - **Download** the APK from the link provided by EAS.
   - **Install** via ADB:
     ```bash
     adb install app-preview.apk
     ```

---

## Option 2: Generate AAB (Production Format) 📦
This creates an `.aab` (Android App Bundle). **Note**: You cannot install an AAB directly. You must use `bundletool` or upload to the Play Store "Internal Testing" track.

1. **Run the Build**:
   ```bash
   eas build -p android --profile production
   ```

### How to test an AAB locally (Advanced)
If you strictly need to test the AAB without the Store:

1. **Download `bundletool`**: [GitHub Releases](https://github.com/google/bundletool/releases)
2. **Generate APKs from AAB**:
   ```bash
   java -jar bundletool.jar build-apks --bundle=app-production.aab --output=app.apks --mode=universal
   ```
   *(Note: You might need to sign it with your keystore using `--ks` flags if checking release signatures)*
3. **Install to Device**:
   ```bash
   java -jar bundletool.jar install-apks --apks=app.apks
   ```

---

## Option 3: Local Compile (Immediate Test) ⚡
Compiles and installs the app directly to your connected USB device.

1. **Connect Device** via USB (Ensure USB Debugging is ON).
2. **Run Release Build**:
   ```bash
   npx expo run:android --variant release
   ```
