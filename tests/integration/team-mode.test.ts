import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, TeamAuth } from '@bab/api';
import { EventBus, Logger, SessionManager, ProviderManager } from '@bab/core';
import { PromptEngine } from '@bab/prompt-engine';
import type {
  Provider,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  HealthCheckResult,
} from '@bab/protocol';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

class EchoProvider implements Provider {
  readonly id = 'echo';
  readonly name = 'Echo';
  readonly type = 'api' as const;

  get status() {
    return 'connected' as const;
  }

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}

  async send(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    return {
      id: `echo-${Date.now()}`,
      object: 'chat.completion',
      created: Date.now(),
      model: request.model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: 'echo' },
        finish_reason: 'stop',
      }],
    };
  }

  async *stream(): AsyncIterable<ChatCompletionChunk> {
    // No streaming needed for these tests.
  }

  async health(): Promise<HealthCheckResult> {
    return { healthy: true };
  }

  getCapabilities() {
    return {};
  }

  getTools() {
    return [];
  }

  cancel(): void {}
}

describe('Team Mode (RBAC)', () => {
  let app: ReturnType<typeof createServer>;
  let sessionManager: SessionManager;
  let dir: string;

  const ADMIN_KEY = 'bab-admin-key';
  const ALICE_KEY = 'bab-alice-key';
  const BOB_KEY = 'bab-bob-key';

  const auth = (key: string) => ({ Authorization: `Bearer ${key}` });

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bab-team-int-'));
    const eventBus = new EventBus();
    const logger = new Logger({ level: 'error', format: 'text', context: 'Test' });
    const providerManager = new ProviderManager(eventBus);
    sessionManager = new SessionManager(eventBus);
    const promptEngine = new PromptEngine();

    const provider = new EchoProvider();
    await provider.connect();
    providerManager.register(provider);

    const teamAuth = new TeamAuth({
      filePath: path.join(dir, 'team.json'),
      clients: [
        { name: 'admin', role: 'admin', key: ADMIN_KEY },
        { name: 'alice', role: 'member', key: ALICE_KEY },
        { name: 'bob', role: 'member', key: BOB_KEY },
      ],
    });

    app = createServer({ providerManager, sessionManager, logger, promptEngine, teamAuth });
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('keeps /health public', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });

  it('rejects requests without a key', async () => {
    const res = await app.request('/v1/providers');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid key', async () => {
    const res = await app.request('/v1/providers', { headers: auth('bab-wrong') });
    expect(res.status).toBe(401);
  });

  it('accepts a valid admin key', async () => {
    const res = await app.request('/v1/providers', { headers: auth(ADMIN_KEY) });
    expect(res.status).toBe(200);
  });

  it('accepts a token via query param (for EventSource)', async () => {
    const res = await app.request(`/v1/providers?token=${ADMIN_KEY}`);
    expect(res.status).toBe(200);
  });

  it('isolates sessions between members', async () => {
    // Alice starts a conversation (creates a session).
    const chat = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { ...auth(ALICE_KEY), 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'echo', messages: [{ role: 'user', content: 'hi' }] }),
    });
    expect(chat.status).toBe(200);
    const aliceSessionId = chat.headers.get('X-Session-Id');
    expect(aliceSessionId).toBeTruthy();

    // Alice sees her session.
    const aliceList = await app.request('/v1/sessions', { headers: auth(ALICE_KEY) });
    const aliceBody = await aliceList.json();
    expect(aliceBody.data).toHaveLength(1);

    // Bob sees none.
    const bobList = await app.request('/v1/sessions', { headers: auth(BOB_KEY) });
    const bobBody = await bobList.json();
    expect(bobBody.data).toHaveLength(0);

    // Admin sees everything.
    const adminList = await app.request('/v1/sessions', { headers: auth(ADMIN_KEY) });
    const adminBody = await adminList.json();
    expect(adminBody.data).toHaveLength(1);

    // Bob cannot access Alice's session detail.
    const bobDetail = await app.request(`/v1/sessions/${aliceSessionId}`, { headers: auth(BOB_KEY) });
    expect(bobDetail.status).toBe(404);

    // Alice can.
    const aliceDetail = await app.request(`/v1/sessions/${aliceSessionId}`, { headers: auth(ALICE_KEY) });
    expect(aliceDetail.status).toBe(200);
  });
});
