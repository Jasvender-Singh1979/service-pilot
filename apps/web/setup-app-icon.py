#!/usr/bin/env python3

import os
import shutil
from pathlib import Path

def setup_icon():
    """Copy icon.png to all Android mipmap directories"""
    source_icon = Path('/home/user/apps/web/public/assets/icon.png')
    base_res_dir = Path('/home/user/apps/web/android/app/src/main/res')
    
    # Densities to copy to
    densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']
    
    if not source_icon.exists():
        print(f"❌ Source icon not found: {source_icon}")
        return False
    
    print(f"📦 Using icon from: {source_icon}")
    
    try:
        for density in densities:
            mipmap_dir = base_res_dir / f'mipmap-{density}'
            mipmap_dir.mkdir(parents=True, exist_ok=True)
            
            # Copy as launcher icon
            launcher_path = mipmap_dir / 'ic_launcher.png'
            shutil.copy2(source_icon, launcher_path)
            print(f"✅ Copied to {launcher_path}")
            
            # Copy as round icon
            round_path = mipmap_dir / 'ic_launcher_round.png'
            shutil.copy2(source_icon, round_path)
            print(f"✅ Copied to {round_path}")
        
        print("\n✨ Success! Your custom icon.png is now set as the app icon.")
        print("   The icon will appear in the next Android APK build.")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == '__main__':
    setup_icon()
