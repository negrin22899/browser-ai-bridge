# Browser AI Bridge

**Use AI in your code editor - no API keys needed!**

Browser AI Bridge lets you use Gemini, ChatGPT, Claude, and DeepSeek directly in your favorite code editor.

## Download

### Desktop App (Recommended for beginners)

Download and install - it's that simple!

| Platform | Download |
|----------|----------|
| Windows | [Download .exe](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |
| macOS | [Download .dmg](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |
| Linux | [Download .AppImage](https://github.com/negrin22899/browser-ai-bridge/releases/latest) |

**Installation:**
1. Download the installer for your OS
2. Run the installer
3. Open Browser AI Bridge
4. Sign in to your AI (Gemini, ChatGPT, Claude, or DeepSeek)
5. Start coding!

### CLI (For developers)

```bash
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm run setup
```

---

## Quick Start

### Step 1: Sign in to AI

Open your browser and sign in to ONE of these:
- **Gemini**: https://gemini.google.com (recommended)
- **ChatGPT**: https://chatgpt.com
- **Claude**: https://claude.ai
- **DeepSeek**: https://chat.deepseek.com

### Step 2: Start the server

**Desktop App:**
- Open Browser AI Bridge
- Click "Start Server"

**CLI:**
```bash
node apps/cli/dist/index.js serve --site gemini
```

### Step 3: Use in your IDE

Configure your IDE to use:
- **API URL**: `http://localhost:3000/v1/chat/completions`
- **Model**: `gemini`

---

## Features

✔ **No API keys** - Uses your browser session  
✔ **Free to use** - If you have free access to AI  
✔ **OpenAI compatible** - Works with most AI extensions  
✔ **Multiple AI providers** - Gemini, ChatGPT, Claude, DeepSeek  
✔ **Desktop app** - Easy to use GUI  
✔ **CLI** - For developers and automation  

---

## IDE Setup

### VS Code

1. Install an AI extension (Continue, Cody, etc.)
2. Set API URL: `http://localhost:3000/v1/chat/completions`
3. Set Model: `gemini`

### Cursor

1. Open Settings → AI → API
2. Set API URL: `http://localhost:3000/v1/chat/completions`
3. Set Model: `gemini`

### Other IDEs

Use the OpenAI-compatible API endpoint:
- **URL**: `http://localhost:3000/v1/chat/completions`
- **Model**: `gemini`, `chatgpt`, `claude`, or `deepseek`

---

## How It Works

```
Your IDE → Browser AI Bridge → Your Browser → AI Service → Response
```

1. Your IDE sends a request to Browser AI Bridge
2. Browser AI Bridge uses your browser to talk to the AI
3. The AI responds through your browser
4. The response goes back to your IDE

**No API keys needed!** It uses your existing browser session.

---

## Troubleshooting

### "Chrome not found"
Install Chrome: https://www.google.com/chrome/

### "Not signed in"
Open Chrome and sign in to your AI provider

### "Connection refused"
Make sure the server is running (port 3000)

### "Rate limit exceeded"
Wait a minute and try again

---

## Documentation

- [Quick Start Guide](./QUICK_START.md) - Get started in 5 minutes
- [User Guide](./USER_GUIDE.md) - Complete documentation
- [API Reference](./docs/api-reference.md) - API documentation

---

## For Developers

### CLI Commands

```bash
# Start server
node apps/cli/dist/index.js serve --site gemini

# Quick chat
node apps/cli/dist/index.js chat "Hello!"

# Check system
node apps/cli/dist/index.js doctor

# List providers
node apps/cli/dist/index.js providers
```

### API Usage

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Build Desktop App

```bash
# Windows
scripts\build-win.bat

# macOS
scripts/build-mac.sh

# Linux
scripts/build-linux.sh
```

---

## Supported AI Services

| Service | Status | Notes |
|---------|--------|-------|
| Gemini | ✅ Working | Recommended |
| ChatGPT | ✅ Working | Popular |
| Claude | ✅ Working | Good for code |
| DeepSeek | ✅ Working | Free tier available |

---

## System Requirements

| Requirement | Minimum |
|-------------|---------|
| OS | Windows 10+, macOS 12+, Ubuntu 20.04+ |
| Node.js | 20.0+ (for CLI) |
| Chrome | Any version |
| RAM | 4GB |

---

## FAQ

**Q: Is it free?**
A: Yes! You just need free access to the AI service.

**Q: Do I need API keys?**
A: No! It uses your browser session.

**Q: Which AI should I use?**
A: Try Gemini first - it's the most reliable.

**Q: Can I use it offline?**
A: No, you need internet for the AI services.

**Q: Is my data safe?**
A: Yes, everything stays on your computer.

---

## Support

- **Issues**: https://github.com/negrin22899/browser-ai-bridge/issues
- **Discussions**: https://github.com/negrin22899/browser-ai-bridge/discussions

---

## License

MIT

---

Made with ❤️ by Browser AI Bridge Team
