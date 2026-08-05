import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaywrightProvider } from './playwright-provider.js';
import type { SiteAdapter } from './site-adapter.js';

// Mock Playwright
vi.mock('playwright-core', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        goto: vi.fn(),
        waitForTimeout: vi.fn(),
        close: vi.fn(),
      }),
      close: vi.fn(),
    }),
  },
}));

function createMockAdapter(): SiteAdapter {
  return {
    siteId: 'test',
    siteUrl: 'https://test.com',
    displayName: 'Test',
    matches: vi.fn().mockReturnValue(true),
    waitForReady: vi.fn(),
    fillInput: vi.fn(),
    clickSend: vi.fn(),
    extractResponse: vi.fn().mockResolvedValue('Test response'),
    isResponseComplete: vi.fn().mockResolvedValue(true),
  };
}

describe('PlaywrightProvider', () => {
  let provider: PlaywrightProvider;
  let adapter: SiteAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
    provider = new PlaywrightProvider({
      id: 'test-provider',
      name: 'Test Provider',
      siteUrl: 'https://test.com',
      adapter,
    });
  });

  describe('Initialization', () => {
    it('should have correct id and name', () => {
      expect(provider.id).toBe('test-provider');
      expect(provider.name).toBe('Test Provider');
    });

    it('should have idle status initially', () => {
      expect(provider.status).toBe('idle');
    });

    it('should accept custom adapter', () => {
      expect(provider.getTools()).toEqual([]);
    });
  });

  describe('Tools', () => {
    it('should set and get tools', () => {
      const tools = [
        { name: 'fs.read', description: 'Read file', parameters: {} },
      ];

      provider.setTools(tools);
      expect(provider.getTools()).toEqual(tools);
    });
  });

  describe('Connection', () => {
    it('should connect to browser', async () => {
      await provider.connect();

      expect(adapter.waitForReady).toHaveBeenCalled();
      expect(provider.status).toBe('idle');
    });
  });

  describe('Message Sending', () => {
    it('should send message and get response', async () => {
      await provider.connect();

      const response = await provider.send({
        model: 'test',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response.choices[0].message.content).toBe('Test response');
      expect(adapter.fillInput).toHaveBeenCalledWith(expect.anything(), 'Hello');
      expect(adapter.clickSend).toHaveBeenCalled();
    });

    it('should throw when sending without connection', async () => {
      await expect(
        provider.send({
          model: 'test',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Not connected');
    });
  });

  describe('Streaming', () => {
    it('should stream response', async () => {
      await provider.connect();

      const chunks = [];
      for await (const chunk of provider.stream({
        model: 'test',
        messages: [{ role: 'user', content: 'Hello' }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].choices[0].delta.content).toBe('Test response');
      expect(chunks[1].choices[0].finish_reason).toBe('stop');
    });
  });

  describe('Shutdown', () => {
    it('should shutdown cleanly', async () => {
      await provider.connect();
      await provider.shutdown();

      expect(provider.status).toBe('shutdown');
    });
  });
});
