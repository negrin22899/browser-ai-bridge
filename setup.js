#!/usr/bin/env node

/**
 * Browser AI Bridge - Setup Script
 * 
 * This script helps users set up Browser AI Bridge quickly.
 * 
 * Usage:
 *   node setup.js
 *   npm run setup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           Browser AI Bridge - Setup Assistant                 ║
║                                                               ║
║  Open Runtime for AI Providers                                ║
║  Use Gemini, ChatGPT, Claude, DeepSeek in your IDE            ║
╚═══════════════════════════════════════════════════════════════╝
`);

// Check Node.js version
function checkNodeVersion() {
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (major < 20) {
    console.error(`❌ Node.js 20+ required. Current version: ${nodeVersion}`);
    console.error('   Download: https://nodejs.org/');
    process.exit(1);
  }
  
  console.log(`✅ Node.js ${nodeVersion} detected`);
}

// Check if Chrome is installed
function checkChrome() {
  const platform = os.platform();
  let chromePath = '';
  
  if (platform === 'win32') {
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ];
    
    for (const p of paths) {
      if (fs.existsSync(p)) {
        chromePath = p;
        break;
      }
    }
  } else if (platform === 'darwin') {
    chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else {
    const paths = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        chromePath = p;
        break;
      }
    }
  }
  
  if (chromePath && fs.existsSync(chromePath)) {
    console.log('✅ Chrome browser detected');
    return true;
  }
  
  console.log('⚠️  Chrome not found. Please install Chrome:');
  console.log('   https://www.google.com/chrome/');
  return false;
}

// Install dependencies
function installDependencies() {
  console.log('\n📦 Installing dependencies...\n');
  
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('\n✅ Dependencies installed');
  } catch (error) {
    console.error('\n❌ Failed to install dependencies');
    console.error('   Try running: npm install');
    process.exit(1);
  }
}

// Build project
function buildProject() {
  console.log('\n🔨 Building project...\n');
  
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('\n✅ Project built successfully');
  } catch (error) {
    console.error('\n❌ Build failed');
    console.error('   Check the error messages above');
    process.exit(1);
  }
}

// Run doctor check
function runDoctor() {
  console.log('\n🏥 Running system check...\n');
  
  try {
    execSync('node apps/cli/dist/index.js doctor', { stdio: 'inherit' });
  } catch (error) {
    // Doctor may return non-zero exit code for warnings
  }
}

// Print success message
function printSuccess() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    Setup Complete! 🎉                         ║
╚═══════════════════════════════════════════════════════════════╝

Next steps:

1. Sign in to your AI provider in Chrome:
   - Gemini: https://gemini.google.com
   - ChatGPT: https://chatgpt.com
   - Claude: https://claude.ai
   - DeepSeek: https://chat.deepseek.com

2. Start the server:
   node apps/cli/dist/index.js serve --site gemini

3. Use in your IDE:
   - API URL: http://localhost:3000/v1/chat/completions
   - Model: gemini, chatgpt, claude, or deepseek

Quick commands:
  bab serve --site gemini     # Start with Gemini
  bab serve --site chatgpt    # Start with ChatGPT
  bab chat "Hello!"           # Quick chat
  bab doctor                  # Check system

Documentation:
  README.md                   # Overview
  docs/api-reference.md       # API docs
  docs/compatibility-matrix.md # Compatibility

Need help? Open an issue:
  https://github.com/negrin22899/browser-ai-bridge/issues
`);
}

// Main setup flow
async function main() {
  console.log('Checking system requirements...\n');
  
  checkNodeVersion();
  checkChrome();
  
  console.log('\n---\n');
  
  installDependencies();
  buildProject();
  runDoctor();
  printSuccess();
}

main().catch(error => {
  console.error('Setup failed:', error.message);
  process.exit(1);
});
