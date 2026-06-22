import { useEffect, useState } from 'react';
import profileAvatar from '../assets/dashboard/profile-avatar.svg';

interface TopAppBarProps {}

export function TopAppBar({}: TopAppBarProps) {
  const [isInternetAvailable, setIsInternetAvailable] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isLocationAvailable, setIsLocationAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function refreshConnectivity() {
      if (!mounted) return;
      setIsInternetAvailable(navigator.onLine);

      if (!('geolocation' in navigator)) {
        setIsLocationAvailable(false);
        return;
      }

      try {
        if ('permissions' in navigator && navigator.permissions?.query) {
          const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          if (!mounted) return;

          if (permission.state === 'denied') {
            setIsLocationAvailable(false);
            return;
          }

          if (permission.state === 'granted') {
            navigator.geolocation.getCurrentPosition(
              () => mounted && setIsLocationAvailable(true),
              () => mounted && setIsLocationAvailable(false),
              { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
            );
            return;
          }

          setIsLocationAvailable(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          () => mounted && setIsLocationAvailable(true),
          () => mounted && setIsLocationAvailable(false),
          { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
        );
      } catch {
        setIsLocationAvailable(false);
      }
    }

    const handleConnectivityChange = () => {
      refreshConnectivity();
    };

    refreshConnectivity();
    window.addEventListener('online', handleConnectivityChange);
    window.addEventListener('offline', handleConnectivityChange);
    window.addEventListener('focus', handleConnectivityChange);

    return () => {
      mounted = false;
      window.removeEventListener('online', handleConnectivityChange);
      window.removeEventListener('offline', handleConnectivityChange);
      window.removeEventListener('focus', handleConnectivityChange);
    };
  }, []);

  const showOnlineTile = isInternetAvailable && isLocationAvailable;

  return (
    <header className="bg-surface w-full top-0 sticky border-b border-outline-variant z-50">
      <div className="flex justify-between items-center px-margin-mobile h-16 w-full max-w-[600px] mx-auto">
        <div className="flex items-center gap-sm">
          <div className="bg-black rounded-lg p-2 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>
              local_parking
            </span>
          </div>
          <span className="text-headline-md font-extrabold text-primary" style={{ fontSize: '22px', lineHeight: '28px' }}>
            ParkWise AI
          </span>
        </div>

        <div className="flex items-center gap-2">
          {showOnlineTile && (
            <div className="h-8 px-3 rounded-full border border-outline-variant bg-surface-container flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4CAF50]" />
              <span className="text-[12px] font-medium text-on-surface-variant">Online</span>
            </div>
          )}
          <img src={profileAvatar} alt="Profile" className="w-10 h-10 rounded-full border-2 border-[#D97706]/45" />
        </div>
      </div>
    </header>
  );
}
