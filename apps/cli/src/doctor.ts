import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const execAsync = promisify(exec);

interface CheckResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
}

/**
 * Doctor - checks system requirements for Browser AI Bridge
 */
export async function runDoctor(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // 1. Check Node.js
  results.push(await checkNode());

  // 2. Check Playwright
  results.push(await checkPlaywright());

  // 3. Check Chrome
  results.push(await checkChrome());

  // 4. Check Browser Profile
  results.push(await checkBrowserProfile());

  // 5. Check Runtime
  results.push(await checkRuntime());

  // 6. Check Workspace
  results.push(await checkWorkspace());

  // 7. Check Git
  results.push(await checkGit());

  // 8. Check API
  results.push(await checkAPI());

  return results;
}

async function checkNode(): Promise<CheckResult> {
  try {
    const { stdout } = await execAsync('node --version');
    const version = stdout.trim();
    const major = parseInt(version.replace('v', '').split('.')[0]);

    if (major >= 20) {
      return { name: 'Node.js', status: 'ok', message: version };
    } else {
      return { name: 'Node.js', status: 'error', message: `${version} (requires >= 20)` };
    }
  } catch {
    return { name: 'Node.js', status: 'error', message: 'Not found' };
  }
}

async function checkPlaywright(): Promise<CheckResult> {
  try {
    const { stdout } = await execAsync('npx playwright --version');
    const version = stdout.trim();
    return { name: 'Playwright', status: 'ok', message: version };
  } catch {
    return { name: 'Playwright', status: 'error', message: 'Not installed' };
  }
}

async function checkChrome(): Promise<CheckResult> {
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];

  for (const chromePath of chromePaths) {
    if (fs.existsSync(chromePath)) {
      return { name: 'Chrome', status: 'ok', message: 'Found', details: chromePath };
    }
  }

  return { name: 'Chrome', status: 'warning', message: 'Not found in default locations' };
}

async function checkBrowserProfile(): Promise<CheckResult> {
  const profilePaths = [
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data'),
    path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome'),
    path.join(os.homedir(), '.config', 'google-chrome'),
  ];

  for (const profilePath of profilePaths) {
    if (fs.existsSync(profilePath)) {
      return { name: 'Browser Profile', status: 'ok', message: 'Found', details: profilePath };
    }
  }

  return { name: 'Browser Profile', status: 'warning', message: 'No Chrome profile found' };
}

async function checkRuntime(): Promise<CheckResult> {
  try {
    // Check if runtime package exists and builds
    const runtimePath = path.join(process.cwd(), 'packages', 'runtime', 'dist', 'index.js');
    if (fs.existsSync(runtimePath)) {
      return { name: 'Runtime', status: 'ok', message: 'Built' };
    } else {
      return { name: 'Runtime', status: 'warning', message: 'Not built (run npm run build)' };
    }
  } catch {
    return { name: 'Runtime', status: 'error', message: 'Check failed' };
  }
}

async function checkWorkspace(): Promise<CheckResult> {
  try {
    const packageJson = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJson)) {
      const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
      if (pkg.workspaces) {
        return { name: 'Workspace', status: 'ok', message: `${pkg.workspaces.length} workspaces` };
      }
    }
    return { name: 'Workspace', status: 'warning', message: 'No workspaces configured' };
  } catch {
    return { name: 'Workspace', status: 'error', message: 'Check failed' };
  }
}

async function checkGit(): Promise<CheckResult> {
  try {
    const { stdout } = await execAsync('git --version');
    return { name: 'Git', status: 'ok', message: stdout.trim() };
  } catch {
    return { name: 'Git', status: 'warning', message: 'Not installed' };
  }
}

async function checkAPI(): Promise<CheckResult> {
  try {
    const apiPath = path.join(process.cwd(), 'packages', 'api', 'dist', 'index.js');
    if (fs.existsSync(apiPath)) {
      return { name: 'API', status: 'ok', message: 'Built' };
    } else {
      return { name: 'API', status: 'warning', message: 'Not built (run npm run build)' };
    }
  } catch {
    return { name: 'API', status: 'error', message: 'Check failed' };
  }
}

/**
 * Print doctor results
 */
export function printDoctorResults(results: CheckResult[]): void {
  console.log('\n' + '='.repeat(50));
  console.log('Browser AI Bridge Doctor');
  console.log('='.repeat(50));

  let hasError = false;
  let hasWarning = false;

  for (const result of results) {
    let icon: string;
    switch (result.status) {
      case 'ok':
        icon = '✔';
        break;
      case 'warning':
        icon = '⚠';
        hasWarning = true;
        break;
      case 'error':
        icon = '✗';
        hasError = true;
        break;
    }

    console.log(`${icon} ${result.name.padEnd(20)} ${result.message}`);
    if (result.details) {
      console.log(`  ${''.padEnd(20)} ${result.details}`);
    }
  }

  console.log('='.repeat(50));

  if (hasError) {
    console.log('\n✗ Some checks failed. Please fix the errors above.');
  } else if (hasWarning) {
    console.log('\n⚠ Some warnings. The system should work but may have issues.');
  } else {
    console.log('\n✔ All checks passed. Ready to go!');
  }

  console.log('');
}
