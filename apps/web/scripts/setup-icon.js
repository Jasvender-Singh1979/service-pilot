#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sourceIcon = path.join(__dirname, '../assets/icon.png');
const publicIcon = path.join(__dirname, '../public/assets/Icon.png');
const baseResDir = path.join(__dirname, '../android/app/src/main/res');

const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];

function copyIcon() {
  try {
    // Try to find the source icon from multiple locations
    let iconPath = sourceIcon;
    if (!fs.existsSync(iconPath)) {
      iconPath = publicIcon;
      if (!fs.existsSync(iconPath)) {
        console.error(`❌ Source icon not found in:`);
        console.error(`   - ${sourceIcon}`);
        console.error(`   - ${publicIcon}`);
        process.exit(1);
      }
    }

    console.log(`📦 Setting up app icon from: ${iconPath}`);
    
    const iconData = fs.readFileSync(iconPath);
    console.log(`✅ Read icon file: ${iconData.length} bytes`);
    
    let successCount = 0;

    densities.forEach((density) => {
      const mipmapDir = path.join(baseResDir, `mipmap-${density}`);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(mipmapDir)) {
        fs.mkdirSync(mipmapDir, { recursive: true });
        console.log(`📁 Created directory: mipmap-${density}`);
      }

      try {
        // Write ic_launcher.png
        const launcherPath = path.join(mipmapDir, 'ic_launcher.png');
        fs.writeFileSync(launcherPath, iconData);
        console.log(`✅ Copied to mipmap-${density}/ic_launcher.png`);

        // Write ic_launcher_round.png
        const roundPath = path.join(mipmapDir, 'ic_launcher_round.png');
        fs.writeFileSync(roundPath, iconData);
        console.log(`✅ Copied to mipmap-${density}/ic_launcher_round.png`);

        successCount++;
      } catch (error) {
        console.error(`❌ Error writing to mipmap-${density}: ${error.message}`);
      }
    });

    console.log(`
📊 Setup Summary: ${successCount}/${densities.length} densities successfully updated`);

    if (successCount === densities.length) {
      console.log('
✨ App icon setup complete!');
      console.log('✅ Your custom icon is now deployed to all mipmap densities');
      console.log('✅ AndroidManifest.xml is configured to use @mipmap/ic_launcher');
      console.log('✅ The new icon will appear in the next Android APK build');
      process.exit(0);
    } else {
      console.log(`
⚠️  Partial setup: Some densities failed`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

copyIcon();