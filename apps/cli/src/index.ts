#!/usr/bin/env node

import { Command } from 'commander';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createServer, runToolLoop, StatePersistence } from '@bab/api';
import { ProviderManager, SessionManager, EventBus, Logger, ProviderRotation } from '@bab/core';
import { PromptEngine } from '@bab/prompt-engine';
import { Runtime } from '@bab/runtime';
import { PlaywrightProvider } from '@bab/playwright-provider';
import { ApiProvider } from '@bab/api-provider';
import {
  FsReadTool,
  FsWriteTool,
  FsEditTool,
  FsSearchTool,
  FsGlobTool,
  FsExistsTool,
  FsDeleteTool,
} from '@bab/tools-fs';
import { GitStatusTool, GitDiffTool, GitCommitTool } from '@bab/tools-git';
import { ShellExecTool } from '@bab/tools-shell';
import { serve } from '@hono/node-server';
import { runDoctor, printDoctorResults } from './doctor.js';
import { runDiagnose, saveDiagnostic, printDiagnosticSummary } from './diagnose.js';
import { runSetup } from './setup.js';
import { runSmokeTest } from './smoke-test.js';
import { runInit } from './init.js';
import { resolveProvider, listProviders } from './providers.js';

const program = new Command();

program
  .name('bab')
  .description('Browser AI Bridge - Use browser AI in your local environment')
  .version('1.0.0');

// ── Helpers ──────────────────────────────────────────────────────

function registerTools(runtime: Runtime): void {
  runtime.tools.register(new FsReadTool());
  runtime.tools.register(new FsWriteTool());
  runtime.tools.register(new FsEditTool());
  runtime.tools.register(new FsSearchTool());
  runtime.tools.register(new FsGlobTool());
  runtime.tools.register(new FsExistsTool());
  runtime.tools.register(new FsDeleteTool());
  runtime.tools.register(new GitStatusTool());
  runtime.tools.register(new GitDiffTool());
  runtime.tools.register(new GitCommitTool());
  runtime.tools.register(new ShellExecTool());
}

function parseAllowList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function createRuntime(eventBus: EventBus, allow: string[], interactive = false): Runtime {
  const workingDirectory = process.cwd();
  const runtime = new Runtime(eventBus, {
    workingDirectory,
    permissions: {
      mode: 'scope',
      defaultScope: {
        allowedPaths: [workingDirectory],
        allowedCommands: ['git status', 'git diff', 'git log', 'ls', 'dir'],
        deniedCommands: ['rm -rf', 'sudo', 'format', 'shutdown', 'del /f /s /q'],
        maxExecutionTime: 30000,
      },
      dangerousTools: [],
    },
    audit: {
      enabled: true,
      maxEntries: 1000,
    },
    autoGrant: allow,
    interactive,
  });

  registerTools(runtime);
  return runtime;
}

// ── Commands ─────────────────────────────────────────────────────

program
  .command('setup')
  .description('First-time setup wizard')
  .action(async () => {
    await runSetup();
  });

program
  .command('init')
  .description('Quick setup - install, build, and start')
  .action(async () => {
    await runInit();
  });

program
  .command('doctor')
  .description('Check system requirements and configuration')
  .action(async () => {
    console.log('\nChecking system requirements...\n');
    const results = await runDoctor();
    printDoctorResults(results);
    if (results.some((r) => r.status === 'error')) process.exit(1);
  });

program
  .command('test')
  .description('Run smoke test to verify everything works')
  .option('--site <url>', 'AI site URL or provider name', 'gemini')
  .action(async (options) => {
    const success = await runSmokeTest(options.site);
    process.exit(success ? 0 : 1);
  });

program
  .command('diagnose')
  .description('Collect diagnostic information for bug reports')
  .option('-o, --output <file>', 'Output file path')
  .action(async () => {
    console.log('\nCollecting diagnostic information...\n');
    const info = await runDiagnose();
    printDiagnosticSummary(info);
    const filepath = await saveDiagnostic(info);
    console.log(`\nDiagnostic saved to: ${filepath}`);
    console.log('Attach this file to your bug report.\n');
  });

program
  .command('providers')
  .description('List available AI providers')
  .action(() => {
    const ids = listProviders();
    console.log('\nAvailable AI Providers:');
    console.log('='.repeat(50));
    console.log('');
    for (const id of ids) {
      console.log(`  ${id}`);
    }
    console.log('');
    console.log('Usage:');
    console.log('  bab serve --site gemini');
    console.log('  bab serve --site https://chatgpt.com');
    console.log('');
    console.log('='.repeat(50));
  });

// ── Serve ────────────────────────────────────────────────────────

