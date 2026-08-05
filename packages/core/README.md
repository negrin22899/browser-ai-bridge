# @bab/core

Core module for Browser AI Bridge - provides fundamental services for the runtime.

## Architecture

```
Core
├── EventBus            - Typed event system
├── Logger              - Logging with levels and formats
├── Config              - Configuration management
├── SessionManager      - Session lifecycle management
├── Router              - Request routing to providers
└── ProviderManager     - Provider registration and management
```

## Components

### EventBus

Typed event system for inter-component communication.

```typescript
import { EventBus } from '@bab/core';

const eventBus = new EventBus();

// Subscribe to events
const unsubscribe = eventBus.on('session.created', (data) => {
  console.log('Session created:', data.sessionId);
});

// Emit events
eventBus.emit('session.created', { sessionId: 'test-123' });

// Unsubscribe
unsubscribe();
```

### Logger

Configurable logging with multiple formats.

```typescript
import { Logger } from '@bab/core';

const logger = new Logger({
  level: 'info',
  format: 'text',
  context: 'MyModule',
});

logger.info('Processing request', { requestId: '123' });

// Create child logger
const childLogger = logger.child('SubModule');
childLogger.debug('Debug message');
```

### Config

Configuration management with deep merge and path access.

```typescript
import { Config } from '@bab/core';

const config = new Config({
  server: { port: 8080 },
});

config.get('server.port'); // 8080
config.set('server.host', '0.0.0.0');
```

### SessionManager

Session lifecycle management with event emission.

```typescript
import { SessionManager, EventBus } from '@bab/core';

const eventBus = new EventBus();
const sessionManager = new SessionManager(eventBus);

const session = sessionManager.create('gemini');
sessionManager.addMessage(session.id, { role: 'user', content: 'Hello' });
sessionManager.close(session.id);
```

### ProviderManager

Provider registration and management.

```typescript
import { ProviderManager, EventBus } from '@bab/core';

const eventBus = new EventBus();
const providerManager = new ProviderManager(eventBus);

providerManager.register(myProvider);
providerManager.setActive('gemini');

const active = providerManager.getActive();
```

### Router

Routes requests to the active provider.

```typescript
import { Router, EventBus } from '@bab/core';

const eventBus = new EventBus();
const router = new Router(eventBus);

router.registerProvider(myProvider);
router.setActiveProvider('gemini');

const response = await router.route({
  model: 'gemini-pro',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

## Events

| Event | Data | Description |
|-------|------|-------------|
| `session.created` | `{ sessionId }` | Session created |
| `session.closed` | `{ sessionId }` | Session closed |
| `provider.connected` | `{ providerId }` | Provider registered |
| `provider.disconnected` | `{ providerId }` | Provider unregistered |
| `request.received` | `{ requestId, model }` | Request received |
| `request.completed` | `{ requestId, duration }` | Request completed |
| `request.error` | `{ requestId, error }` | Request failed |

## Tests

```bash
npm test -w @bab/core
```

57 tests covering all components.
