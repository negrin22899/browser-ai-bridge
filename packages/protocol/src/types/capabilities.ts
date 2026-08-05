/**
 * Provider Capabilities - declares what a provider can do
 */
export interface ProviderCapabilities {
  /** Can stream responses */
  streaming: boolean;
  
  /** Can handle images */
  images: boolean;
  
  /** Can handle files */
  files: boolean;
  
  /** Supports thinking/reasoning */
  thinking: boolean;
  
  /** Supports tool/function calling */
  toolCalling: boolean;
  
  /** Can search the web */
  webSearch: boolean;
  
  /** Supports markdown formatting */
  markdown: boolean;
  
  /** Can generate code */
  codeGeneration: boolean;
  
  /** Supports multi-modal input */
  multiModal: boolean;
  
  /** Maximum context window size */
  maxContextTokens?: number;
  
  /** Maximum output tokens */
  maxOutputTokens?: number;
  
  /** Supported languages */
  languages?: string[];
  
  /** Custom capabilities */
  custom?: Record<string, boolean | string | number>;
}

/**
 * Default capabilities
 */
export const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  streaming: false,
  images: false,
  files: false,
  thinking: false,
  toolCalling: false,
  webSearch: false,
  markdown: true,
  codeGeneration: false,
  multiModal: false,
};

/**
 * Known provider capabilities
 */
export const PROVIDER_CAPABILITIES: Record<string, ProviderCapabilities> = {
  gemini: {
    streaming: true,
    images: true,
    files: true,
    thinking: true,
    toolCalling: false,
    webSearch: true,
    markdown: true,
    codeGeneration: true,
    multiModal: true,
    maxContextTokens: 1000000,
    maxOutputTokens: 8192,
  },
  chatgpt: {
    streaming: true,
    images: true,
    files: true,
    thinking: true,
    toolCalling: false,
    webSearch: true,
    markdown: true,
    codeGeneration: true,
    multiModal: true,
    maxContextTokens: 128000,
    maxOutputTokens: 4096,
  },
  claude: {
    streaming: true,
    images: true,
    files: true,
    thinking: true,
    toolCalling: false,
    webSearch: false,
    markdown: true,
    codeGeneration: true,
    multiModal: true,
    maxContextTokens: 200000,
    maxOutputTokens: 4096,
  },
  deepseek: {
    streaming: true,
    images: false,
    files: false,
    thinking: true,
    toolCalling: false,
    webSearch: false,
    markdown: true,
    codeGeneration: true,
    multiModal: false,
    maxContextTokens: 64000,
    maxOutputTokens: 4096,
  },
};

/**
 * Check if a provider supports a specific capability
 */
export function hasCapability(
  capabilities: ProviderCapabilities,
  capability: keyof ProviderCapabilities
): boolean {
  return capabilities[capability] === true;
}

/**
 * Get missing capabilities compared to requirements
 */
export function getMissingCapabilities(
  provider: ProviderCapabilities,
  required: Partial<ProviderCapabilities>
): string[] {
  const missing: string[] = [];
  
  for (const [key, value] of Object.entries(required)) {
    if (value === true && provider[key as keyof ProviderCapabilities] !== true) {
      missing.push(key);
    }
  }
  
  return missing;
}

/**
 * Merge capabilities (provider overrides defaults)
 */
export function mergeCapabilities(
  defaults: ProviderCapabilities,
  overrides: Partial<ProviderCapabilities>
): ProviderCapabilities {
  return { ...defaults, ...overrides };
}
