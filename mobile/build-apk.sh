#!/usr/bin/env bash
# build-apk.sh — Build Atlas FieldOps Android APK on macOS
# Run from the mobile/ directory: bash build-apk.sh
set -e

MOBILE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$MOBILE_DIR"

echo ""
echo "═══════════════════════════════════════"
echo "  Atlas FieldOps — Android APK Build"
echo "═══════════════════════════════════════"
echo ""

# ── 1. Check prerequisites ────────────────────────────────────────────────────
echo "▶ Checking prerequisites..."

if ! command -v node &>/dev/null; then
  echo "✗ Node.js not found. Install from https://nodejs.org" && exit 1
fi

if ! command -v java &>/dev/null; then
  echo "✗ Java not found. Install Android Studio or JDK 17." && exit 1
fi

ANDROID_SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
if [ ! -d "$ANDROID_SDK" ]; then
  echo "✗ Android SDK not found at $ANDROID_SDK"
  echo "  Set ANDROID_HOME or install Android Studio." && exit 1
fi

echo "  Node: $(node --version)"
echo "  Java: $(java -version 2>&1 | head -1)"
echo "  Android SDK: $ANDROID_SDK"
echo ""

# ── 2. Install dependencies ───────────────────────────────────────────────────
echo "▶ Installing npm packages..."
npm install
echo ""

# ── 3. Prebuild (generates native Android project with new packages) ──────────
echo "▶ Running expo prebuild..."
npx expo prebuild --platform android --clean
echo ""

# ── 4. Restore SDK path (prebuild resets local.properties) ───────────────────
echo "▶ Setting Android SDK path..."
echo "sdk.dir=$ANDROID_SDK" > android/local.properties
echo "  sdk.dir=$ANDROID_SDK"
echo ""

# ── 5. Set JAVA_HOME if needed ────────────────────────────────────────────────
if [ -z "$JAVA_HOME" ]; then
  # macOS: find Java home from the system
  JAVA_HOME=$(/usr/libexec/java_home 2>/dev/null || echo "")
  if [ -n "$JAVA_HOME" ]; then
    export JAVA_HOME
    echo "▶ JAVA_HOME set to: $JAVA_HOME"
  fi
fi

# ── 6. Build the APK ──────────────────────────────────────────────────────────
echo "▶ Building release APK (this takes 3–5 minutes)..."
cd android
./gradlew assembleRelease \
  -Pandroid.enableR8.fullMode=false \
  --no-daemon \
  --warning-mode=none \
  2>&1 | grep -E "BUILD|error:|Error:|FAILED|warning:|Deprecated|Task|> " | head -60
cd ..
echo ""

# ── 7. Copy APK to dist/ ─────────────────────────────────────────────────────
APK_SRC="android/app/build/outputs/apk/release/app-release.apk"
DIST_DIR="../dist/android"
mkdir -p "$DIST_DIR"
TIMESTAMP=$(date +"%Y%m%d-%H%M")
APK_DEST="$DIST_DIR/atlas-fieldops-$TIMESTAMP.apk"

if [ -f "$APK_SRC" ]; then
  cp "$APK_SRC" "$APK_DEST"
  SIZE=$(du -sh "$APK_DEST" | cut -f1)
  echo "═══════════════════════════════════════"
  echo "  ✓ APK built successfully!"
  echo "  Size: $SIZE"
  echo "  Path: $APK_DEST"
  echo "═══════════════════════════════════════"
  echo ""
  echo "  To install on a connected Android device:"
  echo "  adb install -r $APK_DEST"
  echo ""
else
  echo "✗ APK not found at $APK_SRC — build failed."
  echo "  Check the Gradle output above for errors."
  exit 1
fi
