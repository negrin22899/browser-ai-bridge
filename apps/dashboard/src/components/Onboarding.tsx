import { useEffect, useState } from 'react';
import { Zap, Globe, MessageSquare, Bot, Key, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../lib/api';

interface Choice {
  id: string;
  label: string;
  hint: string;
  icon: typeof Globe;
  kind: 'browser' | 'api';
  defaultModel: string;
}

const CHOICES: Choice[] = [
  { id: 'gemini', label: 'Google Gemini', hint: 'Browser session', icon: Globe, kind: 'browser', defaultModel: 'gemini' },
  { id: 'chatgpt', label: 'ChatGPT', hint: 'Browser session', icon: MessageSquare, kind: 'browser', defaultModel: 'chatgpt' },
  { id: 'claude', label: 'Claude', hint: 'Browser session', icon: Bot, kind: 'browser', defaultModel: 'claude' },
  { id: 'deepseek', label: 'DeepSeek', hint: 'Browser session', icon: MessageSquare, kind: 'browser', defaultModel: 'deepseek' },
  { id: 'openai', label: 'OpenAI', hint: 'API key', icon: Key, kind: 'api', defaultModel: 'gpt-4o' },
  { id: 'anthropic', label: 'Anthropic', hint: 'API key', icon: Key, kind: 'api', defaultModel: 'claude-3-5-sonnet' },
  { id: 'google', label: 'Google API', hint: 'API key', icon: Key, kind: 'api', defaultModel: 'gemini-pro' },
];

export default function Onboarding() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState<string>('');
  const [model, setModel] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getConfig()
      .then((config) => {
        if (config.onboarding?.completed && !cancelled) setDone(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const pickProvider = (choice: Choice) => {
    setProvider(choice.id);
    setModel(choice.defaultModel);
    setStep(2);
  };

  const finish = async () => {
    setSaving(true);
    try {
      await api.saveConfig({
        onboarding: { completed: true, provider, model },
      });
      setDone(true);
    } catch {
      setSaving(false);
    }
  };

  if (done) return null;

  const cardClass = `rounded-2xl border shadow-xl ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`${cardClass} w-full max-w-xl p-8`}>
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= step
                  ? theme === 'dark' ? 'bg-primary-500 w-10' : 'bg-primary-500 w-10'
                  : theme === 'dark' ? 'bg-gray-600 w-6' : 'bg-gray-200 w-6'
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-2xl font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {t('onboarding.welcomeTitle')}
            </h1>
            <p className={`mb-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('onboarding.welcomeText')}
            </p>
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors mx-auto"
            >
              {t('onboarding.getStarted')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {t('onboarding.chooseProvider')}
            </h1>
            <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('onboarding.chooseProviderText')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CHOICES.map((choice) => {
                const Icon = choice.icon;
                return (
                  <button
                    key={choice.id}
                    onClick={() => pickProvider(choice)}
                    className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
                      theme === 'dark'
                        ? 'bg-gray-700/50 border-gray-600 hover:border-primary-500'
                        : 'bg-gray-50 border-gray-200 hover:border-primary-500'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${theme === 'dark' ? 'text-primary-400' : 'text-primary-600'}`} />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {choice.label}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {choice.hint}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep(0)}
              className={`flex items-center gap-2 mt-6 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
            >
              <ChevronLeft className="w-4 h-4" />
              {t('onboarding.back')}
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {t('onboarding.chooseModel')}
            </h1>
            <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('onboarding.chooseModelText')}
            </p>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('onboarding.model')}
            </label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
              placeholder={t('onboarding.modelPlaceholder')}
            />
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => setStep(1)}
                className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
              >
                <ChevronLeft className="w-4 h-4" />
                {t('onboarding.back')}
              </button>
              <button
                onClick={finish}
                disabled={saving || !model.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Check className="w-4 h-4" />
                {t('onboarding.done')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
