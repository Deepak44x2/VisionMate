interface StatusIndicatorProps {
  isListening: boolean;
  isProcessing: boolean;
  message?: string;
}

export function StatusIndicator({ isListening, isProcessing, message }: StatusIndicatorProps) {
  let statusText = 'Tap the microphone to speak';

  if (message) statusText = message;
  else if (isProcessing) statusText = 'Processing...';
  else if (isListening) statusText = "Listening for 'Hey Vision'...";

  const statusActive = isListening || isProcessing;

  return (
    <div
      className={`
        text-center py-2 px-4 rounded-xl transition-all duration-300
        ${statusActive ? 'bg-yellow-500/20 border border-yellow-500' : 'bg-white/5'}
      `}
      role="status"
      aria-live="polite"
    >
      <p className="text-lg font-bold text-white">{statusText}</p>
    </div>
  );
}