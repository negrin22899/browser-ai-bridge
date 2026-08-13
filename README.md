# 🌉 Browser AI Bridge

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)
[![GitHub Stars](https://img.shields.io/github/stars/negrin22899/browser-ai-bridge?style=social)](https://github.com/negrin22899/browser-ai-bridge)
[![GitHub Issues](https://img.shields.io/github/issues/negrin22899/browser-ai-bridge)](https://github.com/negrin22899/browser-ai-bridge/issues)

**Use AI in your code editor — no API keys needed!**

[English](./docs/en/QUICK_START.md) | [Русский](./docs/ru/README.md)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔑 No API Keys | Uses your browser session |
| 🆓 Free to Use | If you have free access to AI |
| 🔌 OpenAI Compatible | Works with VS Code, Cursor, JetBrains |
| 🤖 Multiple AI | Gemini, ChatGPT, Claude, DeepSeek |
| 🖥️ Desktop App | Easy GUI for beginners |
| ⌨️ CLI | For developers and automation |
| 🔒 Secure | Local processing, no data sent to third parties |
| 🔧 Extensible | Plugin system for custom providers |

---

## 🚀 Quick Start (10 seconds)

```bash
npx browser-ai-bridge init
```

That's it! Then:
```bash
bab serve --site gemini
```

API ready at: `http://localhost:3000/v1/chat/completions`

---

## 📥 Download

### Desktop App

| Platform | Download |
|----------|----------|
| 🪟 Windows | [Download .exe](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |
| 🍎 macOS | [Download .dmg](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |
| 🐧 Linux | [Download .AppImage](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |

### CLI

```bash
npx browser-ai-bridge init
```

---

## 📖 Documentation

| Language | Quick Start | Full Guide |
|----------|-------------|------------|
| 🇺🇸 English | [Quick Start](./docs/en/QUICK_START.md) | [User Guide](./USER_GUIDE.md) |
| 🇷🇺 Русский | [Быстрый старт](./docs/ru/QUICK_START.md) | [Руководство](./docs/ru/ARCHITECTURE.md) |

---

## 🛠️ CLI Commands

| Command | Description |
|---------|-------------|
| `bab init` | Quick setup |
| `bab setup` | Detailed setup wizard |
| `bab doctor` | Check system requirements |
| `bab test` | Run smoke test |
| `bab serve` | Start API server |
| `bab chat` | Quick chat message |
| `bab providers` | List available providers |

---

## 🤖 Supported AI Providers

| Provider | URL | Status |
|----------|-----|--------|
| 🟢 Gemini | gemini.google.com | ✅ Working |
| 🟢 ChatGPT | chatgpt.com | ✅ Working |
| 🟢 Claude | claude.ai | ✅ Working |
| 🟢 DeepSeek | chat.deepseek.com | ✅ Working |

---

## 💻 IDE Setup

### Cursor
```
Settings → AI → API
API URL: http://localhost:3000/v1/chat/completions
Model: gemini
```

### VS Code
1. Install AI extension (Continue, Cody, etc.)
2. Set API URL: `http://localhost:3000/v1/chat/completions`
3. Set Model: `gemini`

---

## ❓ FAQ

**Q: Is it free?**
A: Yes! You just need free access to the AI service.

**Q: Do I need API keys?**
A: No! It uses your browser session.

**Q: Which AI should I use?**
A: Try Gemini first - it's the most reliable.

**Q: Is my data safe?**
A: Yes, everything stays on your computer.

---

## 📞 Support

- 🐛 [Issues](https://github.com/negrin22899/browser-ai-bridge/issues)
- 💬 [Discussions](https://github.com/negrin22899/browser-ai-bridge/discussions)
- 📧 [Security](https://github.com/negrin22899/browser-ai-bridge/blob/master/SECURITY.md)

---

## 📄 License

MIT

---

Made with ❤️ by Browser AI Bridge Team
