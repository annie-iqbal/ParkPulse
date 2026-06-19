import { useState } from 'react';
import { TopAppBar } from './components/TopAppBar';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './screens/Dashboard';
import { MarkSpotScreen } from './screens/MarkSpotScreen';
import { ScanScreen } from './screens/ScanScreen';
import { AnalysisResult } from './screens/AnalysisResult';
import { ActiveSession } from './screens/ActiveSession';
import { ReminderSettingsScreen } from './screens/ReminderSettings';
import { ParkingAnalysis } from './types';

type Tab = 'home' | 'scan' | 'activity';

type Screen =
  | { name: 'dashboard' }
  | { name: 'mark-spot' }
  | { name: 'scan' }
  | { name: 'reminder-settings' }
  | { name: 'analysis'; analysis: ParkingAnalysis }
  | { name: 'active-session'; sessionId: string };

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [screen, setScreen] = useState<Screen>({ name: 'dashboard' });
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  function handleAnalysisComplete(analysis: ParkingAnalysis) {
    setScreen({ name: 'analysis', analysis });
    setActiveTab('activity');
  }

  function handleSessionStart(sessionId: string) {
    setLastSessionId(sessionId);
    setScreen({ name: 'active-session', sessionId });
    setActiveTab('activity');
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    if (tab === 'home') {
      setScreen({ name: 'dashboard' });
    } else if (tab === 'scan') {
      setScreen({ name: 'mark-spot' });
    } else if (tab === 'activity') {
      if (lastSessionId) {
        setScreen({ name: 'active-session', sessionId: lastSessionId });
      } else if (screen.name === 'analysis') {
        // stay on analysis
      } else {
        setScreen({ name: 'dashboard' });
      }
    }
  }

  function handleStopSession() {
    setLastSessionId(null);
    setScreen({ name: 'dashboard' });
    setActiveTab('home');
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface font-sans">
      {screen.name !== 'dashboard' && screen.name !== 'mark-spot' && screen.name !== 'reminder-settings' && <TopAppBar onHelpClick={() => setShowHelp(true)} />}

      {screen.name === 'dashboard' && (
        <Dashboard
          onParkMyCar={() => {
            setScreen({ name: 'mark-spot' });
            setActiveTab('scan');
          }}
          onFindParking={() => {
            setScreen({ name: 'mark-spot' });
            setActiveTab('scan');
          }}
          onViewAllHistory={() => {
            setActiveTab('activity');
            if (lastSessionId) {
              setScreen({ name: 'active-session', sessionId: lastSessionId });
            }
          }}
          onSettingsClick={() => {
            setScreen({ name: 'reminder-settings' });
            setActiveTab('home');
          }}
        />
      )}

      {screen.name === 'mark-spot' && (
        <MarkSpotScreen
          onConfirm={(sessionId: string) => {
            setLastSessionId(sessionId);
            setScreen({ name: 'dashboard' });
            setActiveTab('home');
          }}
          onHomeClick={() => {
            setScreen({ name: 'dashboard' });
            setActiveTab('home');
          }}
          onParkClick={() => {
            setScreen({ name: 'mark-spot' });
            setActiveTab('scan');
          }}
          onCheckClick={() => {
            setScreen({ name: 'scan' });
            setActiveTab('scan');
          }}
          onSettingsClick={() => {
            setScreen({ name: 'reminder-settings' });
            setActiveTab('home');
          }}
        />
      )}

      {screen.name === 'reminder-settings' && (
        <ReminderSettingsScreen
          onBack={() => {
            setScreen({ name: 'dashboard' });
            setActiveTab('home');
          }}
          onHomeClick={() => {
            setScreen({ name: 'dashboard' });
            setActiveTab('home');
          }}
          onParkClick={() => {
            setScreen({ name: 'mark-spot' });
            setActiveTab('scan');
          }}
          onCheckClick={() => {
            setScreen({ name: 'scan' });
            setActiveTab('scan');
          }}
          onSettingsClick={() => {
            setScreen({ name: 'reminder-settings' });
          }}
        />
      )}

      {screen.name === 'scan' && (
        <ScanScreen onAnalysisComplete={handleAnalysisComplete} />
      )}

      {screen.name === 'analysis' && (
        <AnalysisResult
          analysis={screen.analysis}
          onSessionStart={handleSessionStart}
          onRescan={() => {
            setScreen({ name: 'scan' });
            setActiveTab('scan');
          }}
        />
      )}

      {screen.name === 'active-session' && (
        <ActiveSession sessionId={screen.sessionId} onStopSession={handleStopSession} />
      )}

      {screen.name !== 'dashboard' && screen.name !== 'mark-spot' && screen.name !== 'reminder-settings' && (
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      )}

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
                <h4 className="text-title-sm font-semibold mb-2">Monitor Your Session</h4>
                <p className="text-body-md text-on-surface-variant">
                  View your active parking session in the Activity tab. A countdown timer shows remaining time, and a map displays your parking location.
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
