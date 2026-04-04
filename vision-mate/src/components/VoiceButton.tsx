interface VoiceButtonProps {
  isListening: boolean;
  onClick: () => void;
}

export function VoiceButton({ isListening, onClick }: VoiceButtonProps) {
  const isActive = isListening;

  return (
    <button
      onClick={onClick}
      aria-label={isListening ? 'Listening' : 'Tap to speak'}
      className={`
        relative w-24 h-24 rounded-full
        bg-gradient-to-br from-yellow-400 to-yellow-600
        flex items-center justify-center
        transform transition-all duration-300
        hover:scale-110
        active:scale-95
        focus:outline-none focus:ring-4 focus:ring-yellow-500 focus:ring-offset-4 focus:ring-offset-black
        ${isActive ? 'animate-pulse shadow-2xl shadow-yellow-500/50' : 'shadow-xl'}
      `}
    >
      {isActive && (
        <>
          <span className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-75"></span>
          <span className="absolute inset-0 rounded-full bg-yellow-400 animate-pulse opacity-50"></span>
        </>
      )}
      <span className="text-black text-3xl relative z-10">🎙️</span>
    </button>
  );
}
