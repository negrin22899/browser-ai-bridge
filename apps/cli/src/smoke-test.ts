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

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
}

/**
 * Run smoke test - verifies the full pipeline works
 */
export async function runSmokeTest(site: string): Promise<boolean> {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           Browser AI Bridge - Smoke Test                      ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const results: TestResult[] = [];
  let provider: PlaywrightProvider | null = null;

  // Test 1: Create EventBus
  results.push(await runTest('EventBus', async () => {
    const eventBus = new EventBus();
    if (!eventBus) throw new Error('Failed to create EventBus');
  }));

  // Test 2: Create Logger
  results.push(await runTest('Logger', async () => {
    const logger = new Logger({ level: 'error', format: 'text', context: 'Test' });
    if (!logger) throw new Error('Failed to create Logger');
  }));

  // Test 3: Create ProviderManager
  results.push(await runTest('ProviderManager', async () => {
    const eventBus = new EventBus();
    const pm = new ProviderManager(eventBus);
    if (!pm) throw new Error('Failed to create ProviderManager');
  }));

  // Test 4: Create SessionManager
  results.push(await runTest('SessionManager', async () => {
    const eventBus = new EventBus();
    const sm = new SessionManager(eventBus);
    if (!sm) throw new Error('Failed to create SessionManager');
  }));

  // Test 5: Create Runtime
  results.push(await runTest('Runtime', async () => {
    const eventBus = new EventBus();
    const toolDispatcher = new ToolDispatcher(eventBus);
    toolDispatcher.register(new FsReadTool());
    toolDispatcher.register(new FsWriteTool());
    toolDispatcher.register(new GitStatusTool());
    toolDispatcher.register(new GitDiffTool());
    toolDispatcher.register(new GitCommitTool());
    toolDispatcher.register(new ShellExecTool());
    if (!toolDispatcher) throw new Error('Failed to create ToolDispatcher');
  }));

  // Test 6: Create PromptEngine
  results.push(await runTest('PromptEngine', async () => {
    const pe = new PromptEngine();
    if (!pe) throw new Error('Failed to create PromptEngine');
  }));

  // Test 7: Create API Server
  results.push(await runTest('API Server', async () => {
    const eventBus = new EventBus();
    const logger = new Logger({ level: 'error', format: 'text', context: 'Test' });
    const pm = new ProviderManager(eventBus);
    const sm = new SessionManager(eventBus);
    const pe = new PromptEngine();
    const app = createServer({ providerManager: pm, sessionManager: sm, logger, promptEngine: pe });
    if (!app) throw new Error('Failed to create API server');
  }));

  // Test 8: Connect to Provider
  results.push(await runTest('Provider Connection', async () => {
    const adapter = getAdapter(site);
    provider = new PlaywrightProvider({
      id: getProviderId(site),
      name: site,
      adapter,
      headless: true,
      useExistingProfile: true,
    });

    await provider.connect();

    if (provider.status !== 'connected') {
      throw new Error(`Provider status: ${provider.status}`);
    }
  }));

  // Test 9: Health Check
  if (provider) {
    results.push(await runTest('Health Check', async () => {
      const health = await provider!.health();
      if (!health.healthy) {
        throw new Error(health.error || 'Unhealthy');
      }
    }));
  }

  // Test 10: Send Test Request
  if (provider) {
    results.push(await runTest('Test Request', async () => {
      const response = await provider!.send({
        model: getProviderId(site),
        messages: [{ role: 'user', content: 'Say "test" and nothing else.' }],
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response received');
      }

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response');
      }

      console.log(`    Response: "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}"`);
    }));
  }

  // Cleanup
  if (provider) {
    try {
      await (provider as PlaywrightProvider).disconnect();
    } catch {
      // Ignore cleanup errors
    }
  }

  // Print results
  printResults(results);

  const failed = results.filter(r => r.status === 'fail');
  return failed.length === 0;
}

function getAdapter(site: string) {
  const normalized = site.toLowerCase().trim();
  if (normalized === 'gemini' || normalized.includes('gemini.google.com')) return new GeminiPlaywrightAdapter();
  if (normalized === 'chatgpt' || normalized.includes('chatgpt.com') || normalized.includes('chat.openai.com')) return new ChatGPTPlaywrightAdapter();
  if (normalized === 'claude' || normalized.includes('claude.ai')) return new ClaudePlaywrightAdapter();
  if (normalized === 'deepseek' || normalized.includes('chat.deepseek.com')) return new DeepSeekPlaywrightAdapter();
  return new GeminiPlaywrightAdapter();
}

function getProviderId(site: string): string {
  const normalized = site.toLowerCase().trim();
  if (normalized === 'gemini' || normalized.includes('gemini.google.com')) return 'gemini';
  if (normalized === 'chatgpt' || normalized.includes('chatgpt.com') || normalized.includes('chat.openai.com')) return 'chatgpt';
  if (normalized === 'claude' || normalized.includes('claude.ai')) return 'claude';
  if (normalized === 'deepseek' || normalized.includes('chat.deepseek.com')) return 'deepseek';
  return 'gemini';
}

async function runTest(name: string, fn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now();
  try {
    await fn();
    return { name, status: 'pass', duration: Date.now() - start };
  } catch (error) {
    return {
      name,
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function printResults(results: TestResult[]): void {
  console.log('\n' + '='.repeat(60));
  console.log('Test Results');
  console.log('='.repeat(60));

  for (const result of results) {
    const icon = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '○';
    const color = result.status === 'pass' ? '\x1b[32m' : result.status === 'fail' ? '\x1b[31m' : '\x1b[33m';
    const reset = '\x1b[0m';
    const duration = `(${result.duration}ms)`.padStart(10);

    console.log(`  ${color}${icon}${reset} ${result.name.padEnd(25)} ${duration}`);

    if (result.error) {
      console.log(`    ${color}Error: ${result.error}${reset}`);
    }
  }

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = results.length;

  console.log('='.repeat(60));
  console.log(`  Total: ${total}  Passed: ${passed}  Failed: ${failed}`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n  ✓ All tests passed! System is ready.\n');
  } else {
    console.log('\n  ✗ Some tests failed. Run "bab doctor" for details.\n');
  }
}