function logFilePath(): string {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(os.homedir(), '.browser-ai-bridge', 'logs', `bab-${date}.log`);
}

function crashDir(): string {
  return path.join(os.homedir(), '.browser-ai-bridge', 'crashes');
}

function writeCrashReport(kind: 'exception' | 'rejection', error: unknown): string {
  try {
    const dir = crashDir();
    fs.mkdirSync(dir, { recursive: true });
    const err = error instanceof Error ? error : new Error(String(error));
    const report = {
      kind,
      timestamp: new Date().toISOString(),
      name: err.name,
      message: err.message,
      stack: err.stack,
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    };
    const filepath = path.join(dir, `crash-${Date.now()}.json`);
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    return filepath;
  } catch {
    return '';
  }
}

program
  .command('serve')
  .description('Start the API server')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('-h, --host <host>', 'Host to bind to', 'localhost')
  .option('--site <url>', 'AI site URL or provider name (gemini, chatgpt, claude, deepseek)')
  .option('--headless', 'Run browser in headless mode (no visible window)', true)
  .option('--no-headless', 'Show browser window')
  .option('--profile', 'Use existing Chrome profile (for logged-in sessions)', true)
  .option('--no-profile', 'Use new browser profile')
  .option('--allow <tools>', 'Comma-separated tools to allow without confirmation (e.g. fs.write,shell.exec)')
  .option('--interactive', 'Prompt for permission decisions via the API instead of denying immediately')
  .option('--api <format>', 'Register a native API provider as fallback (openai, anthropic, google)')
  .option('--api-key <key>', 'API key for the native API provider (or use OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_API_KEY)')
  .option('--api-model <model>', 'Model for the native API provider (default: provider id)')
  .option('--api-base-url <url>', 'Base URL for the native API provider')
  .option('--accounts <n>', 'Number of browser accounts/profiles to rotate between (default: 1)')
  .action(async (options) => {
    const eventBus = new EventBus();
    const logger = new Logger({
      level: 'info',
      format: 'text',
      context: 'CLI',
      filePath: logFilePath(),
    });
    const sessionManager = new SessionManager(eventBus);
    const providerManager = new ProviderManager(eventBus);
    const promptEngine = new PromptEngine();
    const runtime = createRuntime(eventBus, parseAllowList(options.allow), options.interactive);

    await runtime.start();

    // Persistence: restore sessions/audit from disk and save periodically.
    const persistence = new StatePersistence(
      path.join(os.homedir(), '.browser-ai-bridge', 'state.json')
    );
    const savedState = persistence.load();
    if (savedState) {
      for (const s of savedState.sessions) {
        sessionManager.restore(
          { id: s.id, providerId: s.providerId, model: s.model, createdAt: s.createdAt },
          s.messages
        );
      }
      if (savedState.activeSessionId && sessionManager.has(savedState.activeSessionId)) {
        sessionManager.setActive(savedState.activeSessionId);
      }
      if (savedState.audit && Object.keys(savedState.audit).length > 0) {
        runtime.restoreAudit(new Map(Object.entries(savedState.audit)));
      }
      logger.info(`Restored ${savedState.sessions.length} session(s) from disk`);
    }

    const captureState = () => ({
      sessions: sessionManager.list().map((s) => ({
        id: s.id,
        providerId: s.providerId,
        model: s.model,
        createdAt: s.createdAt,
        messages: s.getMessages(),
      })),
      audit: Object.fromEntries(runtime.getAllAuditEntries()),
      activeSessionId: sessionManager.getActiveId(),
    });
    const saveState = () => persistence.save(captureState());
    const saveInterval = setInterval(saveState, 5000);

    if (options.site) {
      const { id: providerId } = resolveProvider(options.site);
      const accountCount = Math.max(1, parseInt(options.accounts ?? '1', 10) || 1);

      // Multi-account rotation: each account gets its own Chrome profile so the
      // user can be logged into a different AI account in each one. Account 0
      // reuses the existing logged-in profile; the rest use dedicated profiles
      // that the user can sign into once.
      const accounts: PlaywrightProvider[] = [];
      for (let i = 0; i < accountCount; i++) {
        const { adapter } = resolveProvider(options.site);
        const account = new PlaywrightProvider({
          id: accountCount > 1 ? `${providerId}-account-${i + 1}` : providerId,
          name: accountCount > 1 ? `${options.site} (account ${i + 1})` : options.site,
          adapter,
          headless: options.headless,
          useExistingProfile: i === 0 ? options.profile : false,
          // Distinct profile dir + CDP port keep accounts from colliding on the
          // same browser instance.
          userDataDir: i === 0
            ? undefined
            : path.join(os.homedir(), '.browser-ai-bridge', 'profiles', `${providerId}-account-${i + 1}`),
          cdpPort: 9222 + i,
        });
        account.setTools(runtime.getToolDescriptions());
        accounts.push(account);
      }

      const provider = accountCount > 1
        ? new ProviderRotation(providerId, accounts, { name: options.site })
        : accounts[0];

      providerManager.register(provider);
      providerManager.setActive(providerId);

      logger.info(
        accountCount > 1
          ? `Connecting to ${options.site} across ${accountCount} accounts...`
          : `Connecting to ${options.site}...`
      );
      try {
        await provider.connect();
        logger.info('Connected to browser AI');
      } catch (error) {
        logger.error('Failed to connect:', {
          error: error instanceof Error ? error.message : String(error),
        });
        process.exit(1);
      }
    }

    if (options.api) {
      const format = options.api.toLowerCase();
      if (!['openai', 'anthropic', 'google'].includes(format)) {
        logger.error(`Unknown API format: ${options.api}. Use openai, anthropic, or google.`);
        process.exit(1);
      }

      const apiProvider = new ApiProvider({
        id: `api-${format}`,
        name: `Native ${format}`,
        format: format as 'openai' | 'anthropic' | 'google',
        apiKey: options.apiKey,
        model: options.apiModel,
        baseUrl: options.apiBaseUrl,
      });
      apiProvider.setTools(runtime.getToolDescriptions());
      providerManager.register(apiProvider);

      try {
        await apiProvider.connect();
        logger.info(`Native ${format} API provider registered (fallback)`);
      } catch (error) {
        logger.error('Failed to initialize API provider:', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const app = createServer({ providerManager, sessionManager, logger, promptEngine, runtime, eventBus });
    const port = parseInt(options.port);

    serve({ fetch: app.fetch, port, hostname: options.host }, (info) => {
      logger.info(`Browser AI Bridge running at http://${options.host}:${info.port}`);
      logger.info('Endpoints:');
      logger.info('  POST /v1/chat/completions - Chat completions');
      logger.info('  POST /v1/responses - Responses API');
      logger.info('  GET  /models - List models');
      logger.info('  GET  /health - Health check');
    });

    // Graceful shutdown: close browser and stop runtime.
    let shuttingDown = false;
    const shutdown = async () => {
      if (shuttingDown) return;
      shuttingDown = true;
      logger.info('Shutting down...');
      clearInterval(saveInterval);
      saveState();
      await providerManager.shutdownAll();
      await runtime.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message });
      const report = writeCrashReport('exception', error);
      if (report) logger.info('Crash report saved', { path: report });
      void shutdown();
    });
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', {
        error: reason instanceof Error ? reason.message : String(reason),
      });
      const report = writeCrashReport('rejection', reason);
      if (report) logger.info('Crash report saved', { path: report });
    });
  });

