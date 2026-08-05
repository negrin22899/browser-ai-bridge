import { useState } from 'react';
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
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

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

  const aiProviders = [
    { id: 'gemini', name: 'Gemini', icon: Globe, color: 'bg-blue-500' },
    { id: 'chatgpt', name: 'ChatGPT', icon: Zap, color: 'bg-green-500' },
    { id: 'claude', name: 'Claude', icon: MessageSquare, color: 'bg-orange-500' },
  ];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response with tool calls
    setTimeout(() => {
      const toolCall: ToolCall = {
        id: 'tc-' + Date.now(),
        name: 'fs.read',
        params: { path: input.includes('config') ? 'package.json' : 'README.md' },
        status: 'success',
        result: '{"name": "browser-ai-bridge", "version": "0.1.0"}',
      };

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'll read that file for you. Here's what I found:`,
        timestamp: new Date(),
        toolCalls: [toolCall],
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
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

      {/* Provider Selection */}
      <div className="flex gap-2 mb-4">
        {aiProviders.map((provider) => (
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
            <provider.icon className="w-4 h-4" />
            {provider.name}
          </button>
        ))}
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
                <p className="text-sm">{message.content}</p>
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
