# Browser AI Bridge

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/negrin22899/browser-ai-bridge?style=social)](https://github.com/negrin22899/browser-ai-bridge)

**Use AI in your code editor — no API keys needed!**

---

## For Users (Just Download)

**Download, install, and start using AI — no terminal needed.**

| Platform | Download |
|----------|----------|
| Windows | [Download .exe](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |
| macOS | [Download .dmg](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |
| Linux | [Download .AppImage](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |

### How to use:

1. Download and install the app
2. Open Browser AI Bridge
3. Sign in to your AI (Gemini, ChatGPT, Claude, or DeepSeek) in Chrome
4. The server starts automatically
5. Configure your IDE:
   - **API URL**: `http://localhost:3000/v1/chat/completions`
   - **Model**: `gemini`

That's it! No API keys, no command line, no configuration files.

[Full User Guide →](./USER_GUIDE.md)

---

## For Developers

### Option 1: Use CLI only

```bash
npx browser-ai-bridge init
```

### Option 2: Clone and build

```bash
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm run setup
```

### Option 3: Full development setup

```bash
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm install
npm run build
```

### CLI Commands

| Command | Description |
|---------|-------------|
| `bab serve --site gemini` | Start API server |
| `bab chat "Hello"` | Quick chat |
| `bab doctor` | Check system |
| `bab providers` | List providers |

### Build Desktop Installer

```bash
# Windows
scripts\build-win.bat

# macOS
scripts/build-mac.sh

# Linux
scripts/build-linux.sh
```

Installer will be in `apps/desktop/release/`.

[Developer Documentation →](./CONTRIBUTING.md)

---

## Supported AI Providers

| Provider | Status |
|----------|--------|
| Gemini | Working |
| ChatGPT | Working |
| Claude | Working |
| DeepSeek | Working |

---

## How It Works

Browser AI Bridge uses your browser session to communicate with AI providers. Instead of API keys, it automates the web interface using Playwright.

```
Your IDE → localhost:3000 → Browser AI Bridge → Chrome → AI Provider
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [User Guide](./USER_GUIDE.md) | For users of the desktop app |
| [Quick Start](./QUICK_START.md) | 3-step setup for CLI |
| [API Reference](./docs/api-reference.md) | API endpoints |
| [Contributing](./CONTRIBUTING.md) | For developers |
| [Architecture](./ARCHITECTURE_OVERVIEW.md) | Technical overview |

---

## Support

- [Issues](https://github.com/negrin22899/browser-ai-bridge/issues)
- [Discussions](https://github.com/negrin22899/browser-ai-bridge/discussions)

---

## License

MIT
