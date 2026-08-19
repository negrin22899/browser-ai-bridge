import { useState, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Globe,
  Zap,
  MessageSquare,
  Bot,
  User,
  Terminal,
  FileText,
  GitBranch,
  CheckCircle,
  XCircle,
  Loader2,
  History,
  Plus,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { api, type Provider, type Session } from '../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  id: string;
  name: string;
  params: Record<string, unknown>;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: string;
}

export default function Chat() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome! I can help you with file operations, git commands, and more. Just ask!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Load real providers from API
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
        if (providerList.length > 0 && !providerList.find(p => p.id === selectedProvider)) {
          setSelectedProvider(providerList[0].id);
        }
      } catch {
        // API not available, show default providers
        setProviders([
          { id: 'gemini', name: 'Gemini', status: 'unknown' },
          { id: 'chatgpt', name: 'ChatGPT', status: 'unknown' },
          { id: 'claude', name: 'Claude', status: 'unknown' },
        ]);
      }
    }
    loadProviders();
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const data = await api.getSessions();
      setSessions(data.data || []);
    } catch {
      // Ignore — history is optional.
    }
  }

  const loadHistory = async (sessionId: string) => {
    try {
      const session = await api.getSession(sessionId);
      const history: Message[] = (session.messages || []).map((m, i) => ({
        id: `${sessionId}-${i}`,
        role: m.role as Message['role'],
        content: m.content ?? '',
        timestamp: new Date(),
      }));
      setMessages(history.length > 0 ? history : messages);
      setCurrentSessionId(sessionId);
      setSelectedProvider(session.providerId || selectedProvider);
      setHistoryOpen(false);
    } catch {
      // Ignore load errors.
    }
  };

  const newChat = () => {
    setCurrentSessionId(null);
    setMessages([
      {
        id: Date.now().toString(),
        role: 'system',
        content: 'Welcome! I can help you with file operations, git commands, and more. Just ask!',
        timestamp: new Date(),
      },
    ]);
  };

  const getProviderIcon = (id: string) => {
    switch (id) {
      case 'gemini': return Globe;
      case 'chatgpt': return Zap;
      case 'claude': return MessageSquare;
      default: return Globe;
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

    try {
      // Call real API, continuing the loaded history when present.
      const historyMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> =
        messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role, content: m.content }));

      const { response } = await api.chatWithMeta({
        model: selectedProvider,
        sessionId: currentSessionId ?? undefined,
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Be concise.' },
          ...historyMessages,
          { role: 'user', content: userInput },
        ],
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.choices[0]?.message?.content || 'No response',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      loadSessions();
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {t('chat.title')}
        </h1>
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
          {t('chat.subtitle')}
        </p>
      </div>

      {/* Provider Selection + History */}
      <div className="flex gap-2 mb-4">
        <div className="relative">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
            title="Chat history"
          >
            <History className="w-4 h-4" />
            {t('chat.history')}
          </button>
          {historyOpen && (
            <div className={`absolute left-0 top-12 w-80 z-50 rounded-xl border shadow-lg overflow-hidden ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                theme === 'dark' ? 'text-gray-400 border-b border-gray-700' : 'text-gray-500 border-b border-gray-100'
              }`}>
                {t('chat.history')} ({sessions.length})
              </div>
              {sessions.length === 0 ? (
                <div className={`px-4 py-6 text-sm text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('chat.noHistory')}
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {sessions.map((session) => {
                    const last = session.messages?.[session.messages.length - 1];
                    return (
                      <button
                        key={session.id}
                        onClick={() => loadHistory(session.id)}
                        className={`w-full px-4 py-3 text-left transition-colors ${
                          currentSessionId === session.id
                            ? theme === 'dark' ? 'bg-primary-500/10' : 'bg-primary-50'
                            : theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {session.providerId.charAt(0).toUpperCase() + session.providerId.slice(1)}
                          <span className={`ml-2 text-xs font-normal ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {session.messageCount ?? session.messages?.length ?? 0} msgs
                          </span>
                        </div>
                        <div className={`text-xs truncate mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {last ? (last.content || (last as { tool_calls?: unknown }).tool_calls ? '[tool call]' : '(empty)') : '(empty)'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <button
                onClick={newChat}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-t transition-colors ${
                  theme === 'dark'
                    ? 'text-primary-400 border-gray-700 hover:bg-gray-700'
                    : 'text-primary-600 border-gray-100 hover:bg-gray-50'
                }`}
              >
                <Plus className="w-4 h-4" />
                {t('chat.new')}
              </button>
            </div>
          )}
        </div>
        {providers.map((provider) => {
          const Icon = getProviderIcon(provider.id);
          return (
            <button
              key={provider.id}
              onClick={() => setSelectedProvider(provider.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedProvider === provider.id
                  ? 'bg-primary-500 text-white'
                  : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {provider.name}
              {provider.status === 'connected' && (
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>

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
                  ? 'bg-primary-500'
                  : message.role === 'system'
                    ? theme === 'dark' ? 'bg-gray-600' : 'bg-gray-500'
                    : 'bg-green-500'
              }`}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>
            <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
              <div
                className={`inline-block px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-primary-500 text-white'
                    : message.role === 'system'
                      ? theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                      : theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>

              {/* Tool Calls */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.toolCalls.map((toolCall) => (
                    <div
                      key={toolCall.id}
                      className={`${cardClass} p-3`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {toolCall.status === 'running' ? (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        ) : toolCall.status === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : toolCall.status === 'error' ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <Terminal className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {toolCall.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          theme === 'dark' ? 'bg-gray-600 text-gray-400' : 'bg-gray-100 text-gray-500'
                        }`}>
                          Tool
                        </span>
                      </div>
                      {toolCall.result && (
                        <pre className={`text-xs p-2 rounded overflow-x-auto ${
                          theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-50'
                        }`}>
                          {toolCall.result}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className={`${cardClass} px-4 py-3`}>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('chat.thinking')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`mt-4 ${cardClass} p-4`}>
        <div className="flex items-end gap-3">
          <button className={`p-2.5 rounded-lg transition-colors ${
            theme === 'dark'
              ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}>
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.placeholder')}
              rows={1}
              className={`w-full resize-none border-0 focus:outline-none focus:ring-0 text-sm ${
                theme === 'dark' ? 'bg-transparent text-white placeholder-gray-500' : 'bg-transparent'
              }`}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className={`flex items-center gap-4 mt-3 pt-3 border-t ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
        }`}>
          <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
            {t('chat.quickActions')}
          </span>
          {[
            { icon: FileText, label: t('chat.readFile') },
            { icon: GitBranch, label: t('chat.gitStatus') },
            { icon: Terminal, label: t('chat.runCommand') },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => setInput(action.label + ' ')}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-primary-400'
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              <action.icon className="w-3.5 h-3.5" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
