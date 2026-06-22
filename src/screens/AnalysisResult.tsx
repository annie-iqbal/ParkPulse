import { useState } from 'react';

import { ParkingAnalysis } from '../types';

interface AnalysisResultProps {
  analysis: ParkingAnalysis;
}
function getVerdictColor(canPark: boolean) {
  return canPark ? 'tertiary' : 'error';
}

function getVerdictIcon(canPark: boolean) {
  return canPark ? 'check_circle' : 'error';
}

export function AnalysisResult({ analysis }: AnalysisResultProps) {
  const [reminderEnabled, setReminderEnabled] = useState(true);

  return (
    <main className="flex-grow w-full max-w-[600px] mx-auto px-margin-mobile pb-32 pt-lg">
      {/* Header Section with Breadcrumb */}
      <section className="mb-xl">
        <nav className="flex items-center gap-xs mb-md text-on-surface-variant text-label-sm">
          <span>Analysis</span>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-primary font-semibold">Result</span>
        </nav>
        <h1 className="text-display-status-mobile font-extrabold mb-sm text-on-surface">
          {analysis.verdict}
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">{analysis.description}</p>
      </section>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-lg">
        {/* Success Status Card - Full Width or Half */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl flex flex-col items-center justify-center relative overflow-hidden shadow-sm md:col-span-1">
          <div className={`absolute top-0 left-0 w-full h-1 ${analysis.canPark ? 'bg-tertiary-container' : 'bg-error'}`} />
          
          <div className="relative mb-xl mt-lg">
            <div className={`absolute inset-0 ${analysis.canPark ? 'bg-tertiary-container' : 'bg-error'} opacity-20 rounded-full animate-pulse-subtle scale-150`}></div>
            <div className={`w-24 h-24 ${analysis.canPark ? 'bg-tertiary-container' : 'bg-error-container'} rounded-full flex items-center justify-center relative z-10`}>
              <span 
                className="material-symbols-outlined text-headline-lg"
                style={{
                  color: analysis.canPark ? '#ffffff' : '#93000a',
                  fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 24"
                }}
              >
                {getVerdictIcon(analysis.canPark)}
              </span>
            </div>
          </div>

          <h2 className="text-headline-md font-bold text-on-surface mb-xs text-center">
            {analysis.canPark ? 'Safe to Park' : 'Cannot Park'}
          </h2>
          <p className="text-label-sm text-on-surface-variant text-center">
            {analysis.canPark ? 'Permitted until' : 'Restricted until'}{' '}
            <span className="text-primary font-bold">{analysis.until ?? 'Unknown'}</span>
          </p>

          <button 
            onClick={() => !analysis.canPark || setReminderEnabled(!reminderEnabled)}
            disabled={!analysis.canPark}
            className={`w-full mt-lg py-3 rounded-lg font-label-md flex items-center justify-center gap-sm shadow-md transition-all active:scale-95 ${
              analysis.canPark 
                ? reminderEnabled ? 'bg-primary text-on-primary hover:opacity-90' : 'bg-surface-container-high text-on-surface-variant hover:opacity-90'
                : 'bg-surface-container-high text-on-surface-variant opacity-50 cursor-not-allowed'
            }`}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{reminderEnabled ? 'notifications_active' : 'notifications_off'}</span>
            {analysis.canPark ? (reminderEnabled ? 'Reminder ON' : 'Reminder OFF') : 'Set Reminder'}
          </button>
        </div>

        {/* Rules & Details Card */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-lg shadow-sm md:col-span-1">
          <div className="flex items-start justify-between mb-lg">
            <div>
              <p className="text-label-sm text-on-surface-variant mb-xs font-semibold">Zone Regulations</p>
              <h3 className="text-headline-md font-bold text-on-surface">
                {analysis.maxDuration || 'No Limit'}
              </h3>
            </div>
            <div className="bg-surface-bright p-md rounded-lg border border-outline-variant">
              <span className="material-symbols-outlined text-primary">schedule</span>
            </div>
          </div>

          <div className="space-y-md">
            {analysis.maxDuration && (
              <div className="flex items-center gap-md">
                <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>timer</span>
                </div>
                <div>
                  <p className="text-label-lg font-semibold text-on-surface">Maximum Duration</p>
                  <p className="text-on-surface-variant text-label-sm">Standard limit for parking in this zone</p>
                </div>
              </div>
            )}
            {analysis.contextCards.length > 0 && (
              <div className="flex items-center gap-md">
                <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>info</span>
                </div>
                <div>
                  <p className="text-label-lg font-semibold text-on-surface">Active Hours</p>
                  <p className="text-on-surface-variant text-label-sm">{analysis.contextCards[0]?.description || 'Check local regulations'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Location Card */}
      {analysis.location && analysis.location !== 'Unknown location' && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg mb-lg flex items-start gap-md shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-primary-fixed-dim flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>location_on</span>
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant font-semibold mb-xs">Current Area</p>
            <h4 className="text-headline-sm font-bold text-on-surface">{analysis.location}</h4>
          </div>
        </div>
      )}

      {/* Regulatory Breakdown */}
      {analysis.regulatoryBreakdown.length > 0 && (
        <div className="bg-surface-container-low rounded-xl p-lg mb-lg border border-outline-variant">
          <h3 className="text-headline-sm font-bold text-on-surface mb-md">Regulatory Breakdown</h3>
          <ul className="space-y-md">
            {analysis.regulatoryBreakdown.slice(0, 4).map((item, i) => (
              <li key={i} className="flex items-start gap-md">
                <div className="flex-shrink-0 mt-1">
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{
                      color: item.status === 'ok' ? '#228B22' : item.status === 'error' ? '#ba1a1a' : item.status === 'warning' ? '#b3661f' : '#554336',
                      fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                    }}
                  >
                    {item.status === 'ok' ? 'check_circle' : item.status === 'error' ? 'cancel' : item.status === 'warning' ? 'warning' : 'info'}
                  </span>
                </div>
                <div>
                  <p className="text-label-lg font-semibold text-on-surface">{item.title}</p>
                  <p className="text-on-surface-variant text-label-sm">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sign Text (Collapsible) */}
      {analysis.rawSignText && (
        <details className="bg-surface-container-lowest rounded-xl border border-outline-variant mb-lg group">
          <summary className="p-lg flex items-center justify-between cursor-pointer select-none list-none hover:bg-surface-container-low transition-colors">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>text_snippet</span>
              <span className="text-label-lg font-semibold text-on-surface">Sign Text (Transcribed)</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="px-lg pb-lg border-t border-outline-variant">
            <p className="text-label-sm text-on-surface-variant bg-surface-container p-md rounded-lg font-mono whitespace-pre-wrap">
              {analysis.rawSignText}
            </p>
          </div>
        </details>
      )}


    </main>
  );
}
