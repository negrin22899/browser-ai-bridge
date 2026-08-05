export type * from './types/message.js';
export type * from './types/provider.js';
export type * from './types/tool.js';
export type * from './types/runtime.js';
export type * from './types/events.js';
export type * from './types/config.js';
export type * from './types/session.js';
export type * from './types/actions.js';
export type * from './types/capabilities.js';
export type * from './types/bridge-protocol.js';

// Adapters
export { OpenAIAdapter } from './adapters/openai-adapter.js';

// Capability utilities
export {
  DEFAULT_CAPABILITIES,
  PROVIDER_CAPABILITIES,
  hasCapability,
  getMissingCapabilities,
  mergeCapabilities
} from './types/capabilities.js';

// Bridge Protocol utilities
export { createBridgeRequest, createBridgeResponse } from './types/bridge-protocol.js';

// Validation
export { ProviderValidator, validateProvider, printValidationReport } from './validation/provider-validator.js';
export type { ValidationResult, ValidationReport } from './validation/provider-validator.js';
