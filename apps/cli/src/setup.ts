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
 * Run first-time setup wizard
 */
export async function runSetup(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           Browser AI Bridge - First Run Setup                 ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const checks: CheckResult[] = [];

  // Step 1: Check environment
  console.log('[1/6] Checking environment...\n');
  checks.push(...checkEnvironment());
  printChecks(checks);

  // Step 2: Check browser
  console.log('\n[2/6] Checking browser...\n');
  checks.push(...checkBrowser());
  printChecks(checks);

  // Step 3: Check Playwright
  console.log('\n[3/6] Checking Playwright...\n');
  checks.push(...checkPlaywright());
  printChecks(checks);

  // Step 4: Check providers
  console.log('\n[4/6] Checking providers...\n');
  checks.push(...checkProviders());
  printChecks(checks);

  // Step 5: Check workspace
  console.log('\n[5/6] Checking workspace...\n');
  checks.push(...checkWorkspace());
  printChecks(checks);

  // Step 6: Summary
  console.log('\n[6/6] Setup summary\n');
  printSummary(checks);
}

function checkEnvironment(): CheckResult[] {
  const results: CheckResult[] = [];

  // Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
    const major = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (major >= 20) {
      results.push({ name: 'Node.js', status: 'ok', message: nodeVersion });
    } else {
      results.push({
        name: 'Node.js',
        status: 'error',
        message: `${nodeVersion} (requires 20+)`,
        fix: 'Install Node.js 20+ from https://nodejs.org/',
      });
    }
  } catch {
    results.push({
      name: 'Node.js',
      status: 'error',
      message: 'Not found',
      fix: 'Install Node.js 20+ from https://nodejs.org/',
    });
  }

  // npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
    results.push({ name: 'npm', status: 'ok', message: `v${npmVersion}` });
  } catch {
    results.push({
      name: 'npm',
      status: 'error',
      message: 'Not found',
      fix: 'Install Node.js (includes npm) from https://nodejs.org/',
    });
  }

  // Git
  try {
    const gitVersion = execSync('git --version', { encoding: 'utf-8' }).trim();
    results.push({ name: 'Git', status: 'ok', message: gitVersion });
  } catch {
    results.push({
      name: 'Git',
      status: 'warning',
      message: 'Not found (optional)',
      fix: 'Install Git from https://git-scm.com/',
    });
  }

  return results;
}

