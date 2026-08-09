#!/usr/bin/env node

/**
 * Generate icon files for Browser AI Bridge
 * 
 * This script creates placeholder icons for the desktop app.
 * Replace these with real icons for production.
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');

// Ensure build directory exists
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Simple SVG icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <rect width="256" height="256" rx="32" fill="#1a1a2e"/>
  <path d="M128 48L48 96v64l80 48 80-48V96L128 48z" fill="none" stroke="#4fc3f7" stroke-width="8"/>
  <circle cx="128" cy="128" r="32" fill="#4fc3f7"/>
  <path d="M96 112l32 16 32-16" fill="none" stroke="#1a1a2e" stroke-width="6"/>
  <path d="M96 144l32-16 32 16" fill="none" stroke="#1a1a2e" stroke-width="6"/>
</svg>`;

// Save SVG
fs.writeFileSync(path.join(buildDir, 'icon.svg'), svgIcon);

console.log('Icon files created in build/');
console.log('');
console.log('For production, replace with proper icon files:');
console.log('  - build/icon.ico (Windows)');
console.log('  - build/icon.icns (macOS)');
console.log('  - build/icon.png (Linux)');
console.log('');
console.log('You can use online converters to create these from the SVG.');