// ── Chat ─────────────────────────────────────────────────────────

program
  .command('chat')
  .description('Send a chat message to browser AI')
  .argument('<message>', 'Message to send')
  .option('--site <url>', 'AI site URL or provider name', 'gemini')
  .option('--headless', 'Run browser in headless mode (no visible window)', true)
  .option('--no-headless', 'Show browser window')
  .option('--profile', 'Use existing Chrome profile', true)
  .option('--no-profile', 'Use new browser profile')
  .option('--allow <tools>', 'Comma-separated tools to allow without confirmation (e.g. fs.write,shell.exec)')
  .action(async (message, options) => {
    const logger = new Logger({ level: 'info', format: 'text', context: 'Chat' });
    const eventBus = new EventBus();
    const runtime = createRuntime(eventBus, parseAllowList(options.allow));

    await runtime.start();

    const { id: providerId, adapter } = resolveProvider(options.site);
    const provider = new PlaywrightProvider({
      id: providerId,
      name: options.site,
      adapter,
      headless: options.headless,
      useExistingProfile: options.profile,
    });

    provider.setTools(runtime.getToolDescriptions());

    logger.info(`Connecting to ${options.site}...`);
    try {
      await provider.connect();
      logger.info('Connected!');
    } catch (error) {
      logger.error('Failed to connect:', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }

    const promptEngine = new PromptEngine();
    const systemPrompt = promptEngine.generateSystemPrompt(runtime.getToolDescriptions());
    const sessionManager = new SessionManager(eventBus);
    const session = sessionManager.create(providerId);

    const response = await runToolLoop(
      provider,
      runtime,
      logger,
      {
        model: providerId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      },
      session.id,
      { onMessage: (m) => session.addMessage(m) }
    );

    console.log('\nAI Response:');
    console.log('='.repeat(50));
    console.log(response.choices[0].message.content);
    console.log('='.repeat(50));

    await provider.disconnect();
    await runtime.stop();
  });

program.parse();
