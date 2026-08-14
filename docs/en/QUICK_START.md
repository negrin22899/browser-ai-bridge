# Quick Start

## For Users

Download the app from [GitHub Releases](https://github.com/negrin22899/browser-ai-bridge/releases/latest), install, and open it.

1. Sign in to Gemini/ChatGPT/Claude/DeepSeek in Chrome
2. The server starts automatically
3. Configure your IDE with `http://localhost:3000/v1/chat/completions`

See [User Guide](../../USER_GUIDE.md) for details.

## For Developers

```bash
npx browser-ai-bridge init
```

Or:

```bash
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm run setup
```

Then:

```bash
bab serve --site gemini
```

See [Contributing](../../CONTRIBUTING.md) for development setup.
