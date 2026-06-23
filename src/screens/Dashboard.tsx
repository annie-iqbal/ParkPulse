import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CarFront,
  Clock3,
  Home,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  Settings,
  Trash2,
  User,
} from 'lucide-react';
import { ParkingSession, supabase } from '../lib/supabase';
import { getReminderSettings } from '../lib/reminderSettings';
import { AppHeader } from '../components/layout/AppHeader';
import { AppScreenShell } from '../components/layout/AppScreenShell';

interface DashboardProps {
  onParkMyCar?: () => void;
  onViewAllHistory?: () => void;
  onFindParking?: () => void;
  onSettingsClick?: () => void;
  isVisible?: boolean;
  activeTab?: 'home' | 'park' | 'check' | 'settings';
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMins = Math.floor(ms / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function formatHistoryDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function calculateDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const diffMs = Math.max(0, end - start);
  const totalMins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function toPublicImageUrl(url: string): string {
  if (url.includes('/storage/v1/object/public/')) {
    return url;
  }

  if (url.includes('/storage/v1/object/')) {
    return url.replace('/storage/v1/object/', '/storage/v1/object/public/');
  }

  return url;
}

function extractParkingLevel(description?: string | null): string | null {
  if (!description) return null;

  const levelMatch = description.match(/\b(level|lvl|floor|fl)\s*[:#-]?\s*([a-z]?\d+[a-z]?|\d+[a-z]?|[a-z])\b/i);
  if (levelMatch) {
    const label = levelMatch[1].toLowerCase().startsWith('f') ? 'Floor' : 'Level';
    return `${label} ${levelMatch[2].toUpperCase()}`;
  }

  const sectionMatch = description.match(/\b(section|zone|area)\s*[:#-]?\s*([a-z]?\d+[a-z]?|\d+[a-z]?|[a-z])\b/i);
  if (sectionMatch) {
    const label = sectionMatch[1][0].toUpperCase() + sectionMatch[1].slice(1).toLowerCase();
    return `${label} ${sectionMatch[2].toUpperCase()}`;
  }

  return null;
}

const HISTORY_PAGE_SIZE = 10;
const WALKING_SPEED_METERS_PER_SECOND = 1.4;
const LIVE_POSITION_UPDATE_THRESHOLD_METERS = 30;
const LAST_POSITION_STORAGE_KEY = 'parkpulse:last-position';

type LivePosition = {
  lat: number;
  lng: number;
};

function getDistanceMeters(start: LivePosition, end: LivePosition): number {
  const earthRadiusMeters = 6371000;
  const startLat = start.lat * Math.PI / 180;
  const endLat = end.lat * Math.PI / 180;
  const latDiff = (end.lat - start.lat) * Math.PI / 180;
  const lngDiff = (end.lng - start.lng) * Math.PI / 180;
  const a = Math.sin(latDiff / 2) ** 2 + Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDiff / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatWalkDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    const roundedMeters = Math.round(distanceMeters / 10) * 10;
    return roundedMeters < 10 ? '<10 m' : `${roundedMeters} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatWalkDuration(minutes: number): string {
  return `${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
}

function getParkingReminderMessage(minutesLeft: number, isExpired: boolean): string {
  if (isExpired) {
    return 'Parking time has ended. You may be over the allowed time; extra charges or a fine may apply.';
  }

  if (minutesLeft < 1) {
    return 'Less than 1 min left. Parking time is almost over; move or extend now to avoid extra charges or a fine.';
  }

  return `${formatWalkDuration(minutesLeft)} left. Parking time is almost over; move or extend soon to avoid extra charges or a fine.`;
}

function shouldUpdateLivePosition(currentPosition: LivePosition | null, nextPosition: LivePosition): boolean {
  return !currentPosition || getDistanceMeters(currentPosition, nextPosition) >= LIVE_POSITION_UPDATE_THRESHOLD_METERS;
}

function getCachedLivePosition(): LivePosition | null {
  try {
    const cached = window.localStorage.getItem(LAST_POSITION_STORAGE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as LivePosition;
    if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function cacheLivePosition(position: LivePosition) {
  window.localStorage.setItem(LAST_POSITION_STORAGE_KEY, JSON.stringify(position));
}

function HistoryThumbnail({ session }: { session: ParkingSession }) {
  const isDark = document.documentElement.classList.contains('dark');
  
  if (session.image_url) {
    return <img src={toPublicImageUrl(session.image_url)} alt={session.location} className="w-[68px] h-[68px] rounded-[8px] object-cover" />;
  }

  return (
    <div className={`relative w-[68px] h-[68px] rounded-[8px] overflow-hidden ${isDark ? 'bg-[#333] border-[#555]' : 'bg-[#DDE8EA] border-[#CDBEB2]'} border`}>
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            'linear-gradient(0deg, rgba(255,255,255,0.65) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.65) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      {session.lat && session.lng && (
        <div className={`absolute left-1 top-1 rounded px-1 py-0.5 text-[8px] font-semibold ${isDark ? 'bg-[#333]/85 text-[#ddd]' : 'bg-white/85 text-[#5F514A]'}`}>
          {session.lat.toFixed(2)}, {session.lng.toFixed(2)}
        </div>
      )}
      <MapPin className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#D97706] drop-shadow" size={26} fill="#D97706" />
    </div>
  );
}

export function Dashboard({ onParkMyCar, onSettingsClick, isVisible = true, activeTab = 'home' }: DashboardProps) {
  const [activeSession, setActiveSession] = useState<ParkingSession | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [historyItems, setHistoryItems] = useState<ParkingSession[]>([]);
  const [dismissedReminderSessionId, setDismissedReminderSessionId] = useState<string | null>(null);
  const [notifiedReminderSessionId, setNotifiedReminderSessionId] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [swipedHistoryId, setSwipedHistoryId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [showNavigationMap, setShowNavigationMap] = useState(false);
  const [showNavigationPopup, setShowNavigationPopup] = useState(false);
  const [livePosition, setLivePosition] = useState<LivePosition | null>(null);
  const [navigationStatus, setNavigationStatus] = useState('Waiting for live location...');
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const lastRoutePositionRef = useRef<LivePosition | null>(null);
  const navigationHistoryPushedRef = useRef(false);

  // Load dark mode setting on mount
  useEffect(() => {
    const saved = localStorage.getItem('parkwise_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      setDarkMode(settings.darkMode ?? false);
    }

    // Listen for dark mode changes
    const handleDarkModeChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setDarkMode(customEvent.detail);
    };

    window.addEventListener('darkModeToggled', handleDarkModeChange);
    return () => window.removeEventListener('darkModeToggled', handleDarkModeChange);
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      // Load active session
      const { data: activeSessions } = await supabase
        .from('parking_sessions')
        .select('*')
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1);

      if (activeSessions && activeSessions.length > 0) {
        setActiveSession(activeSessions[0]);
        setRemainingMs(
          Math.max(0, new Date(activeSessions[0].expires_at).getTime() - Date.now())
        );
      } else {
        setActiveSession(null);
        setRemainingMs(0);
      }

      // Load history (cancelled or expired sessions)
      const { data: history } = await supabase
        .from('parking_sessions')
        .select('*')
        .in('status', ['cancelled', 'expired'])
        .order('ended_at', { ascending: false })
        .range(0, HISTORY_PAGE_SIZE - 1);

      if (history) {
        setHistoryItems(history);
        setHasMoreHistory(history.length === HISTORY_PAGE_SIZE);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [isVisible, activeTab, loadSessions]);

  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      setRemainingMs(Math.max(0, new Date(activeSession.expires_at).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    setShowNavigationMap(false);
    setShowNavigationPopup(false);
    setLivePosition(null);
  }, [activeSession?.id]);

  useEffect(() => {
    if (!showNavigationPopup) return;

    if (!navigationHistoryPushedRef.current) {
      window.history.pushState({ parkPulseNavigationOpen: true }, '', window.location.href);
      navigationHistoryPushedRef.current = true;
    }

    function handlePopState() {
      navigationHistoryPushedRef.current = false;
      closeNavigationPopup(false);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showNavigationPopup]);

  useEffect(() => {
    if (!activeSession) return;

    const cachedPosition = getCachedLivePosition();
    if (cachedPosition) {
      setLivePosition(cachedPosition);
      lastRoutePositionRef.current = cachedPosition;
      setNavigationStatus('Using recent location while refreshing GPS');
    }

    if (!navigator.geolocation) {
      setNavigationStatus('Live location is not supported on this device.');
      return;
    }

    setNavigationStatus('Updating from your live location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (!shouldUpdateLivePosition(lastRoutePositionRef.current, currentPosition)) {
          setNavigationStatus('Using stable location; ignoring small GPS drift');
          return;
        }

        cacheLivePosition(currentPosition);
        lastRoutePositionRef.current = currentPosition;
        setLivePosition(currentPosition);
        setNavigationStatus('Live route updated from your current location');
      },
      () => {
        if (!cachedPosition) {
          setNavigationStatus('Allow location access to calculate walk time.');
        }
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 4000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
        const lastPosition = lastRoutePositionRef.current;
        const movedEnough = shouldUpdateLivePosition(lastPosition, nextPosition);

        if (movedEnough) {
          cacheLivePosition(nextPosition);
          lastRoutePositionRef.current = nextPosition;
          setLivePosition(nextPosition);
          setNavigationStatus('Live route updated from your current location');
        } else {
          setNavigationStatus('Using stable location; ignoring small GPS drift');
        }
      },
      () => {
        setNavigationStatus('Allow location access to update route while moving.');
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeSession?.id]);

  async function handleReachedMyCar() {
    if (!activeSession) return;
    const endedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('parking_sessions')
      .update({ status: 'cancelled', ended_at: endedAt })
      .eq('id', activeSession.id);

    if (updateError) {
      console.error('Error ending session:', updateError);
      return;
    }

    // Reload sessions to ensure state is fresh
    await loadSessions();
  }

  function closeNavigationPopup(syncHistory = true) {
    if (syncHistory && navigationHistoryPushedRef.current) {
      navigationHistoryPushedRef.current = false;
      window.history.back();
    }

    setShowNavigationPopup(false);
    setShowNavigationMap(false);
    setLivePosition(null);
    setNavigationStatus('Waiting for live location...');
  }

  function closeFullImageViewer() {
    setFullImageUrl(null);
  }

  useEffect(() => {
    if (!fullImageUrl) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeFullImageViewer();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fullImageUrl]);

  async function fetchNextHistoryPage() {
    if (isLoadingMoreHistory || !hasMoreHistory) return;
    setIsLoadingMoreHistory(true);

    const from = historyItems.length;
    const to = from + HISTORY_PAGE_SIZE - 1;
    const { data } = await supabase
      .from('parking_sessions')
      .select('*')
      .in('status', ['cancelled', 'expired'])
      .order('ended_at', { ascending: false })
      .range(from, to);

    if (data) {
      setHistoryItems((prev) => [...prev, ...data.filter((item) => !prev.some((existing) => existing.id === item.id))]);
      setHasMoreHistory(data.length === HISTORY_PAGE_SIZE);
    }

    setIsLoadingMoreHistory(false);
  }

  function handleHistoryScroll(event: React.UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 40;
    if (nearBottom) {
      fetchNextHistoryPage();
    }
  }

  async function handleDeleteHistoryItem(sessionId: string) {
    const confirmed = window.confirm('Delete this parking history item?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('parking_sessions')
      .delete()
      .eq('id', sessionId);

    if (!error) {
      setHistoryItems((prev) => prev.filter((item) => item.id !== sessionId));
      setSwipedHistoryId(null);
    }
  }

  const isParked = Boolean(activeSession);
  const minutesLeft = Math.max(0, Math.floor(remainingMs / 60000));
  const isParkingExpired = Boolean(activeSession && remainingMs <= 0);
  const reminderMessage = getParkingReminderMessage(minutesLeft, isParkingExpired);
  const reminderSettings = getReminderSettings();
  const shouldShowReminder = Boolean(
    activeSession &&
    activeSession.reminder_enabled &&
    reminderSettings.enabled &&
    (isParkingExpired || (remainingMs > 0 && remainingMs <= reminderSettings.leadMinutes * 60 * 1000)) &&
    dismissedReminderSessionId !== activeSession.id
  );

  useEffect(() => {
    if (!activeSession || !shouldShowReminder || notifiedReminderSessionId === activeSession.id) return;

    setNotifiedReminderSessionId(activeSession.id);

    if (document.visibilityState !== 'visible' && 'Notification' in window) {
      const body = reminderMessage;
      if (Notification.permission === 'granted') {
        new Notification('Parking reminder', { body });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification('Parking reminder', { body });
          }
        });
      }
    }
  }, [activeSession, shouldShowReminder, notifiedReminderSessionId, reminderMessage]);

  const parkingMapUrl = useMemo(() => {
    if (!activeSession) return null;

    if (typeof activeSession.lat !== 'number' || typeof activeSession.lng !== 'number') {
      return `https://maps.google.com/maps?q=${encodeURIComponent(activeSession.location)}&output=embed`;
    }

    const lat = activeSession.lat;
    const lng = activeSession.lng;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${(lng - 0.005).toFixed(4)},${(lat - 0.005).toFixed(4)},${(lng + 0.005).toFixed(4)},${(lat + 0.005).toFixed(4)}&layer=mapnik&marker=${lat},${lng}`;
  }, [activeSession]);

  const navigationMapUrl = useMemo(() => {
    if (!activeSession) return null;

    const destination =
      typeof activeSession.lat === 'number' && typeof activeSession.lng === 'number'
        ? `${activeSession.lat},${activeSession.lng}`
        : activeSession.location;

    const params = new URLSearchParams({
      daddr: destination,
      output: 'embed',
    });

    if (livePosition) {
      params.set('saddr', `${livePosition.lat},${livePosition.lng}`);
    }

    return `https://maps.google.com/maps?${params.toString()}`;
  }, [activeSession, livePosition]);

  const activeMapUrl = showNavigationMap ? navigationMapUrl : parkingMapUrl;
  const activeVisualReferenceUrl = activeSession?.image_url ? toPublicImageUrl(activeSession.image_url) : null;
  const parkingLevelLabel = useMemo(() => extractParkingLevel(activeSession?.spot_note), [activeSession?.spot_note]);
  const parkedPosition = useMemo(() => {
    if (typeof activeSession?.lat !== 'number' || typeof activeSession?.lng !== 'number') return null;
    return { lat: activeSession.lat, lng: activeSession.lng };
  }, [activeSession]);
  const estimatedWalkText = useMemo(() => {
    if (!parkedPosition) return 'Location saved';
    if (!livePosition) return 'Getting GPS...';

    const distanceMeters = getDistanceMeters(livePosition, parkedPosition);
    const displayDistanceMeters = distanceMeters < 1000 ? Math.round(distanceMeters / 10) * 10 : distanceMeters;
    const walkMinutes = Math.max(1, Math.ceil(displayDistanceMeters / WALKING_SPEED_METERS_PER_SECOND / 60));
    return `${formatWalkDuration(walkMinutes)} • ${formatWalkDistance(distanceMeters)}`;
  }, [livePosition, parkedPosition]);
  const isEstimatedWalkStatus = estimatedWalkText === 'Location saved' || estimatedWalkText === 'Getting GPS...';

  const displayedHistoryItems = showAllHistory ? historyItems : historyItems.slice(0, 3);

  return (
    <AppScreenShell darkMode={darkMode}>
      <AppHeader darkMode={darkMode} />

        <section className="p-5">
          {!isParked && (
            <div className="rounded-[12px] bg-gradient-to-br from-[#E88816] via-[#C66709] to-[#A94E09] px-5 sm:px-6 pt-9 pb-8 text-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_16px_24px_rgba(69,26,3,0.16)]">
              <div className={`mx-auto w-24 h-24 rounded-xl ${darkMode ? 'bg-[#5c3d1f]' : 'bg-[#E4A46B]/65'} flex items-center justify-center mb-7`}>
                <CarFront size={42} strokeWidth={2.1} className={darkMode ? 'text-[#ffb84d]' : 'text-white'} />
              </div>

              <p className="text-[12px] leading-none font-medium text-white/95">Current Status</p>
              <h2 className="mt-4 text-[56px] leading-[0.96] font-extrabold tracking-[-0.02em] text-white">Not Parked</h2>
              <p className="mt-6 text-[20px] leading-[1.35] text-white/93 font-normal max-w-[420px] mx-auto">
                Find the best available parking
                <br />
                spot near your destination.
              </p>

              <button
                onClick={onParkMyCar}
                className={`mt-8 w-full h-[72px] rounded-[10px] ${darkMode ? 'bg-[#333] border-[#444]' : 'bg-[#F5F5F5] border-[#D7D7D7]'} ${darkMode ? 'text-[#ff9800]' : 'text-[#D97706]'} border-[4px] flex items-center justify-center gap-3.5 font-semibold tracking-[0.12em] text-[14px] active:scale-[0.99] transition-transform`}
              >
                <span className="text-[36px] font-bold leading-none">P</span>
                <span className="text-[28px] leading-none">Park My Car</span>
              </button>
            </div>
          )}

          {isParked && (
            <div className="space-y-4">
              {shouldShowReminder && (
              <div className="rounded-[10px] bg-[#D97706] text-white px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Bell size={16} className="mt-0.5" />
                  <p className="text-[14px] font-semibold leading-tight">{reminderMessage}</p>
                </div>
                <button
                  onClick={() => activeSession && setDismissedReminderSessionId(activeSession.id)}
                  className="text-white/90 text-[20px] leading-none"
                  aria-label="Dismiss reminder"
                >
                  ×
                </button>
              </div>
              )}

              <div className={`rounded-[12px] border ${darkMode ? 'border-[#555] bg-[#2a2a2a]' : 'border-[#CDBEB2] bg-[#2F404C]'} p-3`}>
                <div className={`rounded-[10px] ${darkMode ? 'bg-[#333] text-[#ddd]' : 'bg-[#F6F2EE]'} px-3 py-2.5 mb-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-9 h-9 rounded-[8px] ${darkMode ? 'bg-[#ff9800]' : 'bg-[#D97706]'} text-white grid place-items-center`}>
                      <Navigation size={16} />
                    </span>
                    <div>
                      <p className={`text-[11px] font-semibold ${darkMode ? 'text-[#ffb84d]' : 'text-[#B66206]'}`}>Estimated Walk</p>
                      <p className={`${isEstimatedWalkStatus ? 'text-[13px]' : 'text-[16px]'} leading-none font-semibold ${darkMode ? 'text-[#ddd]' : 'text-[#251C18]'}`}>{estimatedWalkText}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowNavigationMap(false);
                      setShowNavigationPopup(true);
                    }}
                    className={`w-9 h-9 rounded-[8px] text-white grid place-items-center ${showNavigationMap ? (darkMode ? 'bg-[#2a2a2a]' : 'bg-[#2F404C]') : (darkMode ? 'bg-[#ff9800]' : 'bg-[#D97706]')}`}
                    aria-label="Open full screen navigation"
                  >
                    <Navigation size={16} />
                  </button>
                </div>

                {activeMapUrl ? (
                  <div className="relative rounded-[10px] h-[220px] overflow-hidden bg-[#d9e3ea]">
                    <iframe
                      title={showNavigationMap ? 'Navigation to parking location' : 'Parking location map'}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      src={activeMapUrl}
                      className="absolute inset-0"
                    />
                    {showNavigationMap && (
                      <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-[#2A1E17] shadow-sm">
                        Navigation view
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative rounded-[10px] h-[220px] overflow-hidden bg-gradient-to-br from-[#EDE9E3] via-[#DAE1E6] to-[#ADBCC8]">
                    <div className="absolute inset-0 opacity-70" style={{
                      backgroundImage:
                        'linear-gradient(0deg, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                      backgroundSize: '34px 34px',
                    }} />
                    <MapPin className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#D97706]" size={30} />
                  </div>
                )}

                <div className="mt-3 flex justify-end">
                  <span className={`inline-flex items-center gap-1.5 rounded-[8px] ${darkMode ? 'bg-[#333] text-[#ddd]' : 'bg-[#F6F2EE] text-[#2C211B]'} px-3 py-2 text-[13px] font-semibold`}>
                    <Clock3 size={14} className="text-[#D97706]" /> {formatRemaining(remainingMs)} left
                  </span>
                </div>
              </div>

              <div className={`rounded-[10px] border ${darkMode ? 'border-[#555] bg-[#2a2a2a]' : 'border-[#CDBEB2] bg-[#F8F5F2]'} p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`text-[18px] font-semibold ${darkMode ? 'text-[#e0e0e0]' : 'text-[#2A1E17]'}`}>Parking Location</h4>
                  {parkingLevelLabel && (
                    <span className={`rounded-full ${darkMode ? 'bg-[#664D00] text-[#ffb84d]' : 'bg-[#F4D5A8] text-[#A95E05]'} px-2.5 py-1 text-[10px] font-semibold`}>
                      {parkingLevelLabel}
                    </span>
                  )}
                </div>
                <p className={`text-[14px] ${darkMode ? 'text-[#999]' : 'text-[#514139]'} flex items-center gap-1.5`}><LocateFixed size={14} className="text-[#D97706]" /> {activeSession?.location ?? 'Saved parking location'}</p>
                <p className={`mt-2 text-[13px] ${darkMode ? 'text-[#777]' : 'text-[#6B5A51]'} flex items-center gap-1.5`}>
                  <Clock3 size={14} className="text-[#D97706]" /> Parked on {activeSession ? new Date(activeSession.started_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                </p>
                <div className={`mt-3 rounded-[8px] ${darkMode ? 'bg-[#333] text-[#aaa]' : 'bg-[#E9E7EE] text-[#4E4A57]'} px-4 py-3 text-[14px] italic leading-[1.4]`}>
                  {activeSession?.spot_note ? `"${activeSession.spot_note}"` : '"Spot details were saved when you marked your car."'}
                </div>
              </div>

              {activeVisualReferenceUrl && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-[13px] font-semibold text-[#3A302B]">Visual Reference</h4>
                    <button
                      onClick={() => setFullImageUrl(activeVisualReferenceUrl)}
                      className="text-[#D97706] text-[13px] font-semibold"
                    >
                      View Full
                    </button>
                  </div>
                  <div className="rounded-[10px] border border-[#CDBEB2] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFullImageUrl(activeVisualReferenceUrl)}
                      className="block w-full text-left"
                      aria-label="Open visual reference full screen"
                    >
                      <img src={activeVisualReferenceUrl} alt="Parking spot visual reference" className="w-full h-[160px] object-cover" />
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleReachedMyCar}
                className="w-full h-[50px] rounded-[10px] bg-[#D97706] text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_18px_rgba(69,26,3,0.22)] active:scale-[0.99] transition-transform tracking-[0.02em]"
              >
                Mark Reached My Car
              </button>
            </div>
          )}

          {!isParked && (
            <>
              <div className="mt-7 flex items-center justify-between">
                <h3 className={`text-[20px] leading-none font-semibold ${darkMode ? 'text-[#e0e0e0]' : 'text-[#2A1E17]'}`}>Recent History</h3>
                <button
                  onClick={() => {
                    setShowAllHistory(true);
                  }}
                  className={`text-[13px] font-medium ${darkMode ? 'text-[#ffb84d]' : 'text-[#D97706]'}`}
                >
                  View All
                </button>
              </div>

              <div
                onScroll={showAllHistory ? handleHistoryScroll : undefined}
                className={`mt-3.5 space-y-3 ${showAllHistory ? 'max-h-[520px] overflow-y-auto pr-1' : ''}`}
              >
                {historyItems.length === 0 ? (
                  <p className={`text-center py-8 text-[14px] ${darkMode ? 'text-[#777]' : 'text-[#8B7A70]'}`}>No parking history yet</p>
                ) : (
                  displayedHistoryItems.map((session) => (
                    <div key={session.id} className="relative overflow-hidden rounded-lg">
                      <button
                        onClick={() => handleDeleteHistoryItem(session.id)}
                        className="absolute right-0 inset-y-0 w-12 bg-[#DC2626] text-white grid place-items-center"
                        aria-label="Delete history item"
                      >
                        <Trash2 size={18} />
                      </button>
                      <article
                      onTouchStart={(event) => setTouchStartX(event.touches[0].clientX)}
                      onTouchEnd={(event) => {
                        if (touchStartX === null) return;
                        const deltaX = touchStartX - event.changedTouches[0].clientX;
                        setSwipedHistoryId(deltaX > 45 ? session.id : null);
                        setTouchStartX(null);
                      }}
                      className={`relative ${darkMode ? 'bg-[#2a2a2a] border-[#444]' : 'bg-[#F7F7F7] border-[#CDBEB2]'} border rounded-lg px-4 py-3.5 flex items-center gap-3.5 transition-transform ${swipedHistoryId === session.id ? '-translate-x-12' : 'translate-x-0'}`}
                    >
                      <HistoryThumbnail session={session} />

                      <div className="min-w-0 flex-1">
                        <h4 className={`text-[15px] leading-tight font-semibold truncate ${darkMode ? 'text-[#e0e0e0]' : 'text-[#2A1E17]'}`}>{session.location}</h4>
                        <p className={`mt-1.5 text-[13px] leading-[1.25] ${darkMode ? 'text-[#888]' : 'text-[#5E4D43]'}`}>
                          {formatHistoryDate(session.started_at)} • {calculateDuration(session.started_at, session.ended_at || new Date().toISOString())}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className={`text-[15px] leading-none font-bold ${darkMode ? 'text-[#e0e0e0]' : 'text-[#2A1E17]'}`}>${(session.payment_due ?? 0).toFixed(2)}</p>
                        <span className={`inline-flex mt-1.5 px-3 py-0.5 rounded-full text-[11px] font-medium leading-none ${(session.payment_due ?? 0) > 0 ? (darkMode ? 'bg-[#664D00] text-[#FFD700]' : 'bg-[#FDE68A] text-[#A05A07]') : (darkMode ? 'bg-[#1a3a1a] text-[#4ade80]' : 'bg-[#DCFCE7] text-[#15803D]')}`}>
                          {(session.payment_due ?? 0) > 0 ? 'Paid' : 'Free'}
                        </span>
                      </div>
                    </article>
                    </div>
                  ))
                )}
                {showAllHistory && isLoadingMoreHistory && (
                  <p className={`text-center py-2 text-[13px] ${darkMode ? 'text-[#777]' : 'text-[#8B7A70]'}`}>Loading more...</p>
                )}
                {showAllHistory && !hasMoreHistory && historyItems.length > 0 && (
                  <p className={`text-center py-2 text-[13px] ${darkMode ? 'text-[#777]' : 'text-[#8B7A70]'}`}>No more history</p>
                )}
              </div>
            </>
          )}

        </section>

      <div className="sr-only">
        <User />
      </div>

      {showNavigationPopup && navigationMapUrl && (
        <div className="fixed inset-0 z-50 bg-[#101820]" role="dialog" aria-modal="true" aria-label="Full screen navigation">
          <iframe
            title="Live navigation to parking location"
            width="100%"
            height="100%"
            frameBorder="0"
            src={navigationMapUrl}
            className="absolute inset-x-0 top-0 bottom-[78px] h-[calc(100%-78px)]"
          />
          <button
            type="button"
            onClick={() => closeNavigationPopup()}
            className="absolute left-3 right-16 top-3 z-20 text-left touch-manipulation"
            aria-label="Close navigation from title"
          >
            <div className="rounded-[14px] bg-white/95 px-4 py-3 shadow-lg">
              <p className="text-[12px] font-semibold text-[#B66206]">Navigation</p>
              <p className="mt-1 text-[14px] font-semibold text-[#251C18] truncate">{activeSession?.location ?? 'Saved parking location'}</p>
              <p className="mt-1 text-[12px] text-[#5E4D43]">{navigationStatus}</p>
            </div>
          </button>
          <button
            type="button"
            onTouchStart={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeNavigationPopup();
            }}
            onMouseDownCapture={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeNavigationPopup();
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeNavigationPopup();
            }}
            onClickCapture={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeNavigationPopup();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeNavigationPopup();
            }}
            className="fixed right-3 top-3 z-[10000] w-12 h-12 rounded-full bg-black/85 text-white text-[30px] leading-none grid place-items-center shadow-xl touch-manipulation"
            style={{ zIndex: 2147483647, pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent' }}
            aria-label="Close navigation"
          >
            ×
          </button>
          <div className="absolute inset-x-0 bottom-0 z-20 border-t border-[#D7CCC2] h-[78px] bg-[#F4F0EC] px-8 flex items-center justify-between text-[#4B3A31] shadow-[0_-8px_22px_rgba(0,0,0,0.18)]">
            <button
              type="button"
              onClick={() => closeNavigationPopup()}
              className="flex flex-col items-center justify-center text-[#D97706]"
            >
              <Home size={20} />
              <span className="text-[11px] mt-1">Home</span>
            </button>
            <button
              type="button"
              onClick={() => {
                closeNavigationPopup();
                onParkMyCar?.();
              }}
              className="flex flex-col items-center justify-center text-[#4B3A31]"
            >
              <CarFront size={20} />
              <span className="text-[11px] mt-1">Park</span>
            </button>
            <button type="button" className="flex flex-col items-center justify-center text-[#4B3A31]">
              <Search size={20} />
              <span className="text-[11px] mt-1">Check</span>
            </button>
            <button
              type="button"
              onClick={() => {
                closeNavigationPopup();
                onSettingsClick?.();
              }}
              className="flex flex-col items-center justify-center text-[#4B3A31]"
            >
              <Settings size={20} />
              <span className="text-[11px] mt-1">Settings</span>
            </button>
          </div>
        </div>
      )}

      {fullImageUrl && (
        <div
          onClick={closeFullImageViewer}
          className="fixed left-0 top-0 z-[2147483647] h-dvh w-screen bg-black flex items-center justify-center cursor-zoom-out p-0"
          role="dialog"
          aria-modal="true"
          aria-label="Full visual reference"
        >
          <img
            src={fullImageUrl}
            alt="Full parking spot visual reference"
            className="h-full w-full object-cover object-center"
            onClick={(event) => event.stopPropagation()}
          />
          <button
            type="button"
            onClick={closeFullImageViewer}
            className="absolute right-4 top-4 w-11 h-11 rounded-full bg-black/75 text-white text-[30px] leading-none grid place-items-center shadow-xl border border-white/20"
            aria-label="Close full screen image"
          >
            ×
          </button>
        </div>
      )}
    </AppScreenShell>
  );
}
