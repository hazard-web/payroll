const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'frontend', 'dist');
const destDir = path.join(__dirname, '..', 'dist');

// Remove dest dir if exists
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}

// Copy frontend/dist to dist
if (fs.existsSync(srcDir)) {
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log('Copied frontend/dist to dist');
} else {
  console.error('frontend/dist not found');
  process.exit(1);
}