import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runDoctor } from './doctor.js';

const execAsync = promisify(exec);

interface DiagnosticInfo {
  timestamp: string;
  system: {
    platform: string;
    arch: string;
    release: string;
    hostname: string;
    uptime: number;
  };
  node: {
    version: string;
    platform: string;
    arch: string;
  };
  npm: {
    version: string;
  };
  playwright: {
    version: string;
    browsers: string[];
  };
  git: {
    version: string;
    branch: string;
    commit: string;
  };
  project: {
    version: string;
    packages: string[];
  };
  doctor: any[];
  logs: string[];
  config: Record<string, unknown>;
}

/**
 * Diagnose - collect diagnostic information
 */
export async function runDiagnose(): Promise<DiagnosticInfo> {
  const info: DiagnosticInfo = {
    timestamp: new Date().toISOString(),
    system: {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      hostname: os.hostname(),
      uptime: os.uptime(),
    },
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    npm: { version: '' },
    playwright: { version: '', browsers: [] },
    git: { version: '', branch: '', commit: '' },
    project: { version: '', packages: [] },
    doctor: [],
    logs: [],
    config: {},
  };

  // Collect npm version
  try {
    const { stdout } = await execAsync('npm --version');
    info.npm.version = stdout.trim();
  } catch {}

  // Collect Playwright version
  try {
    const { stdout } = await execAsync('npx playwright --version');
    info.playwright.version = stdout.trim();
  } catch {}

  // Collect Playwright browsers
  try {
    const { stdout } = await execAsync('npx playwright install --dry-run');
    const browsers = stdout.match(/\w+-\d+/g) || [];
    info.playwright.browsers = browsers;
  } catch {}

  // Collect git info
  try {
    const { stdout: version } = await execAsync('git --version');
    info.git.version = version.trim();

    const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD');
    info.git.branch = branch.trim();

    const { stdout: commit } = await execAsync('git rev-parse --short HEAD');
    info.git.commit = commit.trim();
  } catch {}

  // Collect project info
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    info.project.version = packageJson.version;

    if (packageJson.workspaces) {
      info.project.packages = packageJson.workspaces;
    }
  } catch {}

  // Run doctor
  info.doctor = await runDoctor();

  // Collect recent logs (if any)
  try {
    const logPath = path.join(os.homedir(), '.bab', 'bab-debug.log');
    if (fs.existsSync(logPath)) {
      const logs = fs.readFileSync(logPath, 'utf-8');
      info.logs = logs.split('\n').slice(-50); // Last 50 lines
    }
  } catch {}

  // Collect config (without secrets)
  try {
    const configPath = path.join(os.homedir(), '.bab', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      // Remove sensitive fields
      delete config.apiKey;
      delete config.token;
      delete config.secret;
      info.config = config;
    }
  } catch {}

  return info;
}

/**
 * Save diagnostic info to file
 */
export async function saveDiagnostic(info: DiagnosticInfo, outputPath?: string): Promise<string> {
  const filepath = outputPath
    ? path.resolve(outputPath)
    : path.join(process.cwd(), `bab-diagnostic-${Date.now()}.json`);

  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(info, null, 2));

  return filepath;
}

/**
 * Print diagnostic summary
 */
export function printDiagnosticSummary(info: DiagnosticInfo): void {
  console.log('\n' + '='.repeat(50));
  console.log('Browser AI Bridge Diagnostic');
  console.log('='.repeat(50));
  console.log(`Timestamp: ${info.timestamp}`);
  console.log(`Platform:  ${info.system.platform} ${info.system.arch}`);
  console.log(`Node:      ${info.node.version}`);
  console.log(`npm:       ${info.npm.version}`);
  console.log(`Playwright: ${info.playwright.version}`);
  console.log(`Git:       ${info.git.version} (${info.git.branch})`);
  console.log(`Project:   v${info.project.version}`);
  console.log('='.repeat(50));

  // Doctor results
  console.log('\nDoctor Results:');
  for (const check of info.doctor) {
    const icon = check.status === 'ok' ? '✔' : check.status === 'warning' ? '⚠' : '✗';
    console.log(`${icon} ${check.name}: ${check.message}`);
  }

  console.log('='.repeat(50));
}
