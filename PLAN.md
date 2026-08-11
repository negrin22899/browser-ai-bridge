# Browser AI Bridge — Полный план доработки

> Статус: ЧЕРНОВИК — ожидаем дополнения от пользователя
> Дата: 2026-08-10

---

## БЛОК 1: Убираем всё fake/mock/заглушка → делаем реальным

### 1.1 Dashboard (apps/dashboard/src/pages/)

| Файл | Что fake | Что нужно |
|------|----------|-----------|
| `Chat.tsx:71-91` | Весь чат — `setTimeout(1500)` симуляция с фейковым tool call | Реальный `/v1/chat/completions` API |
| `Dashboard.tsx:17-35` | Хардкод stats `'1,234'`, `'3'`, `'2'`, `'2h 34m'` + фейковая активность | Реальные данные из `/v1/models`, `/v1/sessions`, uptime |
| `Sessions.tsx:23-51` | 3 моковых сессии с фейковыми ID `'1'`, `'2'`, `'3'` | Fetch из `/v1/sessions` |
| `Providers.tsx:25-51` | 4 хардкод провайдера все `'disconnected'` + `setTimeout` connect | Fetch из `/v1/models` + реальный connect |
| `Logs.tsx:25-32` | 6 хардкод логов с фейковыми таймстампами | Fetch из audit log API |
| `Runtime.tsx:22-32` | 9 хардкод тулзов с статичными permissions | Fetch из runtime/tool registry API |
| `Extensions.tsx:26-85` | 3 хардкод расширения, toggle/install только в state | Реальный plugin registry API |
| `Integrations.tsx:33-151` | 6 хардкод интеграций, connect/disconnect только в state | Реальный integrations API + OAuth |
| `Settings.tsx:20-53` | localStorage-only save, хардкод defaults | Backend config persistence API |

### 1.2 Dashboard Hooks
| Файл | Что fake | Что нужно |
|------|----------|-----------|
| `useRuntimeState.ts:154-168` | `Math.random()` для CPU/memory метрик | Реальные системные метрики из backend |

### 1.3 Desktop App (apps/desktop)
- [ ] **Сервер не стартует автоматически** — добавить автозапуск при открытии
- [ ] **Кнопки в трее не работают** — подключить к реальной логике
- [ ] **Нет индикатора статуса** — показывать: сервер запущен/нет, провайдер подключён/нет
- [ ] **Нет wizard при первом запуске** — добавить пошаговую настройку

### 1.4 Playwright Provider
- [ ] **Streaming фейковый** — `send()` получает ответ целиком, потом разбивает на чанки. Нужно реальное чтение по мере генерации
- [ ] **`cancel()` — no-op** (`playwright-provider.ts:347`, `provider.ts:218`) — нужно реализовать прерывание запроса
- [ ] **Нет retry при обрыве** — если браузер закрылся, нужно переподключиться
- [ ] **Нет таймаутов для разных операций** — единый 30s таймаут не подходит для длинных ответов

### 1.5 API Server
- [ ] **WebSocket не подключён** — код есть, но не используется в сервере
- [ ] **Metrics не включены** — код есть, но не интегрирован
- [ ] **Cache не используется** — код есть, но не подключён к запросам

---

## БЛОК 2: Исправляем проблемы и недоделки

### 2.1 Архитектурные проблемы
- [ ] **Дублирование Browser Manager** — класс продублирован в 4 плагинах (gemini, chatgpt, claude, deepseek). Вынести в `packages/playwright-provider/src/browser-manager.ts`
- [ ] **Два параллельных интерфейса адаптеров** — `SiteAdapter` и `PlaywrightAdapter` делают одно и то же. Оставить один
- [ ] **CLI использует ProviderManager, но Router тоже существует** — убрать Router или объединить

### 2.2 Безопасность
- [ ] **Нет rate limiting по умолчанию** — код есть, но не включён в сервер
- [ ] **Нет валидации входящих запросов** — API принимает любой JSON
- [ ] **Нет ограничения размера запроса** — можно отправить бесконечный JSON
- [ ] **CORS разрешает все origins** — нужно ограничить localhost

### 2.3 Надёжность
- [ ] **Нет graceful shutdown** — при закрытии сервера браузер не закрывается
- [ ] **Нет обработки uncaught exceptions** — процесс падает молча
- [ ] **Нет health check с автовосстановлением** — если провайдер отвалился, не переподключается
- [ ] **Нет логирования в файл** — логи только в консоль

### 2.4 Тесты
- [ ] **Unit тесты не запускаются** — `npm test` не работает корректно
- [ ] **Integration тесты требуют реальный браузер** — не могут запускаться в CI
- [ ] **Нет E2E тестов** — нет проверки полного цикла

### 2.5 Документация
- [ ] **README не обновлён полностью** — часть информации устарела
- [ ] **Нет CONTRIBUTING.md** — как контрибьютить
- [ ] **Нет CHANGELOG для каждой версии** — только общий

---

## БЛОК 3: Мои предложения и мысли

### 3.1 Критично для пользователей
- [ ] **npm пакет** — `npm install -g @bab/cli` чтобы не клонировать репозиторий
- [ ] **Автообновление** — проверка новой версии при запуске
- [ ] **Краш-репорты** — отправка ошибок разработчикам (с согласия пользователя)
- [ ] **Встроенная справка** — `bab help` с примерами

### 3.2 Улучшения UX
- [ ] **Горячие клавиши** — глобальные хоткеи для быстрого чата
- [ ] **Системные уведомления** — когда ответ готов
- [ ] **История чатов** — сохранение и просмотр
- [ ] **Экспорт чатов** — markdown, JSON

