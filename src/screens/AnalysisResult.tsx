import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentPosition } from '../lib/geolocation';
import { ParkingAnalysis, RegulatoryItem } from '../types';

interface AnalysisResultProps {
  analysis: ParkingAnalysis;
  onSessionStart: (sessionId: string) => void;
  onRescan: () => void;
}

function RegulatoryIcon({ status }: { status: RegulatoryItem['status'] }) {
  if (status === 'ok') {
    return (
      <span
        className="material-symbols-outlined text-green-600 mt-0.5 flex-shrink-0"
        style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
      >
        check_circle
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span
        className="material-symbols-outlined text-error mt-0.5 flex-shrink-0"
        style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
      >
        cancel
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span
        className="material-symbols-outlined text-amber-500 mt-0.5 flex-shrink-0"
        style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
      >
        warning
      </span>
    );
  }
  return (
    <span className="material-symbols-outlined text-on-surface-variant mt-0.5 flex-shrink-0">info</span>
  );
}

export function AnalysisResult({ analysis, onSessionStart, onRescan }: AnalysisResultProps) {
  const [loading, setLoading] = useState(false);

  const borderColor = analysis.canPark ? 'border-t-green-500' : 'border-t-error';
  const verdictColor = analysis.canPark ? 'text-green-600' : 'text-error';
  const badgeBg = analysis.canPark ? 'bg-green-100 text-green-800' : 'bg-error-container text-on-error-container';

  async function handleStartSession() {
    if (!analysis.canPark) return;
    setLoading(true);

    const now = new Date();
    let expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours
    let lat: number | undefined;
    let lng: number | undefined;

    // Get current geolocation
    try {
      const position = await getCurrentPosition();
      lat = position.lat;
      lng = position.lng;
    } catch (err) {
      console.error('Failed to get geolocation:', err);
    }

    // Parse "maxDuration" if present, e.g. "4 Hours", "2 hours"
    if (analysis.maxDuration) {
      const match = analysis.maxDuration.match(/(\d+)\s*hour/i);
      if (match) {
        const hours = parseInt(match[1]);
        expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
      }
    } 
    // Fall back to "until" time if no maxDuration, e.g. "4:00 PM"
    else if (analysis.until) {
      const match = analysis.until.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        const [, h, m, period] = match;
        const candidate = new Date();
        candidate.setHours(
          parseInt(h) + (period.toUpperCase() === 'PM' && parseInt(h) !== 12 ? 12 : 0),
          parseInt(m),
          0,
          0
        );
        if (candidate > now) expiresAt = candidate;
      }
    }

    const { data, error } = await supabase
      .from('parking_sessions')
      .insert({
        location: analysis.location,
        zone: '',
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        reminder_enabled: true,
        status: 'active',
        lat,
        lng,
      })
      .select()
      .single();

    setLoading(false);
    if (!error && data) onSessionStart(data.id);
  }

  return (
    <main className="flex-grow w-full max-w-[600px] mx-auto px-margin-mobile pb-32 pt-lg">

      {/* Result Hero Card */}
      <section
        className={`bg-white rounded-xl shadow-[0_2px_10px_rgba(100,116,139,0.08)] border border-outline-variant mb-lg overflow-hidden border-t-4 ${borderColor} animate-fade-in-up`}
      >
        <div className="p-lg">
          <div className="flex items-center justify-between mb-sm">
            <span className={`text-label-sm px-3 py-1 rounded-full uppercase tracking-wider font-semibold ${badgeBg}`}>
              Analysis Complete
            </span>
            <span className="text-on-surface-variant text-label-sm">{analysis.analysisTime}</span>
          </div>
          <h1 className={`text-display-status-mobile font-extrabold mb-xs ${verdictColor}`}>
            {analysis.verdict}
          </h1>
          <p className="text-on-surface-variant text-body-md mb-lg">{analysis.description}</p>

          {(analysis.maxDuration || analysis.until) && (
            <div className="flex flex-wrap gap-sm">
              {analysis.maxDuration && (
                <div className="flex items-center gap-xs bg-surface-container px-3 py-2 rounded-lg border border-outline-variant">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>schedule</span>
                  <span className="text-label-lg font-semibold">Max {analysis.maxDuration}</span>
                </div>
              )}
              {analysis.until && (
                <div className="flex items-center gap-xs bg-surface-container px-3 py-2 rounded-lg border border-outline-variant">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>event_available</span>
                  <span className="text-label-lg font-semibold">Until {analysis.until}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Context Cards */}
      {analysis.contextCards.length > 0 && (
        <div className="grid grid-cols-2 gap-md mb-lg">
          {analysis.contextCards.map((card, i) => (
            <div
              key={i}
              className={`bg-white rounded-xl p-md border border-outline-variant shadow-sm flex items-start gap-md animate-fade-in-up ${card.colSpan === 2 ? 'col-span-2' : ''}`}
              style={{ animationDelay: `${(i + 1) * 60}ms` }}
            >
              <div
                className="p-3 rounded-lg flex-shrink-0"
                style={{ backgroundColor: card.iconBg ?? '#e5eeff' }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    color: card.iconColor ?? '#004ac6',
                    fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                  }}
                >
                  {card.icon}
                </span>
              </div>
              <div>
                <h3 className="text-headline-sm font-semibold mb-1">{card.title}</h3>
                <p className="text-on-surface-variant text-body-md">{card.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Location row */}
      {analysis.location && analysis.location !== 'Unknown location' && (
        <div className="flex items-center gap-sm bg-surface-container-low rounded-xl px-md py-sm border border-outline-variant mb-lg">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>location_on</span>
          <span className="text-label-lg text-on-surface-variant">{analysis.location}</span>
        </div>
      )}

      {/* Regulatory Breakdown */}
      {analysis.regulatoryBreakdown.length > 0 && (
        <div className="bg-surface-container-low rounded-xl p-lg border border-outline-variant mb-lg animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-headline-sm font-semibold mb-md">Regulatory Breakdown</h2>
          <ul className="space-y-md">
            {analysis.regulatoryBreakdown.map((item, i) => (
              <li key={i} className="flex items-start gap-md">
                <RegulatoryIcon status={item.status} />
                <div>
                  <p className="text-label-lg font-semibold">{item.title}</p>
                  <p className="text-on-surface-variant text-label-sm">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Raw sign text (collapsible) */}
      {analysis.rawSignText && (
        <details className="bg-white rounded-xl border border-outline-variant mb-lg group">
          <summary className="p-md flex items-center justify-between cursor-pointer select-none list-none">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>text_snippet</span>
              <span className="text-label-lg font-semibold">Sign Text (Transcribed)</span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="px-md pb-md">
            <p className="text-label-sm text-on-surface-variant bg-surface-container-low p-md rounded-lg font-mono whitespace-pre-wrap">
              {analysis.rawSignText}
            </p>
          </div>
        </details>
      )}

      {/* Action row */}
      <div className="flex gap-md">
        <button
          onClick={onRescan}
          className="flex-1 border border-outline-variant bg-white py-4 rounded-xl flex items-center justify-center gap-sm text-on-surface text-label-lg font-semibold hover:bg-surface-container-low active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>photo_camera</span>
          Scan Again
        </button>

        {analysis.canPark && (
          <button
            onClick={handleStartSession}
            disabled={loading}
            className="flex-[2] bg-primary py-4 rounded-xl flex items-center justify-center gap-sm text-on-primary text-headline-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg disabled:opacity-70"
          >
            <span className="material-symbols-outlined">timer</span>
            {loading ? 'Starting...' : 'Start Session'}
          </button>
        )}
      </div>
    </main>
  );
}
