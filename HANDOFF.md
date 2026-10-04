# Browser AI Bridge — HANDOFF для следующей ИИ-сессии

> Дата: 2026-08-18. Всё变更 ещё НЕ закоммичено — 59 файлов, ~1300+/1600 строк.
> Сборка чистая, тесты зелёные (275+ unit + 22 integration).

---

## 1. Что это за проект

**Browser AI Bridge (BAB)** — локальный runtime, который вместо API-ключей использует **залогиненную браузерную сессию** (Gemini/ChatGPT/Claude/DeepSeek) и отдаёт **OpenAI-совместимый API** (`/v1/chat/completions`) для IDE (Cursor, VS Code, Continue) и CLI.

**Ключевая фича**: AI выполняет реальные действия (чтение/запись файлов, shell, git) через браузерную сессию, а не через API-ключи. Права管控 через `PermissionEngine`.

### Как технически получается ответ

1. IDE/CLI → `POST /v1/chat/completions` (OpenAI JSON)
2. Сервер (Hono) → резолвит провайдера, создаёт/берёт сессию, подставляет system-prompt с описанием тулов
3. **Tool-loop** (новый!): AI отвечает `tool_calls` или `{"actions":[...]}` → `PermissionEngine` → `ToolDispatcher.execute` → результат обратно → повторяем до финального ответа (макс. 4 итерации)
4. `PlaywrightProvider` через Playwright печатает текст в textarea браузера → жмёт Send → **ResponseReader** поллит DOM, ждёт стабилизации и читает `textContent`
5. Ответ → JSON `ChatCompletionResponse` обратно клиенту

**Слабое место**: ответ "вычитывается из DOM", а не из API. Вот что мы сделали чтобы это укрепить (Level 0).

---

## 2. Архитектура (монорепо npm workspaces)

```
├── packages/
│   ├── protocol/          — типы: Provider, Session, Tool, Message, Events
│   ├── core/              — SessionManager, SessionFabric, EventBus, Logger, ProviderManager
│   ├── runtime/           — Runtime, ToolDispatcher, PermissionEngine, AuditLogger
│   ├── api/               — Hono HTTP-сервер, tool-loop, config-store, metrics
│   ├── prompt-engine/     — system-prompt для AI (описание тулов + формат actions)
│   ├── playwright-provider/ — ПРОВАЙДЕР: PlaywrightProvider, PlaywrightAdapter, MessageSender, ResponseReader,
│   │                         resilient-finder, retry-logic, reliability, tab-manager, browser-session
│   ├── mcp-adapter/       — Model Context Protocol
│   ├── plugin-sdk/        — SDK для плагинов
│   ├── tools/fs,git,shell — реализация тулов (ToolDispatcher)
├── apps/
│   ├── cli/               — CLI: `bab serve` (API-сервер), `bab chat` (одноразовый)
│   ├── dashboard/         — React/Vite/Tailwind дашборд (providers, sessions, chat, logs, extensions, settings)
│   ├── desktop/           — Electron: тре автозапуск, auto-updater
├── plugins/
│   ├── provider-gemini,chatgpt,claude,deepseek — СТАРЫЕ standalone провайдеры (Page-based, НЕ используют PlaywrightAdapter)
├── tests/integration/     — vitest: openai-api.test.ts (22), gemini-provider.test.ts (opt-in, требует реальный браузер)
├── .github/workflows/ci.yml — GitHub Actions CI
├── ROADMAP.md             — живой документ с планами
├── CHANGELOG.md           — что сделано
├── HANDOFF.md             — ЭТОТ ФАЙЛ
```

**Живой путь провайдера**: `apps/cli` → `resolveProvider()` → `GeminiPlaywrightAdapter` (из `packages/playwright-provider`) → `PlaywrightProvider.send()` → `PlaywrightAdapter.sendMessage()` / `readResponse()` → `MessageSender` / `ResponseReader` → `BrowserSession` → Playwright Page.

**Старые плагины** (`plugins/provider-*`) — используют `BrowserManager` напрямую с `Page`, НЕ `PlaywrightAdapter`. Они **не задействованы** в текущем CLI/live-path. Их стоит либо удалить, либо переписать на PlaywrightAdapter.

---

## 3. Что сделано в последнем заходе (оба предыдущих тура)

### Baseline-чинка (было сломано до нас)
- `workspace:*` в 4 package.json → нормализовал к `*` (npm install падал)
- События `plugin.*`/`provider.register`/`tool.register` не были в `EventMap` → добавил
- Тесты не запускались (vitest без --passWithNoTests, отсутствующий test-скрипт, устаревшие типы SessionFabric/PlaywrightProvider) → починил все
- `ProfileManager`: `profile-${Date.now()}` давал одинаковый ID → `randomUUID()`

