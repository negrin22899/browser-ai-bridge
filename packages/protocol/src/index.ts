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

// Provider v2 types (new unified contract)
export type {
  ProviderMetadata,
  ProviderTransport,
  ProviderState,
  ProviderStateInfo,
  RecoveryInfo,
  ProviderHealth,
  ConnectionHealth,
  BrowserHealth,
  LatencyHealth,
  RequestInfo,
  RequestError,
  CapabilitiesHealth,
  CapabilityStatus,
  ProviderErrorCode,
  ProviderError,
} from './types/provider-v2.js';
export { createProviderError } from './types/provider-v2.js';

// Adapters
export { OpenAIAdapter } from './adapters/openai-adapter.js';
export { AnthropicAdapter } from './adapters/anthropic-adapter.js';
export { GoogleAdapter } from './adapters/google-adapter.js';

// Capability utilities
export {
  DEFAULT_CAPABILITIES,
  PROVIDER_CAPABILITIES,
  hasCapability,
  getMissingCapabilities,
  mergeCapabilities
} from './types/capabilities.js';

// Capability Resolver
export { CapabilityResolver, defaultCapabilityResolver } from './capability-resolver.js';
export type { CapabilityContext, CapabilityRequirements, ResolvedCapabilities, CapabilityMismatch } from './capability-resolver.js';

// Conformance Testing
export { ProviderConformanceTester, testProviderConformance, printConformanceReport } from './conformance-test.js';
export type { ConformanceTestResult, ConformanceReport } from './conformance-test.js';

// Tool Negotiation
export { ToolNegotiator, defaultToolNegotiator, resolveAvailableTools } from './tool-negotiation.js';
export type { ToolNegotiationContext, NegotiationResult, NegotiationSummary, RuntimeCapabilities, UserPermissions, SessionInfo } from './tool-negotiation.js';

// Bridge Protocol utilities
export { createBridgeRequest, createBridgeResponse } from './types/bridge-protocol.js';

// Validation
export { ProviderValidator, validateProvider, printValidationReport } from './validation/provider-validator.js';
export type { ValidationResult, ValidationReport } from './validation/provider-validator.js';
