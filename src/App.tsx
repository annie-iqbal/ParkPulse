import { useState } from 'react';
import { TopAppBar } from './components/TopAppBar';
import { BottomNav } from './components/BottomNav';
import { ScanScreen } from './screens/ScanScreen';
import { AnalysisResult } from './screens/AnalysisResult';
import { ActiveSession } from './screens/ActiveSession';
import { ParkingAnalysis } from './types';

type Tab = 'scan' | 'activity' | 'settings';

type Screen =
  | { name: 'scan' }
  | { name: 'analysis'; analysis: ParkingAnalysis }
  | { name: 'active-session'; sessionId: string };

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('scan');
  const [screen, setScreen] = useState<Screen>({ name: 'scan' });
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

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
    if (tab === 'scan') {
      setScreen({ name: 'scan' });
    } else if (tab === 'activity') {
      if (lastSessionId) {
        setScreen({ name: 'active-session', sessionId: lastSessionId });
      } else if (screen.name === 'analysis') {
        // stay on analysis
      } else {
        setScreen({ name: 'scan' });
      }
    }
    // settings tab: stay on current screen (not yet implemented)
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface font-sans">
      <TopAppBar />

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
        <ActiveSession sessionId={screen.sessionId} />
      )}

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