### P1 — Tool execution loop (СЕРДЦЕ ПРОДУКТА)
- Создал `packages/api/src/tool-loop.ts` — `runToolLoop()` + `extractToolCalls()`
- `/v1/chat/completions` теперь реально исполняет тулы: `tool_calls` / `{"actions":[...]}` → `PermissionEngine` → `ToolDispatcher.execute` → результат обратно, до финального ответа
- CLI `serve` и `chat` подключены, добавлен `--allow fs.write,shell.exec`
- `Runtime` получил `allowSet: Set<string>` для авто-ранта тулов без подтверждения
- Unit-тесты `tool-loop.test.ts` + интеграционный тест обновлён

### P2 — Дашборд на реальном API
- Новые endpoint'ы: `/v1/audit`, `DELETE /v1/sessions/:id`, `/v1/config`, `/v1/extensions`
- `packages/api/src/config-store.ts` — ConfigStore для хранения настроек
- Providers → health/models из API (без localStorage)
- Logs → audit-лог вместо синтеза
- Extensions → реальные модели + тулы
- Settings → config API
- Sessions → DELETE работает
- Все pre-existing type-ошибки дашборда исправлены

### P3 — Гигиена/надёжность
- Удалил 4 дубликата `BrowserManager` (был мёртвый код в plugins)
- `cancel()` реализован: `ResponseReader.isCancelled` → `PlaywrightAdapter.cancel()` → подключён к abort HTTP-стрима
- Graceful shutdown: SIGINT/SIGTERM, uncaughtException/unhandledRejection → закрытие браузера + остановка runtime
- Метрики в `/metrics`: `requests_total`, `request_duration_seconds`, `provider_requests`, `provider_request_errors`

### P4 — CI/документация
- CI падает при падении тестов (убрал `continue-on-error: true` + `--passWithNoTests`)
- README честно: пометки `Working ✅` / `In Progress 🔄` / `Planned 📋` по провайдерам
- PLAN.md получил STATUS UPDATE

### Level 0 — Укрепление получения ответа (ПОСЛЕДНИЙ ТУР)
- **MessageSender**: мульти-селекторы (ordered fallback) + проверка visibility/enabled, fallback Enter
- **ResponseReader**: мульти-стратегии (кэш рабочего селектора → конфиг-селекторы → aria-live/role=status), `SelectorList` type
- **PlaywrightAdapter**: `createSession`/`sendMessage` обёрнуты в `withRetry` (exp backoff)
- **PlaywrightProvider**: `ensureSession()` — **раньше был мёртвым кодом!** — теперь вызывается в `send`/`stream`: если вкладку закрыли, пересоздаётся перед отправкой
- **resilient-finder.ts**: починил `createDefaultFinder` (namespace: `gemini.input`, `chatgpt.input` + добавил `getProviderSelectors()` + `PROVIDER_STRATEGIES`)
- **4 адаптера** (`*-adapter.ts`): берут селекторы из общей таблицы стратегий, убрали дублированные `waitForReady` overrides
- **selector-utils.ts**: общий `toSelectorList()` helper
- Пофиксил TS-ошибку: `context.browser()` → `Browser | null`, нужен null-check
- Импорт `withRetry`/`withConnectionRetry` в `playwright-provider.ts`

---

## 4. Что НЕ сделано / осталось

### Срочное (P1 из ROADMAP)
- [ ] **Streaming + tool-loop**: цикл тулов работает в не-стриминге; `stream: true` идёт старым путём (без tool-loop)
- [ ] **Интерактивный permission-промпт**: дашборд показывает «AI хочет fs.write/shell.exec», разрешаешь. Сейчас write/exec в headless просто deny, пока не дашь `--allow`
- [ ] **Персистентность**: сессии/аудит/настройки в памяти, после рестарта пропадают (нужно на диск)
- [ ] **WebSocket/SSE**: дашборд поллит каждые 5–30 сек; нужен live-update
- [ ] `fs.edit` (search/replace/patch), `fs.search`/`grep`, `fs.glob`, `fs.exists` — тулов не хватает для код-редактирования как в Cursor

### Продуктовые (P2)
- [ ] E2E для ChatGPT/Claude/DeepSeek (реальный браузер + логин, opt-in)
- [ ] История чатов + экспорт
- [ ] AI Debugger в дашборде (код в `packages/core` как библиотека, UI нет)
- [ ] Multi-provider сессии (Session Fabric)
- [ ] Краш-репорты + логирование в файл

