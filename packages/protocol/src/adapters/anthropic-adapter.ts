import type {
  BridgeAdapter,
  BridgeRequest,
  BridgeResponse,
  BridgeStreamChunk,
} from '../types/bridge-protocol.js';
import type { ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk } from '../types/message.js';

/**
 * Anthropic Adapter - converts between Anthropic Messages API and Bridge Protocol
 *
 * Supports Claude 3.5 Sonnet, Claude 3 Opus, etc.
 */
export class AnthropicAdapter implements BridgeAdapter {
  readonly name = 'anthropic';
  readonly format = 'anthropic' as const;

  /**
   * Convert Anthropic request to Bridge Protocol
   */
  toBridgeRequest(anthropic: ChatCompletionRequest): BridgeRequest {
    return {
      version: '1.0',
      session: `anthropic-${Date.now()}`,
      provider: anthropic.model,
      messages: anthropic.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        toolCalls: msg.tool_calls?.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        })),
        toolCallId: msg.tool_call_id,
      })),
      tools: anthropic.tools?.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
      stream: anthropic.stream ?? false,
      metadata: {
        client: 'anthropic-adapter',
        clientVersion: '1.0.0',
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Convert Bridge Response to Anthropic format
   */
  fromBridgeResponse(response: BridgeResponse): ChatCompletionResponse {
    return {
      id: `msg-${response.metadata.requestId}`,
      object: 'chat.completion',
      created: Math.floor(response.metadata.duration / 1000),
      model: response.provider,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: response.message.content,
          tool_calls: response.message.toolCalls?.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        },
        finish_reason: response.message.toolCalls?.length ? 'tool_calls' : 'stop',
      }],
      usage: response.usage ? {
        prompt_tokens: response.usage.promptTokens,
        completion_tokens: response.usage.completionTokens,
        total_tokens: response.usage.promptTokens + response.usage.completionTokens,
      } : undefined,
    };
  }

  /**
   * Convert Bridge Stream Chunk to Anthropic format
   */
  fromBridgeStreamChunk(chunk: BridgeStreamChunk): ChatCompletionChunk {
    return {
      id: `msg-${chunk.session}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: 'unknown',
      choices: [{
        index: 0,
        delta: {
          role: chunk.delta.role,
          content: chunk.delta.content ?? undefined,
          tool_calls: chunk.delta.toolCalls?.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        },
        finish_reason: chunk.finishReason ?? null,
      }],
    };
  }

  /**
   * Format messages for Anthropic API
   * Anthropic requires system message to be separate from user/assistant messages
   */
  formatForAnthropic(request: ChatCompletionRequest): {
    system?: string;
    messages: Array<{ role: string; content: string }>;
    max_tokens: number;
    model: string;
    stream?: boolean;
    tools?: Array<{
      name: string;
      description: string;
      input_schema: Record<string, unknown>;
    }>;
  } {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const otherMessages = request.messages.filter(m => m.role !== 'system');

    return {
      system: systemMessage?.content ?? undefined,
      messages: otherMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content ?? '',
      })),
      max_tokens: 4096,
      model: request.model,
      stream: request.stream,
      tools: request.tools?.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters as Record<string, unknown>,
      })),
    };
  }

  /**
   * Parse Anthropic API response to ChatCompletionResponse
   */
  parseAnthropicResponse(response: {
    id: string;
    type: string;
    role: string;
    content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>;
    model: string;
    stop_reason: string;
    usage: { input_tokens: number; output_tokens: number };
  }): ChatCompletionResponse {
    const textContent = response.content.find(c => c.type === 'text');
    const toolUseContent = response.content.filter(c => c.type === 'tool_use');

    return {
      id: response.id,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: response.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: textContent?.text ?? null,
          tool_calls: toolUseContent.length > 0 ? toolUseContent.map(tc => ({
            id: tc.id!,
            type: 'function' as const,
            function: {
              name: tc.name!,
              arguments: JSON.stringify(tc.input),
            },
          })) : undefined,
        },
        finish_reason: toolUseContent.length > 0 ? 'tool_calls' : 'stop',
      }],
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }
}
