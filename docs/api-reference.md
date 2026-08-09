# Browser AI Bridge - API Reference

## Base URL

```
http://localhost:3000
```

## Authentication

Currently, no authentication is required. For production use, consider adding API keys.

## Endpoints

### Health Check

Check the health status of the bridge and connected providers.

**Request:**
```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1691234567890,
  "providers": {
    "gemini": {
      "healthy": true,
      "latency": 150
    }
  }
}
```

**Status Codes:**
- `200` - All systems operational
- `503` - One or more providers unhealthy

---

### List Models

List all available AI models (providers).

**Request:**
```
GET /v1/models
```

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "gemini",
      "object": "model",
      "created": 0,
      "owned_by": "Google Gemini"
    },
    {
      "id": "chatgpt",
      "object": "model",
      "created": 0,
      "owned_by": "ChatGPT"
    }
  ]
}
```

---

### Chat Completions

Send a chat completion request (OpenAI-compatible).

**Request:**
```
POST /v1/chat/completions
Content-Type: application/json
```

**Body:**
```json
{
  "model": "gemini",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello!"
    }
  ],
  "stream": false
}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| model | string | Yes | Model/provider ID |
| messages | array | Yes | Array of message objects |
| stream | boolean | No | Enable streaming (default: false) |

**Message Object:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| role | string | Yes | "system", "user", or "assistant" |
| content | string | Yes | Message content |

**Response:**
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1691234567,
  "model": "gemini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 8,
    "total_tokens": 18
  }
}
```

**Streaming Response:**
```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1691234567,"model":"gemini","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1691234567,"model":"gemini","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1691234567,"model":"gemini","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `429` - Rate limit exceeded
- `503` - Provider unavailable

---

### Responses

OpenAI Responses API compatible endpoint.

**Request:**
```
POST /v1/responses
Content-Type: application/json
```

**Body:**
```json
{
  "model": "gemini",
  "input": [
    {
      "role": "user",
      "content": "Hello!"
    }
  ]
}
```

**Response:**
```json
{
  "id": "resp-123",
  "object": "response",
  "created": 1691234567,
  "model": "gemini",
  "output": [
    {
      "id": "resp-123-0",
      "type": "message",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "Hello! How can I help you?"
        }
      ]
    }
  ]
}
```

---

### Sessions

Manage chat sessions.

#### List Sessions
```
GET /v1/sessions
```

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "session-123",
      "providerId": "gemini",
      "model": "gemini",
      "createdAt": 1691234567,
      "messages": []
    }
  ]
}
```

#### Create Session
```
POST /v1/sessions
Content-Type: application/json
```

**Body:**
```json
{
  "providerId": "gemini",
  "model": "gemini"
}
```

**Response:**
```json
{
  "id": "session-456",
  "providerId": "gemini",
  "model": "gemini",
  "createdAt": 1691234567,
  "messages": []
}
```

#### Get Session
```
GET /v1/sessions/:id
```

**Response:**
```json
{
  "id": "session-123",
  "providerId": "gemini",
  "model": "gemini",
  "createdAt": 1691234567,
  "messages": [
    {
      "role": "user",
      "content": "Hello!"
    }
  ]
}
```

---

## Rate Limiting

All endpoints are rate limited. Rate limit information is included in response headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1691234627
```

Default limits:
- 60 requests per minute per IP

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| VALIDATION_ERROR | Invalid request parameters |
| PROVIDER_CONNECTION_ERROR | Failed to connect to provider |
| PROVIDER_TIMEOUT_ERROR | Provider request timed out |
| RATE_LIMIT_ERROR | Rate limit exceeded |
| PLUGIN_ERROR | Plugin execution error |
| TOOL_EXECUTION_ERROR | Tool execution failed |
| PERMISSION_DENIED_ERROR | Permission denied for tool |

---

## WebSocket

Connect to real-time events:

```
ws://localhost:3000/ws
```

### Messages

**Client → Server:**
```json
{
  "type": "ping"
}
```

**Server → Client:**
```json
{
  "type": "pong",
  "data": {
    "timestamp": 1691234567
  }
}
```

**Server Broadcast:**
```json
{
  "type": "heartbeat",
  "data": {
    "timestamp": 1691234567
  }
}
```

---

## Metrics

Prometheus-compatible metrics endpoint:

```
GET /metrics
```

**Response:**
```
bab_requests_total 1234
bab_requests_duration 150
bab_provider_requests{provider="gemini"} 567
```

---

## Examples

### cURL

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

# Streaming
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### JavaScript

```javascript
const response = await fetch('http://localhost:3000/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gemini',
    messages: [{ role: 'user', content: 'Hello!' }],
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

### Python

```python
import requests

response = requests.post(
    'http://localhost:3000/v1/chat/completions',
    json={
        'model': 'gemini',
        'messages': [{'role': 'user', 'content': 'Hello!'}],
    }
)

data = response.json()
print(data['choices'][0]['message']['content'])
```