### Инфраструктура (P3)
- [ ] npm-пакет `@bab/cli` + автосборка релизов в CI
- [ ] Docker/WSL/SSH runtime-провайдеры (стабы)
- [ ] CDP/Extension браузер-адаптеры (стабы, `cdp-adapter.ts`, `extension-adapter.ts`)
- [ ] Plugin marketplace + sandboxing
- [ ] Old plugins (`plugins/provider-*`) — не задействованы, удалить или переписать на PlaywrightAdapter

### Уровень 2-3 укрепления ответа
- [ ] **CDP Network interception**: перехват SSE-стрима сайта через Chrome DevTools Protocol → настоящие токены без поллинга DOM. Заготовки: `cdp-client.ts` (`CDPClient.interceptNetwork`), `cdp-adapter.ts`
- [ ] **Нативный streaming для API-адаптеров** (`google-adapter.ts`, `anthropic-adapter.ts`, `openai-adapter.ts` — стабы)
- [ ] Детект AUTH_REQUIRED / rate-limit / CAPTCHA → честная ошибка вместо пустого ответа
- [ ] **Нативный API-режим** (Level 3): если у пользователя есть API-ключ — ходить в официальный API с настоящим function calling. Заготовки адаптеров уже есть.
- [ ] Retry при обрыве/таймауте чтения (емулировано через мульти-селекторы, но не через retry всего `readResponse`)
- [ ] Слой с fallback: `DOM-scrape → CDP network → native API`

### Визуал
- [ ] Единая дизайн-система
- [ ] Онбординг/wizard
- [ ] Полировка тёмной/светлой тем
- [ ] Лендинг

---

## 5. Какие IDEИ были предложены (но не в ROADMAP)

- **Рейтинг надёжности провайдеров** и авто-выбор «best working»
- **Multiple accounts** — несколько браузерных профилей на провайдер
- **PWA-клиент** поверх API
- **Кэш ответов** (опционально, с уважением к приватности)
- **Токен-эстимация/лимиты** на сессию
- **«Командный режим»**: один локальный сервер, несколько IDE с RBAC
- **Экспорт диагностики** → публичный debug-портал

---

## 6. Текущее состояние сборки и тестов

```
✅ npm run build — чисто (все пакеты)
✅ npm test — все пакеты зелёные (~275 unit tests)
✅ tests/integration/openai-api.test.ts — 22 теста зелёные
⚠️ tests/integration/gemini-provider.test.ts — opt-in, требует реальный браузер
⚠️ git status: 59 файлов изменены, НЕ закоммичено и НЕ запушено
```

---

## 7. Ключевые файлы для понимания проекта

| Файл | Зачем |
|------|-------|
| `packages/protocol/src/types/*.ts` | Все контракты (Provider, Message, Tool, Session, Runtime) |
| `packages/api/src/tool-loop.ts` | Tool execution loop (P1) |
| `packages/api/src/server.ts` | Hono HTTP-сервер с endpoint'ами |
| `packages/api/src/config-store.ts` | Хранение настроек |
| `packages/runtime/src/runtime.ts` | Runtime + allowSet |
| `packages/runtime/src/tool-dispatcher.ts` | Диспетчер тулов |
| `packages/runtime/src/permission-engine.ts` | Движок прав |
| `packages/playwright-provider/src/playwright-provider.ts` | Браузерный провайдер (connect/send/stream) |
| `packages/playwright-provider/src/playwright-adapter.ts` | Абстракция над браузером (сессии, ретраи) |
| `packages/playwright-provider/src/message-sender.ts` | Ввод сообщения (мульти-селекторы) |
| `packages/playwright-provider/src/response-reader.ts` | Чтение ответа (мульти-стратегии + кэш) |
| `packages/playwright-provider/src/resilient-finder.ts` | Стратегии селекторов по провайдерам |
| `packages/playwright-provider/src/retry-logic.ts` | withRetry / withConnectionRetry |
| `packages/playwright-provider/src/reliability.ts` | ResilientFinder, HealthMonitor, SessionRecovery, SelectorDiscovery |
| `apps/cli/src/index.ts` | CLI entry: `serve` и `chat` команды |
| `apps/cli/src/providers.ts` | Resolve provider по имени/URL |
| `apps/dashboard/src/pages/*.tsx` | Страницы дашборда |
| `ROADMAP.md` | Живой документ с планами |
| `CHANGELOG.md` | Что сделано |
| `tests/integration/openai-api.test.ts` | Интеграционный тест |
