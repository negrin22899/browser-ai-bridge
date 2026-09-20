import { useState, useEffect } from 'react';
import {
  Send,
  Globe,
  Zap,
  MessageSquare,
  Bot,
  User,
  Loader2,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api, type Provider } from '../lib/api';
import { humanizeError } from '../lib/errors';
import { SlidingTabs } from '../components/motion';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export default function Chat() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content:
        language === 'ru'
          ? 'Быстрая проверка провайдера: напиши что-нибудь и посмотри, отвечает ли выбранная модель.'
          : 'Quick provider check: type something to see whether the selected model replies.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    async function loadProviders() {
      try {
        const health = await api.getHealth();
        const providerList: Provider[] = Object.entries(health.providers).map(([id, data]) => ({
          id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          status: data.healthy ? 'connected' : 'disconnected',
        }));
        setProviders(providerList);
        if (providerList.length > 0 && !providerList.find((p) => p.id === selectedProvider)) {
          setSelectedProvider(providerList[0].id);
        }
      } catch {
        // API not available, show default providers so the tabs aren't empty.
        setProviders([
          { id: 'gemini', name: 'Gemini', status: 'unknown' },
          { id: 'chatgpt', name: 'ChatGPT', status: 'unknown' },
          { id: 'claude', name: 'Claude', status: 'unknown' },
        ]);
      }
    }
    loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getProviderIcon = (id: string) => {
    switch (id) {
      case 'gemini':
        return Globe;
      case 'chatgpt':
        return Zap;
      case 'claude':
        return MessageSquare;
      default:
        return Globe;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const stream = api.chatStream({
        model: selectedProvider,
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Be concise.' },
          { role: 'user', content: userInput },
        ],
      });

      let accumulated = '';
      for await (const chunk of stream) {
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)),
        );
      }

      if (!accumulated) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: 'No response' } : m)),
        );
      }
    } catch (error) {
      const errMsg = humanizeError(error, language);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: errMsg } : m)),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const cardClass = 'rounded-xl glass';

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h1 className="text-2xl font-display leading-none text-text">{t('chat.title')}</h1>
        <p className="text-text-muted mt-2">{t('chat.subtitle')}</p>
      </div>

      {/* Provider Selection */}
      {providers.length > 0 && (
        <div className="mb-4">
          <SlidingTabs
            ariaLabel="Provider"
            value={selectedProvider}
            onChange={setSelectedProvider}
            tabs={providers.map((provider) => {
              const Icon = getProviderIcon(provider.id);
              return {
                id: provider.id,
                label: (
                  <>
                    <Icon className="w-4 h-4" />
                    {provider.name}
                    {provider.status === 'connected' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden />
                    )}
                  </>
                ),
              };
            })}
          />
        </div>
      )}

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto ${cardClass} p-4 space-y-4`}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                message.role === 'user'
                  ? 'bg-accent text-accent-fg'
                  : message.role === 'system'
                    ? 'bg-surface-inset text-text-subtle'
                    : 'bg-accent-soft text-accent'
              }`}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
              <div
                className={`inline-block px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-accent text-accent-fg'
                    : message.role === 'system'
                      ? 'bg-surface-inset text-text-muted italic'
                      : 'bg-surface-strong text-text'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>

              <p className="text-xs mt-1 text-text-subtle font-mono">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent-soft text-accent">
              <Bot className="w-4 h-4" />
            </div>
            <div className="glass px-4 py-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-accent animate-spin" />
                <span className="text-sm text-text-muted">{t('chat.thinking')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`mt-4 ${cardClass} p-4`}>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.placeholder')}
              rows={1}
              className="w-full resize-none border-0 focus:outline-none focus:ring-0 text-sm bg-transparent text-text placeholder:text-text-subtle"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-accent text-accent-fg rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
