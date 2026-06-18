interface TopAppBarProps {
  onHelpClick?: () => void;
}

export function TopAppBar({ onHelpClick }: TopAppBarProps) {
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
        <button
          onClick={onHelpClick}
          className="hover:opacity-80 transition-opacity active:scale-95 w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-on-surface-variant">help_outline</span>
        </button>
      </div>
    </header>
  );
}
