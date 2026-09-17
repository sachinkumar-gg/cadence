#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUTPUT_DIR="${ROOT_DIR}/build"
BUNDLE_NAME="Cadence.saver"
USER_SAVER_DIR="${HOME}/Library/Screen Savers"

echo "=================================================="
echo "⚡ Cadence macOS Screen Saver (.saver) Builder"
echo "=================================================="

# 1. Build Vite React + TypeScript Frontend
echo ""
echo "📦 [1/4] Building Vite Web Application..."
cd "${ROOT_DIR}"
npm run build

# 2. Compile Native Screen Saver Bundle
echo ""
echo "🔨 [2/4] Compiling native Swift ScreenSaver bundle..."
mkdir -p "${OUTPUT_DIR}/${BUNDLE_NAME}/Contents/MacOS"
mkdir -p "${OUTPUT_DIR}/${BUNDLE_NAME}/Contents/Resources"

# Check if full Xcode with xcodebuild is configured
CAN_USE_XCODEBUILD=false
if xcode-select -p | grep -q "Xcode.app" 2>/dev/null && command -v xcodebuild >/dev/null 2>&1; then
    CAN_USE_XCODEBUILD=true
fi

if [ "$CAN_USE_XCODEBUILD" = true ]; then
    echo "  → Using xcodebuild..."
    xcodebuild -project "${SCRIPT_DIR}/Cadence.xcodeproj" -target Cadence -configuration Release -derivedDataPath "${OUTPUT_DIR}/DerivedData" build
    cp -R "${OUTPUT_DIR}/DerivedData/Build/Products/Release/${BUNDLE_NAME}" "${OUTPUT_DIR}/"
else
    echo "  → Compiling with Apple Swift compiler (swiftc via CommandLineTools)..."
    cp "${SCRIPT_DIR}/CadenceScreenSaver/Info.plist" "${OUTPUT_DIR}/${BUNDLE_NAME}/Contents/Info.plist"

    swiftc \
        -emit-library \
        -module-name Cadence \
        -target arm64-apple-macosx13.0 \
        -O \
        -framework ScreenSaver \
        -framework WebKit \
        -framework AppKit \
        -framework Foundation \
        "${SCRIPT_DIR}/CadenceScreenSaver/CadenceView.swift" \
        "${SCRIPT_DIR}/CadenceScreenSaver/MediaRemoteBridge.swift" \
        -o "${OUTPUT_DIR}/${BUNDLE_NAME}/Contents/MacOS/Cadence"
fi

# 3. Copy compiled web assets into bundle resources
echo ""
echo "📂 [3/4] Packaging web assets into bundle..."
rm -rf "${OUTPUT_DIR}/${BUNDLE_NAME}/Contents/Resources/dist"
mkdir -p "${OUTPUT_DIR}/${BUNDLE_NAME}/Contents/Resources/dist"
cp -R "${ROOT_DIR}/dist/"* "${OUTPUT_DIR}/${BUNDLE_NAME}/Contents/Resources/dist/"

# Ad-hoc code sign with entitlements
echo "  → Signing bundle with ad-hoc signature..."
codesign --force --deep --sign - --entitlements "${SCRIPT_DIR}/CadenceScreenSaver/Cadence.entitlements" "${OUTPUT_DIR}/${BUNDLE_NAME}" 2>/dev/null || true

# 4. Install into User Screen Savers folder
echo ""
echo "🚀 [4/4] Installing Cadence to ~/Library/Screen Savers/..."
mkdir -p "${USER_SAVER_DIR}"
rm -rf "${USER_SAVER_DIR}/${BUNDLE_NAME}"
cp -R "${OUTPUT_DIR}/${BUNDLE_NAME}" "${USER_SAVER_DIR}/"

# Configure macOS to select Cadence as the active screen saver
defaults -currentHost write com.apple.screensaver moduleDict -dict moduleName "Cadence" path "${USER_SAVER_DIR}/${BUNDLE_NAME}" type 0 2>/dev/null || true


echo ""
echo "=================================================="
echo "✅ Successfully built and installed Cadence.saver!"
echo "📍 Location: ${USER_SAVER_DIR}/${BUNDLE_NAME}"
echo "=================================================="
echo ""
echo "HOW TO TEST & PREVIEW:"
echo "1. System Settings:"
echo "   Open 'System Settings' → 'Screen Saver', select 'Cadence', and click 'Preview'."
echo ""
echo "2. Real Idle Activation Test:"
echo "   defaults -currentHost write com.apple.screensaver idleTime 5"
echo "   (Wait 5 seconds of keyboard/mouse inactivity to trigger screen saver)"
echo ""
echo "3. Direct Launch:"
echo "   open -a ScreenSaverEngine"
echo "=================================================="
