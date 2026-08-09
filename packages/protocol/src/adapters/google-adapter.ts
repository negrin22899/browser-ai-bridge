import type {
  BridgeAdapter,
  BridgeRequest,
  BridgeResponse,
  BridgeStreamChunk,
} from '../types/bridge-protocol.js';
import type { ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk } from '../types/message.js';

/**
 * Google Gemini Adapter - converts between Google Generative AI API and Bridge Protocol
 *
 * Supports Gemini 1.5 Pro, Gemini 1.5 Flash, etc.
 */
export class GoogleAdapter implements BridgeAdapter {
  readonly name = 'google';
  readonly format = 'google' as const;

  /**
   * Convert Google request to Bridge Protocol
   */
  toBridgeRequest(google: ChatCompletionRequest): BridgeRequest {
    return {
      version: '1.0',
      session: `google-${Date.now()}`,
      provider: google.model,
      messages: google.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        toolCalls: msg.tool_calls?.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        })),
        toolCallId: msg.tool_call_id,
      })),
      tools: google.tools?.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
      stream: google.stream ?? false,
      metadata: {
        client: 'google-adapter',
        clientVersion: '1.0.0',
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Convert Bridge Response to Google format
   */
  fromBridgeResponse(response: BridgeResponse): ChatCompletionResponse {
    return {
      id: `gemini-${response.metadata.requestId}`,
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
   * Convert Bridge Stream Chunk to Google format
   */
  fromBridgeStreamChunk(chunk: BridgeStreamChunk): ChatCompletionChunk {
    return {
      id: `gemini-${chunk.session}`,
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
   * Format messages for Google Gemini API
   */
  formatForGoogle(request: ChatCompletionRequest): {
    contents: Array<{
      role: string;
      parts: Array<{ text: string }>;
    }>;
    systemInstruction?: { parts: Array<{ text: string }> };
    tools?: Array<{
      functionDeclarations: Array<{
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      }>;
    }>;
    generationConfig?: {
      maxOutputTokens?: number;
      temperature?: number;
    };
  } {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const otherMessages = request.messages.filter(m => m.role !== 'system');

    return {
      contents: otherMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content ?? '' }],
      })),
      systemInstruction: systemMessage ? {
        parts: [{ text: systemMessage.content ?? '' }],
      } : undefined,
      tools: request.tools ? [{
        functionDeclarations: request.tools.map(t => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters as Record<string, unknown>,
        })),
      }] : undefined,
      generationConfig: {
        maxOutputTokens: 4096,
      },
    };
  }

  /**
   * Parse Google Gemini API response to ChatCompletionResponse
   */
  parseGoogleResponse(response: {
    candidates: Array<{
      content: {
        parts: Array<{
          text?: string;
          functionCall?: { name: string; args: Record<string, unknown> };
        }>;
        role: string;
      };
      finishReason: string;
    }>;
    usageMetadata: {
      promptTokenCount: number;
      candidatesTokenCount: number;
      totalTokenCount: number;
    };
  }): ChatCompletionResponse {
    const candidate = response.candidates[0];
    const textPart = candidate.content.parts.find(p => p.text);
    const functionCallParts = candidate.content.parts.filter(p => p.functionCall);

    return {
      id: `gemini-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gemini',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: textPart?.text ?? null,
          tool_calls: functionCallParts.length > 0 ? functionCallParts.map((fc, i) => ({
            id: `call-${Date.now()}-${i}`,
            type: 'function' as const,
            function: {
              name: fc.functionCall!.name,
              arguments: JSON.stringify(fc.functionCall!.args),
            },
          })) : undefined,
        },
        finish_reason: functionCallParts.length > 0 ? 'tool_calls' : 'stop',
      }],
      usage: {
        prompt_tokens: response.usageMetadata.promptTokenCount,
        completion_tokens: response.usageMetadata.candidatesTokenCount,
        total_tokens: response.usageMetadata.totalTokenCount,
      },
    };
  }
}
