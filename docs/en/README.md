# Browser AI Bridge

**Use AI in your code editor — no API keys needed!**

Browser AI Bridge lets you use Gemini, ChatGPT, Claude, and DeepSeek directly in your favorite code editor.

## Quick Start (10 seconds)

```bash
npx browser-ai-bridge init
```

Done! The command will:
1. Check system requirements
2. Install dependencies
3. Build the project
4. Show API URL for your IDE

Then start the server:
```bash
bab serve --site gemini
```

## Download

| Platform | Download |
|----------|----------|
| Windows | [Browser.AI.Bridge.Setup.1.0.0.exe](https://github.com/negrin22899/browser-ai-bridge/releases/download/v1.0.0/Browser.AI.Bridge.Setup.1.0.0.exe) |
| macOS | [Browser.AI.Bridge-1.0.0.dmg](https://github.com/negrin22899/browser-ai-bridge/releases/download/v1.0.0/Browser.AI.Bridge-1.0.0.dmg) |
| Linux | [Browser.AI.Bridge-1.0.0.AppImage](https://github.com/negrin22899/browser-ai-bridge/releases/download/v1.0.0/Browser.AI.Bridge-1.0.0.AppImage) |

[All releases](https://github.com/negrin22899/browser-ai-bridge/releases)

### CLI (For Developers)

```bash
# Quick setup
npx browser-ai-bridge init

# Or clone and setup
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm run setup
```

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

### Step 3: Configure Your IDE

**Cursor:**
1. Settings → AI → API
2. API URL: `http://localhost:3000/v1/chat/completions`
3. Model: `gemini`

**VS Code (with Continue/Cody extension):**
1. Install AI extension
2. API URL: `http://localhost:3000/v1/chat/completions`
3. Model: `gemini`

## CLI Commands

| Command | Description |
|---------|-------------|
| `bab init` | Quick setup |
| `bab setup` | Setup wizard |
| `bab doctor` | Check system |
| `bab test` | Smoke test |
| `bab serve` | Start server |
| `bab chat` | Quick chat |
| `bab providers` | List providers |
| `bab diagnose` | Collect diagnostics |

## Supported Providers

| Provider | URL | Status |
|----------|-----|--------|
| Gemini | gemini.google.com | Working |
| ChatGPT | chatgpt.com | Working |
| Claude | claude.ai | Working |
| DeepSeek | chat.deepseek.com | Working |

## API

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

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Chrome not found" | Install Chrome from https://www.google.com/chrome/ |
| "Not authorized" | Open Chrome and sign in to your AI provider |
| "Connection refused" | Start the server: `bab serve --site gemini` |
| "Rate limit exceeded" | Wait a minute and try again |

## Links

- **GitHub**: https://github.com/negrin22899/browser-ai-bridge
- **Documentation**: https://github.com/negrin22899/browser-ai-bridge/tree/master/docs
- **Issues**: https://github.com/negrin22899/browser-ai-bridge/issues

## License

MIT
