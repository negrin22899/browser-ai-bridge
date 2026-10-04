import { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout';
import TitleBar from './components/TitleBar';
import LivingBackground from './components/LivingBackground';
import Dashboard from './pages/Dashboard';
import Providers from './pages/Providers';
import Sessions from './pages/Sessions';
import RuntimePage from './pages/Runtime';
import RuntimeInspector from './pages/RuntimeInspector';
import Logs from './pages/Logs';
import DebuggerPage from './pages/Debugger';
import Extensions from './pages/Extensions';
import Settings from './pages/Settings';
import ConnectionInfo from './pages/ConnectionInfo';
import Wizard from './pages/Wizard';
import { isElectron } from './hooks/useElectron';

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    async function check() {
      let done = true;
      if (isElectron() && window.electronAPI?.loadSettings) {
        try {
          const s = await window.electronAPI.loadSettings();
          done = s?.onboarded === true;
        } catch {
          done = false;
        }
      } else {
        done = localStorage.getItem('bab-onboarded') === 'true';
      }
      setChecked(true);
      if (!done && location.pathname !== '/wizard') {
        navigate('/wizard', { replace: true });
      }
    }
    check();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!checked) return null;
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  if (location.pathname === '/wizard') {
    return (
      <Routes>
        <Route path="/wizard" element={<Wizard />} />
        <Route path="*" element={<Navigate to="/wizard" replace />} />
      </Routes>
    );
  }
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/providers" element={<Providers />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/runtime" element={<RuntimePage />} />
        <Route path="/inspector" element={<RuntimeInspector />} />
        <Route path="/debugger" element={<DebuggerPage />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/extensions" element={<Extensions />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/connect" element={<ConnectionInfo />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Router>
          <LivingBackground />
          <div className="h-screen flex flex-col text-text">
            <TitleBar />
            <div className="flex-1 min-h-0 overflow-hidden">
              <OnboardingGuard>
                <AppRoutes />
              </OnboardingGuard>
            </div>
          </div>
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
