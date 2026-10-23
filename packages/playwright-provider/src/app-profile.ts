import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * App-managed Chrome profile (NOT the user's everyday Chrome profile).
 *
 * Login cookies live here, so the app keeps working after the user closes
 * their daily browser. The same directory is used by the login window and
 * by the Playwright session, so sign-in once is enough.
 */
export function getAppProfileDir(): string {
  return path.join(os.homedir(), '.browser-ai-bridge', 'chrome-profile');
}

export function ensureAppProfileDir(): string {
  const dir = getAppProfileDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function isSignedInHint(): boolean {
  const dir = getAppProfileDir();
  // Cheap heuristic: a non-empty Cookies database means some Google/site
  // login has already been stored in the app profile.
  const candidates = [
    path.join(dir, 'Default', 'Cookies'),
    path.join(dir, 'Default', 'Network', 'Cookies'),
    path.join(dir, 'Cookies'),
  ];
  return candidates.some((p) => {
    try {
      return fs.existsSync(p) && fs.statSync(p).size > 1024;
    } catch {
      return false;
    }
  });
}
