import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { ProviderManager, SessionManager, Logger } from '@bab/core';
import type { PromptEngine } from '@bab/prompt-engine';
import type { ChatCompletionRequest } from '@bab/protocol';
import { RateLimiter } from './rate-limiter.js';
import { redactString } from './redaction.js';
import { RequestValidator } from './validation.js';

interface ServerDeps {
  providerManager: ProviderManager;
  sessionManager: SessionManager;
  logger: Logger;
  promptEngine: PromptEngine;
  rateLimiter?: RateLimiter;
  validator?: RequestValidator;
}

/**
 * Create OpenAI-compatible API server
 */
export function createServer(deps: ServerDeps): Hono {
  const app = new Hono();
  const { providerManager, sessionManager, logger, promptEngine } = deps;
  const rateLimiter = deps.rateLimiter ?? new RateLimiter();
  const validator = deps.validator ?? new RequestValidator();

  app.use('*', cors());

  // Rate limiting middleware
  app.use('*', async (c, next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const { allowed, info } = rateLimiter.check(ip);

    c.header('X-RateLimit-Limit', info.total.toString());
    c.header('X-RateLimit-Remaining', info.remaining.toString());
    c.header('X-RateLimit-Reset', info.reset.toString());

    if (!allowed) {
      return c.json({
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
        },
      }, 429);
    }

    return next();
  });

  // Health check
  app.get('/health', async (c) => {
    const healthResults = await providerManager.healthCheckAll();
    const allHealthy = Array.from(healthResults.values()).every(r => r.healthy);

    return c.json({
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: Date.now(),
      providers: Object.fromEntries(healthResults),
    });
  });

  // List models (providers)
  app.get('/models', (c) => {
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
  });

  app.get('/v1/models', (c) => {
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
  });

  // Chat completions
  app.post('/v1/chat/completions', async (c) => {
    // Validate body size
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

    // Validate request structure
    const validation = validator.validateChatRequest(body);
    if (!validation.valid) {
      return c.json({ error: { message: validation.error } }, 400);
    }

    logger.info('Chat completion request', { model: body.model });

    try {
      // Get provider by model name or use active
      let provider;
      try {
        provider = providerManager.get(body.model) ?? providerManager.getActive();
      } catch {
        return c.json({ error: { message: 'No provider available' } }, 503);
      }

      // Inject system prompt with tool negotiation if tools available
      const tools = provider.getTools?.() ?? [];
      if (tools.length > 0 && !body.messages.some(m => m.role === 'system')) {
        const systemPrompt = promptEngine.generateSystemPrompt(tools);
        body.messages.unshift({ role: 'system', content: systemPrompt });
      }

      // Create or get session
      let session;
      try {
        session = sessionManager.getActive();
      } catch {
        session = sessionManager.create(provider.id, body.model);
      }

      // Add user message to session
      const userMessage = body.messages[body.messages.length - 1];
      if (userMessage) {
        session.addMessage(userMessage);
      }

      // Send to provider
      if (body.stream) {
        return streamResponse(provider, body, logger);
      }

      const response = await provider.send(body);

      // Add assistant message to session
      if (response.choices[0]?.message) {
        session.addMessage(response.choices[0].message);
      }

      return c.json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      logger.error('Request failed', {
        error: redactString(errorMessage),
      });
      return c.json({
        error: {
          message: redactString(errorMessage),
          type: 'server_error',
        },
      }, 500);
    }
  });

  // Responses endpoint
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
        messages: body.input.map(m => ({ role: m.role as any, content: m.content })),
      };

      let provider;
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
          content: [{
            type: 'output_text',
            text: choice.message.content ?? '',
          }],
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

  // Sessions endpoints
  app.get('/v1/sessions', (c) => {
    const sessions = sessionManager.list();
    return c.json({
      object: 'list',
      data: sessions.map(s => s.toJSON()),
    });
  });

  app.post('/v1/sessions', async (c) => {
    const body = await c.req.json();
    const session = sessionManager.create(body.providerId, body.model);
    return c.json(session.toJSON());
  });

  app.get('/v1/sessions/:id', (c) => {
    const id = c.req.param('id');
    const session = sessionManager.get(id);
    if (!session) {
      return c.json({ error: { message: 'Session not found' } }, 404);
    }
    return c.json(session.toJSON());
  });

  // Tools endpoint
  app.get('/v1/tools', (c) => {
    const provider = providerManager.getActive();
    const tools = provider.getTools?.() ?? [];
    return c.json(tools);
  });

  // Metrics endpoint
  app.get('/metrics', (c) => {
    const providers = providerManager.list();
    const lines: string[] = [];

    lines.push(`# HELP bab_providers_total Total number of providers`);
    lines.push(`# TYPE bab_providers_total gauge`);
    lines.push(`bab_providers_total ${providers.length}`);

    for (const provider of providers) {
      lines.push(`# HELP bab_provider_status Provider status (1=connected, 0=disconnected)`);
      lines.push(`# TYPE bab_provider_status gauge`);
      lines.push(`bab_provider_status{provider="${provider.id}"} ${provider.status === 'connected' ? 1 : 0}`);
    }

    return c.text(lines.join('\n'), 200, { 'Content-Type': 'text/plain' });
  });

  return app;
}

function streamResponse(provider: any, request: ChatCompletionRequest, logger: Logger): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of provider.stream(request)) {
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
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
