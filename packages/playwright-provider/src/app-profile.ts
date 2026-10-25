import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * App-managed auth storage.
 *
 * The Google OAuth popup (Electron BrowserWindow) signs the user in and
 * writes cookies to auth-cookies.json. Playwright injects those cookies
 * into its own (headless) browser so no extra Chrome window is needed.
 */
export function getAppProfileDir(): string {
  return path.join(os.homedir(), '.browser-ai-bridge', 'chrome-profile');
}

export function ensureAppProfileDir(): string {
  const dir = getAppProfileDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function authCookiesPath(): string {
  return path.join(os.homedir(), '.browser-ai-bridge', 'auth-cookies.json');
}

export function loadAuthCookies(): Array<Record<string, unknown>> {
  try {
    const p = authCookiesPath();
    if (!fs.existsSync(p)) return [];
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveAuthCookies(cookies: Array<Record<string, unknown>>): void {
  try {
    const dir = path.dirname(authCookiesPath());
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(authCookiesPath(), JSON.stringify(cookies, null, 2), 'utf-8');
  } catch (e) {
    console.error('[auth] save failed:', e);
  }
}

export interface SignInCheckResult {
  signedIn: boolean;
  email?: string;
  reason?: string;
}

/**
 * True when the persisted cookie jar looks like a real Google session
 * (not just any random cookie file).
 */
export function hasGoogleSessionCookies(cookies = loadAuthCookies()): boolean {
  const names = new Set(cookies.map((c) => String(c.name || '')));
  const sid = names.has('SID') || names.has('__Secure-1PSID') || names.has('LSID');
  const hsid = names.has('HSID') || names.has('SSID') || names.has('__Secure-3PSID') || names.has('NID');
  return sid && hsid;
}

export function checkGoogleSignIn(): SignInCheckResult {
  const cookies = loadAuthCookies();
  if (cookies.length === 0) {
    return { signedIn: false, reason: 'No saved session — use the sign-in popup' };
  }
  if (!hasGoogleSessionCookies(cookies)) {
    return {
      signedIn: false,
      reason: 'Cookies present but no Google session (SID/HSID missing)',
    };
  }
  const emailCookie = cookies.find((c) => /email|user/i.test(String(c.name)));
  return {
    signedIn: true,
    email: emailCookie ? String(emailCookie.value) : undefined,
    reason: `Google session present (${cookies.length} cookies)`,
  };
}

/**
 * Convert Electron cookie records to Playwright cookie objects.
 */
export function toPlaywrightCookies(
  cookies: Array<Record<string, unknown>>
): Array<{
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}> {
  const out: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }> = [];
  for (const c of cookies) {
    const name = String(c.name || '');
    const value = String(c.value || '');
    const domain = String(c.domain || '');
    if (!name || !domain) continue;
    let expires: number | undefined;
    const exp = c.expirationDate ?? c.expires;
    if (typeof exp === 'number') {
      // Chrome/Electron sometimes use seconds, Playwright wants epoch seconds.
      expires = exp > 1e12 ? Math.floor(exp / 1000) : Math.floor(exp);
    }
    const sameSiteRaw = String(c.sameSite || 'Lax');
    const sameSite =
      sameSiteRaw === 'Strict' || sameSiteRaw === 'None'
        ? sameSiteRaw
        : sameSiteRaw === 'no_restriction'
          ? 'None'
          : 'Lax';
    out.push({
      name,
      value,
      domain,
      path: String(c.path || '/'),
      expires,
      httpOnly: Boolean(c.httpOnly),
      secure: Boolean(c.secure),
      sameSite,
    });
  }
  return out;
}

/** Compact OAuth-style Google sign-in URL (account chooser). */
export function googleSignInUrl(continueUrl?: string): string {
  const cont = continueUrl || 'https://myaccount.google.com/';
  return (
    'https://accounts.google.com/AccountChooser' +
    `?continue=${encodeURIComponent(cont)}&hl=en`
  );
}
