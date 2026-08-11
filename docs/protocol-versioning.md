# Protocol Versioning — Browser AI Bridge

> Version: 1.0.0  
> Date: 2026-08-10  
> Status: Accepted

---

## Текущая версия

```
Bridge Protocol: 1.0
```

---

## Правила версионирования

### SemVer для Bridge Protocol

```
MAJOR.MINOR
  │     │
  │     └── Новые необязательные поля, расширения
  └──────── Breaking changes
```

### MAJOR версия (1.x → 2.0)

Breaking changes:
- Удаление обязательных полей
- Изменение типа обязательных полей
- Изменение структуры сообщений
- Изменение формата запросов/ответов

### MINOR версия (1.0 → 1.1)

Backward-compatible changes:
- Новые необязательные поля
- Новые типы сообщений
- Расширения существующих полей
- Новые capabilities

---

## Version Negotiation

### Клиент → Сервер

```json
{
  "version": "1.0",
  "session": "...",
  "provider": "...",
  ...
}
```

### Сервер → Клиент

Ответ содержит версию протокола в метаданных.

### Обработка неизвестной версии

```
Клиент отправляет version: "2.0"
         ↓
Сервер не знает 2.0
         ↓
Сервер отвечает ошибкой:
{
  "error": {
    "code": "UNSUPPORTED_PROTOCOL_VERSION",
    "message": "Protocol version 2.0 not supported",
    "supported_versions": ["1.0", "1.1"]
  }
}
```

---

## Совместимость

### Backward Compatibility (1.0 → 1.1)

- Клиент 1.0 может общаться с сервером 1.1
- Сервер 1.1 игнорирует неизвестные поля от клиента 1.0
- Новые поля в 1.1 необязательны

### Forward Compatibility (1.1 → 1.0)

- Клиент 1.1 может общаться с сервером 1.0
- Сервер 1.0 игнорирует неизвестные поля от клиента 1.1
- Клиент 1.1 не должен требовать новые поля

---

## Обработка неизвестных полей

```
Получено неизвестное поле
         ↓
Логировать как warning
         ↓
Игнорировать поле
         ↓
Продолжить обработку
```

---

## Deprecated Fields

### Процесс deprecation

1. Пометить поле как deprecated в документации
2. Добавить warning в логи при использовании
3. Поддерживать минимум 2 MINOR версии
4. Удалить в следующей MAJOR версии

### Пример

```typescript
interface BridgeRequest {
  version: string;
  session: string;
  
  /** @deprecated Use 'messages' instead */
  prompt?: string;
  
  messages: Message[];
}
```

---

## Совместимость компонентов

### Provider Plugins

| Plugin Protocol | Bridge Protocol | Совместимость |
|-----------------|-----------------|---------------|
| 1.0 | 1.0 | ✅ Полная |
| 1.0 | 1.1 | ✅ Backward |
| 1.1 | 1.0 | ⚠️ Partial |
| 2.0 | 1.0 | ❌ Несовместим |

### Tool Plugins

| Tool Protocol | Bridge Protocol | Совместимость |
|---------------|-----------------|---------------|
| 1.0 | 1.0 | ✅ Полная |
| 1.0 | 1.1 | ✅ Backward |

### API Adapters (OpenAI, Anthropic, Google)

| Adapter Version | Bridge Protocol | Совместимость |
|-----------------|-----------------|---------------|
| 1.0 | 1.0 | ✅ Полная |
| 1.0 | 1.1 | ✅ Backward |

---

## Minimum/Maximum Supported Version

```
Minimum: 1.0
Maximum: 1.0
Current: 1.0
```

При выходе 1.1:
```
Minimum: 1.0
Maximum: 1.1
Current: 1.1
```

---

## Реализация

### Текущая структура Bridge Protocol

```typescript
interface BridgeRequest {
  version: string;        // "1.0"
  session: string;
  provider: string;
  messages: BridgeMessage[];
  tools?: BridgeTool[];
  stream?: boolean;
  metadata?: Record<string, unknown>;
}
```

### Проверка версии

```typescript
function validateVersion(request: BridgeRequest): void {
  const [major] = request.version.split('.').map(Number);
  
  if (major > SUPPORTED_MAJOR_VERSION) {
    throw new ProtocolError('UNSUPPORTED_PROTOCOL_VERSION', {
      requested: request.version,
      supported: SUPPORTED_VERSIONS,
    });
  }
}
```

---

## Ссылки

- [Bridge Protocol Types](../packages/protocol/src/types/bridge-protocol.ts)
- [OpenAI Adapter](../packages/protocol/src/adapters/openai-adapter.ts)
- [Anthropic Adapter](../packages/protocol/src/adapters/anthropic-adapter.ts)
- [Google Adapter](../packages/protocol/src/adapters/google-adapter.ts)
