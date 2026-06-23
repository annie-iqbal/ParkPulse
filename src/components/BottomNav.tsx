import { useState, useEffect } from 'react';

type Tab = 'home' | 'park' | 'check' | 'settings';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);

    const handleDarkModeChange = (e: StorageEvent) => {
      if (e.key === 'parkwise_settings') {
        const settings = JSON.parse(e.newValue || '{}');
        setDarkMode(settings.darkMode || false);
      }
    };

    const handleDarkModeToggled = (e: Event) => {
      const customEvent = e as CustomEvent;
      setDarkMode(customEvent.detail);
    };

    window.addEventListener('storage', handleDarkModeChange);
    window.addEventListener('darkModeToggled', handleDarkModeToggled);

    return () => {
      window.removeEventListener('storage', handleDarkModeChange);
      window.removeEventListener('darkModeToggled', handleDarkModeToggled);
    };
  }, []);

  return (
    <nav className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] flex justify-around items-center py-sm px-md pb-safe z-50 ${
      darkMode 
        ? 'bg-[#1a1a1a] border-t border-[#444]' 
        : 'bg-[#F4F0EC] border-t border-[#D7CCC2]'
    }`}>
      <NavItem
        icon="home"
        label="Home"
        active={activeTab === 'home'}
        onClick={() => onTabChange('home')}
        darkMode={darkMode}
      />
      <NavItem
        icon="directions_car"
        label="Park"
        active={activeTab === 'park'}
        onClick={() => onTabChange('park')}
        darkMode={darkMode}
      />
      <NavItem
        icon="search"
        label="Check"
        active={activeTab === 'check'}
        onClick={() => onTabChange('check')}
        darkMode={darkMode}
      />
      <NavItem
        icon="settings"
        label="Settings"
        active={activeTab === 'settings'}
        onClick={() => onTabChange('settings')}
        darkMode={darkMode}
      />
    </nav>
  );
}

interface NavItemProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  darkMode: boolean;
}

function NavItem({ icon, label, active, onClick, darkMode }: NavItemProps) {
  if (active) {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center justify-center text-[#D97706] active:scale-90 transition-all duration-200 min-w-[72px] py-1"
      >
        <span
          className="material-symbols-outlined text-[22px]"
          style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
        >
          {icon}
        </span>
        <span className="text-label-sm font-medium mt-0.5">{label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center active:scale-90 transition-all duration-200 min-w-[72px] py-1 ${
        darkMode
          ? 'text-[#999] hover:text-[#D97706]'
          : 'text-on-surface-variant hover:text-[#D97706]'
      }`}
    >
      <span className="material-symbols-outlined text-[22px]">{icon}</span>
      <span className="text-label-sm font-medium mt-0.5">{label}</span>
    </button>
  );
}
