import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Work with the user's real Chrome profile WITHOUT killing Chrome
 * or closing their tabs.
 */

export function chromeUserDataDir(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
  }
  return path.join(os.homedir(), '.config', 'google-chrome');
}

/** Email / name Chrome shows in the profile menu (from Local State cache). */
export function readChromeAccountHint(): string | null {
  try {
    const p = path.join(chromeUserDataDir(), 'Local State');
    if (!fs.existsSync(p)) return null;
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const cache = raw?.profile?.info_cache;
    if (!cache || typeof cache !== 'object') return null;
    for (const key of Object.keys(cache)) {
      const entry = cache[key];
      const email = entry?.user_name || entry?.gaia_email || entry?.email;
      if (email && String(email).includes('@')) return String(email);
      const name = entry?.gaia_name || entry?.user_name;
      if (name) return String(name);
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Copy Chrome's cookie DB (+ Local State key material) into a private
 * Playwright profile directory. The user's running Chrome is NOT touched —
 * we only read files. Playwright can then open a headless browser that
 * already has the Google session.
 */
export function snapshotChromeCookies(targetProfileDir: string): boolean {
  try {
    const userData = chromeUserDataDir();
    const defaultDir = path.join(userData, 'Default');
    const networkDir = path.join(defaultDir, 'Network');
    const srcCookies =
      [path.join(networkDir, 'Cookies'), path.join(defaultDir, 'Cookies')].find((p) =>
        fs.existsSync(p)
      ) || null;
    if (!srcCookies) return false;

    const destDefault = path.join(targetProfileDir, 'Default');
    const destNetwork = path.join(destDefault, 'Network');
    fs.mkdirSync(destNetwork, { recursive: true });

    // Chrome may hold the DB open; copy via read+write (not move).
    fs.copyFileSync(srcCookies, path.join(destNetwork, 'Cookies'));
    // Preferences carries account / signin state.
    const prefs = path.join(defaultDir, 'Preferences');
    if (fs.existsSync(prefs)) {
      fs.copyFileSync(prefs, path.join(destDefault, 'Preferences'));
    }
    const localState = path.join(userData, 'Local State');
    if (fs.existsSync(localState)) {
      fs.copyFileSync(localState, path.join(targetProfileDir, 'Local State'));
    }
    return true;
  } catch (e) {
    console.warn('[chrome-profile] cookie snapshot failed:', e);
    return false;
  }
}

/** True when Chrome looks signed into Google (account hint or cookie file). */
export function chromeLooksSignedIn(): boolean {
  if (readChromeAccountHint()) return true;
  const userData = chromeUserDataDir();
  const cookies = [
    path.join(userData, 'Default', 'Network', 'Cookies'),
    path.join(userData, 'Default', 'Cookies'),
  ];
  return cookies.some((p) => {
    try {
      return fs.existsSync(p) && fs.statSync(p).size > 2048;
    } catch {
      return false;
    }
  });
}

export function chromeIsRunning(): boolean {
  try {
    const { execSync } = require('node:child_process') as typeof import('node:child_process');
    if (process.platform === 'win32') {
      const out = execSync('tasklist /FI "IMAGENAME eq chrome.exe" /NH', {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return /chrome\.exe/i.test(out);
    }
    return false;
  } catch {
    return false;
  }
}
