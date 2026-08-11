import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Providers from './pages/Providers';
import Sessions from './pages/Sessions';
import RuntimePage from './pages/Runtime';
import RuntimeInspector from './pages/RuntimeInspector';
import Logs from './pages/Logs';
import Extensions from './pages/Extensions';
import Settings from './pages/Settings';
import ConnectionInfo from './pages/ConnectionInfo';

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/providers" element={<Providers />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/runtime" element={<RuntimePage />} />
              <Route path="/inspector" element={<RuntimeInspector />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/extensions" element={<Extensions />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/connect" element={<ConnectionInfo />} />
            </Routes>
          </Layout>
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
