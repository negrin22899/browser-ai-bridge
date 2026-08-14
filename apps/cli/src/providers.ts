import type { PlaywrightAdapter } from '@bab/playwright-provider';
import {
  GeminiPlaywrightAdapter,
  ChatGPTPlaywrightAdapter,
  ClaudePlaywrightAdapter,
  DeepSeekPlaywrightAdapter,
} from '@bab/playwright-provider';

export interface ProviderEntry {
  id: string;
  names: string[];
  urlPatterns: string[];
  createAdapter: () => PlaywrightAdapter;
}

const PROVIDERS: ProviderEntry[] = [
  {
    id: 'gemini',
    names: ['gemini', 'google'],
    urlPatterns: ['gemini.google.com'],
    createAdapter: () => new GeminiPlaywrightAdapter(),
  },
  {
    id: 'chatgpt',
    names: ['chatgpt', 'openai'],
    urlPatterns: ['chat.openai.com', 'chatgpt.com'],
    createAdapter: () => new ChatGPTPlaywrightAdapter(),
  },
  {
    id: 'claude',
    names: ['claude', 'anthropic'],
    urlPatterns: ['claude.ai'],
    createAdapter: () => new ClaudePlaywrightAdapter(),
  },
  {
    id: 'deepseek',
    names: ['deepseek'],
    urlPatterns: ['chat.deepseek.com'],
    createAdapter: () => new DeepSeekPlaywrightAdapter(),
  },
];

function findProvider(siteUrlOrName: string): ProviderEntry {
  const normalized = siteUrlOrName.toLowerCase().trim();

  for (const p of PROVIDERS) {
    if (p.names.includes(normalized) || p.urlPatterns.some((u) => normalized.includes(u))) {
      return p;
    }
  }

  // Default to Gemini
  return PROVIDERS[0];
}

export function resolveProvider(siteUrlOrName: string): { id: string; adapter: PlaywrightAdapter } {
  const entry = findProvider(siteUrlOrName);
  return { id: entry.id, adapter: entry.createAdapter() };
}

export function resolveProviderId(siteUrlOrName: string): string {
  return findProvider(siteUrlOrName).id;
}

export function listProviders(): string[] {
  return PROVIDERS.map((p) => p.id);
}
