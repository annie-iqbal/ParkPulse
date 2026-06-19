type Tab = 'check' | 'settings';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] flex justify-around items-center py-sm px-md pb-safe bg-surface rounded-t-xl shadow-[0_-2px_10px_rgba(100,116,139,0.12)] z-50">
      <NavItem
        icon="search"
        label="Check"
        active={activeTab === 'check'}
        onClick={() => onTabChange('check')}
        filled={activeTab === 'check'}
      />
      <NavItem
        icon="settings"
        label="Settings"
        active={activeTab === 'settings'}
        onClick={() => onTabChange('settings')}
        filled={activeTab === 'settings'}
      />
    </nav>
  );
}

interface NavItemProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  filled?: boolean;
}

function NavItem({ icon, label, active, onClick, filled }: NavItemProps) {
  if (active) {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center justify-center bg-primary text-on-primary rounded-full px-5 py-1 active:scale-90 transition-all duration-200 min-w-[72px]"
      >
        <span
          className="material-symbols-outlined text-[22px]"
          style={filled ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
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
      className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary active:scale-90 transition-all duration-200 min-w-[72px] py-1"
    >
      <span className="material-symbols-outlined text-[22px]">{icon}</span>
      <span className="text-label-sm font-medium mt-0.5">{label}</span>
    </button>
  );
}
