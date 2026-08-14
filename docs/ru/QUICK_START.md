# Browser AI Bridge — Быстрый старт

**Используйте AI в вашем редакторе кода — без API ключей!**

---

## Что такое Browser AI Bridge?

Browser AI Bridge (BAB) позволяет использовать AI ассистентов (Gemini, ChatGPT, Claude, DeepSeek) прямо в вашем редакторе кода. Вместо API ключей используются ваши существующие сессии в браузере.

**Основные преимущества:**
- Не нужны API ключи
- Бесплатно (если у вас есть бесплатный доступ к AI)
- Работает с VS Code, Cursor, JetBrains и другими
- Поддерживает 4 основных AI провайдера
- Открытый исходный код

---

## Установка

### Вариант 1: Десктоп приложение (Для начинающих)

Скачайте с [GitHub Releases](https://github.com/negrin22899/browser-ai-bridge/releases):

| Платформа | Скачать |
|-----------|---------|
| Windows | [Скачать .exe](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |
| macOS | [Скачать .dmg](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |
| Linux | [Скачать .AppImage](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |

Установите и откройте приложение. Готово!

### Вариант 2: Быстрая настройка CLI

```bash
npx browser-ai-bridge init
```

Эта команда:
1. Проверит системные требования
2. Установит зависимости
3. Соберёт проект
4. Покажет URL API для вашего IDE

### Вариант 3: Клонирование и настройка

```bash
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm run setup
```

---

## Быстрый старт

### Шаг 1: Войдите в AI провайдер

Откройте Chrome и войдите в ОДИН из сервисов:
- **Gemini**: https://gemini.google.com (рекомендуется)
- **ChatGPT**: https://chatgpt.com
- **Claude**: https://claude.ai
- **DeepSeek**: https://chat.deepseek.com

### Шаг 2: Запустите сервер

**Десктоп приложение:** Сервер запускается автоматически.

**CLI:**
```bash
bab serve --site gemini
```

Вы увидите:
```
Browser AI Bridge running at http://localhost:3000
```

### Шаг 3: Настройте ваш IDE

**Cursor:**
1. Настройки → AI → API
2. URL API: `http://localhost:3000/v1/chat/completions`
3. Модель: `gemini`

**VS Code (с расширением Continue/Cody):**
1. Установите AI расширение
2. URL API: `http://localhost:3000/v1/chat/completions`
3. Модель: `gemini`

---

## Команды CLI

| Команда | Описание |
|---------|----------|
| `bab init` | Быстрая настройка |
| `bab setup` | Мастер настройки |
| `bab doctor` | Проверка системных требований |
| `bab test` | Smoke тест |
| `bab serve` | Запуск API сервера |
| `bab chat` | Быстрый чат |
| `bab providers` | Список провайдеров |
| `bab diagnose` | Сбор диагностической информации |

---

## API

### Chat Completion

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [{"role": "user", "content": "Привет!"}]
  }'
```

### Список моделей

```bash
curl http://localhost:3000/v1/models
```

### Проверка здоровья

```bash
curl http://localhost:3000/health
```

---

## Поддерживаемые провайдеры

| Провайдер | URL | Статус |
|-----------|-----|--------|
| Gemini | gemini.google.com | Работает |
| ChatGPT | chatgpt.com | Работает |
| Claude | claude.ai | Работает |
| DeepSeek | chat.deepseek.com | Работает |

---

## Решение проблем

| Проблема | Решение |
|----------|---------|
| "Chrome не найден" | Установите Chrome с https://www.google.com/chrome/ |
| "Не авторизован" | Откройте Chrome и войдите в ваш AI провайдер |
| "Соединение отклонено" | Запустите сервер: `bab serve --site gemini` |
| "Превышен лимит запросов" | Подождите минуту и попробуйте снова |

---

## Ссылки

- **GitHub**: https://github.com/negrin22899/browser-ai-bridge
- **Issues**: https://github.com/negrin22899/browser-ai-bridge/issues
- **Документация**: https://github.com/negrin22899/browser-ai-bridge/tree/master/docs

---

## Лицензия

MIT
