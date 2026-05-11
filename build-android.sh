#!/bin/bash
# Description: Helper script to build the Android app manually in GitHub Codespaces or any Ubuntu terminal.
# Ensure you run this script from the root of your project: bash build-android.sh

echo "⚙️ 1/7 Checking and installing Android SDK (for Codespaces/Linux)..."
if [ -z "$ANDROID_HOME" ]; then
  echo "ANDROID_HOME is not set. Installing Android SDK locally in the project..."
  sudo apt-get update && sudo apt-get install -y openjdk-17-jdk unzip wget fastjar
  
  export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
  
  if [ ! -d "android-sdk" ]; then
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline-tools.zip
    unzip -q cmdline-tools.zip -d android-tmp
    mkdir -p android-sdk/cmdline-tools/latest
    mv android-tmp/cmdline-tools/* android-sdk/cmdline-tools/latest/
    rm -rf android-tmp cmdline-tools.zip
  fi
  
  export ANDROID_HOME=$PWD/android-sdk
  export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
  
  yes | sdkmanager --licenses > /dev/null 2>&1
  sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" > /dev/null 2>&1
  echo "Android SDK installed at $ANDROID_HOME"
else
  echo "Android SDK found at $ANDROID_HOME"
fi

echo "📦 2/7 Installing Dependencies..."
npm install
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli @capacitor/assets

echo "🏗️  3/7 Building React Web App..."
npm run build

echo "📱 4/7 Generating Android Project..."
npx cap add android || true
npx cap sync android

echo "🎨 5/7 Generating Native App Icons (Using SVG)..."
npx @capacitor/assets generate --android

echo "⚙️  6/7 Injecting AdMob App ID into AndroidManifest.xml (if not already present)..."
grep -q "com.google.android.gms.ads.APPLICATION_ID" android/app/src/main/AndroidManifest.xml || sed -i '/<application/a \        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-3113275088766608~6530986035"/>' android/app/src/main/AndroidManifest.xml || true

echo "🚀 7/7 Compiling Android APK & AAB (This might take a few minutes)..."
cd android

# Give execution permissions to gradlew
chmod +x gradlew

# Build the Debug APK
echo "Building APK..."
./gradlew assembleDebug

# Build the Release AAB
echo "Building AAB Bundle..."
./gradlew bundleRelease

cd ..

echo "✅ ALL DONE! Your compiled files are ready:"
echo "👉 APK Path: android/app/build/outputs/apk/debug/app-debug.apk"
echo "👉 AAB Path: android/app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "To download them in GitHub Codespaces, you can right-click the files in the file explorer and select 'Download'."
