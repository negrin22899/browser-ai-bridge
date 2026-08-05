import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Router } from './router.js';
import { EventBus } from './event-bus.js';
import type { Provider, ChatCompletionRequest, ChatCompletionResponse } from '@bab/protocol';

function createMockProvider(id: string): Provider {
  return {
    id,
    name: id,
    status: 'idle',
    send: vi.fn(),
    stream: vi.fn(),
    cancel: vi.fn(),
    shutdown: vi.fn(),
  };
}

describe('Router', () => {
  let router: Router;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    router = new Router(eventBus);
  });

  it('should register a provider', () => {
    const provider = createMockProvider('gemini');
    router.registerProvider(provider);

    expect(router.getProvider('gemini')).toBe(provider);
  });

  it('should throw when registering duplicate provider', () => {
    const provider = createMockProvider('gemini');
    router.registerProvider(provider);

    expect(() => router.registerProvider(provider)).toThrow('already registered');
  });

  it('should set and get active provider', () => {
    const provider = createMockProvider('gemini');
    router.registerProvider(provider);
    router.setActiveProvider('gemini');

    expect(router.getActiveProvider()).toBe(provider);
  });

  it('should throw when setting non-existent provider as active', () => {
    expect(() => router.setActiveProvider('nonexistent')).toThrow('not found');
  });

  it('should route request to active provider', async () => {
    const provider = createMockProvider('gemini');
    const mockResponse: ChatCompletionResponse = {
      id: 'test-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gemini-pro',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Hello' },
        finish_reason: 'stop',
      }],
    };

    vi.mocked(provider.send).mockResolvedValue(mockResponse);

    router.registerProvider(provider);
    router.setActiveProvider('gemini');

    const request: ChatCompletionRequest = {
      model: 'gemini-pro',
      messages: [{ role: 'user', content: 'Hi' }],
    };

    const response = await router.route(request);

    expect(provider.send).toHaveBeenCalledWith(request);
    expect(response).toBe(mockResponse);
  });

  it('should emit request events', async () => {
    const provider = createMockProvider('gemini');
    vi.mocked(provider.send).mockResolvedValue({
      id: 'test-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gemini-pro',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'Hello' },
        finish_reason: 'stop',
      }],
    });

    router.registerProvider(provider);
    router.setActiveProvider('gemini');

    const receivedHandler = vi.fn();
    const completedHandler = vi.fn();
    eventBus.on('request.received', receivedHandler);
    eventBus.on('request.completed', completedHandler);

    await router.route({
      model: 'gemini-pro',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(receivedHandler).toHaveBeenCalled();
    expect(completedHandler).toHaveBeenCalled();
  });

  it('should throw when no active provider set', async () => {
    await expect(router.route({
      model: 'test',
      messages: [],
    })).rejects.toThrow('No active provider');
  });
});
