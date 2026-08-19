import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { randomUUID } from 'node:crypto';
import type { EventBus, ProviderManager, SessionManager, Logger } from '@bab/core';
import { detectIde } from '@bab/prompt-engine';
import type { PromptEngine } from '@bab/prompt-engine';
import type { Runtime } from '@bab/runtime';
import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  Message,
  Provider,
  ToolScope,
} from '@bab/protocol';
import { RateLimiter } from './rate-limiter.js';
import { redactString } from './redaction.js';
import { RequestValidator } from './validation.js';
import { runToolLoop, runToolLoopStream } from './tool-loop.js';
import { ConfigStore } from './config-store.js';
import { MetricsCollector, createRequestMetrics } from './metrics.js';

interface ServerDeps {
  providerManager: ProviderManager;
  sessionManager: SessionManager;
  logger: Logger;
  promptEngine: PromptEngine;
  eventBus?: EventBus;
  runtime?: Runtime;
  configStore?: ConfigStore;
  metrics?: MetricsCollector;
  rateLimiter?: RateLimiter;
  validator?: RequestValidator;
}

export function createServer(deps: ServerDeps): Hono {
  const app = new Hono();
  const { providerManager, sessionManager, logger, promptEngine } = deps;
  const rateLimiter = deps.rateLimiter ?? new RateLimiter();
  const validator = deps.validator ?? new RequestValidator();
  const configStore = deps.configStore ?? new ConfigStore();
  const metrics = deps.metrics ?? new MetricsCollector();
  const metricsHelpers = createRequestMetrics(metrics);

  // CORS
  app.use('*', cors({
    origin: ['http://localhost', 'http://127.0.0.1', 'http://localhost:3000', 'http://localhost:5173'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }));

  // Rate limiting
  app.use('*', async (c, next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const { allowed, info } = rateLimiter.check(ip);

    c.header('X-RateLimit-Limit', info.total.toString());
    c.header('X-RateLimit-Remaining', info.remaining.toString());
    c.header('X-RateLimit-Reset', info.reset.toString());

    if (!allowed) {
      return c.json({ error: { message: 'Rate limit exceeded', type: 'rate_limit_error' } }, 429);
    }
    return next();
  });

  // ── Health ───────────────────────────────────────────────────

  app.get('/health', async (c) => {
    const healthResults = await providerManager.healthCheckAll();
    const providerEntries = Array.from(healthResults.entries());
    // No providers at all is not "ok" — an empty bridge can't answer anything.
    const allHealthy = providerEntries.length > 0 && providerEntries.every(([, r]) => r.healthy);

    return c.json({
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: Date.now(),
      providers: Object.fromEntries(healthResults),
    });
  });

  // ── Models ───────────────────────────────────────────────────

  const listModels = (c: any) => {
    const providers = providerManager.list();
    return c.json({
      object: 'list',
      data: providers.map((p) => ({
        id: p.id,
        object: 'model',
        created: 0,
        owned_by: p.name,
      })),
    });
  };

  app.get('/models', listModels);
  app.get('/v1/models', listModels);

  // ── Providers ────────────────────────────────────────────────

  app.get('/v1/providers', (c) => {
    const providers = providerManager.list();
    return c.json({
      object: 'list',
      data: providers.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        status: p.status,
        capabilities: p.getCapabilities?.() ?? {},
      })),
    });
  });

  // ── Chat Completions ─────────────────────────────────────────

  app.post('/v1/chat/completions', async (c) => {
    const bodyText = await c.req.text();
    const sizeValidation = validator.validateBodySize(bodyText);
    if (!sizeValidation.valid) {
      return c.json({ error: { message: sizeValidation.error } }, 400);
    }

    let body: ChatCompletionRequest;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return c.json({ error: { message: 'Invalid JSON body' } }, 400);
    }

    const validation = validator.validateChatRequest(body);
    if (!validation.valid) {
      return c.json({ error: { message: validation.error } }, 400);
    }

    logger.info('Chat completion request', { model: body.model });

    const finishRequest = metricsHelpers.startRequest();
    const eventBus = deps.eventBus;
    const requestId = randomUUID();
    const startedAt = Date.now();
    let providerId = body.model;

    try {
      let provider: Provider;
      try {
        provider = providerManager.get(body.model) ?? providerManager.getActive();
      } catch {
        return c.json({ error: { message: 'No provider available' } }, 503);
      }

      providerId = provider.id;
      metricsHelpers.recordProviderRequest(provider.id);
      eventBus?.emit('request.received', { requestId, model: body.model });

      // Inject system prompt with tool negotiation if tools available.
      // Tailor the prompt to the calling IDE when it identifies itself.
      const tools = provider.getTools?.() ?? [];
      if (tools.length > 0 && !body.messages.some((m) => m.role === 'system')) {
        const clientHint = c.req.header('user-agent') ?? c.req.header('x-client') ?? c.req.header('x-ide');
        const systemPrompt = promptEngine.generateSystemPrompt(tools, undefined, detectIde(clientHint));
        body.messages.unshift({ role: 'system', content: systemPrompt });
      }

      // Create or get session. Clients may pass `session_id` to continue
      // an existing conversation history.
      let session;
      const requestedSessionId = (body as { session_id?: string; sessionId?: string }).session_id
        ?? (body as { sessionId?: string }).sessionId;
      if (requestedSessionId) {
        session = sessionManager.get(requestedSessionId);
        if (!session) {
          return c.json({ error: { message: 'Session not found' } }, 404);
        }
        sessionManager.setActive(requestedSessionId);
      } else {
        try {
          session = sessionManager.getActive();
        } catch {
          session = sessionManager.create(provider.id, body.model);
        }
      }

      // Expose the session id so clients can continue the conversation.
      c.header('X-Session-Id', session.id);

      // Session Fabric: continue on the provider the conversation started with
      // (if it is still registered), regardless of which model id the client sent.
      const boundProvider = providerManager.get(session.providerId);
      if (boundProvider) {
        provider = boundProvider;
        providerId = provider.id;
        metricsHelpers.recordProviderRequest(provider.id);
      }

      // A browser provider can only run one conversation at a time. Return a
      // retryable 429 instead of interleaving requests into the same DOM session.
      if (provider.status === 'busy') {
        c.header('Retry-After', '1');
        return c.json({ error: { message: 'Provider is busy, retry shortly', type: 'provider_busy' } }, 429);
      }

      const userMessage = body.messages[body.messages.length - 1];
      if (userMessage) {
        session.addMessage(userMessage);
      }

      if (body.stream) {
        if (deps.runtime) {
          return streamToolLoopResponse(
            provider,
            deps.runtime,
            logger,
            body,
            session.id,
            (m) => session.addMessage(m),
            eventBus
          );
        }
        return streamResponse(provider, body, logger);
      }

      try {
        const response = deps.runtime
          ? await runToolLoop(provider, deps.runtime, logger, body, session.id, {
              onMessage: (m) => session.addMessage(m),
              eventBus,
            })
          : await provider.send(body);

        if (response.choices[0]?.message && !deps.runtime) {
          session.addMessage(response.choices[0].message);
        }

        eventBus?.emit('request.completed', { requestId, duration: Date.now() - startedAt });
        return c.json({ ...response, session_id: session.id });
      } catch (error) {
        // Fallback: if the browser provider failed and a native API provider is
        // available, retry once on the API instead of failing the request.
        const apiProviders = providerManager
          .getByType('api')
          .filter((p) => p.status === 'connected' || p.status === 'busy');

        if (provider.type === 'browser' && apiProviders.length > 0) {
          const fallbackProvider = apiProviders[0];
          logger.warn('Browser provider failed, falling back to native API', {
            providerId: provider.id,
            fallback: fallbackProvider.id,
            error: error instanceof Error ? redactString(error.message) : String(error),
          });
          provider = fallbackProvider;
          providerId = fallbackProvider.id;
          metricsHelpers.recordProviderRequest(fallbackProvider.id);

          const fallbackResponse = deps.runtime
            ? await runToolLoop(provider, deps.runtime, logger, body, session.id, {
                onMessage: (m) => session.addMessage(m),
                eventBus,
              })
            : await provider.send(body);

          if (fallbackResponse.choices[0]?.message && !deps.runtime) {
            session.addMessage(fallbackResponse.choices[0].message);
          }

          eventBus?.emit('request.completed', { requestId, duration: Date.now() - startedAt });
          return c.json({ ...fallbackResponse, session_id: session.id });
        }

        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      metricsHelpers.recordError(errorMessage);
      metricsHelpers.recordProviderError(providerId, errorMessage);
      eventBus?.emit('request.error', { requestId, error: redactString(errorMessage) });
      logger.error('Request failed', { error: redactString(errorMessage) });
      return c.json({ error: { message: redactString(errorMessage), type: 'server_error' } }, 500);
    } finally {
      finishRequest();
    }
  });

  // ── Responses API ────────────────────────────────────────────

  app.post('/v1/responses', async (c) => {
    let body: { model: string; input: Array<{ role: string; content: string }> };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { message: 'Invalid JSON body' } }, 400);
    }

    if (!body.model || !body.input) {
      return c.json({ error: { message: 'model and input are required' } }, 400);
    }

    logger.info('Responses request', { model: body.model });

    try {
      const request: ChatCompletionRequest = {
        model: body.model,
        messages: body.input.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
      };

      let provider: Provider;
      try {
        provider = providerManager.get(body.model) ?? providerManager.getActive();
      } catch {
        return c.json({ error: { message: 'No provider available' } }, 503);
      }

      const response = await provider.send(request);

      return c.json({
        id: response.id,
        object: 'response',
        created: response.created,
        model: response.model,
        output: response.choices.map((choice, i) => ({
          id: `${response.id}-${i}`,
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: choice.message.content ?? '' }],
        })),
      });
    } catch (error) {
      logger.error('Responses request failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return c.json({
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          type: 'server_error',
        },
      }, 500);
    }
  });

  // ── Sessions ─────────────────────────────────────────────────

  app.get('/v1/sessions', (c) => {
    const sessions = sessionManager.list();
    return c.json({ object: 'list', data: sessions.map((s) => s.toJSON()) });
  });

  app.post('/v1/sessions', async (c) => {
    const body = await c.req.json();
    if (!body.providerId) {
      return c.json({ error: { message: 'providerId is required' } }, 400);
    }
    const session = sessionManager.create(body.providerId, body.model);
    return c.json(session.toJSON());
  });

  app.get('/v1/sessions/:id', (c) => {
    const id = c.req.param('id');
    const session = sessionManager.get(id);
    if (!session) {
      return c.json({ error: { message: 'Session not found' } }, 404);
    }
    // Include the full message history in the detail view.
    return c.json(session.toJSON(true));
  });

  // Export a session's history as markdown or JSON.
  app.get('/v1/sessions/:id/export', (c) => {
    const id = c.req.param('id');
    const session = sessionManager.get(id);
    if (!session) {
      return c.json({ error: { message: 'Session not found' } }, 404);
    }

    const format = (c.req.query('format') ?? 'markdown').toLowerCase();
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');

    if (format === 'json') {
      return c.text(JSON.stringify(session.toJSON(true), null, 2), 200, {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="bab-session-${safeId}.json"`,
      });
    }

    return c.text(session.toMarkdown(), 200, {
      'Content-Type': 'text/markdown',
      'Content-Disposition': `attachment; filename="bab-session-${safeId}.md"`,
    });
  });

  app.delete('/v1/sessions/:id', (c) => {
    const id = c.req.param('id');
    const session = sessionManager.get(id);
    if (!session) {
      return c.json({ error: { message: 'Session not found' } }, 404);
    }
    sessionManager.close(id);
    return c.json({ deleted: true, id });
  });

  // ── Tools ────────────────────────────────────────────────────

  app.get('/v1/tools', (c) => {
    // Runtime tools are the real, executable tools (fs/git/shell).
    // Provider tools are only a fallback for runtimes that don't register tools.
    if (deps.runtime) {
      return c.json(
        deps.runtime.getToolDescriptions().map((tool) => ({
          ...tool,
          permission: deps.runtime!.getToolPermissionMode(tool.name),
        }))
      );
    }

    try {
      const provider = providerManager.getActive();
      const tools = provider.getTools?.() ?? [];
      return c.json(tools);
    } catch {
      return c.json({ error: { message: 'No active provider' } }, 503);
    }
  });

  // ── Permissions ──────────────────────────────────────────────

  app.get('/v1/permissions/pending', (c) => {
    if (!deps.runtime) {
      return c.json({ error: { message: 'Runtime not available' } }, 503);
    }
    return c.json({ object: 'list', data: deps.runtime.getPendingPermissions() });
  });

  app.post('/v1/permissions/:id/approve', async (c) => {
    if (!deps.runtime) {
      return c.json({ error: { message: 'Runtime not available' } }, 503);
    }

    const id = c.req.param('id');
    let body: { mode?: string; scope?: ToolScope } = {};
    try {
      body = await c.req.json();
    } catch {
      // Empty body: approve once by default.
    }

    const persist = body.mode === 'session' || body.mode === 'always';
    const ok = deps.runtime.approvePermission(id, {
      persist,
      scope: body.scope,
    });

    if (!ok) {
      return c.json({ error: { message: 'Permission request not found' } }, 404);
    }
    return c.json({ approved: true, id });
  });

  app.post('/v1/permissions/:id/deny', (c) => {
    if (!deps.runtime) {
      return c.json({ error: { message: 'Runtime not available' } }, 503);
    }

    const id = c.req.param('id');
    const ok = deps.runtime.denyPermission(id);

    if (!ok) {
      return c.json({ error: { message: 'Permission request not found' } }, 404);
    }
    return c.json({ denied: true, id });
  });

  // ── Config ──────────────────────────────────────────────────

  app.get('/v1/config', (c) => {
    return c.json(configStore.get());
  });

  app.put('/v1/config', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { message: 'Invalid JSON body' } }, 400);
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return c.json({ error: { message: 'Config must be an object' } }, 400);
    }

    return c.json(configStore.set(body as Partial<import('./config-store.js').AppConfig>));
  });

  // ── Extensions ───────────────────────────────────────────────

  app.get('/v1/extensions', (c) => {
    const data: Array<Record<string, unknown>> = [];

    for (const provider of providerManager.list()) {
      data.push({
        id: `provider-${provider.id}`,
        name: provider.name,
        type: 'provider',
        providerId: provider.id,
        enabled: true,
        status: provider.status,
      });
    }

    if (deps.runtime) {
      for (const tool of deps.runtime.getToolDescriptions()) {
        data.push({
          id: `tool-${tool.name}`,
          name: tool.name,
          type: 'tool',
          enabled: true,
          description: tool.description,
        });
      }
    }

    return c.json({ object: 'list', data });
  });

  // ── Audit ───────────────────────────────────────────────────

  app.get('/v1/audit', (c) => {
    const entries: Array<Record<string, unknown>> = [];

    if (deps.runtime) {
      for (const session of sessionManager.list()) {
        for (const entry of deps.runtime.getAuditLog(session.id)) {
          entries.push({
            id: `${entry.timestamp}-${entry.toolName}-${entries.length}`,
            timestamp: entry.timestamp,
            sessionId: entry.sessionId,
            toolName: entry.toolName,
            result: entry.result,
            reason: entry.reason,
          });
        }
      }
    }

    entries.sort((a, b) => (b.timestamp as number) - (a.timestamp as number));
    return c.json({ object: 'list', data: entries });
  });

  // ── Metrics ──────────────────────────────────────────────────

  app.get('/metrics', (c) => {
    const providers = providerManager.list();
    const lines: string[] = [];

    for (const metric of metrics.getMetrics()) {
      const name = metric.name.replace(/\./g, '_');
      const labelStr = metric.labels
        ? '{' + Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}'
        : '';
      lines.push(`# TYPE ${name} ${metric.name.endsWith('total') ? 'counter' : 'gauge'}`);
      lines.push(`${name}${labelStr} ${metric.value}`);
    }

    lines.push('# TYPE bab_providers_total gauge');
    lines.push(`bab_providers_total ${providers.length}`);

    for (const provider of providers) {
      lines.push('# TYPE bab_provider_status gauge');
      lines.push(`bab_provider_status{provider="${provider.id}"} ${provider.status === 'connected' ? 1 : 0}`);
    }

    return c.text(lines.join('\n'), 200, { 'Content-Type': 'text/plain' });
  });

  // ── Metrics (JSON) ────────────────────────────────────────────

  app.get('/v1/metrics', (c) => {
    const sum = (name: string) =>
      metrics
        .getMetrics()
        .filter((m) => m.name === name)
        .reduce((acc, m) => acc + m.value, 0);

    return c.json({
      requestsTotal: sum('bab.requests.total'),
      requestsErrors: sum('bab.requests.errors'),
      providerRequests: sum('bab.provider.requests'),
      providerErrors: sum('bab.provider.errors'),
      toolExecutions: sum('bab.tool.executions'),
    });
  });

  // ── Events (SSE) ─────────────────────────────────────────────

  app.get('/v1/events', (c) => {
    if (!deps.eventBus) {
      return c.json({ error: { message: 'Event bus not available' } }, 503);
    }

    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream({
      start(controller) {
        const send = (type: string, data: unknown) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
            );
          } catch {
            // Stream already closed.
          }
        };

        unsubscribe = deps.eventBus!.onAny((event, data) => send(event, data));
        send('connected', { timestamp: Date.now() });

        heartbeat = setInterval(() => {
          send('heartbeat', { timestamp: Date.now() });
        }, 15000);
      },
      cancel() {
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  });

  return app;
}

// ── Streaming ──────────────────────────────────────────────────

function streamResponse(provider: Provider, request: ChatCompletionRequest, logger: Logger): Response {
  return sseResponse(provider.stream(request), provider, logger);
}

function streamToolLoopResponse(
  provider: Provider,
  runtime: Runtime,
  logger: Logger,
  request: ChatCompletionRequest,
  sessionId: string,
  onMessage: (message: Message) => void,
  eventBus?: EventBus
): Response {
  const chunks = runToolLoopStream(provider, runtime, logger, request, sessionId, { onMessage, eventBus });
  return sseResponse(chunks, provider, logger);
}

function sseResponse(
  chunks: AsyncIterable<ChatCompletionChunk>,
  provider: Provider,
  logger: Logger
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        logger.error('Stream error', {
          error: error instanceof Error ? error.message : String(error),
        });
        controller.error(error);
      }
    },
    cancel() {
      try {
        provider.cancel();
      } catch {
        // Ignore cancel errors
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
