#!/bin/bash

# Clean and build release APK script for FeastoPOS

echo "🧹 Cleaning previous builds..."
cd android
./gradlew clean

echo "📦 Building release APK..."
./gradlew assembleRelease

echo "✅ Build complete! APK location:"
echo "android/app/build/outputs/apk/release/app-release.apk"

echo ""
echo "📱 To install on device:"
echo "adb install android/app/build/outputs/apk/release/app-release.apk"
