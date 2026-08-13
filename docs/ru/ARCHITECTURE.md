# Browser AI Bridge — Обзор архитектуры

## Идея проекта

**Browser AI Bridge (BAB)** — это open-source runtime, который позволяет использовать AI провайдеры (Gemini, ChatGPT, Claude, DeepSeek) через браузерную автоматизацию.

**Главная идея:** AI работает через привычный веб-интерфейс, а реальные действия выполняются на локальной машине пользователя.

---

## Архитектура

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
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
     PROVIDERS         RUNTIME           PLUGINS
         │                │                │
   Gemini/ChatGPT    Files/Git/CLI    Community
   Claude/etc.       Browser/etc.     Extensions
         │                │                │
         └────────────────┼────────────────┘
                          ▼
                    LOCAL MACHINE
```

---

## Ключевые компоненты

### 1. Провайдеры (AI Providers)
- **Gemini** — Google AI
- **ChatGPT** — OpenAI
- **Claude** — Anthropic
- **DeepSeek** — DeepSeek AI

### 2. Browser Runtime
- **Playwright** — автоматизация браузера
- **CDP** — Chrome DevTools Protocol (заглушка)
- **Extension** — расширение браузера (заглушка)

### 3. Runtime Providers
- **Local** — локальная машина ✅
- **Docker** — контейнеры ✅
- **WSL** — Windows Subsystem for Linux (заглушка)
- **SSH** — удалённая машина (заглушка)

### 4. Сессии (Session Fabric)
- Изолированные контексты выполнения
- Каждая сессия имеет свой провайдер, runtime, workspace
- Сессии не пересекаются

### 5. Безопасность
- Permission Engine — контроль доступа к инструментам
- Path Traversal Protection — защита от выхода за workspace
- Credential Boundary — credentials не хранятся
- Rate Limiting — ограничение запросов

---

## Установка

```bash
# Быстрая настройка
npx browser-ai-bridge init

# Или клонирование
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm run setup
```

---

## Использование

```bash
# Запуск с Gemini
bab serve --site gemini

# Запуск с ChatGPT
bab serve --site chatgpt

# Быстрый чат
bab chat "Привет!"
```

---

## Статус проекта

| Компонент | Статус |
|-----------|--------|
| Core (EventBus, Logger) | ✅ |
| Protocol типы | ✅ |
| API Server | ✅ |
| Plugin SDK | ✅ |
| Gemini Provider | ✅ |
| ChatGPT Provider | ✅ |
| Claude Provider | ✅ |
| DeepSeek Provider | ✅ |
| Browser Runtime | ✅ |
| Runtime Providers | ✅ |
| Session Fabric | ✅ |
| AI Debugger | ✅ |
| MCP Adapter | ✅ |
| CLI | ✅ |
| Dashboard | ✅ |
| Desktop App | ✅ |

---

## Репозиторий

https://github.com/negrin22899/browser-ai-bridge
