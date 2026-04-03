#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function setupIcon() {
  const sourcePath = '/home/user/apps/web/public/assets/icon.png';
  const baseDir = '/home/user/apps/web/android/app/src/main/res';
  
  // Icon sizes for different densities
  const densities = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
  };

  try {
    // Check if source icon exists
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ Source icon not found at ${sourcePath}`);
      process.exit(1);
    }

    console.log(`📁 Using icon from: ${sourcePath}`);

    // Process each density
    for (const [density, size] of Object.entries(densities)) {
      const mipmapDir = path.join(baseDir, `mipmap-${density}`);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(mipmapDir)) {
        fs.mkdirSync(mipmapDir, { recursive: true });
      }

      // Generate ic_launcher.png
      const launcherPath = path.join(mipmapDir, 'ic_launcher.png');
      await sharp(sourcePath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(launcherPath);
      console.log(`✅ Created ${launcherPath} (${size}x${size})`);

      // Generate ic_launcher_round.png
      const roundPath = path.join(mipmapDir, 'ic_launcher_round.png');
      await sharp(sourcePath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(roundPath);
      console.log(`✅ Created ${roundPath} (${size}x${size})`);
    }

    console.log('\n✨ App icon setup complete! Your custom icon.png is now set as the app icon.');
  } catch (error) {
    console.error('❌ Error setting up icon:', error.message);
    process.exit(1);
  }
}

setupIcon();
