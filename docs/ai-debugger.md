# AI Debugger — Browser AI Bridge

> Version: 1.0.0  
> Date: 2026-08-10  
> Status: Accepted

---

## Что такое AI Debugger?

AI Debugger — это слой наблюдения и управления поверх существующего Runtime.

Он объединяет:
- Event Bus
- Recorder
- Replay
- trace_id / observability
- Runtime Inspector
- Sessions
- Provider State
- Tool Negotiation
- Permission Engine

**Это НЕ новая Runtime архитектура.**

---

## Главный принцип

```
Existing Runtime
│
├── Event Bus
├── Recorder
├── Replay
├── Observability
├── Providers
├── Tools
├── Permissions
└── Capabilities
│
▼
AI Debugger
```

---

## Trace Model

### Trace

Каждый запрос создаёт Trace:

```typescript
interface Trace {
  traceId: string;        // Уникальный ID
  sessionId: string;      // ID сессии
  requestId?: string;     // ID запроса
  providerId?: string;    // ID провайдера
  startTime: number;      // Время начала
  endTime?: number;       // Время окончания
  duration?: number;      // Длительность
  status: TraceStatus;    // Статус
  events: TraceEvent[];   // События
  metadata: TraceMetadata; // Метаданные
}
```

### Trace Event

Каждое событие в трассе:

```typescript
interface TraceEvent {
  eventId: string;        // Уникальный ID
  traceId: string;        // ID трассы
  timestamp: number;      // Время
  type: TraceEventType;   // Тип события
  component: TraceComponent; // Компонент
  status: EventStatus;    // Статус
  duration?: number;      // Длительность
  data: TraceEventData;   // Данные
  error?: TraceError;     // Ошибка
}
```

---

## Timeline

Для каждого запроса создаётся timeline:

```
Request
  ↓
Capability Resolution
  ↓
Tool Selection
  ↓
Permission Check
  ↓
Provider Request
  ↓
Browser Action
  ↓
AI Response
  ↓
Tool Execution
  ↓
Tool Result
  ↓
Final Response
```

### Пример вывода

```
TRACE abc123
Session: session-456
Status: completed
Duration: 2500ms

Timeline:
----------------------------------------------------------------------
0s     → request.received           Model: gemini
12ms   ✓ capability.resolved        Tools: 6
15ms   ✓ tool.negotiated            Tool: fs.read
18ms   ✓ permission.checked         fs.read: allowed
20ms   → provider.request           Provider: connected
340ms  ✓ provider.response          Latency: 320ms
2400ms ✓ browser.action             send message
2450ms ✓ tool.executed              Tool: fs.read
2485ms ✓ response.sent
----------------------------------------------------------------------

Performance Breakdown:
----------------------------------------
bridge               12ms ██
capability           3ms  █
permission           2ms  █
provider             320ms ████████████████
browser              2100ms █████████████████████████████████████████████████████████████
tool                 35ms ██
response             12ms ██
```

---

## Debug Session

Пользователь может открыть конкретный trace и увидеть полный timeline.

### Event Details

При открытии события показывается:

- Input
- Output
- Capabilities
- Permissions
- Provider state
- Duration
- Errors
- Related events

**Sensitive data проходит через redaction mechanism.**

---

## Explainability

Debugger объясняет решения Runtime.

### Пример: Tool unavailable

```
Tool: git_push

Status: unavailable

Why:

Provider:
✓ tool calling

Runtime:
✓ git

Permissions:
✗ network = denied

Therefore:
Tool was not exposed to AI.
```

### Пример: Tool requires confirmation

```
Tool: fs.write

Status: confirmation_required

Why:

Provider:
✓ files

Runtime:
✓ filesystem

Permissions:
⚠ filesystem.write = confirm

Therefore:
Tool execution requires user confirmation.
```

---

## Tool Execution Inspector

Для каждого Tool показывается:

```
Tool: git_status

Requirements:
✓ git
✓ filesystem.read

Permission:
✓ allowed

Execution:
✓ success

Duration: 34ms
```

---

## Provider Inspector

Для каждого Provider Request:

