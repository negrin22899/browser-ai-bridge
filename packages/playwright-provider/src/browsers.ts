import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Chromium-based browsers we know how to drive.
 * All share the Chrome cookie/profile format, so Playwright can
 * use them via chromium.launchPersistentContext with executablePath+userDataDir.
 */
export type BrowserId = 'chrome' | 'edge' | 'brave' | 'opera' | 'vivaldi' | 'chromium';

export interface BrowserInfo {
  id: BrowserId;
  name: string;
  executablePath: string;
  userDataDir: string;
  installed: boolean;
}

interface Candidate {
  id: BrowserId;
  name: string;
  win: { exe: string[]; data: string[] };
  mac: { exe: string[]; data: string[] };
  linux: { exe: string[]; data: string[] };
}

function home(): string {
  return os.homedir();
}

function localAppData(): string {
  return process.env.LOCALAPPDATA || path.join(home(), 'AppData', 'Local');
}

function programFiles(): string {
  return process.env.PROGRAMFILES || 'C:\\Program Files';
}

function programFilesX86(): string {
  return process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
}

const CANDIDATES: Candidate[] = [
  {
    id: 'chrome',
    name: 'Google Chrome',
    win: {
      exe: [
        path.join(programFiles(), 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(programFilesX86(), 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(localAppData(), 'Google', 'Chrome', 'Application', 'chrome.exe'),
      ],
      data: [path.join(localAppData(), 'Google', 'Chrome', 'User Data')],
    },
    mac: {
      exe: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
      data: [path.join(home(), 'Library', 'Application Support', 'Google', 'Chrome')],
    },
    linux: {
      exe: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/snap/bin/google-chrome'],
      data: [path.join(home(), '.config', 'google-chrome')],
    },
  },
  {
    id: 'edge',
    name: 'Microsoft Edge',
    win: {
      exe: [
        path.join(programFiles(), 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(programFilesX86(), 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      ],
      data: [path.join(localAppData(), 'Microsoft', 'Edge', 'User Data')],
    },
    mac: {
      exe: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
      data: [path.join(home(), 'Library', 'Application Support', 'Microsoft Edge')],
    },
    linux: {
      exe: ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable'],
      data: [path.join(home(), '.config', 'microsoft-edge')],
    },
  },
  {
    id: 'brave',
    name: 'Brave',
    win: {
      exe: [
        path.join(programFiles(), 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
        path.join(programFilesX86(), 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
        path.join(localAppData(), 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      ],
      data: [path.join(localAppData(), 'BraveSoftware', 'Brave-Browser', 'User Data')],
    },
    mac: {
      exe: ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'],
      data: [path.join(home(), 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser')],
    },
    linux: {
      exe: ['/usr/bin/brave-browser', '/usr/bin/brave'],
      data: [path.join(home(), '.config', 'BraveSoftware', 'Brave-Browser')],
    },
  },
  {
    id: 'opera',
    name: 'Opera',
    win: {
      exe: [
        path.join(localAppData(), 'Programs', 'Opera', 'opera.exe'),
        path.join(programFiles(), 'Opera', 'opera.exe'),
      ],
      data: [path.join(process.env.APPDATA || path.join(home(), 'AppData', 'Roaming'), 'Opera Software', 'Opera Stable')],
    },
    mac: {
      exe: ['/Applications/Opera.app/Contents/MacOS/Opera'],
      data: [path.join(home(), 'Library', 'Application Support', 'com.operasoftware.Opera')],
    },
    linux: {
      exe: ['/usr/bin/opera'],
      data: [path.join(home(), '.config', 'opera')],
    },
  },
  {
    id: 'vivaldi',
    name: 'Vivaldi',
    win: {
      exe: [
        path.join(localAppData(), 'Vivaldi', 'Application', 'vivaldi.exe'),
        path.join(programFiles(), 'Vivaldi', 'Application', 'vivaldi.exe'),
      ],
      data: [path.join(localAppData(), 'Vivaldi', 'User Data')],
    },
    mac: {
      exe: ['/Applications/Vivaldi.app/Contents/MacOS/Vivaldi'],
      data: [path.join(home(), 'Library', 'Application Support', 'Vivaldi')],
    },
    linux: {
      exe: ['/usr/bin/vivaldi', '/usr/bin/vivaldi-stable'],
      data: [path.join(home(), '.config', 'vivaldi')],
    },
  },
  {
    id: 'chromium',
    name: 'Chromium',
    win: {
      exe: [path.join(localAppData(), 'Chromium', 'Application', 'chrome.exe')],
      data: [path.join(localAppData(), 'Chromium', 'User Data')],
    },
    mac: {
      exe: ['/Applications/Chromium.app/Contents/MacOS/Chromium'],
      data: [path.join(home(), 'Library', 'Application Support', 'Chromium')],
    },
    linux: {
      exe: ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'],
      data: [path.join(home(), '.config', 'chromium')],
    },
  },
];

function firstExisting(paths: string[]): string {
  for (const p of paths) {
    if (p && fs.existsSync(p)) return p;
  }
  return '';
}

function platformPaths(c: Candidate): { exe: string[]; data: string[] } {
  const p = os.platform();
  if (p === 'win32') return c.win;
  if (p === 'darwin') return c.mac;
  return c.linux;
}

/**
 * Return info for one browser (installed or not).
 */
export function getBrowserInfo(id: BrowserId): BrowserInfo | null {
  const c = CANDIDATES.find((x) => x.id === id);
  if (!c) return null;
  const p = platformPaths(c);
  const exe = firstExisting(p.exe);
  const data = firstExisting(p.data);
  return {
    id: c.id,
    name: c.name,
    executablePath: exe,
    userDataDir: data,
    installed: Boolean(exe),
  };
}

/**
 * Detect all Chromium browsers installed on the current machine.
 * Returns only ones with a real executable on disk.
 */
export function detectInstalledBrowsers(): BrowserInfo[] {
  const out: BrowserInfo[] = [];
  for (const c of CANDIDATES) {
    const info = getBrowserInfo(c.id);
    if (info?.installed) out.push(info);
  }
  return out;
}

/**
 * Full catalogue (installed + not) — useful for UI dropdown that greys out
 * missing options with a "not installed" hint.
 */
export function listAllBrowsers(): BrowserInfo[] {
  return CANDIDATES.map((c) => getBrowserInfo(c.id)!).filter(Boolean);
}
