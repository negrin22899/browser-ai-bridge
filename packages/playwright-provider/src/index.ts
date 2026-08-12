// Core components
export { PlaywrightProvider } from './playwright-provider.js';
export type { PlaywrightProviderOptions } from './playwright-provider.js';

// Browser management
export { BrowserManager } from './browser-manager.js';
export type { BrowserManagerOptions } from './browser-manager.js';

// Adapter abstraction
export { PlaywrightAdapter } from './playwright-adapter.js';
export type { PlaywrightAdapterConfig } from './playwright-adapter.js';

// Browser session management
export { BrowserSession } from './browser-session.js';
export { TabManager } from './tab-manager.js';

// Message handling
export { MessageSender } from './message-sender.js';
export { ResponseReader } from './response-reader.js';
export type { ResponseReaderOptions } from './response-reader.js';

// Site-specific adapters (SiteAdapter interface implementations)
export { GeminiAdapter } from './adapters/gemini.js';
export { ChatGPTAdapter } from './adapters/chatgpt.js';
export { ClaudeAdapter } from './adapters/claude.js';
export { DeepSeekAdapter } from './adapters/deepseek.js';

// PlaywrightAdapter implementations
export { GeminiPlaywrightAdapter } from './adapters/gemini-adapter.js';
export { ChatGPTPlaywrightAdapter } from './adapters/chatgpt-adapter.js';
export { ClaudePlaywrightAdapter } from './adapters/claude-adapter.js';
export { DeepSeekPlaywrightAdapter } from './adapters/deepseek-adapter.js';

// Session persistence
export { SessionPersistence } from './session-persistence.js';
export type { PersistedSession, SessionPersistenceConfig } from './session-persistence.js';

// Retry logic
export { withRetry, withConnectionRetry } from './retry-logic.js';
export type { RetryConfig } from './retry-logic.js';

// Profile management
export { ProfileManager } from './profile-manager.js';
export type { BrowserProfile, ProfileManagerConfig } from './profile-manager.js';

// Reliability layer
export { ResilientFinder, HealthMonitor, SessionRecovery, SelectorDiscovery } from './reliability.js';
export type { SelectorStrategy, HealthCheckResult, RecoveryAction } from './reliability.js';

// Browser Runtime (Replaceable Browser Layer)
export type {
  BrowserRuntime,
  BrowserAdapterMetadata,
  BrowserState,
  BrowserCapabilities,
  BrowserConnectionState,
  BrowserConnectOptions,
  BrowserTab,
  BrowserElement,
  BrowserError,
  BrowserHealthResult,
  BrowserErrorCode,
  BrowserAdapterType,
  NavigationOptions,
  FindOptions,
  ClickOptions,
  TypeOptions,
  WaitOptions,
  ScreenshotOptions,
} from './browser-runtime.js';

// Browser Adapters
export { PlaywrightAdapter as PlaywrightAdapterV2 } from './playwright-adapter-v2.js';
export { CDPAdapter } from './cdp-adapter.js';
export { ExtensionAdapter } from './extension-adapter.js';

// CDP client
export { CDPClient } from './cdp-client.js';
