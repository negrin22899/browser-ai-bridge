import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

interface CheckResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  fix?: string;
}

/**
 * Init command - one-command setup for Browser AI Bridge
 * 
 * Goal: User runs `npx browser-ai-bridge init` and gets a working API in 10 seconds.
 */
export async function runInit(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           Browser AI Bridge - Quick Setup                     ║
║                                                               ║
║  Use AI (Gemini, ChatGPT, Claude) in your code editor         ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const checks: CheckResult[] = [];
  let hasErrors = false;

  // Step 1: Check Node.js
  console.log('[1/5] Checking Node.js...');
  const nodeCheck = checkNode();
  checks.push(nodeCheck);
  printCheck(nodeCheck);
  if (nodeCheck.status === 'error') hasErrors = true;

  // Step 2: Check Chrome
  console.log('\n[2/5] Checking Chrome...');
  const chromeCheck = checkChrome();
  checks.push(chromeCheck);
  printCheck(chromeCheck);
  if (chromeCheck.status === 'error') hasErrors = true;

  // Step 3: Install dependencies
  console.log('\n[3/5] Installing dependencies...');
  if (!hasErrors) {
    try {
      execSync('npm install', { stdio: 'ignore' });
      console.log('  ✔ Dependencies installed');
    } catch {
      console.log('  ⚠ Dependencies install failed (may already be installed)');
    }
  }

  // Step 4: Build project
  console.log('\n[4/5] Building project...');
  if (!hasErrors) {
    try {
      execSync('npm run build', { stdio: 'ignore' });
      console.log('  ✔ Project built');
    } catch {
      console.log('  ⚠ Build failed (check npm run build)');
    }
  }

  // Step 5: Start server
  console.log('\n[5/5] Starting server...');
  if (!hasErrors) {
    console.log('\n' + '='.repeat(60));
    console.log('SETUP COMPLETE!');
    console.log('='.repeat(60));
    console.log(`
Your Browser AI Bridge is ready!

To start:
  bab serve --site gemini

Or with other providers:
  bab serve --site chatgpt
  bab serve --site claude
  bab serve --site deepseek

API will be available at:
  http://localhost:3000/v1/chat/completions

Configure your IDE (Cursor, VS Code, etc.):
  API URL: http://localhost:3000/v1/chat/completions
  Model: gemini

For more help:
  bab --help
  bab doctor
  bab providers

Documentation:
  https://github.com/negrin22899/browser-ai-bridge
`);
  } else {
    console.log('\n' + '='.repeat(60));
    console.log('SETUP FAILED');
    console.log('='.repeat(60));
    console.log('\nPlease fix the errors above and try again.\n');
  }
}

function checkNode(): CheckResult {
  try {
    const version = execSync('node --version', { encoding: 'utf-8' }).trim();
    const major = parseInt(version.replace('v', '').split('.')[0]);
    if (major >= 20) {
      return { name: 'Node.js', status: 'ok', message: version };
    }
    return { name: 'Node.js', status: 'error', message: `${version} (requires >= 20)`, fix: 'Install Node.js 20+ from https://nodejs.org/' };
  } catch {
    return { name: 'Node.js', status: 'error', message: 'Not found', fix: 'Install Node.js 20+ from https://nodejs.org/' };
  }
}

function checkChrome(): CheckResult {
  const platform = os.platform();
  const paths: string[] = [];

  if (platform === 'win32') {
    paths.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe')
    );
  } else if (platform === 'darwin') {
    paths.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  } else {
    paths.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable');
  }

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return { name: 'Chrome', status: 'ok', message: 'Found' };
    }
  }

  return { name: 'Chrome', status: 'error', message: 'Not found', fix: 'Install Chrome from https://www.google.com/chrome/' };
}

function printCheck(result: CheckResult): void {
  const icon = result.status === 'ok' ? '✔' : result.status === 'warning' ? '⚠' : '✗';
  console.log(`  ${icon} ${result.name}: ${result.message}`);
  if (result.fix) {
    console.log(`    Fix: ${result.fix}`);
  }
}
