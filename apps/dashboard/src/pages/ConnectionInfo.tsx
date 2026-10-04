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
import { useTheme } from '../contexts/ThemeContext';
import { api, type HealthStatus } from '../lib/api';

export default function ConnectionInfo() {
  const { theme } = useTheme();
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
  const providers = health ? Object.entries(health.providers).map(([id, data]) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    healthy: data.healthy,
  })) : [];

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  const codeClass = `px-3 py-2 rounded-lg font-mono text-sm ${
    theme === 'dark' ? 'bg-gray-700 text-green-400' : 'bg-gray-100 text-green-700'
  }`;

  return (
    <div>
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Connection Info
        </h1>
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
          Use these settings to connect your IDE or AI tool to Browser AI Bridge
        </p>
      </div>

      {/* API Endpoint */}
      <div className={`${cardClass} p-6 mb-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            theme === 'dark' ? 'bg-blue-900' : 'bg-blue-50'
          }`}>
            <Server className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              API Endpoint
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              OpenAI-compatible API for your IDE
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Chat Completions URL
            </label>
            <div className="flex items-center gap-2 mt-1">
              <code className={`${codeClass} flex-1`}>
                {baseUrl}/v1/chat/completions
              </code>
              <button
                onClick={() => copyToClipboard(`${baseUrl}/v1/chat/completions`, 'chat')}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                {copied === 'chat' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Base URL
            </label>
            <div className="flex items-center gap-2 mt-1">
              <code className={`${codeClass} flex-1`}>
                {baseUrl}
              </code>
              <button
                onClick={() => copyToClipboard(baseUrl, 'base')}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                {copied === 'base' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Available Models */}
      <div className={`${cardClass} p-6 mb-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            theme === 'dark' ? 'bg-green-900' : 'bg-green-50'
          }`}>
            <Globe className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
          </div>
          <div>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Available Models
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Use these model names in your IDE configuration
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={`p-3 rounded-lg border ${
                provider.healthy
                  ? theme === 'dark' ? 'border-green-700 bg-green-900/20' : 'border-green-200 bg-green-50'
                  : theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {provider.healthy ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-gray-400" />
                )}
                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {provider.name}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(provider.id, `model-${provider.id}`)}
                className={`mt-2 w-full text-left text-xs font-mono px-2 py-1 rounded ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                } transition-colors`}
              >
                {copied === `model-${provider.id}` ? 'Copied!' : provider.id}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* IDE Configuration */}
      <div className={`${cardClass} p-6 mb-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            theme === 'dark' ? 'bg-purple-900' : 'bg-purple-50'
          }`}>
            <Terminal className={`w-5 h-5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
          </div>
          <div>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              IDE Configuration
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Copy these settings to your IDE
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* OpenCode */}
          <div>
            <h3 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              OpenCode / Continue
            </h3>
            <pre className={`${codeClass} overflow-x-auto`}>
{`{
  "apiBase": "${baseUrl}",
  "model": "gemini"
}`}
            </pre>
          </div>

          {/* Cursor */}
          <div>
            <h3 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Cursor
            </h3>
            <pre className={`${codeClass} overflow-x-auto`}>
{`Settings → AI → API
API URL: ${baseUrl}/v1/chat/completions
Model: gemini`}
            </pre>
          </div>

          {/* cURL */}
          <div>
            <h3 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              cURL
            </h3>
            <div className="flex items-start gap-2">
              <pre className={`${codeClass} flex-1 overflow-x-auto`}>
{`curl ${baseUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gemini","messages":[{"role":"user","content":"Hello!"}]}'`}
              </pre>
              <button
                onClick={() => copyToClipboard(
                  `curl ${baseUrl}/v1/chat/completions -H "Content-Type: application/json" -d '{"model":"gemini","messages":[{"role":"user","content":"Hello!"}]}'`,
                  'curl'
                )}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                {copied === 'curl' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div className={`${cardClass} p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            theme === 'dark' ? 'bg-orange-900' : 'bg-orange-50'
          }`}>
            <Key className={`w-5 h-5 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
          </div>
          <div>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Quick Start
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Get started in 3 steps
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              theme === 'dark' ? 'bg-blue-900 text-blue-400' : 'bg-blue-100 text-blue-600'
            }`}>1</span>
            <div>
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Sign in to your AI provider
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Open Chrome and sign in to Gemini, ChatGPT, Claude, or DeepSeek
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              theme === 'dark' ? 'bg-blue-900 text-blue-400' : 'bg-blue-100 text-blue-600'
            }`}>2</span>
            <div>
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Configure your IDE
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Add the API URL and model name to your IDE settings
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              theme === 'dark' ? 'bg-blue-900 text-blue-400' : 'bg-blue-100 text-blue-600'
            }`}>3</span>
            <div>
              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Start coding!
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Your IDE will now use the AI provider through Browser AI Bridge
              </p>
            </div>
          </div>
        </div>

        <a
          href="https://github.com/negrin22899/browser-ai-bridge"
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-4 inline-flex items-center gap-2 text-sm ${
            theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          Documentation on GitHub
        </a>
      </div>
    </div>
  );
}