### 3.3 Улучшения производительности
- [ ] **Connection pooling** — переиспользование браузерных сессий
- [ ] **Lazy loading** — загружать провайдеры по требованию
- [ ] **Debounce для streaming** — не отправлять каждый чанк отдельно

### 3.4 DevOps
- [ ] **GitHub Actions CI** — автоматическая сборка и тесты
- [ ] **Docker образ** — для серверного деплоя
- [ ] **Release automation** — автоматическая сборка установщиков при теге

### 3.5 Плагины
- [ ] **Plugin marketplace** — список доступных плагинов
- [ ] **Hot-reload плагинов** — перезагрузка без перезапуска
- [ ] **Plugin sandboxing** — изоляция плагинов друг от друга

---

## БЛОК 4: Что НЕЛЬЗЯ сделать реальным (ограничения)

| Что | Почему нельзя | Альтернатива |
|-----|---------------|--------------|
| Tool Calling через API напрямую | Gemini/ChatGPT/Claude не дают прямой API для browser-based провайдеров | Tool Negotiation через промпт |
| Offline режим | AI сервисы требуют интернет | Нет альтернативы |
| Мгновенный ответ | Browser automation inherently slow | Показывать прогресс |
| Мульти-аккаунт | Один браузер = один аккаунт | Запуск нескольких экземпляров |

---

## Приоритеты выполнения

### Phase 1 — Критично (нужно сразу)
1. Убрать все mock из Dashboard (9 страниц)
2. Подключить Desktop app к реальному API
3. Реальный streaming
4. Вынести общий Browser Manager
5. Включить rate limiting, metrics, cache в сервер

### Phase 2 — Важно (следующее)
6. npm пакет
7. Graceful shutdown + автовосстановление
8. Логирование в файл
9. Валидация запросов
10. Тесты

### Phase 3 — Улучшения (потом)
11. CI/CD
12. Docker
13. Plugin marketplace
14. Горячие клавиши
15. История чатов

---

## БЛОК 5: Стратегическое видение (от обсуждения)

### Главная концепция: ANY AI CLIENT → LOCAL MACHINE

```
                      ANY AI CLIENT
                           │
               ┌───────────┴───────────┐
               │                       │
            OpenCode                 IDE
               │                       │
               └───────────┬───────────┘
                           ▼
                   BROWSER AI BRIDGE
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
        PROVIDERS       RUNTIME          PLUGINS
            │              │              │
      Gemini/ChatGPT   Files/Git/CLI   Community
      Claude/etc.      Browser/etc.     Extensions
            │              │              │
            └──────────────┼──────────────┘
                           ▼
                    LOCAL MACHINE
```

### 5.1 Capability Negotiation — САМАЯ СИЛЬНАЯ ФИЧА

Не просто `Provider = Gemini`, а:

```
Provider
├── text
├── vision
├── files
├── streaming
├── tool-calling
├── reasoning
├── web
└── computer-use

Runtime
├── filesystem
├── git
├── terminal
├── browser
├── docker
└── network
```

Система сама строит:
```
AI capabilities + Runtime capabilities + User permissions → Available toolset
```

Пример capabilities:
```json
{
  "filesystem.read": true,
  "filesystem.write": "confirm",
  "git.status": true,
  "git.commit": "confirm",
  "git.push": "confirm",
  "terminal.execute": "confirm"
}
```

### 5.2 AI Debugger из Recorder/Replay

Превратить существующий Recorder в полноценный дебаггер:

```
SESSION #481

14:32:01  REQUEST
14:32:02  PROVIDER CONNECT
14:32:03  TOOL: read_file
14:32:03  PERMISSION: approved
14:32:03  TOOL RESULT
14:32:04  PROVIDER RESPONSE
14:32:05  TOOL: git_diff
14:32:05  TOOL RESULT
14:32:07  FINAL RESPONSE
```

Возможности: Replay, Pause, Step, Continue, Inspect, Export

### 5.3 MCP Adapter

MCP становится адаптером, а не фундаментом:

```
MCP Adapter → Bridge Tool System → Runtime

BAB Tools → MCP Server → External AI Agent
```

### 5.4 Browser Layer сменным

```
Browser Interface
      │
 ┌────┼─────┐
 ▼    ▼     ▼
Playwright CDP Extension
```

### 5.5 Session Fabric

```
Session
├── Provider
├── Browser Context
├── Workspace
├── Runtime State
├── Permissions
├── Tool State
├── History
├── Recording
└── Metadata
```

Мульти-сессии: Session A → Gemini, Session B → ChatGPT, Session C → Claude одновременно.

### 5.6 Runtime Providers (отделение от машины)

```
AI Provider          Runtime Provider
   │                     │
Gemini               Local PC
Claude               WSL
ChatGPT              Docker
Local LLM            Remote
```

### 5.7 Обновлённый Roadmap

| Версия | Фокус |
|--------|-------|
| v1.0 | Стабильность, убрать все mock, реальный dashboard |
| v1.1 | Capability Negotiation + AI Debugger |
| v1.2 | MCP Adapter + Multi-provider sessions |
| v1.3 | Runtime Providers (Docker, WSL, SSH) |
| v2.0 | Plugin Registry + Community ecosystem |

### 5.8 Рекомендация: 3 вещи сейчас

1. **Capability Negotiation** — самая сильная фича
2. **AI Debugger** из Recorder/Replay
3. **MCP Adapter**

А потом — дать проекту реальных пользователей.

### 5.9 Предупреждение о README

> Сейчас README заявляет 4 провайдера как Working, хотя реально протестирован только Gemini E2E. Это стоит держать синхронизированным с фактическими тестами, иначе доверие к проекту пострадает.

---

> Ожидаем дополнений от пользователя...
