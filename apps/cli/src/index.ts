#!/usr/bin/env node

import { Command } from 'commander';
import { createServer } from '@bab/api';
import { Router, SessionManager, EventBus, Logger } from '@bab/core';
import { PromptEngine } from '@bab/prompt-engine';
import { ToolDispatcher } from '@bab/runtime';
import { PlaywrightProvider } from '@bab/playwright-provider';
import { GeminiAdapter } from '@bab/playwright-provider';
import { ChatGPTAdapter } from '@bab/playwright-provider';
import { ClaudeAdapter } from '@bab/playwright-provider';
import { DeepSeekAdapter } from '@bab/playwright-provider';
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
  .version('0.2.0');

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

// Helper function to get adapter by site URL
function getAdapter(siteUrl: string) {
  if (siteUrl.includes('gemini.google.com')) return new GeminiAdapter();
  if (siteUrl.includes('chat.openai.com') || siteUrl.includes('chatgpt.com')) return new ChatGPTAdapter();
  if (siteUrl.includes('claude.ai')) return new ClaudeAdapter();
  if (siteUrl.includes('chat.deepseek.com')) return new DeepSeekAdapter();
  return new GeminiAdapter(); // Default
}

// Serve command
program
  .command('serve')
  .description('Start the API server')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('-h, --host <host>', 'Host to bind to', 'localhost')
  .option('--site <url>', 'AI site URL to connect to')
  .option('--headless', 'Run browser in headless mode', false)
  .action(async (options) => {
    const eventBus = new EventBus();
    const logger = new Logger({ level: 'info', format: 'text', context: 'CLI' });
    const sessionManager = new SessionManager(eventBus);
    const router = new Router(eventBus);
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
      const provider = new PlaywrightProvider({
        id: 'browser',
        name: 'Browser AI',
        adapter,
        headless: options.headless,
      });

      provider.setTools(toolDispatcher.getDescriptions());
      router.registerProvider(provider);
      router.setActiveProvider('browser');

      logger.info(`Connecting to ${options.site}...`);
      await provider.connect();
      logger.info('Connected to browser AI');
    }

    const app = createServer({ providerManager: router, sessionManager, logger, promptEngine });

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
  .option('--site <url>', 'AI site URL', 'https://gemini.google.com')
  .option('--headless', 'Run browser in headless mode', false)
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
    const provider = new PlaywrightProvider({
      id: 'browser',
      name: 'Browser AI',
      adapter,
      headless: options.headless,
    });

    provider.setTools(toolDispatcher.getDescriptions());

    logger.info(`Connecting to ${options.site}...`);
    await provider.connect();
    logger.info('Connected!');

    const promptEngine = new PromptEngine();
    const systemPrompt = promptEngine.generateSystemPrompt(toolDispatcher.getDescriptions());

    const response = await provider.send({
      model: 'browser-ai',
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
