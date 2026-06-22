import { ReactNode } from 'react';

interface AppScreenShellProps {
  children: ReactNode;
  darkMode?: boolean;
  className?: string;
  contentClassName?: string;
}

export function AppScreenShell({ children, darkMode = false, className = '', contentClassName = '' }: AppScreenShellProps) {
  return (
    <main className={`flex-grow w-full max-w-[600px] mx-auto px-3 sm:px-4 pt-3 pb-20 ${darkMode ? 'bg-[#1a1a1a]' : 'bg-[#EEE8E2]'} ${className}`.trim()}>
      <div className={`mx-auto w-full max-w-[540px] ${darkMode ? 'bg-[#242424]' : 'bg-[#F3EEEA]'} ${contentClassName}`.trim()}>
        {children}
      </div>
    </main>
  );
}
