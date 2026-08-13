# Browser AI Bridge — Quick Start Guide

**Use AI in your code editor — no API keys needed!**

---

## What is Browser AI Bridge?

Browser AI Bridge (BAB) lets you use AI assistants (Gemini, ChatGPT, Claude, DeepSeek) directly in your code editor. Instead of API keys, it uses your existing browser sessions.

**Key Benefits:**
- ✅ No API keys required
- ✅ Free to use (if you have free access to AI)
- ✅ Works with VS Code, Cursor, JetBrains, and more
- ✅ Supports 4 major AI providers
- ✅ Open source and privacy-focused

---

## Installation (10 seconds)

### Option 1: Quick Setup (Recommended)

```bash
npx browser-ai-bridge init
```

This will:
1. Check your system requirements
2. Install all dependencies
3. Build the project
4. Show you the API URL for your IDE

### Option 2: Clone and Setup

```bash
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm run setup
```

### Option 3: Desktop App

Download from [GitHub Releases](https://github.com/negrin22899/browser-ai-bridge/releases):
- Windows: `.exe` installer
- macOS: `.dmg` installer
- Linux: `.AppImage`

---

## Quick Start

### Step 1: Sign in to AI Provider

Open Chrome and sign in to ONE of these:
- **Gemini**: https://gemini.google.com (recommended)
- **ChatGPT**: https://chatgpt.com
- **Claude**: https://claude.ai
- **DeepSeek**: https://chat.deepseek.com

### Step 2: Start the Server

```bash
bab serve --site gemini
```

You'll see:
```
Browser AI Bridge running at http://localhost:3000
```

### Step 3: Configure Your IDE

**Cursor:**
1. Settings → AI → API
2. API URL: `http://localhost:3000/v1/chat/completions`
3. Model: `gemini`

**VS Code (with Continue/Cody extension):**
1. Install AI extension
2. Set API URL: `http://localhost:3000/v1/chat/completions`
3. Set Model: `gemini`

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `bab init` | Quick setup |
| `bab setup` | Detailed setup wizard |
| `bab doctor` | Check system requirements |
| `bab test` | Run smoke test |
| `bab serve` | Start API server |
| `bab chat` | Quick chat message |
| `bab providers` | List available providers |
| `bab diagnose` | Collect diagnostic info |

---

## API Reference

### Chat Completion

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### List Models

```bash
curl http://localhost:3000/v1/models
```

### Health Check

```bash
curl http://localhost:3000/health
```

---

## Supported Providers

| Provider | URL | Status |
|----------|-----|--------|
| Gemini | gemini.google.com | ✅ Working |
| ChatGPT | chatgpt.com | ✅ Working |
| Claude | claude.ai | ✅ Working |
| DeepSeek | chat.deepseek.com | ✅ Working |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Chrome not found" | Install Chrome from https://www.google.com/chrome/ |
| "Not signed in" | Open Chrome and sign in to your AI provider |
| "Connection refused" | Start the server: `bab serve --site gemini` |
| "Rate limit exceeded" | Wait a minute and try again |

---

## Links

- **GitHub**: https://github.com/negrin22899/browser-ai-bridge
- **Issues**: https://github.com/negrin22899/browser-ai-bridge/issues
- **Documentation**: https://github.com/negrin22899/browser-ai-bridge/tree/master/docs

---

## License

MIT
