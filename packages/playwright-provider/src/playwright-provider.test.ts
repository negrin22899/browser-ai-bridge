import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaywrightProvider } from './playwright-provider.js';
import type { PlaywrightAdapter } from './playwright-adapter.js';

// Mock Playwright so connect() resolves without a real browser
vi.mock('playwright-core', () => ({
  chromium: {
    connectOverCDP: vi.fn().mockResolvedValue({ close: vi.fn() }),
  },
}));

function createMockAdapter(): PlaywrightAdapter {
  const session = {
    id: 'session-1',
    url: 'https://test.com',
    close: vi.fn().mockResolvedValue(undefined),
  };

  return {
    siteId: 'test',
    siteUrl: 'https://test.com',
    displayName: 'Test',
    setBrowser: vi.fn(),
    createSession: vi.fn().mockResolvedValue(session),
    waitForReady: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    readResponse: vi.fn().mockResolvedValue('Test response'),
    streamResponse: vi.fn().mockImplementation(async function* () {
      yield 'Test response';
    }),
    isReady: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as PlaywrightAdapter;
}

describe('PlaywrightProvider', () => {
  let provider: PlaywrightProvider;
  let adapter: PlaywrightAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
    provider = new PlaywrightProvider({
      id: 'test-provider',
      name: 'Test Provider',
      adapter,
    });
  });

  describe('Initialization', () => {
    it('should have correct id and name', () => {
      expect(provider.id).toBe('test-provider');
      expect(provider.name).toBe('Test Provider');
    });

    it('should have disconnected status initially', () => {
      expect(provider.status).toBe('disconnected');
    });

    it('should start with no tools', () => {
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

      expect(adapter.setBrowser).toHaveBeenCalled();
      expect(adapter.createSession).toHaveBeenCalled();
      expect(provider.status).toBe('connected');
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
      expect(adapter.sendMessage).toHaveBeenCalled();
      expect(adapter.readResponse).toHaveBeenCalled();
    });

    it('should throw when sending without connection', async () => {
      await expect(
        provider.send({
          model: 'test',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Provider not connected');
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
    it('should disconnect cleanly', async () => {
      await provider.connect();
      await provider.disconnect();

      expect(provider.status).toBe('disconnected');
    });
  });
});
