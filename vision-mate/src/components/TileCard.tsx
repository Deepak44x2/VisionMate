import type { LucideIcon } from 'lucide-react';

interface TileCardProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  accentColor?: string;
  ariaLabel?: string;
}

export function TileCard({ icon: Icon, label, onClick, accentColor = 'bg-yellow-500', ariaLabel }: TileCardProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel || label}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`
        ${accentColor}
        rounded-3xl p-8
        flex flex-col items-center justify-center gap-4
        min-h-[180px] w-full
        transform transition-all duration-200
        hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/30
        active:scale-95
        focus:outline-none focus:ring-4 focus:ring-yellow-500 focus:ring-offset-4 focus:ring-offset-black
        cursor-pointer
      `}
    >
      <Icon size={64} strokeWidth={2.5} className="text-black" />
      <span className="text-2xl font-bold text-black text-center leading-tight">{label}</span>
    </div>
  );
}