function checkBrowser(): CheckResult[] {
  const results: CheckResult[] = [];
  const platform = os.platform();

  const chromePaths: string[] = [];
  if (platform === 'win32') {
    chromePaths.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe')
    );
  } else if (platform === 'darwin') {
    chromePaths.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  } else {
    chromePaths.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable');
  }

  let chromeFound = false;
  for (const p of chromePaths) {
    if (fs.existsSync(p)) {
      results.push({ name: 'Chrome', status: 'ok', message: p });
      chromeFound = true;
      break;
    }
  }

  if (!chromeFound) {
    results.push({
      name: 'Chrome',
      status: 'error',
      message: 'Not found',
      fix: 'Install Chrome from https://www.google.com/chrome/',
    });
  }

  // Check Chrome profile
  const profilePaths: string[] = [];
  if (platform === 'win32') {
    profilePaths.push(path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data'));
  } else if (platform === 'darwin') {
    profilePaths.push(path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome'));
  } else {
    profilePaths.push(path.join(os.homedir(), '.config', 'google-chrome'));
  }

  let profileFound = false;
  for (const p of profilePaths) {
    if (fs.existsSync(p)) {
      results.push({ name: 'Chrome Profile', status: 'ok', message: p });
      profileFound = true;
      break;
    }
  }

  if (!profileFound) {
    results.push({
      name: 'Chrome Profile',
      status: 'warning',
      message: 'Not found',
      fix: 'Open Chrome and sign in to create a profile',
    });
  }

  return results;
}

function checkPlaywright(): CheckResult[] {
  const results: CheckResult[] = [];

  try {
    require.resolve('playwright-core');
    results.push({ name: 'Playwright', status: 'ok', message: 'Installed' });
  } catch {
    results.push({
      name: 'Playwright',
      status: 'error',
      message: 'Not found',
      fix: 'Run: npm install',
    });
  }

  return results;
}

function checkProviders(): CheckResult[] {
  const results: CheckResult[] = [];
  const providersDir = path.join(process.cwd(), 'plugins');

  const providers = ['provider-gemini', 'provider-chatgpt', 'provider-claude', 'provider-deepseek'];

  for (const provider of providers) {
    const providerPath = path.join(providersDir, provider);
    if (fs.existsSync(providerPath)) {
      const distPath = path.join(providerPath, 'dist');
      if (fs.existsSync(distPath)) {
        results.push({ name: provider, status: 'ok', message: 'Built' });
      } else {
        results.push({
          name: provider,
          status: 'warning',
          message: 'Not built',
          fix: 'Run: npm run build',
        });
      }
    } else {
      results.push({ name: provider, status: 'warning', message: 'Not found' });
    }
  }

  return results;
}

function checkWorkspace(): CheckResult[] {
  const results: CheckResult[] = [];

  // Check if API can be built
  const apiPath = path.join(process.cwd(), 'packages', 'api', 'dist');
  if (fs.existsSync(apiPath)) {
    results.push({ name: 'API Server', status: 'ok', message: 'Built' });
  } else {
    results.push({
      name: 'API Server',
      status: 'warning',
      message: 'Not built',
      fix: 'Run: npm run build',
    });
  }

  // Check runtime
  const runtimePath = path.join(process.cwd(), 'packages', 'runtime', 'dist');
  if (fs.existsSync(runtimePath)) {
    results.push({ name: 'Runtime', status: 'ok', message: 'Built' });
  } else {
    results.push({
      name: 'Runtime',
      status: 'warning',
      message: 'Not built',
      fix: 'Run: npm run build',
    });
  }

  return results;
}

function printChecks(checks: CheckResult[]): void {
  for (const check of checks) {
    const icon = check.status === 'ok' ? '✓' : check.status === 'warning' ? '⚠' : '✗';
    const color = check.status === 'ok' ? '\x1b[32m' : check.status === 'warning' ? '\x1b[33m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`  ${color}${icon}${reset} ${check.name.padEnd(20)} ${check.message}`);
  }
}

function printSummary(checks: CheckResult[]): void {
  const errors = checks.filter(c => c.status === 'error');
  const warnings = checks.filter(c => c.status === 'warning');
  const ok = checks.filter(c => c.status === 'ok');

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                     Setup Summary                             ║
╚═══════════════════════════════════════════════════════════════╝

  Passed:   ${ok.length}
  Warnings: ${warnings.length}
  Errors:   ${errors.length}
`);

  if (errors.length > 0) {
    console.log('  Issues to fix:\n');
    for (const error of errors) {
      console.log(`  ✗ ${error.name}: ${error.message}`);
      if (error.fix) {
        console.log(`    Fix: ${error.fix}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.log('\n  Warnings:\n');
    for (const warning of warnings) {
      console.log(`  ⚠ ${warning.name}: ${warning.message}`);
      if (warning.fix) {
        console.log(`    Fix: ${warning.fix}`);
      }
    }
  }

  if (errors.length === 0) {
    console.log(`
  Next steps:
  
  1. Open Chrome and sign in to your AI provider:
     - Gemini: https://gemini.google.com
     - ChatGPT: https://chatgpt.com
     - Claude: https://claude.ai
  
  2. Start the server:
     bab serve --site gemini
  
  3. Test the connection:
     bab test
  
  4. Configure your IDE:
     API URL: http://localhost:3000/v1/chat/completions
     Model: gemini
`);
  }
}
