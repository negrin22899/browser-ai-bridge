import type {
  BrowserRuntime,
  BrowserAdapterMetadata,
  BrowserState,
  BrowserCapabilities,
  BrowserConnectOptions,
  BrowserTab,
  BrowserElement,
  BrowserHealthResult,
  BrowserConnectionState,
  NavigationOptions,
  FindOptions,
  ClickOptions,
  TypeOptions,
  WaitOptions,
  ScreenshotOptions,
} from './browser-runtime.js';

/**
 * ExtensionAdapter - Browser Extension adapter
 * 
 * Connects to user's existing browser via Chrome Extension.
 * 
 * STATUS: Architecture stub - implementation pending
 * 
 * Scenario:
 * Chrome → Browser Extension → Local Bridge → BAB Browser Adapter → Provider
 * 
 * Main advantage:
 * BAB can work with user's already-open browser.
 * No need to launch a separate Chrome instance.
 */
export class ExtensionAdapter implements BrowserRuntime {
  readonly metadata: BrowserAdapterMetadata = {
    id: 'extension',
    name: 'Browser Extension',
    version: '0.1.0',
    type: 'extension',
    description: 'Connect to existing browser via extension',
  };

  readonly capabilities: BrowserCapabilities = {
    tabs: true,
    navigation: true,
    dom: true,
    screenshots: false,
    input: true,
    events: true,
    evaluate: true,
    launch: false,
    connectExisting: true,
  };

  private _state: BrowserConnectionState = 'disconnected';
  private bridgePort: number = 9223;

  get state(): BrowserState {
    return {
      state: this._state,
      timestamp: Date.now(),
    };
  }

  // --- Connection ---

  async connect(_options?: BrowserConnectOptions): Promise<void> {
    this._state = 'connecting';

    try {
      // TODO: Implement extension connection
      // 1. Start local bridge server
      // 2. Wait for extension to connect
      // 3. Establish communication channel
      console.log(`Extension: Waiting for bridge on port ${this.bridgePort}`);
      this._state = 'connected';
    } catch (error) {
      this._state = 'error';
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this._state = 'disconnected';
  }

  isConnected(): boolean {
    return this._state === 'connected';
  }

  // --- Health ---

  async health(): Promise<BrowserHealthResult> {
    return {
      healthy: this._state === 'connected',
      state: this._state,
    };
  }

  // --- Tab Management ---

  async listTabs(): Promise<BrowserTab[]> {
    // TODO: Implement via extension messaging
    return [];
  }

  async createTab(_url?: string): Promise<BrowserTab> {
    throw new Error('Not implemented - use existing browser tabs');
  }

  async closeTab(_tabId: string): Promise<void> {
    // TODO: Implement via extension messaging
  }

  async activateTab(_tabId: string): Promise<void> {
    // TODO: Implement via extension messaging
  }

  async getActiveTab(): Promise<BrowserTab | null> {
    return null;
  }

  // --- Navigation ---

  async navigate(_url: string, _options?: NavigationOptions): Promise<void> {
    // TODO: Implement via extension messaging
  }

  async getCurrentUrl(): Promise<string> {
    return '';
  }

  async getTitle(): Promise<string> {
    return '';
  }

  async goBack(): Promise<void> {
    // TODO: Implement via extension messaging
  }

  async goForward(): Promise<void> {
    // TODO: Implement via extension messaging
  }

  async reload(): Promise<void> {
    // TODO: Implement via extension messaging
  }

  // --- DOM Interaction ---

  async find(_selector: string, _options?: FindOptions): Promise<BrowserElement | null> {
    // TODO: Implement via extension content script
    return null;
  }

  async findAll(_selector: string, _options?: FindOptions): Promise<BrowserElement[]> {
    return [];
  }

  async click(_selector: string, _options?: ClickOptions): Promise<void> {
    // TODO: Implement via extension content script
  }

  async type(_selector: string, _text: string, _options?: TypeOptions): Promise<void> {
    // TODO: Implement via extension content script
  }

  async fill(_selector: string, _value: string): Promise<void> {
    // TODO: Implement via extension content script
  }

  async read(_selector: string): Promise<string> {
    return '';
  }

  async readAll(_selector: string): Promise<string[]> {
    return [];
  }

  async getContent(): Promise<string> {
    return '';
  }

  async waitFor(_selector: string, _options?: WaitOptions): Promise<void> {
    // TODO: Implement via extension content script
  }

  async waitForNavigation(_options?: NavigationOptions): Promise<void> {
    // TODO: Implement via extension messaging
  }

  // --- Advanced ---

  async screenshot(_options?: ScreenshotOptions): Promise<Buffer> {
    // TODO: Implement via extension messaging
    return Buffer.alloc(0);
  }

  async evaluate<T>(_script: string, ..._args: unknown[]): Promise<T> {
    // TODO: Implement via extension content script
    throw new Error('Not implemented');
  }

  async pressKey(_key: string): Promise<void> {
    // TODO: Implement via extension content script
  }

  async scroll(_direction: 'up' | 'down', _amount?: number): Promise<void> {
    // TODO: Implement via extension content script
  }
}
