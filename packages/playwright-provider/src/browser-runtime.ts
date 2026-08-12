/**
 * Browser Runtime — Stable Contract for Browser Interaction
 * 
 * Provider knows WHAT to do with the browser.
 * Browser Adapter knows HOW to do it.
 * 
 * Architecture:
 * Provider → BrowserRuntime → BrowserAdapter → Browser
 * 
 * This interface is STABLE. Adding a new Browser Adapter
 * does NOT require changing Provider or BrowserRuntime.
 */

// ============================================================================
// BROWSER RUNTIME INTERFACE
// ============================================================================

/**
 * BrowserRuntime - the stable contract for browser interaction
 * 
 * All browser providers use this interface.
 * Implementations: PlaywrightAdapter, CDPAdapter, ExtensionAdapter
 */
export interface BrowserRuntime {
  /** Adapter metadata */
  readonly metadata: BrowserAdapterMetadata;

  /** Current connection state */
  readonly state: BrowserState;

  /** Adapter capabilities */
  readonly capabilities: BrowserCapabilities;

  // --- Connection ---

  /** Connect to browser */
  connect(options?: BrowserConnectOptions): Promise<void>;

  /** Disconnect from browser */
  disconnect(): Promise<void>;

  /** Check if connected */
  isConnected(): boolean;

  // --- Health ---

  /** Check browser health */
  health(): Promise<BrowserHealthResult>;

  // --- Tab Management ---

  /** List all tabs */
  listTabs(): Promise<BrowserTab[]>;

  /** Create a new tab */
  createTab(url?: string): Promise<BrowserTab>;

  /** Close a tab */
  closeTab(tabId: string): Promise<void>;

  /** Activate/switch to a tab */
  activateTab(tabId: string): Promise<void>;

  /** Get active tab */
  getActiveTab(): Promise<BrowserTab | null>;

  // --- Navigation ---

  /** Navigate to URL */
  navigate(url: string, options?: NavigationOptions): Promise<void>;

  /** Get current URL */
  getCurrentUrl(): Promise<string>;

  /** Get page title */
  getTitle(): Promise<string>;

  /** Go back */
  goBack(): Promise<void>;

  /** Go forward */
  goForward(): Promise<void>;

  /** Reload page */
  reload(): Promise<void>;

  // --- DOM Interaction ---

  /** Find element by selector */
  find(selector: string, options?: FindOptions): Promise<BrowserElement | null>;

  /** Find multiple elements */
  findAll(selector: string, options?: FindOptions): Promise<BrowserElement[]>;

  /** Click element */
  click(selector: string, options?: ClickOptions): Promise<void>;

  /** Type text into element */
  type(selector: string, text: string, options?: TypeOptions): Promise<void>;

  /** Fill input field */
  fill(selector: string, value: string): Promise<void>;

  /** Read text from element */
  read(selector: string): Promise<string>;

  /** Read text from multiple elements */
  readAll(selector: string): Promise<string[]>;

  /** Get page content */
  getContent(): Promise<string>;

  /** Wait for selector */
  waitFor(selector: string, options?: WaitOptions): Promise<void>;

  /** Wait for navigation */
  waitForNavigation(options?: NavigationOptions): Promise<void>;

  // --- Advanced ---

  /** Take screenshot */
  screenshot(options?: ScreenshotOptions): Promise<Buffer>;

  /** Execute JavaScript */
  evaluate<T>(script: string, ...args: unknown[]): Promise<T>;

  /** Press keyboard key */
  pressKey(key: string): Promise<void>;

  /** Scroll page */
  scroll(direction: 'up' | 'down', amount?: number): Promise<void>;
}

// ============================================================================
// BROWSER ADAPTER METADATA
// ============================================================================

export interface BrowserAdapterMetadata {
  /** Adapter ID */
  readonly id: string;

  /** Adapter name */
  readonly name: string;

  /** Adapter version */
  readonly version: string;

  /** Adapter type */
  readonly type: BrowserAdapterType;

  /** Description */
  readonly description?: string;
}

