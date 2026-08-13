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

## 📥 Download

### For Beginners (Recommended)

**Just download and install — no command line needed!**

| Platform | Download |
|----------|----------|
| 🪟 Windows | [⬇️ Download Installer (.exe)](https://github.com/negrin22899/browser-ai-bridge/releases/download/v1.0.0/Browser.AI.Bridge.Setup.1.0.0.exe) |
| 🍎 macOS | [⬇️ Download Installer (.dmg)](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |
| 🐧 Linux | [⬇️ Download Installer (.AppImage)](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |

**Installation:**
1. Download the installer for your OS
2. Run the installer
3. Open Browser AI Bridge
4. Sign in to your AI (Gemini, ChatGPT, Claude, or DeepSeek)
5. Start coding!

### For Developers

```bash
# Quick setup
npx browser-ai-bridge init

# Or clone and setup
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm run setup
```

📖 [Developer Guide](./docs/en/QUICK_START.md)

---

## 🚀 Quick Start

### Step 1: Sign in to AI Provider

Open Chrome and sign in to ONE of these:
- **Gemini**: https://gemini.google.com (recommended)
- **ChatGPT**: https://chatgpt.com
- **Claude**: https://claude.ai
- **DeepSeek**: https://chat.deepseek.com

### Step 2: Start the Server

**Desktop App:**
- Open Browser AI Bridge
- Click "Start Server"

**CLI:**
```bash
bab serve --site gemini
```

### Step 3: Configure Your IDE

**Cursor:**
```
Settings → AI → API
API URL: http://localhost:3000/v1/chat/completions
Model: gemini
```

**VS Code:**
1. Install AI extension (Continue, Cody, etc.)
2. Set API URL: `http://localhost:3000/v1/chat/completions`
3. Set Model: `gemini`

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

## 📖 Documentation

| Language | Quick Start | Full Guide |
|----------|-------------|------------|
| 🇺🇸 English | [Quick Start](./docs/en/QUICK_START.md) | [User Guide](./USER_GUIDE.md) |
| 🇷🇺 Русский | [Быстрый старт](./docs/ru/QUICK_START.md) | [Руководство](./docs/ru/ARCHITECTURE.md) |

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

---

## 📄 License

MIT

---

Made with ❤️ by Browser AI Bridge Team
