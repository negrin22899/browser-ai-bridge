import { chromium, type Browser } from 'playwright-core';
import { spawn, execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ensureAppProfileDir } from './app-profile.js';

/**
 * Attach to the user's everyday Chrome profile.
 *
 * Playwright's launchPersistentContext() cannot open the Default profile
 * while Chrome is already running (Singleton lock). The reliable path is
 * Chrome's DevTools Protocol: either the browser was started with
 * --remote-debugging-port, or we restart it that way using the same
 * user-data-dir so all logins stay intact.
 */
export interface ChromeAttachOptions {
  executablePath: string;
  userDataDir?: string;
  cdpPort?: number;
  headless?: boolean;
  /** Kill + relaunch Chrome with the debug port when CDP is not already open. */
  allowRelaunch?: boolean;
}

export function readDevToolsActivePort(userDataDir?: string): number | null {
  if (!userDataDir) return null;
  try {
    const file = path.join(userDataDir, 'DevToolsActivePort');
    if (!fs.existsSync(file)) return null;
    const text = fs.readFileSync(file, 'utf-8');
    const first = text.split(/\r?\n/).find((l) => l.trim());
    const port = first ? parseInt(first.trim(), 10) : NaN;
    return Number.isFinite(port) && port > 0 ? port : null;
  } catch {
    return null;
  }
}

export function isChromeRunning(): boolean {
  try {
    if (os.platform() === 'win32') {
      const out = execSync('tasklist /FI "IMAGENAME eq chrome.exe" /NH', {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return /chrome\.exe/i.test(out);
    }
    const out = execSync('pgrep -x chrome || pgrep -x "Google Chrome"', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

async function tryCdp(port: number): Promise<Browser | null> {
  try {
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    console.log(`[chrome-attach] Connected to running Chrome via CDP :${port}`);
    return browser;
  } catch {
    return null;
  }
}

function killChrome(): void {
  try {
    if (os.platform() === 'win32') {
      execSync('taskkill /IM chrome.exe /F', { stdio: 'ignore' });
    } else {
      execSync('pkill -f "Google Chrome" || pkill -x chrome', { stdio: 'ignore' });
    }
  } catch {
    // already closed
  }
}

/**
 * Launch Chrome on the real user-data-dir with a remote-debugging port.
 * All cookies / logins stay available, and Playwright can connectOverCDP.
 */
function launchChromeWithDebugging(opts: {
  executablePath: string;
  userDataDir: string;
  cdpPort: number;
  headless?: boolean;
}): ReturnType<typeof spawn> {
  const args = [
    `--remote-debugging-port=${opts.cdpPort}`,
    `--user-data-dir=${opts.userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-blink-features=AutomationControlled',
    'about:blank',
  ];
  if (opts.headless) {
    args.unshift('--headless=new');
  }
  console.log(
    '[chrome-attach] Starting Chrome with debugging :%s profile=%s',
    opts.cdpPort,
    opts.userDataDir
  );
  return spawn(opts.executablePath, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });
}

async function waitForPort(port: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`, {
        signal: AbortSignal.timeout(1000),
      });
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/**
 * Connect to the app-managed Chrome profile (where the user signed in via
 * the "Open site" login window). Falls back to the system profile only if
 * an explicit userDataDir was passed.
 */
export async function connectToUserChrome(opts: ChromeAttachOptions): Promise<Browser> {
  const cdpPort = opts.cdpPort ?? 9222;
  const executablePath = opts.executablePath;
  // Prefer the app-managed profile so closing the everyday browser is fine.
  const userDataDir = opts.userDataDir || ensureAppProfileDir();
  if (!executablePath) {
    throw new Error('Chrome executable not found');
  }

  // 1) Chrome already exposing CDP (started with --remote-debugging-port).
  const activePort = readDevToolsActivePort(userDataDir) ?? cdpPort;
  let browser = await tryCdp(activePort);
  if (browser) return browser;
  if (activePort !== cdpPort) {
    browser = await tryCdp(cdpPort);
    if (browser) return browser;
  }

  if (opts.allowRelaunch === false) {
    throw new Error(
      'Chrome is not exposing a DevTools port. Start Chrome with --remote-debugging-port=' +
        cdpPort
    );
  }

  // 2) Relaunch the same profile with a debug port so logins stay in place.
  if (isChromeRunning()) {
    console.log('[chrome-attach] Chrome is running without CDP — restarting it with a debug port');
    killChrome();
    // Wait for the Singleton lock to clear.
    await new Promise((r) => setTimeout(r, 1500));
  }

  if (!userDataDir) {
    throw new Error('No Chrome user-data-dir available for a profile-preserving launch');
  }

  launchChromeWithDebugging({
    executablePath,
    userDataDir,
    cdpPort,
    headless: opts.headless,
  });

  const up = await waitForPort(cdpPort, 15000);
  if (!up) {
    throw new Error(`Chrome debug port ${cdpPort} did not come up`);
  }
  browser = await tryCdp(cdpPort);
  if (!browser) {
    throw new Error(`Chrome is listening on :${cdpPort} but Playwright could not connect`);
  }
  console.log('[chrome-attach] Attached to user Chrome with logged-in profile');
  return browser;
}
