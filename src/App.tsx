import { useState, useEffect, useCallback } from 'react';
import { TopAppBar } from './components/TopAppBar';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './screens/Dashboard';
import { MarkSpotScreen } from './screens/MarkSpotScreen';
import { ScanScreen } from './screens/ScanScreen';
import { AnalysisResult } from './screens/AnalysisResult';
import { SettingsScreen } from './screens/SettingsScreen';
import { ParkingAnalysis } from './types';

type Tab = 'home' | 'park' | 'check' | 'settings';

type Screen =
  | { name: 'dashboard' }
  | { name: 'mark-spot' }
  | { name: 'scan' }
  | { name: 'analysis'; analysis: ParkingAnalysis }
  | { name: 'settings' };

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('parkwise_activeTab');
    return (saved as Tab) || 'home';
  });
  const [screen, setScreen] = useState<Screen>({ name: 'dashboard' });
  const [showHelp, setShowHelp] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Initialize screen based on loaded activeTab on mount
  useEffect(() => {
    const savedTab = localStorage.getItem('parkwise_activeTab') as Tab | null;
    if (savedTab) {
      if (savedTab === 'home') {
        setScreen({ name: 'dashboard' });
      } else if (savedTab === 'park') {
        setScreen({ name: 'mark-spot' });
      } else if (savedTab === 'check') {
        setScreen({ name: 'scan' });
      } else if (savedTab === 'settings') {
        setScreen({ name: 'settings' });
      }
    }
  }, []);

  // Persist activeTab to localStorage
  useEffect(() => {
    localStorage.setItem('parkwise_activeTab', activeTab);
  }, [activeTab]);

  // Load dark mode setting and apply to document
  useEffect(() => {
    const loadDarkModeSetting = () => {
      const saved = localStorage.getItem('parkwise_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        const isDarkMode = settings.darkMode ?? false;
        setDarkMode(isDarkMode);
        if (isDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    loadDarkModeSetting();

    // Listen for storage changes (when settings are changed in SettingsScreen)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'parkwise_settings' && e.newValue) {
        const settings = JSON.parse(e.newValue);
        const isDarkMode = settings.darkMode ?? false;
        setDarkMode(isDarkMode);
        if (isDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Also listen for changes in the same tab using a custom event
  useEffect(() => {
    const handleDarkModeChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setDarkMode(customEvent.detail);
      if (customEvent.detail) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    window.addEventListener('darkModeToggled', handleDarkModeChange);
    return () => window.removeEventListener('darkModeToggled', handleDarkModeChange);
  }, []);

  function handleAnalysisComplete(analysis: ParkingAnalysis) {
    setScreen({ name: 'analysis', analysis });
    setActiveTab('check');
  }

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'home') {
      setScreen({ name: 'dashboard' });
    } else if (tab === 'park') {
      setScreen({ name: 'mark-spot' });
    } else if (tab === 'check') {
      setScreen({ name: 'scan' });
    } else if (tab === 'settings') {
      setScreen({ name: 'settings' });
    }
  }, []);



return (
    <div className="min-h-screen flex flex-col bg-surface font-sans">
      {screen.name !== 'dashboard' && screen.name !== 'mark-spot' && screen.name !== 'scan' && <TopAppBar onHelpClick={() => setShowHelp(true)} />}

      {screen.name === 'dashboard' && (
        <Dashboard
          onParkMyCar={() => {
            setScreen({ name: 'mark-spot' });
            setActiveTab('park');
          }}
          onFindParking={() => {
            setScreen({ name: 'mark-spot' });
            setActiveTab('park');
          }}

          onSettingsClick={() => {
            setScreen({ name: 'settings' });
            setActiveTab('settings');
          }}
        />
      )}

      {screen.name === 'mark-spot' && (
        <MarkSpotScreen
          onConfirm={(sessionId: string) => {
            setScreen({ name: 'dashboard' });
            setActiveTab('home');
          }}
        />
      )}

      {screen.name === 'scan' && (
        <ScanScreen 
          onAnalysisComplete={handleAnalysisComplete}
          onHomeClick={() => { setScreen({ name: 'dashboard' }); setActiveTab('home'); }}
          onParkClick={() => { setScreen({ name: 'mark-spot' }); setActiveTab('park'); }}
          onCheckClick={() => { setScreen({ name: 'scan' }); setActiveTab('check'); }}
          onSettingsClick={() => { setScreen({ name: 'settings' }); setActiveTab('settings'); }}
        />
      )}

      {screen.name === 'analysis' && (
        <AnalysisResult
          analysis={screen.analysis}
        />
      )}



      {screen.name === 'settings' && (
        <SettingsScreen showHelp={() => setShowHelp(true)} />
      )}

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-md">​​
          <div className="bg-surface rounded-3xl p-6 max-h-[80vh] overflow-y-auto w-full max-w-[540px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">​​
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-headline-sm font-bold">Help</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="hover:opacity-80 transition-opacity active:scale-95"
              >
                <span className="material-symbols-outlined text-on-surface">close</span>
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-title-md font-semibold mb-2">How to Use ParkWise AI</h3>
                <p className="text-body-md text-on-surface-variant">Scan parking signs to get AI-powered parking insights and automatic session tracking.</p>
              </div>

              <div>
                <h4 className="text-title-sm font-semibold mb-2">Scan a Parking Sign</h4>
                <p className="text-body-md text-on-surface-variant">
                  Tap the camera icon at the bottom and take a photo of a parking sign. Our AI will analyze the sign and provide parking duration and restrictions.
                </p>
              </div>

              <div>
                <h4 className="text-title-sm font-semibold mb-2">Start a Parking Session</h4>
                <p className="text-body-md text-on-surface-variant">
                  After analysis, tap "Start Session" to begin tracking your parking time. Your location will be saved for reference.
                </p>
              </div>



              <div>
                <h4 className="text-title-sm font-semibold mb-2">Get Reminders</h4>
                <p className="text-body-md text-on-surface-variant">
                  Enable the 15-minute reminder toggle when starting a session to get notified before your parking time expires.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
