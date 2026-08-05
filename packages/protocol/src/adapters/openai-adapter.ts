import type {
  BridgeAdapter,
  BridgeRequest,
  BridgeResponse,
  BridgeStreamChunk,
} from '../types/bridge-protocol.js';
import type { ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk } from '../types/message.js';

/**
 * OpenAI Adapter - converts between OpenAI API and Bridge Protocol
 */
export class OpenAIAdapter implements BridgeAdapter {
  readonly name = 'openai';
  readonly format = 'openai' as const;

  /**
   * Convert OpenAI request to Bridge Protocol
   */
  toBridgeRequest(openai: ChatCompletionRequest): BridgeRequest {
    return {
      version: '1.0',
      session: `openai-${Date.now()}`,
      provider: openai.model,
      messages: openai.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        toolCalls: msg.tool_calls?.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        })),
        toolCallId: msg.tool_call_id,
      })),
      tools: openai.tools?.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
      stream: openai.stream ?? false,
      metadata: {
        client: 'openai-adapter',
        clientVersion: '1.0.0',
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Convert Bridge Response to OpenAI format
   */
  fromBridgeResponse(response: BridgeResponse): ChatCompletionResponse {
    return {
      id: `chatcmpl-${response.metadata.requestId}`,
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
        total_tokens: response.usage.totalTokens,
      } : undefined,
    };
  }

  /**
   * Convert Bridge Stream Chunk to OpenAI format
   */
  fromBridgeStreamChunk(chunk: BridgeStreamChunk): ChatCompletionChunk {
    return {
      id: `chatcmpl-${chunk.session}`,
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
}
