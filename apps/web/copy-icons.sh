#!/bin/bash

ICON_SOURCE="/home/user/apps/web/public/assets/icon.png"
BASE_RES="/home/user/apps/web/android/app/src/main/res"

DENSITIES=("mdpi" "hdpi" "xhdpi" "xxhdpi" "xxxhdpi")

echo "🔄 Setting up app icon from: $ICON_SOURCE"

if [ ! -f "$ICON_SOURCE" ]; then
    echo "❌ Source icon not found!"
    exit 1
fi

SUCCESS=0
for density in "${DENSITIES[@]}"; do
    MIPMAP_DIR="$BASE_RES/mipmap-$density"
    mkdir -p "$MIPMAP_DIR"
    
    cp "$ICON_SOURCE" "$MIPMAP_DIR/ic_launcher.png" && echo "✅ Copied to mipmap-$density/ic_launcher.png"
    cp "$ICON_SOURCE" "$MIPMAP_DIR/ic_launcher_round.png" && echo "✅ Copied to mipmap-$density/ic_launcher_round.png"
    
    if [ $? -eq 0 ]; then
        ((SUCCESS++))
    fi
done

if [ $SUCCESS -eq ${#DENSITIES[@]} ]; then
    echo ""
    echo "✨ App icon setup complete!"
    echo "Your custom icon.png is now set as the app icon."
else
    echo ""
    echo "⚠️ Partial setup completed"
fi
