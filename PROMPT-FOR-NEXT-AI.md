# Промпт для следующей ИИ-сессии (Browser AI Bridge)

Скопируй и вставь в новый чат как system- или user-промпт:

---

```
Ты работаешь над Browser AI Bridge (BAB) — локальным рантаймом, который вместо API-ключей использует залогиненную браузерную сессию (Gemini/ChatGPT/Claude/DeepSeek) и отдаёт OpenAI-совместимый API (/v1/chat/completions) для IDE (Cursor/VS Code/Continue) и CLI. Ключевая фича: AI выполняет реальные действия (чтение/запись файлов, shell, git) через браузерную сессию под контролем PermissionEngine.

## Главная цель (важно)
Ответ должен быть максимально правдоподобным, точным и неотличимым от настоящего API-ответа. Приоритет: точность контента + настоящие токены (CDP Network interception / нативный API-режим), а не косметическая «живость» стрима.

## Текущее состояние (закоммичено, сборка и тесты зелёные)
- Монорепо npm workspaces: packages (protocol, core, runtime, api, playwright-provider, prompt-engine, mcp-adapter, plugin-sdk, tools/*), apps (cli, dashboard, desktop), plugins (provider-*).
- npm run build — зелёный (порядок сборки исправлен на топологический, clean чистит и dist, и *.tsbuildinfo).
- npm test — зелёный (~290 unit + 26 integration).

## Сделано в последних сессиях
1. Tool execution loop: /v1/chat/completions исполняет tool_calls/actions → PermissionEngine → ToolDispatcher → результат обратно (packages/api/src/tool-loop.ts).
2. Дашборд на реальном API: Providers, Logs (audit), Extensions, Settings, Sessions (delete), Chat.
3. Endpoint'ы: /v1/audit, DELETE /v1/sessions/:id, /v1/config, /v1/extensions, /metrics.
4. Укрепление ответа (Level 0): мульти-селекторы с fallback в MessageSender/ResponseReader, withRetry, ensureSession, ResilientFinder, общая таблица стратегий для 4 провайдеров.
5. cancel() + graceful shutdown + метрики.
6. Streaming + tool-loop: stream:true теперь исполняет тулы и стримит финальный ответ чанками (runToolLoopStream в packages/api/src/tool-loop.ts). Формат 1-в-1 OpenAI: role-chunk → content-chunks → finish_reason:stop → [DONE].
7. Интерактивный permission-промпт (БЭКЕНД): PermissionBroker (packages/runtime/src/permission-broker.ts) + Runtime.interactive + эндпоинты GET /v1/permissions/pending, POST /v1/permissions/:id/approve (mode: once/session/always), POST /:id/deny + флаг CLI `bab serve --interactive`.

## Осталось (по приоритету)
### P1
- [ ] UI permission-промпта в дашборде: поллить /v1/permissions/pending, карточка «AI хочет fs.write(path=…)» с кнопками «Разрешить» (1 раз/сессия/навсегда) и «Отклонить».
- [ ] Персистентность сессий/аудита/настроек на диск (сейчас всё в памяти).
- [ ] WebSocket/SSE live-апдейты дашборда вместо поллинга.
- [ ] fs.edit/search/glob/exists — тулы для код-редактирования.
### P2
- [ ] E2E для ChatGPT/Claude/DeepSeek; история чатов + экспорт; multi-provider сессии (Session Fabric); AI Debugger UI.
### P3
- [ ] npm-пакет @bab/cli; Docker/WSL/SSH runtime-стабы; CDP/Extension адаптеры (стабы); plugin marketplace; удалить plugins/provider-* (не задействованы).
### Главный апгрейд качества (уровень 2-3)
- [ ] CDP Network interception — перехват SSE-стрима сайта через Chrome DevTools Protocol → настоящие токены (заготовки: cdp-client.ts, cdp-adapter.ts).
- [ ] Детект AUTH_REQUIRED / rate-limit / CAPTCHA → честная ошибка вместо пустого ответа.
- [ ] Нативный API-режим (fallback: DOM-scrape → CDP network → native API).
- [ ] Retry при обрыве/таймауте чтения.

## Как получается ответ
Playwright печатает в textarea → Send → ResponseReader поллит DOM (~500мс), ждёт стабилизации (3 полла без изменений), читает textContent. Слабое место — DOM-скрейпинг. Дальше — CDP interception для настоящих токенов.

## Архитектура
Живой путь: apps/cli → resolveProvider() → PlaywrightProvider → PlaywrightAdapter.sendMessage/readResponse → MessageSender/ResponseReader → BrowserSession → Playwright Page.
Ключевые контракты: Provider, ProviderManager, Session, SessionManager, Runtime, ToolDispatcher, PermissionEngine, PlaywrightAdapter, MessageSender, ResponseReader.

## Ключевые файлы
- packages/api/src/tool-loop.ts — runToolLoop + runToolLoopStream
- packages/api/src/server.ts — Hono-сервер и все endpoint'ы
- packages/runtime/src/runtime.ts, permission-engine.ts, permission-broker.ts
- packages/playwright-provider/src/{playwright-provider,playwright-adapter,message-sender,response-reader,resilient-finder,retry-logic,reliability,cdp-client,cdp-adapter}.ts
- apps/cli/src/index.ts — serve/chat, флаги
- apps/dashboard/src/pages/*.tsx — страницы дашборда
- tests/integration/openai-api.test.ts — интеграционный тест

## Состояние git
Всё закоммичено. Если работаешь в Freebuff-ворктри на ветке freebuff/task-*, сначала смёрджи её в master (или работай прямо в этой ветке).
```
