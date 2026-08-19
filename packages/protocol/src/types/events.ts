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

  // Tool loop lifecycle (for the AI Debugger timeline)
  'loop.started': { sessionId: string; model: string; messageCount: number };
  'loop.iteration': { sessionId: string; iteration: number; toolCount: number; tools: string[] };
  'loop.repair': { sessionId: string; iteration: number; repairs: number };
  'loop.final': { sessionId: string; iterations: number; duration: number };
  'loop.error': { sessionId: string; error: string };

  'permission.requested': { toolName: string; sessionId: string };
  'permission.granted': { toolName: string; sessionId: string };
  'permission.denied': { toolName: string; sessionId: string };

  'session.created': { sessionId: string };
  'session.initializing': { sessionId: string };
  'session.ready': { sessionId: string };
  'session.started': { sessionId: string };
  'session.paused': { sessionId: string };
  'session.resumed': { sessionId: string };
  'session.degraded': { sessionId: string; error?: string };
  'session.recovering': { sessionId: string };
  'session.stopped': { sessionId: string };
  'session.destroyed': { sessionId: string };
  'session.terminated': { sessionId: string };
  'session.closed': { sessionId: string };

  // Capability and Tool Negotiation events
  'capability.detected': { providerId: string; capabilities: string[] };
  'capability.granted': { capability: string; providerId: string };
  'capability.revoked': { capability: string; providerId: string; reason: string };
  'capability.changed': { providerId: string; added: string[]; removed: string[] };

  'tool.available': { toolName: string; sessionId: string };
  'tool.unavailable': { toolName: string; sessionId: string; reason: string };
  'tool.denied': { toolName: string; sessionId: string; reason: string };
  'tool.confirmation_required': { toolName: string; sessionId: string; reason: string };

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

  // Plugin lifecycle events
  'plugin.loaded': { name: string };
  'plugin.unloaded': { name: string };
  'plugin.reloaded': { name: string };
  'plugin.error': { name: string; error: string };
  'provider.register': { provider: unknown; plugin: string };
  'tool.register': { tool: unknown; plugin: string };
};

export type EventHandler<T> = (data: T) => void | Promise<void>;
