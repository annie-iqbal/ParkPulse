import { useEffect, useState } from 'react';
import profileAvatar from '../../assets/dashboard/profile-avatar.svg';

interface AppHeaderProps {
  darkMode?: boolean;
}

export function AppHeader({ darkMode = false }: AppHeaderProps) {
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
    <header className={`h-[64px] px-4 sm:px-5 border-b ${darkMode ? 'border-[#444] bg-[#1f1f1f]' : 'border-[#D7CCC2] bg-[#F4F0EC]'} flex items-center justify-between`}>
      <div className={`flex items-center gap-2 ${darkMode ? 'text-[#E8A600]' : 'text-[#D97706]'}`}>
        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>
          local_parking
        </span>
        <h1 className="text-[24px] leading-none font-bold tracking-tight">
          <span>P</span>
        </h1>
        <span className="-ml-2 text-[24px] leading-none font-semibold">arkWise AI</span>
      </div>

      <div className="flex items-center gap-2">
        {showOnlineTile && (
          <div className={`h-8 px-3 rounded-full border ${darkMode ? 'border-[#555] bg-[#333]' : 'border-[#D4C8BE] bg-[#EEE8E1]'} flex items-center gap-2`}>
            <span className="w-2 h-2 rounded-full bg-[#4CAF50]" />
            <span className={`text-[12px] font-medium ${darkMode ? 'text-[#999]' : 'text-[#6B615B]'}`}>Online</span>
          </div>
        )}
        <img src={profileAvatar} alt="Profile" className="w-10 h-10 rounded-full border-2 border-[#D97706]/45" />
      </div>
    </header>
  );
}
