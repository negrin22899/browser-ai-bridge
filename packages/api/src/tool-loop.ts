import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  Message,
  ToolCall,
} from '@bab/protocol';
import type { Provider } from '@bab/protocol';
import type { Runtime } from '@bab/runtime';
import type { Logger } from '@bab/core';

export interface ToolLoopOptions {
  maxIterations?: number;
  /** Called for every message the loop appends (for session recording). */
  onMessage?: (message: Message) => void;
}

interface Action {
  id?: string;
  tool: string;
  params?: Record<string, unknown>;
}

const DEFAULT_MAX_ITERATIONS = 4;

/**
 * Execute a chat request with a real tool loop.
 *
 * The provider is asked repeatedly until it produces a final answer
 * without tool calls. Tool calls are resolved through the Runtime
 * (PermissionEngine + ToolDispatcher) and results are fed back.
 */
export async function runToolLoop(
  provider: Provider,
  runtime: Runtime,
  logger: Logger,
  request: ChatCompletionRequest,
  sessionId: string,
  options?: ToolLoopOptions
): Promise<ChatCompletionResponse> {
  const maxIterations = options?.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const messages: Message[] = [...request.messages];
  let lastResponse: ChatCompletionResponse | null = null;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await provider.send({ ...request, messages });
    lastResponse = response;

    const choice = response.choices[0];
    if (!choice?.message) {
      return response;
    }

    const calls = extractToolCalls(choice.message);
    if (calls.length === 0) {
      options?.onMessage?.({ ...choice.message });
      return response;
    }

    logger.info('Executing tool calls', {
      sessionId,
      iteration,
      tools: calls.map((c) => c.function.name),
    });

    // Record the assistant tool-call message.
    messages.push({ ...choice.message });
    options?.onMessage?.({ ...choice.message });

    const results: Array<{
      id: string;
      tool: string;
      success: boolean;
      output: string;
      error?: string;
    }> = [];

    for (const call of calls) {
      const params = parseArguments(call.function.arguments);
      const result = await runtime.executeTool(call.function.name, params, sessionId);

      results.push({
        id: call.id,
        tool: call.function.name,
        success: result.success,
        output: result.output,
        error: result.error,
      });
    }

    const resultsMessage: Message = {
      role: 'user',
      content:
        JSON.stringify(
          {
            results,
            summary: `Executed ${results.length} tool(s)`,
          },
          null,
          2
        ) +
        '\n\nContinue using these results. If the task is now complete, reply with your final answer in plain text (no JSON, no actions).',
    };

    messages.push(resultsMessage);
    options?.onMessage?.(resultsMessage);
  }

  // Maximum iterations reached — return the last response with a note.
  const response = lastResponse as ChatCompletionResponse;
  const message = response.choices[0]?.message;
  if (message) {
    message.content =
      (message.content ?? '') +
      '\n\n[Note: tool execution reached the maximum number of iterations.]';
  }
  return response;
}

/**
 * Extract tool calls from an assistant message.
 *
 * Supports both the OpenAI `tool_calls` shape and the prompt-negotiation
 * `{"actions": [...]}` JSON shape produced by browser providers.
 */
export function extractToolCalls(message: Message): ToolCall[] {
  if (message.tool_calls && message.tool_calls.length > 0) {
    return message.tool_calls;
  }

  const actions = parseActionsJson(message.content ?? '');
  return actions.map((action, index) => ({
    id: action.id ?? `action-${index}`,
    type: 'function' as const,
    function: {
      name: action.tool,
      arguments: JSON.stringify(action.params ?? {}),
    },
  }));
}

/**
 * Parse the `{"actions": [...]}` negotiation format from raw text,
 * tolerating markdown code fences and surrounding prose.
 */
export function parseActionsJson(text: string): Action[] {
  let candidate = text.trim();

  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    candidate = fence[1].trim();
  }

  const parsed = tryParseJson(candidate) ?? tryParseJson(findJsonObject(candidate));
  if (parsed === undefined) return [];

  return extractActions(parsed);
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function findJsonObject(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : '';
}

function extractActions(parsed: unknown): Action[] {
  if (Array.isArray(parsed)) {
    return parsed.filter(isAction);
  }
  if (parsed && typeof parsed === 'object' && 'actions' in parsed) {
    const actions = (parsed as { actions: unknown }).actions;
    if (Array.isArray(actions)) {
      return actions.filter(isAction);
    }
  }
  return [];
}

function isAction(value: unknown): value is Action {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { tool?: unknown }).tool === 'string'
  );
}

function parseArguments(args: string): Record<string, unknown> {
  if (!args) return {};
  try {
    const parsed = JSON.parse(args);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Invalid JSON arguments
  }
  return {};
}
