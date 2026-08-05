import { useState } from 'react';
import {
  Puzzle,
  Download,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Package,
  Star,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface Extension {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  enabled: boolean;
  installed: boolean;
  downloads: number;
  rating: number;
}

const mockExtensions: Extension[] = [
  {
    id: 'example',
    name: 'Example Plugin',
    description: 'Example plugin demonstrating plugin SDK',
    version: '0.1.0',
    author: 'BAB Team',
    enabled: true,
    installed: true,
    downloads: 1234,
    rating: 4.5,
  },
  {
    id: 'git-enhanced',
    name: 'Git Enhanced',
    description: 'Advanced git operations and visualizations',
    version: '1.0.0',
    author: 'Community',
    enabled: false,
    installed: true,
    downloads: 5678,
    rating: 4.8,
  },
  {
    id: 'docker-tools',
    name: 'Docker Tools',
    description: 'Docker container management tools',
    version: '0.5.0',
    author: 'Community',
    enabled: false,
    installed: false,
    downloads: 890,
    rating: 4.2,
  },
];

export default function Extensions() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [extensions, setExtensions] = useState(mockExtensions);

  const cardClass = `rounded-xl border ${
    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`;

  const handleToggle = (id: string) => {
    setExtensions(prev =>
      prev.map(ext =>
        ext.id === id ? { ...ext, enabled: !ext.enabled } : ext
      )
    );
  };

  const handleInstall = (id: string) => {
    setExtensions(prev =>
      prev.map(ext =>
        ext.id === id ? { ...ext, installed: true, enabled: true } : ext
      )
    );
  };

  const handleUninstall = (id: string) => {
    setExtensions(prev =>
      prev.map(ext =>
        ext.id === id ? { ...ext, installed: false, enabled: false } : ext
      )
    );
  };

  const installedCount = extensions.filter(e => e.installed).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {t('extensions.title')}
        </h1>
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
          {t('extensions.subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-blue-900' : 'bg-blue-50'
            }`}>
              <Package className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {installedCount}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('extensions.enabled')}
              </p>
            </div>
          </div>
        </div>
        <div className={`${cardClass} p-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              theme === 'dark' ? 'bg-green-900' : 'bg-green-50'
            }`}>
              <Puzzle className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {extensions.length}
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Available
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Extensions List */}
      {extensions.length === 0 ? (
        <div className={`${cardClass} p-12 text-center`}>
          <Puzzle className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            {t('extensions.noExtensions')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {extensions.map((ext) => (
            <div key={ext.id} className={`${cardClass} p-6`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    ext.installed
                      ? theme === 'dark' ? 'bg-primary-900' : 'bg-primary-50'
                      : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <Puzzle className={`w-6 h-6 ${
                      ext.installed
                        ? theme === 'dark' ? 'text-primary-400' : 'text-primary-600'
                        : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {ext.name}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        v{ext.version}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {ext.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        by {ext.author}
                      </span>
                      <span className={`text-xs flex items-center gap-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        <Download className="w-3 h-3" />
                        {ext.downloads}
                      </span>
                      <span className={`text-xs flex items-center gap-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        <Star className="w-3 h-3" />
                        {ext.rating}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {ext.installed ? (
                    <>
                      <button
                        onClick={() => handleToggle(ext.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          ext.enabled
                            ? 'text-green-500'
                            : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        {ext.enabled ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                      <button
                        onClick={() => handleUninstall(ext.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                            : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleInstall(ext.id)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
                    >
                      <Download className="w-4 h-4" />
                      {t('extensions.install')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
