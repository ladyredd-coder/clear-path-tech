import React from 'react';

export type StudioView = 'concepts' | 'motion' | 'reel';

interface TopBarProps {
  activeView: StudioView;
  onSelectView: (view: StudioView) => void;
  onNewBrief: () => void;
  logoCount: number;
  animationCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onSelectView,
  onNewBrief,
  logoCount,
  animationCount,
}) => {
  const navItems: Array<{ id: StudioView; label: string; count?: number }> = [
    { id: 'concepts', label: 'Concept Studio', count: logoCount > 0 ? logoCount : undefined },
    { id: 'motion', label: 'Motion Stage', count: animationCount > 0 ? animationCount : undefined },
    { id: 'reel', label: 'Session Reel' },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-white/[0.08] bg-[#101114]/95 backdrop-blur-sm px-6 flex items-center justify-between gap-8">
      <button
        type="button"
        onClick={() => onSelectView('concepts')}
        className="font-display text-lg font-semibold tracking-tight text-[#F3F4F6] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93C] rounded"
      >
        Forma Studio
      </button>

      <nav className="flex items-center gap-6 overflow-x-auto" aria-label="Workspace stages">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`relative h-16 flex items-center gap-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:text-[#E5A93C] ${
                isActive ? 'text-[#F3F4F6]' : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span className="font-mono text-xs tabular-nums text-[#9CA3AF]">
                  ({item.count})
                </span>
              )}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E5A93C]"
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onNewBrief}
          className="h-10 px-4 rounded-lg bg-[#E5A93C] hover:bg-[#EDB955] text-[#101114] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101114]"
        >
          New Brief
        </button>
      </div>
    </header>
  );
};
