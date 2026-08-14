# Quick Start - CLI

For developers who want to use Browser AI Bridge from the terminal.

## Install

```bash
npx browser-ai-bridge init
```

Or clone and build:

```bash
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm run setup
```

## Sign in

Open Chrome and sign in to one of:
- https://gemini.google.com (recommended)
- https://chatgpt.com
- https://claude.ai
- https://chat.deepseek.com

## Start

```bash
bab serve --site gemini
```

Server runs at http://localhost:3000

## Use in IDE

Configure your AI extension:
- **API URL**: `http://localhost:3000/v1/chat/completions`
- **Model**: `gemini`

## Commands

| Command | Description |
|---------|-------------|
| `bab serve --site gemini` | Start server |
| `bab chat "Hello"` | Quick chat |
| `bab doctor` | Check system |
| `bab providers` | List providers |
| `bab diagnose` | Collect diagnostics |

## Options

```bash
# Custom port
bab serve --site gemini --port 8080

# Show browser window
bab serve --site gemini --no-headless

# Use fresh browser profile
bab serve --site gemini --no-profile
```
