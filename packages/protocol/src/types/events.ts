export type EventMap = {
  'request.received': { requestId: string; model: string };
  'request.completed': { requestId: string; duration: number };
  'request.error': { requestId: string; error: string };

  'provider.connected': { providerId: string };
  'provider.disconnected': { providerId: string };
  'provider.error': { providerId: string; error: string };

  'tool.requested': { toolName: string; params: Record<string, unknown>; sessionId: string };
  'tool.executing': { toolName: string; sessionId: string };
  'tool.completed': { toolName: string; result: unknown; sessionId: string };
  'tool.error': { toolName: string; error: string; sessionId: string };

  'permission.requested': { toolName: string; sessionId: string };
  'permission.granted': { toolName: string; sessionId: string };
  'permission.denied': { toolName: string; sessionId: string };

  'session.created': { sessionId: string };
  'session.closed': { sessionId: string };

  'recording.started': { sessionId: string };
  'recording.stopped': { sessionId: string };

  'replay.started': { sessionId: string };
  'replay.completed': { sessionId: string; result?: unknown };
  'replay.error': { sessionId: string; error: string };
  'replay.request': { sessionId: string; data: unknown };
  'replay.response': { sessionId: string; data: unknown };
  'replay.tool_call': { sessionId: string; data: unknown };
  'replay.tool_result': { sessionId: string; data: unknown };
  'replay.permission': { sessionId: string; data: unknown };
};

export type EventHandler<T> = (data: T) => void | Promise<void>;
