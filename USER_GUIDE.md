# Browser AI Bridge - User Guide

## Welcome! 👋

Browser AI Bridge lets you use AI assistants (Gemini, ChatGPT, Claude, DeepSeek) directly in your code editor. No API keys needed - it uses your browser!

## Quick Start (5 minutes)

### Step 1: Install

```bash
# Clone the repository
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge

# Run setup (installs everything automatically)
npm run setup
```

### Step 2: Sign in to AI

Open Chrome and sign in to ONE of these:
- **Gemini**: https://gemini.google.com
- **ChatGPT**: https://chatgpt.com
- **Claude**: https://claude.ai
- **DeepSeek**: https://chat.deepseek.com

### Step 3: Start the server

```bash
# Start with your preferred AI
node apps/cli/dist/index.js serve --site gemini
```

### Step 4: Use in your IDE

Configure your IDE to use:
- **API URL**: `http://localhost:3000/v1/chat/completions`
- **Model**: `gemini` (or `chatgpt`, `claude`, `deepseek`)

---

## Detailed Setup

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 20.0 | 22.x |
| Chrome | Any | Latest |
| RAM | 4GB | 8GB |
| OS | Windows 10, macOS 12, Ubuntu 20.04 | Latest |

### Installation Options

#### Option 1: Automatic Setup (Recommended)

```bash
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm run setup
```

The setup script will:
1. ✅ Check Node.js version
2. ✅ Check Chrome installation
3. ✅ Install dependencies
4. ✅ Build the project
5. ✅ Run system check

#### Option 2: Manual Setup

```bash
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm install
npm run build
node apps/cli/dist/index.js doctor
```

---

## Using Browser AI Bridge

### Starting the Server

```bash
# Start with Gemini
node apps/cli/dist/index.js serve --site gemini

# Start with ChatGPT
node apps/cli/dist/index.js serve --site chatgpt

# Start with Claude
node apps/cli/dist/index.js serve --site claude

# Start with DeepSeek
node apps/cli/dist/index.js serve --site deepseek

# Custom port
node apps/cli/dist/index.js serve --site gemini --port 8080
```

### Quick Chat (Command Line)

```bash
# Send a message
node apps/cli/dist/index.js chat "What is React?"

# Use specific provider
node apps/cli/dist/index.js chat "Explain this code" --site claude
```

### Checking System Health

```bash
# Run doctor check
node apps/cli/dist/index.js doctor

# Get diagnostic info
node apps/cli/dist/index.js diagnose
```

---

## IDE Configuration

### VS Code

Install an AI extension (like Continue, Cody, or similar) and configure:

```json
{
  "apiBase": "http://localhost:3000",
  "model": "gemini"
}
```

### Cursor

1. Open Settings → AI → API
2. Set API URL: `http://localhost:3000/v1/chat/completions`
3. Set Model: `gemini`

### JetBrains IDEs

1. Install AI Assistant plugin
2. Configure custom API endpoint: `http://localhost:3000/v1/chat/completions`

### Neovim

```lua
-- Using copilot.lua or similar
require('copilot').setup({
  server = {
    url = 'http://localhost:3000',
  },
})
```

---

## API Usage

### Chat Completion

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### Streaming

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [
      {"role": "user", "content": "Tell me a story"}
    ],
    "stream": true
  }'
```

### List Available Models

```bash
curl http://localhost:3000/v1/models
```

### Health Check

```bash
curl http://localhost:3000/health
```

---

## Dashboard

Access the web dashboard:

```bash
npm run dashboard
# Open http://localhost:5173
```

Features:
- Provider status
- Chat interface
- Session history
- Settings

---

## Troubleshooting

### "Chrome not found"

Install Chrome: https://www.google.com/chrome/

### "User not authorized"

1. Open Chrome
2. Sign in to your AI provider
3. Make sure you're logged in

### "Connection refused"

1. Check if server is running
2. Check port (default: 3000)
3. Check firewall settings

### "Rate limit exceeded"

Wait a minute and try again, or increase limits in config.

### Provider not responding

1. Check if you're signed in to the AI service
2. Try refreshing the browser page
3. Restart the server

---

## Advanced Configuration

### Custom Port

```bash
node apps/cli/dist/index.js serve --site gemini --port 8080
```

### Headless Mode (No visible browser)

```bash
node apps/cli/dist/index.js serve --site gemini --headless
```

### Environment Variables

```bash
# Set API port
export BAB_PORT=3000

# Set log level
export BAB_LOG_LEVEL=info
```

---

## FAQ

**Q: Do I need API keys?**
A: No! Browser AI Bridge uses your browser session.

**Q: Is it free?**
A: Yes, if you have free access to the AI service.

**Q: Which AI is best?**
A: Try them all! Gemini and ChatGPT are most popular.

**Q: Can I use multiple AIs?**
A: Yes, start different servers on different ports.

**Q: Is my data safe?**
A: Yes, everything stays on your computer.

**Q: Can I use it offline?**
A: No, you need internet for the AI services.

---

## Getting Help

- **Issues**: https://github.com/negrin22899/browser-ai-bridge/issues
- **Discussions**: https://github.com/negrin22899/browser-ai-bridge/discussions

---

## What's Next?

- Try different AI providers
- Explore the API
- Build plugins
- Contribute to the project!

Happy coding! 🚀
