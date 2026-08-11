# Testing Strategy — Browser AI Bridge

> Version: 1.0.0  
> Date: 2026-08-10  
> Status: Accepted

---

## Принципы

### Production Path — только реальные реализации

Production code **никогда** не использует mocks/fakes.

```
Production Path
      ↓
Real Implementation
      ↓
Real API Calls
      ↓
Real Browser Automation
```

### Unit Tests — mocks допустимы

Unit tests могут использовать mocks для изоляции.

```
Unit Test
      ↓
Mock Dependencies
      ↓
Isolated Component
      ↓
Deterministic Results
```

### Integration/E2E — реальные компоненты

По возможности использовать реальные компоненты.

```
Integration Test
      ↓
Real Components
      ↓
Real (Test) Environment
      ↓
Verifiable Behavior
```

---

## Классификация тестов

### Unit Tests

**Цель:** Изолированная проверка компонентов.

**Mocks:** Допустимы для внешних зависимостей.

**Примеры:**
- `permission-engine.test.ts`
- `rate-limiter.test.ts`
- `cache.test.ts`

### Integration Tests

**Цель:** Проверка взаимодействия компонентов.

**Mocks:** Минимальные, только для внешних сервисов.

**Примеры:**
- `openai-api.test.ts` (с mock provider)
- `gemini-provider.test.ts` (с реальным браузером)

### E2E Tests

**Цель:** Проверка полного цикла.

**Mocks:** Нет.

**Примеры:**
- Полный запрос через API
- Подключение реального провайдера
- Выполнение реальных инструментов

---

## Mock/Fake Policy

### Допустимо (TEST ONLY)

| Mock | Где | Причина |
|------|-----|---------|
| MockProvider | Unit tests | Изоляция от браузера |
| MockBrowserSession | Unit tests | Изоляция от Playwright |
| MockEventBus | Unit tests | Изоляция от событий |

### Запрещено (PRODUCTION)

| Mock | Почему |
|------|--------|
| Fake API response | Dashboard должен показывать реальные данные |
| Fake provider status | Интеграции должны показывать реальный статус |
| Fake metrics | Runtime Inspector должен показывать реальные метрики |
| Fake sessions | Sessions должен показывать реальные сессии |

---

## Тестовые файлы

### Существующие тесты (корректные)

- `packages/core/src/config.test.ts` — unit test
- `packages/core/src/event-bus.test.ts` — unit test
- `packages/core/src/logger.test.ts` — unit test
- `packages/core/src/provider-manager.test.ts` — unit test с mock provider
- `packages/core/src/router.test.ts` — unit test с mock provider
- `packages/runtime/src/runtime.test.ts` — unit test
- `packages/runtime/src/permission-engine.test.ts` — unit test
- `packages/runtime/src/audit-logger.test.ts` — unit test
- `packages/api/src/rate-limiter.test.ts` — unit test
- `packages/api/src/websocket.test.ts` — unit test
- `packages/plugin-sdk/src/builder.test.ts` — unit test
- `packages/plugin-sdk/src/validator.test.ts` — unit test
- `packages/playwright-provider/src/profile-manager.test.ts` — unit test
- `packages/playwright-provider/src/session-persistence.test.ts` — unit test

### Integration Tests (с реальным браузером)

- `tests/integration/gemini-provider.test.ts`
- `tests/integration/chatgpt-provider.test.ts`
- `tests/integration/claude-provider.test.ts`
- `tests/integration/deepseek-provider.test.ts`
- `tests/integration/openai-api.test.ts`

---

## CI/CD интеграция

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test -- --unit
  
  integration:
    runs-on: ubuntu-latest
    needs: unit
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test -- --integration
```

---

## Ссылки

- [Unit Tests](../packages/core/src/*.test.ts)
- [Integration Tests](../tests/integration/)
- [SECURITY_THREAT_MODEL.md](../SECURITY_THREAT_MODEL.md)
