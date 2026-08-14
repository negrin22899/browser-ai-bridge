# 🌉 Browser AI Bridge

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)
[![GitHub Stars](https://img.shields.io/github/stars/negrin22899/browser-ai-bridge?style=social)](https://github.com/negrin22899/browser-ai-bridge)
[![GitHub Issues](https://img.shields.io/github/issues/negrin22899/browser-ai-bridge)](https://github.com/negrin22899/browser-ai-bridge/issues)

**Используйте AI в вашем редакторе кода — без API ключей!**

[English](./README.md) | [Русский](./docs/ru/README.md)

---

## ✨ Возможности

| Возможность | Описание |
|-------------|----------|
| 🔑 Без API ключей | Использует вашу сессию в браузере |
| 🆓 Бесплатно | Если у вас есть бесплатный доступ к AI |
| 🔌 Совместимость с OpenAI | Работает с VS Code, Cursor, JetBrains |
| 🤖 Несколько AI | Gemini, ChatGPT, Claude, DeepSeek |
| 🖥️ Десктоп приложение | Простой GUI для начинающих |
| ⌨️ CLI | Для разработчиков и автоматизации |
| 🔒 Безопасность | Локальная обработка, данные не отправляются третьим лицам |
| 🔧 Расширяемость | Система плагинов для кастомных провайдеров |

---

## 📥 Скачать

### Для начинающих (Рекомендуется)

**Просто скачайте и установите — никакого терминала!**

| Платформа | Скачать |
|-----------|---------|
| 🪟 Windows | [⬇️ Скачать установщик (.exe)](https://github.com/negrin22899/browser-ai-bridge/releases/download/v1.0.0/Browser.AI.Bridge.Setup.1.0.0.exe) |
| 🍎 macOS | [⬇️ Скачать установщик (.dmg)](https://github.com/negrin22899/browser-ai-bridge/releases/download/v1.0.0/Browser.AI.Bridge-1.0.0.dmg) |
| 🐧 Linux | [⬇️ Скачать установщик (.AppImage)](https://github.com/negrin22899/browser-ai-bridge/releases/download/v1.0.0/Browser.AI.Bridge-1.0.0.AppImage) |

**Установка:**
1. Скачайте установщик для вашей ОС
2. Запустите установщик
3. Откройте Browser AI Bridge
4. Войдите в ваш AI (Gemini, ChatGPT, Claude или DeepSeek)
5. Начинайте кодить!

### Для разработчиков

```bash
# Быстрая настройка
npx browser-ai-bridge init

# Или клонирование и настройка
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm run setup
```

📖 [Руководство разработчика](./docs/en/QUICK_START.md)

---

## 🚀 Быстрый старт

### Шаг 1: Войдите в AI провайдер

Откройте Chrome и войдите в ОДИН из сервисов:
- **Gemini**: https://gemini.google.com (рекомендуется)
- **ChatGPT**: https://chatgpt.com
- **Claude**: https://claude.ai
- **DeepSeek**: https://chat.deepseek.com

### Шаг 2: Запустите сервер

**Десктоп приложение:**
- Откройте Browser AI Bridge
- Нажмите "Start Server"

**CLI:**
```bash
bab serve --site gemini
```

### Шаг 3: Настройте ваш IDE

**Cursor:**
```
Settings → AI → API
API URL: http://localhost:3000/v1/chat/completions
Model: gemini
```

**VS Code:**
1. Установите AI расширение (Continue, Cody и т.д.)
2. Укажите API URL: `http://localhost:3000/v1/chat/completions`
3. Укажите Model: `gemini`

---

## 🛠️ Команды CLI

| Команда | Описание |
|---------|----------|
| `bab init` | Быстрая настройка |
| `bab setup` | Мастер настройки |
| `bab doctor` | Проверка системных требований |
| `bab test` | Smoke тест |
| `bab serve` | Запуск API сервера |
| `bab chat` | Быстрый чат |
| `bab providers` | Список провайдеров |

---

## 🤖 Поддерживаемые AI провайдеры

| Провайдер | URL | Статус |
|-----------|-----|--------|
| 🟢 Gemini | gemini.google.com | ✅ Работает |
| 🟢 ChatGPT | chatgpt.com | ✅ Работает |
| 🟢 Claude | claude.ai | ✅ Работает |
| 🟢 DeepSeek | chat.deepseek.com | ✅ Работает |

---

## 📖 Документация

| Язык | Быстрый старт | Полное руководство |
|------|---------------|-------------------|
| 🇺🇸 English | [Quick Start](./docs/en/QUICK_START.md) | [User Guide](./USER_GUIDE.md) |
| 🇷🇺 Русский | [Быстрый старт](./docs/ru/QUICK_START.md) | [Руководство](./docs/ru/ARCHITECTURE.md) |

---

## ❓ FAQ

**Q: Это бесплатно?**
A: Да! Вам нужен только бесплатный доступ к AI сервису.

**Q: Нужны ли API ключи?**
A: Нет! Используется ваша сессия в браузере.

**Q: Какой AI лучше использовать?**
A: Попробуйте Gemini первым — он самый стабильный.

**Q: Мои данные в безопасности?**
A: Да, всё остаётся на вашем компьютере.

---

## 📞 Поддержка

- 🐛 [Issues](https://github.com/negrin22899/browser-ai-bridge/issues)
- 💬 [Discussions](https://github.com/negrin22899/browser-ai-bridge/discussions)

---

## 📄 Лицензия

MIT

---

Сделано с ❤️ командой Browser AI Bridge
