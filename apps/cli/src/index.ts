#!/usr/bin/env node

import { Command } from 'commander';
import { createServer } from '@bab/api';
import { ProviderManager, SessionManager, EventBus, Logger } from '@bab/core';
import { PromptEngine } from '@bab/prompt-engine';
import { ToolDispatcher } from '@bab/runtime';
import { PlaywrightProvider } from '@bab/playwright-provider';
import { FsReadTool, FsWriteTool } from '@bab/tools-fs';
import { GitStatusTool, GitDiffTool, GitCommitTool } from '@bab/tools-git';
import { ShellExecTool } from '@bab/tools-shell';
import { serve } from '@hono/node-server';
import { runDoctor, printDoctorResults } from './doctor.js';
import { runDiagnose, saveDiagnostic, printDiagnosticSummary } from './diagnose.js';
import { runSetup } from './setup.js';
import { runSmokeTest } from './smoke-test.js';
import { runInit } from './init.js';
import { resolveProvider, resolveProviderId, listProviders } from './providers.js';

const program = new Command();

program
  .name('bab')
  .description('Browser AI Bridge - Use browser AI in your local environment')
  .version('1.0.0');

// ── Helpers ──────────────────────────────────────────────────────

function registerTools(dispatcher: ToolDispatcher): void {
  dispatcher.register(new FsReadTool());
  dispatcher.register(new FsWriteTool());
  dispatcher.register(new GitStatusTool());
  dispatcher.register(new GitDiffTool());
  dispatcher.register(new GitCommitTool());
  dispatcher.register(new ShellExecTool());
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
  .action(async (options) => {
    const eventBus = new EventBus();
    const logger = new Logger({ level: 'info', format: 'text', context: 'CLI' });
    const sessionManager = new SessionManager(eventBus);
    const providerManager = new ProviderManager(eventBus);
    const promptEngine = new PromptEngine();
    const toolDispatcher = new ToolDispatcher(eventBus);

    registerTools(toolDispatcher);

    if (options.site) {
      const { id: providerId, adapter } = resolveProvider(options.site);
      const provider = new PlaywrightProvider({
        id: providerId,
        name: options.site,
        adapter,
        headless: options.headless,
        useExistingProfile: options.profile,
      });

      provider.setTools(toolDispatcher.getDescriptions());
      providerManager.register(provider);
      providerManager.setActive(providerId);

      logger.info(`Connecting to ${options.site}...`);
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

    const app = createServer({ providerManager, sessionManager, logger, promptEngine });
    const port = parseInt(options.port);

    serve({ fetch: app.fetch, port }, (info) => {
      logger.info(`Browser AI Bridge running at http://localhost:${info.port}`);
      logger.info('Endpoints:');
      logger.info('  POST /v1/chat/completions - Chat completions');
      logger.info('  POST /v1/responses - Responses API');
      logger.info('  GET  /models - List models');
      logger.info('  GET  /health - Health check');
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
  .action(async (message, options) => {
    const logger = new Logger({ level: 'info', format: 'text', context: 'Chat' });
    const eventBus = new EventBus();
    const toolDispatcher = new ToolDispatcher(eventBus);

    registerTools(toolDispatcher);

    const { id: providerId, adapter } = resolveProvider(options.site);
    const provider = new PlaywrightProvider({
      id: providerId,
      name: options.site,
      adapter,
      headless: options.headless,
      useExistingProfile: options.profile,
    });

    provider.setTools(toolDispatcher.getDescriptions());

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
    const systemPrompt = promptEngine.generateSystemPrompt(toolDispatcher.getDescriptions());

    const response = await provider.send({
      model: providerId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    });

    console.log('\nAI Response:');
    console.log('='.repeat(50));
    console.log(response.choices[0].message.content);
    console.log('='.repeat(50));

    await provider.disconnect();
  });

program.parse();
