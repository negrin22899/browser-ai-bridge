import { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Server,
  Globe,
  Key,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { api, type HealthStatus } from '../lib/api';
import { Accordion } from '../components/motion';

export default function ConnectionInfo() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [port] = useState('3000');

  useEffect(() => {
    async function load() {
      try {
        const healthData = await api.getHealth();
        setHealth(healthData);
      } catch {
        // API not available
      }
    }
    load();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const baseUrl = `http://localhost:${port}`;
  const providers = health
    ? Object.entries(health.providers).map(([id, data]) => ({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        healthy: data.healthy,
      }))
    : [];

  const cardClass = 'rounded-xl glass';
  const codeClass = 'px-3 py-2 rounded-lg font-mono text-sm bg-surface-inset text-success';

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copyToClipboard(text, id)}
      className="p-2 rounded-lg hover:bg-surface-inset text-text-muted hover:text-accent transition-colors"
      aria-label="Copy"
    >
      {copied === id ? (
        <Check className="w-4 h-4 text-success" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-display leading-none text-text">Connection Info</h1>
        <p className="text-text-muted mt-2">
          Use these settings to connect your IDE or AI tool to Browser AI Bridge
        </p>
      </div>

      {/* API Endpoint */}
      <div className={`${cardClass} p-6 mb-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent-soft text-accent">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">API Endpoint</h2>
            <p className="text-sm text-text-muted">OpenAI-compatible API for your IDE</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-muted">Chat Completions URL</label>
            <div className="flex items-center gap-2 mt-1">
              <code className={`${codeClass} flex-1`}>{baseUrl}/v1/chat/completions</code>
              <CopyButton text={`${baseUrl}/v1/chat/completions`} id="chat" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted">Base URL</label>
            <div className="flex items-center gap-2 mt-1">
              <code className={`${codeClass} flex-1`}>{baseUrl}</code>
              <CopyButton text={baseUrl} id="base" />
            </div>
          </div>
        </div>
      </div>

      {/* Available Models */}
      <div className={`${cardClass} p-6 mb-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-success/15 text-success">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">Available Models</h2>
            <p className="text-sm text-text-muted">Use these model names in your IDE configuration</p>
          </div>
        </div>

        {providers.length === 0 ? (
          <p className="text-sm text-text-subtle">
            Start the server to see available models.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className={`p-3 rounded-lg border ${
                  provider.healthy
                    ? 'border-success/40 bg-success/10'
                    : 'border-border bg-surface-inset'
                }`}
              >
                <div className="flex items-center gap-2">
                  {provider.healthy ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-text-subtle" />
                  )}
                  <span className="font-medium text-text">{provider.name}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(provider.id, `model-${provider.id}`)}
                  className="mt-2 w-full text-left text-xs font-mono px-2 py-1 rounded bg-surface-inset hover:bg-accent-soft text-text-muted hover:text-accent transition-colors"
                >
                  {copied === `model-${provider.id}` ? 'Copied!' : provider.id}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* IDE Configuration */}
      <div className={`${cardClass} p-6 mb-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-warning/15 text-warning">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">IDE Configuration</h2>
            <p className="text-sm text-text-muted">Copy these settings to your IDE</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2 text-text">OpenCode / Continue</h3>
            <pre className={`${codeClass} overflow-x-auto`}>
{`{
  "apiBase": "${baseUrl}",
  "model": "gemini"
}`}
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2 text-text">Cursor</h3>
            <pre className={`${codeClass} overflow-x-auto`}>
{`Settings → AI → API
API URL: ${baseUrl}/v1/chat/completions
Model: gemini`}
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2 text-text">cURL</h3>
            <div className="flex items-start gap-2">
              <pre className={`${codeClass} flex-1 overflow-x-auto`}>
{`curl ${baseUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gemini","messages":[{"role":"user","content":"Hello!"}]}'`}
              </pre>
              <CopyButton
                text={`curl ${baseUrl}/v1/chat/completions -H "Content-Type: application/json" -d '{"model":"gemini","messages":[{"role":"user","content":"Hello!"}]}'`}
                id="curl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start — as Accordion so long descriptions don't stack the page */}
      <div className={`${cardClass} p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent-soft text-accent">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">Quick Start</h2>
            <p className="text-sm text-text-muted">Get started in 3 steps</p>
          </div>
        </div>

        <div className="space-y-2">
          <Accordion
            defaultOpen
            title={
              <span className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-accent-soft text-accent">
                  1
                </span>
                Sign in to your AI provider
              </span>
            }
          >
            <p className="text-sm text-text-muted">
              Open Chrome (or Edge / Brave / Opera / Vivaldi) and sign in to Gemini, ChatGPT,
              Claude, or DeepSeek. Browser AI Bridge reuses that session — no API keys.
            </p>
          </Accordion>

          <Accordion
            title={
              <span className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-accent-soft text-accent">
                  2
                </span>
                Configure your IDE
              </span>
            }
          >
            <p className="text-sm text-text-muted">
              Add the API URL and model name from above to your IDE settings — Cursor, Continue,
              or anything OpenAI-compatible.
            </p>
          </Accordion>

          <Accordion
            title={
              <span className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-accent-soft text-accent">
                  3
                </span>
                Start coding
              </span>
            }
          >
            <p className="text-sm text-text-muted">
              Your IDE will now stream responses from the AI provider through Browser AI Bridge.
              Sessions and rate limits stay on the provider's side.
            </p>
          </Accordion>
        </div>

        <a
          href="https://github.com/negrin22899/browser-ai-bridge"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm text-accent hover:opacity-80"
        >
          <ExternalLink className="w-4 h-4" />
          Documentation on GitHub
        </a>
      </div>
    </div>
  );
}
