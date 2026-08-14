# Browser AI Bridge

**Используйте AI в вашем редакторе кода — без API ключей!**

---

## Для пользователей (Просто скачайте)

**Скачайте, установите и начните использовать AI — без терминала.**

| Платформа | Скачать |
|-----------|---------|
| Windows | [Скачать .exe](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |
| macOS | [Скачать .dmg](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |
| Linux | [Скачать .AppImage](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |

### Как использовать:

1. Скачайте и установите приложение
2. Откройте Browser AI Bridge
3. Войдите в Gemini/ChatGPT/Claude/DeepSeek в Chrome
4. Сервер запускается автоматически
5. Настройте ваш IDE:
   - **URL API**: `http://localhost:3000/v1/chat/completions`
   - **Модель**: `gemini`

Готово! Без API ключей, без командной строки, без конфигурационных файлов.

[Полное руководство пользователя →](./docs/ru/QUICK_START.md)

---

## Для разработчиков

### Вариант 1: Использовать только CLI

```bash
npx browser-ai-bridge init
```

### Вариант 2: Клонировать и собрать

```bash
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm run setup
```

### Вариант 3: Полная настройка для разработки

```bash
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm install
npm run build
```

### Команды CLI

| Команда | Описание |
|---------|----------|
| `bab serve --site gemini` | Запуск API сервера |
| `bab chat "Привет"` | Быстрый чат |
| `bab doctor` | Проверка системы |
| `bab providers` | Список провайдеров |

### Сборка десктоп установщика

```bash
# Windows
scripts\build-win.bat

# macOS
scripts/build-mac.sh

# Linux
scripts/build-linux.sh
```

Установщик будет в `apps/desktop/release/`.

[Документация для разработчиков →](./CONTRIBUTING.md)

---

## Поддерживаемые AI провайдеры

| Провайдер | Статус |
|-----------|--------|
| Gemini | Работает |
| ChatGPT | Работает |
| Claude | Работает |
| DeepSeek | Работает |

---

## Как это работает

Browser AI Bridge использует вашу сессию в браузере для общения с AI провайдерами. Вместо API ключей автоматизируется веб-интерфейс с помощью Playwright.

```
Ваш IDE → localhost:3000 → Browser AI Bridge → Chrome → AI провайдер
```

---

## Документация

| Документ | Описание |
|----------|----------|
| [Руководство пользователя](./USER_GUIDE.md) | Для пользователей десктоп приложения |
| [Быстрый старт](./QUICK_START.md) | 3-шаговая настройка для CLI |
| [Справочник API](./docs/api-reference.md) | API эндпоинты |
| [Участие в разработке](./CONTRIBUTING.md) | Для разработчиков |
| [Архитектура](./ARCHITECTURE_OVERVIEW.md) | Технический обзор |

---

## Поддержка

- [Issues](https://github.com/negrin22899/browser-ai-bridge/issues)
- [Discussions](https://github.com/negrin22899/browser-ai-bridge/discussions)

---

## Лицензия

MIT
