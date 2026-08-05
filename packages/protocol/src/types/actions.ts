// Custom format: {"actions": [...]} — NOT OpenAI function calling
export interface ActionRequest {
  actions: Action[];
  context?: string;
}

export interface Action {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  description: string;
}

export interface ActionResponse {
  results: ActionResult[];
  summary: string;
}

export interface ActionResult {
  id: string;
  success: boolean;
  output: string;
  error?: string;
}

// Tool Negotiation — AI and runtime agree on available tools
export interface ToolNegotiation {
  availableTools: ToolDescription[];
  constraints: NegotiationConstraints;
  format: 'actions';
}

export interface NegotiationConstraints {
  maxActionsPerTurn: number;
  allowedTools: string[];
  deniedTools: string[];
  requireConfirmation: string[];
}

import type { ToolDescription } from './tool.js';
