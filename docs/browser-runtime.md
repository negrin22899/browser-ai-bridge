# Browser Runtime — Replaceable Browser Layer

> Version: 1.0.0  
> Date: 2026-08-11  
> Status: Accepted

---

## Главный принцип

```
Provider знает, ЧТО ему нужно сделать с браузером.
Browser Adapter знает, КАК это сделать.
```

---

## Архитектура

```
Provider
   │
   ▼
Browser Runtime (interface)
   │
   ├──────────────┐
   ▼              ▼
Playwright       CDP
   │              │
   ▼              ▼
Chrome          Chrome

             +
             
Browser Extension
        │
        ▼
  Existing Browser
```

---

## BrowserRuntime Interface

Стабильный контракт для взаимодействия с браузером:

```typescript
interface BrowserRuntime {
  readonly metadata: BrowserAdapterMetadata;
  readonly state: BrowserState;
  readonly capabilities: BrowserCapabilities;

  // Connection
  connect(options?: BrowserConnectOptions): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Health
  health(): Promise<BrowserHealthResult>;

  // Tab Management
  listTabs(): Promise<BrowserTab[]>;
  createTab(url?: string): Promise<BrowserTab>;
  closeTab(tabId: string): Promise<void>;
  activateTab(tabId: string): Promise<void>;
  getActiveTab(): Promise<BrowserTab | null>;

  // Navigation
  navigate(url: string, options?: NavigationOptions): Promise<void>;
  getCurrentUrl(): Promise<string>;
  getTitle(): Promise<string>;
  goBack(): Promise<void>;
  goForward(): Promise<void>;
  reload(): Promise<void>;

  // DOM Interaction
  find(selector: string, options?: FindOptions): Promise<BrowserElement | null>;
  findAll(selector: string, options?: FindOptions): Promise<BrowserElement[]>;
  click(selector: string, options?: ClickOptions): Promise<void>;
  type(selector: string, text: string, options?: TypeOptions): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  read(selector: string): Promise<string>;
  readAll(selector: string): Promise<string[]>;
  getContent(): Promise<string>;
  waitFor(selector: string, options?: WaitOptions): Promise<void>;

  // Advanced
  screenshot(options?: ScreenshotOptions): Promise<Buffer>;
  evaluate<T>(script: string, ...args: unknown[]): Promise<T>;
  pressKey(key: string): Promise<void>;
  scroll(direction: 'up' | 'down', amount?: number): Promise<void>;
}
```

---

## Browser Adapters

### PlaywrightAdapter ✅ Implemented

```typescript
class PlaywrightAdapter implements BrowserRuntime {
  readonly metadata = {
    id: 'playwright',
    name: 'Playwright',
    version: '1.0.0',
    type: 'playwright',
  };
  
  readonly capabilities = {
    tabs: true,
    navigation: true,
    dom: true,
    screenshots: true,
    input: true,
    events: true,
    evaluate: true,
    launch: true,
    connectExisting: true,
  };
}
```

### CDPAdapter 🔲 Architecture Stub

```typescript
class CDPAdapter implements BrowserRuntime {
  readonly metadata = {
    id: 'cdp',
    name: 'Chrome DevTools Protocol',
    version: '0.1.0',
    type: 'cdp',
  };
  
  readonly capabilities = {
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
}
```

### ExtensionAdapter 🔲 Architecture Stub

```typescript
class ExtensionAdapter implements BrowserRuntime {
  readonly metadata = {
    id: 'extension',
    name: 'Browser Extension',
    version: '0.1.0',
    type: 'extension',
  };
  
  readonly capabilities = {
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
}
```

---

## Provider Independence

### Плохо (сейчас):

```typescript
class GeminiProvider {
  async send() {
    await this.page.locator('...').click(); // Playwright-specific
  }
}
```

### Хорошо (после рефакторинга):

```typescript
class GeminiProvider {
  async send() {
    await this.browserRuntime.click('...'); // Browser-agnostic
  }
}
```

---

## Browser Capabilities

Используем существующую Capability System:

```typescript
interface BrowserCapabilities {
  tabs: boolean;
  navigation: boolean;
  dom: boolean;
  screenshots: boolean;
  input: boolean;
  events: boolean;
  evaluate: boolean;
  launch: boolean;
  connectExisting: boolean;
}
```

---

## Browser Session

Session независима от транспорта:

```typescript
interface BrowserSession {
  adapter: 'playwright' | 'cdp' | 'extension';
  sessionId: string;
  tabs: BrowserTab[];
  state: BrowserState;
  capabilities: BrowserCapabilities;
  health: BrowserHealthResult;
}
```

---

## Browser Health

Используем существующий Reliability Layer:

```
Browser Adapter
  ↓
HealthMonitor
  ↓
Failure
  ↓
Recovery
  ↓
Re-check capabilities
```

---

## Error Model

Используем существующую нормализованную Error Model:

| Browser Error | BAB Error Code |
|---------------|----------------|
| TargetClosedError | `BROWSER_UNAVAILABLE` |
| Selector not found | `PAGE_NOT_FOUND` или `UI_CHANGED` |
| Connection failed | `BROWSER_UNAVAILABLE` |
| Timeout | `TIMEOUT` |

---

## Observability

Все Browser Adapter actions используют:
- `trace_id`
- `session_id`
- `request_id`

```
trace abc123

Provider request
  ↓
Browser.connect
  ↓
Browser.find
  ↓
Browser.click
  ↓
Browser.type
  ↓
Browser.read
  ↓
Provider response
```

---

## Tests

### Browser Adapter Contract Tests

Каждый Adapter проверяется:
- connect
- disconnect
- health
- listTabs
- createTab
- activateTab
- navigate
- find
- click
- type
- read
- error handling
- recovery
- capabilities

### E2E Test

```
OpenCode
  ↓
Bridge
  ↓
Provider
  ↓
BrowserRuntime
  ↓
PlaywrightAdapter
  ↓
Browser
  ↓
AI
  ↓
Response
```

---

## Главный критерий

```
Добавление нового Browser Adapter НЕ требует изменения Provider.
Добавление нового Browser Provider НЕ требует изменения Browser Runtime.
```

---

## Ссылки

- [Browser Runtime Interface](../packages/playwright-provider/src/browser-runtime.ts)
- [PlaywrightAdapter](../packages/playwright-provider/src/playwright-adapter-v2.ts)
- [CDPAdapter](../packages/playwright-provider/src/cdp-adapter.ts)
- [ExtensionAdapter](../packages/playwright-provider/src/extension-adapter.ts)