```
Provider: Gemini

State: connected

Capabilities:
✓ streaming
✓ toolCalling
✓ files

Request: ...

Response: ...

Latency: 320ms

Errors: none
```

---

## Browser Action Inspector

Для Browser Provider:

```
Browser Action: send message

Selector Strategy:
[data-testid="chat-input"]  ✗
textarea                    ✓

Fallback used: true

Duration: 2100ms
```

---

## Breakpoints

### Добавление breakpoint

```typescript
debugController.addBreakpoint('tool.executed', {
  component: 'tool',
});
```

### Типы breakpoints

- `provider.request` — перед запросом к провайдеру
- `tool.executed` — перед выполнением tool
- `permission.checked` — перед проверкой permission
- `browser.action` — перед действием браузера
- `error` — при ошибке
- `capability.changed` — при изменении capabilities

### Pipeline

```
Event
  ↓
Breakpoint
  ↓
PAUSE
  ↓
Inspector
  ↓
Continue / Replay
```

---

## Pause / Resume

### Приостановка выполнения

```typescript
// Автоматически при breakpoint
const action = await debugController.pause(event, breakpoint);

// Вручную
debugController.pause();
```

### Продолжение

```typescript
// Продолжить
debugController.continue();

// Следующий шаг
debugController.step();

// Пропустить
debugController.skip();

// Отменить
debugController.cancel();
```

---

## Replay Integration

### Replay trace

```typescript
const controller = new StepReplayController();
controller.load(trace, events);
controller.start({
  mode: 'full',
  speed: 1,
  onStep: (event, index) => {
    console.log(`Step ${index}: ${event.type}`);
  },
});
```

### Replay from event

```typescript
const controller = replayFromEvent(events, eventId, (event, index) => {
  console.log(`Step ${index}: ${event.type}`);
});
```

---

## Step-by-Step Replay

### Режимы

- `full` — воспроизвести всё
- `step` — пауза после каждого шага
- `skip-to-event` — перейти к конкретному событию

### Пример

```typescript
controller.start({
  mode: 'step',
  onStep: (event) => {
    console.log(buildEventDetail(event));
  },
});

// Вручную переходим к следующему шагу
controller.step();
```

---

## Comparison Mode

Сравнение двух трасс:

```typescript
const comparison = buildComparison(traceA, eventsA, traceB, eventsB);
console.log(comparison);
```

### Вывод

```
Trace Comparison
============================================================

Basic Info:
  Trace A: abc123 (completed)
  Trace B: def456 (completed)
  Duration A: 2500ms
  Duration B: 1800ms

Capability Changes:
  Added: webSearch
  Removed: (none)

Tool Changes:
  Added: browser.navigate
  Removed: (none)
```

---

## Performance Analysis

На timeline показывается latency:

```
Performance Breakdown:
----------------------------------------
bridge               12ms ██
capability           3ms  █
permission           2ms  █
provider             320ms ████████████████
browser              2100ms █████████████████████████████████████████████████████████████
tool                 35ms ██
response             12ms ██
```

Самый долгий участок легко заметен.

---

## Security

### Правила

- Debugger **может** наблюдать
- Debugger **может** replay
- Debugger **может** pause/resume

### Ограничения

- Debugger **НЕ может** обходить Permission Engine
- Debugger **НЕ может** автоматически выдавать capabilities
- Debugger **НЕ может** получать credentials
- Debugger **НЕ может** расширять Workspace

---

## Tests

### Unit Tests

- Trace creation
- Event correlation
- Timeline ordering
- Trace persistence
- Redaction
- Breakpoint
- Pause/resume
- Replay
- Step replay

### Integration Tests

- Provider error trace
- Tool error trace
- Capability change trace
- Permission confirmation trace
- Browser recovery trace

---

## Ссылки

- [Debugger Data Model](../packages/core/src/debugger.ts)
- [Timeline Builder](../packages/core/src/debugger-timeline.ts)
- [Debug Controller](../packages/core/src/debug-controller.ts)
- [Step Replay](../packages/core/src/debug-replay.ts)
- [Observability](../packages/core/src/observability.ts)
- [Recorder](../packages/core/src/recorder.ts)
- [Replay](../packages/core/src/replay.ts)
