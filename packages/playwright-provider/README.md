# @bab/playwright-provider

Browser Provider implementation using Playwright for Browser AI Bridge.

## Architecture

```
PlaywrightProvider
├── SiteAdapter          - Abstract interface for AI sites
├── Adapters
│   ├── GeminiAdapter    - Google Gemini
│   ├── ChatGPTAdapter   - OpenAI ChatGPT
│   ├── ClaudeAdapter    - Anthropic Claude
│   └── DeepSeekAdapter  - DeepSeek
└── CDPClient            - Chrome DevTools Protocol client
```

## Usage

```typescript
import { PlaywrightProvider, GeminiAdapter } from '@bab/playwright-provider';

// Create provider with specific adapter
const provider = new PlaywrightProvider({
  id: 'gemini',
  name: 'Gemini',
  siteUrl: 'https://gemini.google.com',
  headless: false,
  adapter: new GeminiAdapter(),
});

// Set available tools
provider.setTools([
  { name: 'fs.read', description: 'Read file', parameters: {} },
]);

// Connect to browser
await provider.connect();

// Send message
const response = await provider.send({
  model: 'gemini-pro',
  messages: [{ role: 'user', content: 'Hello' }],
});

// Shutdown
await provider.shutdown();
```

## Site Adapter Interface

Each AI site implements the `SiteAdapter` interface:

```typescript
interface SiteAdapter {
  readonly siteId: string;
  readonly siteUrl: string;
  readonly displayName: string;

  matches(url: string): boolean;
  waitForReady(page: Page): Promise<void>;
  fillInput(page: Page, message: string): Promise<void>;
  clickSend(page: Page): Promise<void>;
  extractResponse(page: Page): Promise<string>;
  isResponseComplete(page: Page): Promise<boolean>;
}
```

## Creating Custom Adapters

```typescript
import type { SiteAdapter } from '@bab/playwright-provider';
import type { Page } from 'playwright-core';

export class MyAIAdapter implements SiteAdapter {
  readonly siteId = 'my-ai';
  readonly siteUrl = 'https://my-ai.com';
  readonly displayName = 'My AI';

  matches(url: string): boolean {
    return url.includes('my-ai.com');
  }

  async waitForReady(page: Page): Promise<void> {
    await page.waitForSelector('textarea');
  }

  async fillInput(page: Page, message: string): Promise<void> {
    await page.fill('textarea', message);
  }

  async clickSend(page: Page): Promise<void> {
    await page.click('button[type="submit"]');
  }

  async extractResponse(page: Page): Promise<string> {
    return await page.textContent('.response') ?? '';
  }

  async isResponseComplete(page: Page): Promise<boolean> {
    const loading = await page.$('.loading');
    return loading === null;
  }
}
```

## CDP Client

Chrome DevTools Protocol client for advanced browser interaction:

```typescript
import { CDPClient } from '@bab/playwright-provider';

const cdp = new CDPClient();
await cdp.attach(page);

// Evaluate JavaScript
const result = await cdp.evaluate('document.title');

// Get console logs
const logs = await cdp.getConsoleLogs();
```

## Tests

```bash
npm test -w @bab/playwright-provider
```
