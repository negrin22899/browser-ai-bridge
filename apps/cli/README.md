# @bab/cli

CLI for Browser AI Bridge - Use browser AI (Gemini, ChatGPT, Claude, DeepSeek) in your local environment.

## Installation

```bash
npm install -g @bab/cli
```

## Quick Start

```bash
# Check system requirements
bab doctor

# Start with Gemini
bab serve --site gemini

# Start with ChatGPT
bab serve --site chatgpt

# Quick chat
bab chat "Hello!"
```

## Commands

### `bab serve`

Start the API server.

```bash
bab serve [options]

Options:
  -p, --port <port>    Port to listen on (default: 3000)
  -h, --host <host>    Host to bind to (default: localhost)
  --site <url>         AI site URL or provider name
  --headless           Run browser in headless mode (default: true)
  --no-headless        Show browser window
  --profile            Use existing Chrome profile (default: true)
  --no-profile         Use new browser profile
```

### `bab chat`

Send a chat message to browser AI.

```bash
bab chat <message> [options]

Options:
  --site <url>    AI site URL or provider name (default: gemini)
  --headless      Run browser in headless mode (default: true)
```

### `bab doctor`

Check system requirements and configuration.

```bash
bab doctor
```

### `bab diagnose`

Collect diagnostic information for bug reports.

```bash
bab diagnose [options]

Options:
  -o, --output <file>    Output file path
```

### `bab providers`

List available AI providers.

```bash
bab providers
```

## API

After starting the server, use the OpenAI-compatible API:

```bash
# Health check
curl http://localhost:3000/health

# List models
curl http://localhost:3000/v1/models

# Chat completion
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## License

MIT
