import { Menu } from 'lucide-react';
import profileAvatar from '../../assets/dashboard/profile-avatar.svg';

interface AppHeaderProps {
  darkMode?: boolean;
}

export function AppHeader({ darkMode = false }: AppHeaderProps) {
  return (
    <header className={`h-[64px] px-4 sm:px-5 border-b ${darkMode ? 'border-[#444] bg-[#1f1f1f]' : 'border-[#D7CCC2] bg-[#F4F0EC]'} flex items-center justify-between`}>
      <div className={`flex items-center gap-2 ${darkMode ? 'text-[#E8A600]' : 'text-[#D97706]'}`}>
        <Menu size={22} strokeWidth={2.2} />
        <h1 className="text-[24px] leading-none font-bold tracking-tight">
          <span>P</span>
        </h1>
        <span className="-ml-2 text-[24px] leading-none font-semibold">arkWise AI</span>
      </div>

      <div className="flex items-center gap-2">
        <div className={`h-8 px-3 rounded-full border ${darkMode ? 'border-[#555] bg-[#333]' : 'border-[#D4C8BE] bg-[#EEE8E1]'} flex items-center gap-2`}>
          <span className="w-2 h-2 rounded-full bg-[#4CAF50]" />
          <span className={`text-[12px] font-medium ${darkMode ? 'text-[#999]' : 'text-[#6B615B]'}`}>Online</span>
        </div>
        <img src={profileAvatar} alt="Profile" className="w-10 h-10 rounded-full border-2 border-[#D97706]/45" />
      </div>
    </header>
  );
}
