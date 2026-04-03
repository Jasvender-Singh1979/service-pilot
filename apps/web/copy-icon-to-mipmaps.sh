#!/bin/bash

SOURCE_ICON="/home/user/apps/web/assets/icon.png"
BASE_RES_DIR="/home/user/apps/web/android/app/src/main/res"

DENSITIES=("mdpi" "hdpi" "xhdpi" "xxhdpi" "xxxhdpi")

if [ ! -f "$SOURCE_ICON" ]; then
    echo "❌ Source icon not found: $SOURCE_ICON"
    exit 1
fi

echo "📦 Setting up app icon from: $SOURCE_ICON"

for density in "${DENSITIES[@]}"; do
    MIPMAP_DIR="$BASE_RES_DIR/mipmap-$density"
    
    # Create directory if it doesn't exist
    mkdir -p "$MIPMAP_DIR"
    
    # Copy ic_launcher.png
    cp "$SOURCE_ICON" "$MIPMAP_DIR/ic_launcher.png"
    echo "✅ Copied to mipmap-$density/ic_launcher.png"
    
    # Copy ic_launcher_round.png
    cp "$SOURCE_ICON" "$MIPMAP_DIR/ic_launcher_round.png"
    echo "✅ Copied to mipmap-$density/ic_launcher_round.png"
done

echo ""
echo "✨ App icon setup complete!"
echo "Your custom icon.png is now set as the app icon."
echo "The new icon will appear in the next Android APK build."
