# First Run Guide — Browser AI Bridge

> Welcome! This guide will help you get started with Browser AI Bridge in 5 minutes.

---

## Step 1: Install

```bash
# Clone the repository
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge

# Run setup
npm run setup
```

Or download the desktop app from [GitHub Releases](https://github.com/negrin22899/browser-ai-bridge/releases).

---

## Step 2: First Run Setup

Run the setup wizard:

```bash
bab setup
```

This will check:
- ✓ Node.js version
- ✓ Chrome browser
- ✓ Chrome profile
- ✓ Playwright
- ✓ Providers
- ✓ Workspace

---

## Step 3: Sign In to AI Provider

Open Chrome and sign in to ONE of these:

| Provider | URL | Recommended |
|----------|-----|-------------|
| Gemini | https://gemini.google.com | Yes |
| ChatGPT | https://chatgpt.com | Yes |
| Claude | https://claude.ai | Yes |
| DeepSeek | https://chat.deepseek.com | Yes |

**Important:** You must be signed in before using Browser AI Bridge.

---

## Step 4: Start the Server

```bash
bab serve --site gemini
```

You should see:
```
Browser AI Bridge running at http://localhost:3000
```

---

## Step 5: Test the Connection

```bash
bab test --site gemini
```

You should see:
```
✓ EventBus
✓ Logger
✓ ProviderManager
✓ SessionManager
✓ Runtime
✓ PromptEngine
✓ API Server
✓ Provider Connection
✓ Health Check
✓ Test Request

All tests passed! System is ready.
```

---

## Step 6: Use in Your IDE

Configure your IDE to use:

- **API URL:** `http://localhost:3000/v1/chat/completions`
- **Model:** `gemini`

### VS Code

1. Install an AI extension (Continue, Cody, etc.)
2. Set API URL to `http://localhost:3000/v1/chat/completions`
3. Set Model to `gemini`

### Cursor

1. Open Settings → AI → API
2. Set API URL to `http://localhost:3000/v1/chat/completions`

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `bab setup` | First-time setup wizard |
| `bab doctor` | Check system requirements |
| `bab test` | Run smoke test |
| `bab serve` | Start API server |
| `bab chat` | Quick chat message |
| `bab providers` | List available providers |
| `bab diagnose` | Collect diagnostic info |

---

## Troubleshooting

### "Chrome not found"

Install Chrome from https://www.google.com/chrome/

### "Not signed in"

Open Chrome and sign in to your AI provider.

### "Connection refused"

Start the server: `bab serve --site gemini`

### "Browser Session Lost"

Run: `bab connect gemini`

### "Rate limit exceeded"

Wait a minute and try again.

---

## What's Next?

- Try different providers: `bab serve --site chatgpt`
- Read the [User Guide](./USER_GUIDE.md)
- Read the [API Reference](./docs/api-reference.md)
- Join the community: [GitHub Discussions](https://github.com/negrin22899/browser-ai-bridge/discussions)

---

## Need Help?

- Run `bab doctor` to check your setup
- Run `bab diagnose` to collect diagnostic info
- Open an issue: https://github.com/negrin22899/browser-ai-bridge/issues
