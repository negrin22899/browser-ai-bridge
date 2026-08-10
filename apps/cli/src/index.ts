#!/usr/bin/env node

import { Command } from 'commander';
import { createServer } from '@bab/api';
import { ProviderManager, SessionManager, EventBus, Logger } from '@bab/core';
import { PromptEngine } from '@bab/prompt-engine';
import { ToolDispatcher } from '@bab/runtime';
import { PlaywrightProvider } from '@bab/playwright-provider';
import { GeminiPlaywrightAdapter } from '@bab/playwright-provider';
import { ChatGPTPlaywrightAdapter } from '@bab/playwright-provider';
import { ClaudePlaywrightAdapter } from '@bab/playwright-provider';
import { DeepSeekPlaywrightAdapter } from '@bab/playwright-provider';
import { FsReadTool, FsWriteTool } from '@bab/tools-fs';
import { GitStatusTool, GitDiffTool, GitCommitTool } from '@bab/tools-git';
import { ShellExecTool } from '@bab/tools-shell';
import { serve } from '@hono/node-server';
import { runDoctor, printDoctorResults } from './doctor.js';
import { runDiagnose, saveDiagnostic, printDiagnosticSummary } from './diagnose.js';

const program = new Command();

program
  .name('bab')
  .description('Browser AI Bridge - Use browser AI in your local environment')
  .version('1.0.0');

// Doctor command
program
  .command('doctor')
  .description('Check system requirements and configuration')
  .action(async () => {
    console.log('\nChecking system requirements...\n');
    const results = await runDoctor();
    printDoctorResults(results);

    const hasErrors = results.some(r => r.status === 'error');
    if (hasErrors) {
      process.exit(1);
    }
  });

// Diagnose command
program
  .command('diagnose')
  .description('Collect diagnostic information for bug reports')
  .option('-o, --output <file>', 'Output file path')
  .action(async (_options) => {
    console.log('\nCollecting diagnostic information...\n');
    const info = await runDiagnose();
    printDiagnosticSummary(info);

    const filepath = await saveDiagnostic(info);
    console.log(`\nDiagnostic saved to: ${filepath}`);
    console.log('Attach this file to your bug report.\n');
  });

// List providers command
program
  .command('providers')
  .description('List available AI providers')
  .action(() => {
    console.log('\nAvailable AI Providers:');
    console.log('='.repeat(50));
    console.log('');
    console.log('  gemini      - Google Gemini (gemini.google.com)');
    console.log('  chatgpt     - ChatGPT (chatgpt.com)');
    console.log('  claude      - Claude (claude.ai)');
    console.log('  deepseek    - DeepSeek (chat.deepseek.com)');
    console.log('');
    console.log('Usage:');
    console.log('  bab serve --site https://gemini.google.com');
    console.log('  bab serve --site https://chatgpt.com');
    console.log('  bab serve --site https://claude.ai');
    console.log('  bab serve --site https://chat.deepseek.com');
    console.log('');
    console.log('='.repeat(50));
  });

// Helper function to get adapter by site URL or provider name
function getAdapter(siteUrlOrName: string) {
  const normalized = siteUrlOrName.toLowerCase().trim();

  // Check by provider name
  if (normalized === 'gemini' || normalized === 'google') {
    return new GeminiPlaywrightAdapter();
  }
  if (normalized === 'chatgpt' || normalized === 'openai') {
    return new ChatGPTPlaywrightAdapter();
  }
  if (normalized === 'claude' || normalized === 'anthropic') {
    return new ClaudePlaywrightAdapter();
  }
  if (normalized === 'deepseek') {
    return new DeepSeekPlaywrightAdapter();
  }

  // Check by URL
  if (normalized.includes('gemini.google.com')) return new GeminiPlaywrightAdapter();
  if (normalized.includes('chat.openai.com') || normalized.includes('chatgpt.com')) return new ChatGPTPlaywrightAdapter();
  if (normalized.includes('claude.ai')) return new ClaudePlaywrightAdapter();
  if (normalized.includes('chat.deepseek.com')) return new DeepSeekPlaywrightAdapter();

  // Default to Gemini
  console.log('Unknown provider, defaulting to Gemini');
  return new GeminiPlaywrightAdapter();
}

// Helper function to get provider ID from site URL or name
function getProviderId(siteUrlOrName: string): string {
  const normalized = siteUrlOrName.toLowerCase().trim();

  if (normalized === 'gemini' || normalized === 'google' || normalized.includes('gemini.google.com')) {
    return 'gemini';
  }
  if (normalized === 'chatgpt' || normalized === 'openai' || normalized.includes('chat.openai.com') || normalized.includes('chatgpt.com')) {
    return 'chatgpt';
  }
  if (normalized === 'claude' || normalized === 'anthropic' || normalized.includes('claude.ai')) {
    return 'claude';
  }
  if (normalized === 'deepseek' || normalized.includes('chat.deepseek.com')) {
    return 'deepseek';
  }

  return 'gemini';
}

// Serve command
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

    // Register tools
    toolDispatcher.register(new FsReadTool());
    toolDispatcher.register(new FsWriteTool());
    toolDispatcher.register(new GitStatusTool());
    toolDispatcher.register(new GitDiffTool());
    toolDispatcher.register(new GitCommitTool());
    toolDispatcher.register(new ShellExecTool());

    // Create provider if site URL provided
    if (options.site) {
      const adapter = getAdapter(options.site);
      const providerId = getProviderId(options.site);
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

// Chat command
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

    // Register tools
    toolDispatcher.register(new FsReadTool());
    toolDispatcher.register(new FsWriteTool());
    toolDispatcher.register(new GitStatusTool());
    toolDispatcher.register(new GitDiffTool());
    toolDispatcher.register(new GitCommitTool());
    toolDispatcher.register(new ShellExecTool());

    const adapter = getAdapter(options.site);
    const providerId = getProviderId(options.site);
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
