# Browser AI Bridge

**Используйте AI в вашем редакторе кода — без API ключей!**

Browser AI Bridge позволяет использовать Gemini, ChatGPT, Claude и DeepSeek прямо в вашем любимом редакторе кода.

## Быстрый старт (10 секунд)

```bash
npx browser-ai-bridge init
```

Всё готово! Команда:
1. ✅ Проверит систему
2. ✅ Установит зависимости
3. ✅ Соберёт проект
4. ✅ Покажет URL API для вашего IDE

Затем запустите сервер:
```bash
bab serve --site gemini
```

## Скачать

### Десктоп приложение (Для начинающих)

Скачайте и установите — это просто!

| Платформа | Скачать |
|-----------|---------|
| Windows | [Скачать .exe](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |
| macOS | [Скачать .dmg](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |
| Linux | [Скачать .AppImage](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |

### CLI (Для разработчиков)

```bash
# Быстрая настройка
npx browser-ai-bridge init

# Или клонирование и настройка
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm run setup
```

## Быстрый старт

### Шаг 1: Войдите в AI провайдер

Откройте Chrome и войдите в ОДИН из сервисов:
- **Gemini**: https://gemini.google.com (рекомендуется)
- **ChatGPT**: https://chatgpt.com
- **Claude**: https://claude.ai
- **DeepSeek**: https://chat.deepseek.com

### Шаг 2: Запустите сервер

```bash
bab serve --site gemini
```

### Шаг 3: Настройте ваш IDE

**Cursor:**
1. Настройки → AI → API
2. URL API: `http://localhost:3000/v1/chat/completions`
3. Модель: `gemini`

## Команды CLI

| Команда | Описание |
|---------|----------|
| `bab init` | Быстрая настройка |
| `bab setup` | Мастер настройки |
| `bab doctor` | Проверка системы |
| `bab test` | Smoke тест |
| `bab serve` | Запуск сервера |
| `bab chat` | Быстрый чат |
| `bab providers` | Список провайдеров |

## Поддерживаемые провайдеры

| Провайдер | URL | Статус |
|-----------|-----|--------|
| Gemini | gemini.google.com | ✅ Работает |
| ChatGPT | chatgpt.com | ✅ Работает |
| Claude | claude.ai | ✅ Работает |
| DeepSeek | chat.deepseek.com | ✅ Работает |

## Решение проблем

| Проблема | Решение |
|----------|---------|
| "Chrome не найден" | Установите Chrome с https://www.google.com/chrome/ |
| "Не авторизован" | Откройте Chrome и войдите в AI провайдер |
| "Соединение отклонено" | Запустите сервер: `bab serve --site gemini` |

## Ссылки

- **GitHub**: https://github.com/negrin22899/browser-ai-bridge
- **Документация**: https://github.com/negrin22899/browser-ai-bridge/tree/master/docs
- **Issues**: https://github.com/negrin22899/browser-ai-bridge/issues

## Лицензия

MIT
