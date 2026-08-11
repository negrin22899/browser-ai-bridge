# Performance Budget — Browser AI Bridge

> Version: 1.0.0  
> Date: 2026-08-10  
> Status: Accepted

---

## Метрики для измерения

| Метрика | Описание | Baseline | Target |
|---------|----------|----------|--------|
| API startup time | Время запуска сервера | TBD | < 2s |
| Bridge overhead | Добавленная задержка на запрос | TBD | < 50ms |
| Provider dispatch latency | Время выбора провайдера | TBD | < 5ms |
| Tool dispatch latency | Время выбора инструмента | TBD | < 5ms |
| Permission check latency | Проверка прав доступа | TBD | < 1ms |
| Memory baseline | Базовое потребление памяти | TBD | < 100MB |
| Memory growth | Рост памяти за сессию | TBD | < 10MB/hour |
| CPU usage | Использование CPU в простое | TBD | < 5% |
| Browser connection latency | Подключение к браузеру | TBD | < 3s |

---

## Benchmark Tests

### 1. API Startup Benchmark

```typescript
describe('API Startup', () => {
  it('should start within 2 seconds', async () => {
    const start = Date.now();
    await startServer();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});
```

### 2. Request Overhead Benchmark

```typescript
describe('Request Overhead', () => {
  it('should add less than 50ms overhead', async () => {
    const start = Date.now();
    await api.health();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(50);
  });
});
```

### 3. Memory Benchmark

```typescript
describe('Memory Usage', () => {
  it('should stay under 100MB baseline', () => {
    const used = process.memoryUsage().heapUsed;
    expect(used).toBeLessThan(100 * 1024 * 1024);
  });
});
```

---

## Сценарии для тестирования

### Длинные сессии
- 100+ сообщений в одной сессии
- Проверить рост памяти
- Проверить latency после 100 сообщений

### Streaming
- Стриминг 10KB+ ответа
- Проверить latency первого чанка
- Проверить потребление памяти

### Несколько провайдеров
- 4 провайдера одновременно
- Переключение между провайдерами
- Проверить overhead

### Recorder
- Запись 1000+ событий
- Проверить потребление памяти
- Проверить производительность записи

---

## Инструменты измерения

```bash
# Benchmark tests
npm run test -- --benchmark

# Memory profiling
node --inspect apps/cli/dist/index.js serve --site gemini

# CPU profiling
node --prof apps/cli/dist/index.js serve --site gemini
```

---

## Ссылки

- [Runtime](../packages/runtime/src/runtime.ts)
- [API Server](../packages/api/src/server.ts)
- [Permission Engine](../packages/runtime/src/permission-engine.ts)
