export interface WebSocketMessage {
  type: string;
  data: unknown;
}

export interface WebSocketConfig {
  path?: string;
  heartbeatInterval?: number;
}

export interface WebSocketClient {
  send(data: string): void;
  close(): void;
  readyState: number;
}

/**
 * WebSocket Handler - manages WebSocket connections
 */
export class WebSocketHandler {
  private clients: Set<WebSocketClient> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private path: string;
  private messageHandler?: (ws: WebSocketClient, message: WebSocketMessage) => void;

  constructor(config?: WebSocketConfig) {
    this.path = config?.path ?? '/ws';

    if (config?.heartbeatInterval) {
      this.startHeartbeat(config.heartbeatInterval);
    }
  }

  /**
   * Get WebSocket path
   */
  getPath(): string {
    return this.path;
  }

  /**
   * Set message handler
   */
  onMessage(handler: (ws: WebSocketClient, message: WebSocketMessage) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Handle new WebSocket connection
   */
  open(ws: WebSocketClient): void {
    this.clients.add(ws);
    console.log(`WebSocket client connected. Total: ${this.clients.size}`);

    // Send welcome message
    this.send(ws, {
      type: 'connected',
      data: {
        timestamp: Date.now(),
        message: 'Connected to Browser AI Bridge',
      },
    });
  }

  /**
   * Handle WebSocket message
   */
  message(ws: WebSocketClient, message: string): void {
    try {
      const parsed = JSON.parse(message) as WebSocketMessage;
      this.handleMessage(ws, parsed);
    } catch (error) {
      this.send(ws, {
        type: 'error',
        data: { message: 'Invalid JSON message' },
      });
    }
  }

  /**
   * Handle parsed message
   */
  private handleMessage(ws: WebSocketClient, message: WebSocketMessage): void {
    switch (message.type) {
      case 'ping':
        this.send(ws, { type: 'pong', data: { timestamp: Date.now() } });
        break;

      case 'subscribe':
        // Handle subscription to events
        break;

      default:
        if (this.messageHandler) {
          this.messageHandler(ws, message);
        } else {
          this.send(ws, {
            type: 'error',
            data: { message: `Unknown message type: ${message.type}` },
          });
        }
    }
  }

  /**
   * Handle WebSocket close
   */
  close(ws: WebSocketClient): void {
    this.clients.delete(ws);
    console.log(`WebSocket client disconnected. Total: ${this.clients.size}`);
  }

  /**
   * Send message to a specific client
   */
  send(ws: WebSocketClient, message: WebSocketMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      try {
        client.send(data);
      } catch (error) {
        console.error('Failed to broadcast to client:', error);
        this.clients.delete(client);
      }
    }
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(interval: number): void {
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        type: 'heartbeat',
        data: { timestamp: Date.now() },
      });
    }, interval);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    for (const client of this.clients) {
      try {
        client.close();
      } catch (error) {
        // Ignore errors during close
      }
    }
    this.clients.clear();
    this.stopHeartbeat();
  }
}
