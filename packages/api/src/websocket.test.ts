import { describe, it, expect, beforeEach } from 'vitest';
import { WebSocketHandler } from './websocket.js';

describe('WebSocketHandler', () => {
  let handler: WebSocketHandler;

  beforeEach(() => {
    handler = new WebSocketHandler({ path: '/ws' });
  });

  it('should track connected clients', () => {
    const mockClient = {
      send: () => {},
      close: () => {},
      readyState: 1,
    };

    handler.open(mockClient);

    expect(handler.getClientCount()).toBe(1);
  });

  it('should remove disconnected clients', () => {
    const mockClient = {
      send: () => {},
      close: () => {},
      readyState: 1,
    };

    handler.open(mockClient);
    handler.close(mockClient);

    expect(handler.getClientCount()).toBe(0);
  });

  it('should broadcast messages', () => {
    const messages: string[] = [];
    const mockClient1 = {
      send: (data: string) => messages.push(data),
      close: () => {},
      readyState: 1,
    };
    const mockClient2 = {
      send: (data: string) => messages.push(data),
      close: () => {},
      readyState: 1,
    };

    handler.open(mockClient1);
    handler.open(mockClient2);

    // Ignore welcome messages sent during open()
    messages.length = 0;

    handler.broadcast({ type: 'test', data: { value: 123 } });

    expect(messages).toHaveLength(2);
    expect(JSON.parse(messages[0]).type).toBe('test');
  });

  it('should handle ping messages', () => {
    const messages: string[] = [];
    const mockClient = {
      send: (data: string) => messages.push(data),
      close: () => {},
      readyState: 1,
    };

    handler.open(mockClient);
    handler.message(mockClient, JSON.stringify({ type: 'ping' }));

    expect(messages.length).toBeGreaterThan(1); // welcome + pong
    const lastMessage = JSON.parse(messages[messages.length - 1]);
    expect(lastMessage.type).toBe('pong');
  });

  it('should get path', () => {
    expect(handler.getPath()).toBe('/ws');
  });

  it('should close all connections', () => {
    let closed = false;
    const mockClient = {
      send: () => {},
      close: () => { closed = true; },
      readyState: 1,
    };

    handler.open(mockClient);
    handler.closeAll();

    expect(closed).toBe(true);
    expect(handler.getClientCount()).toBe(0);
  });
});