export type BrowserAdapterType = 'playwright' | 'cdp' | 'extension';

// ============================================================================
// BROWSER STATE
// ============================================================================

export type BrowserConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'recovering';

export interface BrowserState {
  /** Connection state */
  state: BrowserConnectionState;

  /** State timestamp */
  timestamp: number;

  /** Error if in error state */
  error?: BrowserError;
}

// ============================================================================
// BROWSER CAPABILITIES
// ============================================================================

export interface BrowserCapabilities {
  /** Can manage tabs */
  tabs: boolean;

  /** Can navigate */
  navigation: boolean;

  /** Can interact with DOM */
  dom: boolean;

  /** Can take screenshots */
  screenshots: boolean;

  /** Can handle input */
  input: boolean;

  /** Can listen to events */
  events: boolean;

  /** Can execute JavaScript */
  evaluate: boolean;

  /** Can launch new browser */
  launch: boolean;

  /** Can connect to existing browser */
  connectExisting: boolean;

  /** Custom capabilities */
  custom?: Record<string, boolean>;
}

// ============================================================================
// BROWSER TAB
// ============================================================================

export interface BrowserTab {
  /** Tab ID */
  id: string;

  /** Tab URL */
  url: string;

  /** Tab title */
  title: string;

  /** Is active tab */
  isActive: boolean;

  /** Tab creation time */
  createdAt: number;
}

// ============================================================================
// BROWSER ELEMENT
// ============================================================================

export interface BrowserElement {
  /** Element selector */
  selector: string;

  /** Is visible */
  isVisible: boolean;

  /** Element text content */
  text?: string;

  /** Element tag name */
  tagName?: string;

  /** Element attributes */
  attributes?: Record<string, string>;
}

// ============================================================================
// BROWSER ERROR
// ============================================================================

export type BrowserErrorCode =
  | 'CONNECTION_FAILED'
  | 'BROWSER_NOT_FOUND'
  | 'TAB_NOT_FOUND'
  | 'ELEMENT_NOT_FOUND'
  | 'NAVIGATION_FAILED'
  | 'TIMEOUT'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN';

export interface BrowserError {
  code: BrowserErrorCode;
  message: string;
  recoverable: boolean;
  recovery?: string;
  original?: unknown;
}

// ============================================================================
// OPTIONS
// ============================================================================

export interface BrowserConnectOptions {
  /** Browser executable path */
  executablePath?: string;

  /** User data directory */
  userDataDir?: string;

  /** Headless mode */
  headless?: boolean;

  /** CDP endpoint URL */
  cdpEndpoint?: string;

  /** Extension ID */
  extensionId?: string;

  /** Custom options */
  custom?: Record<string, unknown>;
}

export interface NavigationOptions {
  /** Wait until */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';

  /** Timeout in ms */
  timeout?: number;
}

export interface FindOptions {
  /** Timeout in ms */
  timeout?: number;

  /** Must be visible */
  visible?: boolean;
}

export interface ClickOptions {
  /** Force click even if element is intercepted */
  force?: boolean;

  /** Click delay in ms */
  delay?: number;

  /** Timeout in ms */
  timeout?: number;
}

export interface TypeOptions {
  /** Typing delay in ms */
  delay?: number;

  /** Timeout in ms */
  timeout?: number;
}

export interface WaitOptions {
  /** Timeout in ms */
  timeout?: number;

  /** State to wait for */
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
}

export interface ScreenshotOptions {
  /** Full page screenshot */
  fullPage?: boolean;

  /** Image format */
  format?: 'png' | 'jpeg';

  /** Quality (jpeg only) */
  quality?: number;
}

// ============================================================================
// BROWSER HEALTH
// ============================================================================

export interface BrowserHealthResult {
  /** Is healthy */
  healthy: boolean;

  /** Connection state */
  state: BrowserConnectionState;

  /** Latency in ms */
  latency?: number;

  /** Error if unhealthy */
  error?: BrowserError;

  /** Active tabs count */
  tabCount?: number;

  /** Browser version */
  browserVersion?: string;
}
