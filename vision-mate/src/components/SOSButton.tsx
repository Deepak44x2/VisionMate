import React from 'react';

interface SOSButtonProps {
  onTrigger?: () => void;
}

const SOSButton: React.FC<SOSButtonProps> = ({ onTrigger }) => {
  return (
    <button
      id="sos-button"
      type="button"
      onClick={() => onTrigger?.()}
      aria-label="SOS Emergency Button"
      className="absolute top-4 right-4 z-20 bg-vision-alert text-white font-black text-xl w-20 h-20 rounded-full border-4 border-white shadow-2xl flex items-center justify-center active:bg-red-800 active:scale-95 transition-all"
    >
      SOS
    </button>
  );
};

export default SOSButton; 