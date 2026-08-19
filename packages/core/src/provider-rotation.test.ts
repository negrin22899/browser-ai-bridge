import { describe, it, expect, vi } from 'vitest';
import { ProviderRotation, isBlockError } from './provider-rotation.js';
import type {
  Provider,
  ProviderStatus,
  ChatCompletionResponse,
  HealthCheckResult,
} from '@bab/protocol';

function response(id: string): ChatCompletionResponse {
  return {
    id,
    object: 'chat.completion',
    created: 0,
    model: 'test',
    choices: [{ index: 0, message: { role: 'assistant', content: `ok-${id}` }, finish_reason: 'stop' }],
  };
}

function mockProvider(
  id: string,
  status: ProviderStatus = 'connected',
  impl: Partial<Provider> = {}
): Provider {
  return {
    id,
    name: `Provider ${id}`,
    type: 'api',
    status,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(response(id)),
    stream: vi.fn().mockImplementation(async function* () {}),
    health: vi.fn().mockResolvedValue({ healthy: true } as HealthCheckResult),
    cancel: vi.fn(),
    getTools: vi.fn().mockReturnValue([]),
    getCapabilities: vi.fn().mockReturnValue({}),
    setTools: vi.fn(),
    ...impl,
  } as Provider;
}

describe('isBlockError', () => {
  it('detects auth/rate-limit/captcha messages', () => {
    expect(isBlockError(new Error('auth_required: re-login'))).toBe(true);
    expect(isBlockError(new Error('rate_limited by provider'))).toBe(true);
    expect(isBlockError(new Error('CAPTCHA challenge detected'))).toBe(true);
    expect(isBlockError(new Error('provider blocked the request'))).toBe(true);
  });

  it('ignores ordinary errors', () => {
    expect(isBlockError(new Error('timeout'))).toBe(false);
    expect(isBlockError('network down')).toBe(false);
  });
});

describe('ProviderRotation', () => {
  it('requires at least one provider', () => {
    expect(() => new ProviderRotation('gemini', [])).toThrow('at least one provider');
  });

  it('sends through the first connected provider', async () => {
    const a = mockProvider('a');
    const b = mockProvider('b');
    const rotation = new ProviderRotation('gemini', [a, b]);

    const result = await rotation.send({ model: 'gemini', messages: [{ role: 'user', content: 'hi' }] });

    expect(result.choices[0].message.content).toBe('ok-a');
    expect(a.send).toHaveBeenCalledOnce();
    expect(b.send).not.toHaveBeenCalled();
  });

  it('skips errored providers and uses the connected one', async () => {
    const a = mockProvider('a', 'error');
    const b = mockProvider('b', 'connected');
    const rotation = new ProviderRotation('gemini', [a, b]);

    const result = await rotation.send({ model: 'gemini', messages: [{ role: 'user', content: 'hi' }] });

    expect(result.choices[0].message.content).toBe('ok-b');
    expect(a.send).not.toHaveBeenCalled();
  });

  it('rotates to the next account on a block error', async () => {
    const a = mockProvider('a');
    const b = mockProvider('b');
    (a.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('rate_limited'));

    const rotation = new ProviderRotation('gemini', [a, b]);
    const result = await rotation.send({ model: 'gemini', messages: [{ role: 'user', content: 'hi' }] });

    expect(result.choices[0].message.content).toBe('ok-b');
    expect(a.send).toHaveBeenCalledOnce();
    expect(b.send).toHaveBeenCalledOnce();
  });

  it('rethrows non-block errors immediately without rotating', async () => {
    const a = mockProvider('a');
    const b = mockProvider('b');
    (a.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('DOM timeout'));

    const rotation = new ProviderRotation('gemini', [a, b]);

    await expect(
      rotation.send({ model: 'gemini', messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow('DOM timeout');
    expect(b.send).not.toHaveBeenCalled();
  });

  it('aggregates status: connected wins, then busy, then error', () => {
    expect(new ProviderRotation('x', [mockProvider('a', 'error'), mockProvider('b', 'connected')]).status).toBe('connected');
    expect(new ProviderRotation('x', [mockProvider('a', 'error'), mockProvider('b', 'busy')]).status).toBe('busy');
    expect(new ProviderRotation('x', [mockProvider('a', 'error'), mockProvider('b', 'error')]).status).toBe('error');
  });

  it('health is healthy when any account is healthy', async () => {
    const a = mockProvider('a');
    const b = mockProvider('b');
    (a.health as ReturnType<typeof vi.fn>).mockResolvedValue({ healthy: false });
    (b.health as ReturnType<typeof vi.fn>).mockResolvedValue({ healthy: true });

    const rotation = new ProviderRotation('x', [a, b]);
    const result = await rotation.health();

    expect(result.healthy).toBe(true);
    expect(result.details).toMatchObject({ accounts: 2, healthy: 1 });
  });

  it('propagates setTools to all accounts', () => {
    const a = mockProvider('a');
    const b = mockProvider('b');
    const tools = [{ name: 'fs.read', description: 'read' }] as never;

    const rotation = new ProviderRotation('x', [a, b]);
    rotation.setTools(tools as never);

    expect(a.setTools).toHaveBeenCalledWith(tools);
    expect(b.setTools).toHaveBeenCalledWith(tools);
  });
});
