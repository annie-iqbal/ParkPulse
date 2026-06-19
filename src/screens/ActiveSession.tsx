import { useState, useEffect, useCallback } from 'react';
import { supabase, ParkingSession } from '../lib/supabase';

interface ActiveSessionProps {
  sessionId: string;
  onStopSession?: () => void;
}

const RADIUS = 110;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TOTAL_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours in ms

function formatTime(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSecs = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatEndTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ActiveSession({ sessionId, onStopSession }: ActiveSessionProps) {
  const [session, setSession] = useState<ParkingSession | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [togglingReminder, setTogglingReminder] = useState(false);

  const loadSession = useCallback(async () => {
    const { data } = await supabase
      .from('parking_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (data) {
      setSession(data);
      setReminderEnabled(data.reminder_enabled);
      const now = Date.now();
      const expires = new Date(data.expires_at).getTime();
      setRemainingMs(Math.max(0, expires - now));
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Countdown tick
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      const expires = new Date(session.expires_at).getTime();
      const remaining = Math.max(0, expires - Date.now());
      setRemainingMs(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  async function toggleReminder() {
    if (togglingReminder || !session) return;
    setTogglingReminder(true);
    const next = !reminderEnabled;
    setReminderEnabled(next);
    await supabase
      .from('parking_sessions')
      .update({ reminder_enabled: next })
      .eq('id', sessionId);
    setTogglingReminder(false);
  }

  async function handleStopSession() {
    if (!session) return;
    // Update session status to cancelled
    await supabase
      .from('parking_sessions')
      .update({ status: 'cancelled' })
      .eq('id', sessionId);
    // Call the callback to navigate away
    onStopSession?.();
  }

  const progressPercent = TOTAL_DURATION_MS > 0 ? remainingMs / TOTAL_DURATION_MS : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progressPercent);

  return (
    <main className="flex-grow w-full max-w-[600px] mx-auto px-margin-mobile pb-32 pt-lg">
      {/* Status Card */}
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-[0_2px_10px_rgba(100,116,139,0.08)] relative overflow-hidden mb-lg">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />

        {/* Location Header */}
        <div className="flex items-start justify-between px-lg pt-lg pb-0">
          <div>
            <h2 className="text-headline-sm font-semibold text-on-surface mb-xs">Active Session</h2>
            <div className="flex items-center gap-xs text-on-surface-variant">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>location_on</span>
              <span className="text-label-lg font-semibold">
                {session?.location ?? '452 Market Street, Zone A'}
              </span>
            </div>
          </div>
          <div className="bg-primary text-on-primary px-md py-xs rounded-full text-label-sm font-semibold tracking-wider">
            PARKED
          </div>
        </div>

        {/* Circular Timer */}
        <div className="flex flex-col items-center justify-center py-lg px-lg">
          <div className="relative flex items-center justify-center" style={{ width: 256, height: 256 }}>
            <svg width="256" height="256" className="absolute">
              {/* Background ring */}
              <circle
                cx="128"
                cy="128"
                r={RADIUS}
                fill="transparent"
                stroke="#dce9ff"
                strokeWidth="8"
              />
              {/* Progress ring */}
              <circle
                cx="128"
                cy="128"
                r={RADIUS}
                fill="transparent"
                stroke="#004ac6"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                className="progress-ring-circle"
              />
            </svg>
            <div className="text-center z-10">
              <span className="block text-on-surface font-extrabold" style={{ fontSize: '44px', lineHeight: '48px', letterSpacing: '-0.02em' }}>
                {formatTime(remainingMs)}
              </span>
              <span className="text-label-lg text-on-surface-variant uppercase tracking-widest">Remaining</span>
            </div>
          </div>
        </div>

        {/* End Time Banner */}
        <div className="bg-surface-container-low rounded-lg mx-lg mb-lg p-md flex items-center justify-center gap-sm">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>schedule</span>
          <p className="text-body-md text-on-surface">
            Parked until{' '}
            <span className="font-bold">
              {session ? formatEndTime(session.expires_at) : '2:15 PM'}
            </span>
          </p>
        </div>
      </section>

      {/* Action Button */}
      <div className="mb-lg">
        <button 
          onClick={handleStopSession}
          className="w-full bg-surface-container-lowest border border-error p-lg rounded-xl flex items-center justify-center gap-md active:scale-95 transition-transform hover:bg-error/10"
        >
          <div className="w-12 h-12 rounded-full bg-error/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-error">stop_circle</span>
          </div>
          <span className="text-headline-sm font-semibold text-error">Stop Session</span>
        </button>
      </div>

      {/* Reminder Toggle */}
      <div className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant flex items-center justify-between mb-xl">
        <div className="flex items-center gap-md">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">notifications_active</span>
          </div>
          <div>
            <p className="text-label-lg font-semibold text-on-surface">15-min Reminder</p>
            <p className="text-label-sm text-on-surface-variant">Alert before time expires</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={reminderEnabled}
            onChange={toggleReminder}
          />
          <div className="w-11 h-6 bg-outline-variant rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
        </label>
      </div>

      {/* Map Visualization */}
      <div className="relative w-full h-48 rounded-xl overflow-hidden border border-outline-variant mb-xl group">
        {session?.lat && session?.lng ? (
          <>
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${(session.lng - 0.005).toFixed(4)},${(session.lat - 0.005).toFixed(4)},${(session.lng + 0.005).toFixed(4)},${(session.lat + 0.005).toFixed(4)}&layer=mapnik&marker=${session.lat},${session.lng}`}
              className="absolute inset-0"
            />
            <div className="absolute bottom-md left-md flex items-center gap-sm">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse-subtle shadow-[0_0_8px_rgba(0,74,198,0.8)]" />
              <span className="text-white text-label-lg font-semibold drop-shadow-md">Live Parking Location</span>
            </div>
          </>
        ) : (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{
                backgroundImage: `url('https://images.pexels.com/photos/1738985/pexels-photo-1738985.jpeg?auto=compress&cs=tinysrgb&w=800')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-md left-md flex items-center gap-sm">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse-subtle shadow-[0_0_8px_rgba(0,74,198,0.8)]" />
              <span className="text-white text-label-lg font-semibold">Live Parking Location</span>
            </div>
          </>
        )}
        <div className="absolute top-md right-md">
          <button className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-primary active:scale-90 transition-all hover:bg-surface-container-low">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>fullscreen</span>
          </button>
        </div>
      </div>
    </main>
  );
}
