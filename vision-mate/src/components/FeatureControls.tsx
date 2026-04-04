import React from 'react';
import { AppMode } from '../types';
import { vibrate } from '../services/ttsService';

interface FeatureControlsProps {
  currentMode: AppMode;
  isProcessing: boolean;
  onAnalyze: () => void;
  isListening: boolean;
  onToggleMic: () => void;
  onBack: () => void;
}

const FeatureControls: React.FC<FeatureControlsProps> = ({ 
  currentMode, 
  isProcessing, 
  onAnalyze,
  isListening,
  onToggleMic,
  onBack
}) => {
  
  const handleMainAction = () => {
    if (isProcessing) return;
    vibrate(100);
    onAnalyze();
  };

  const handleMicClick = () => {
    vibrate(50);
    onToggleMic();
  };

  const handleBackClick = () => {
    vibrate(50);
    onBack();
  };

  const getModeIcon = () => {
    switch(currentMode) {
      case AppMode.SCENE: return '👁️';
      case AppMode.OBJECT: return '📦';
      case AppMode.READ: return '📝';
      case AppMode.FIND: return '🔍';
      case AppMode.MONEY: return '💵';
      case AppMode.FACE: return '👤';
      case AppMode.COLOR: return '🎨';
      default: return '👁️';
    }
  };

  return (
    <div className="flex flex-col w-full bg-eyefi-bg border-t border-gray-800 pb-safe pt-4">
      
      {/* Main Action Area */}
      <div className="flex justify-between items-center px-8 mb-8 relative z-10">
        
        {/* Back Button */}
        <button
          onClick={handleBackClick}
          aria-label="Back to Home"
          className="w-20 h-20 rounded-full bg-gray-800 text-white border-4 border-gray-600 shadow-xl flex items-center justify-center active:scale-95 transition-transform"
        >
          <span className="text-4xl">⬅️</span>
        </button>

        {/* Main Analyze Button */}
        <button
          onClick={handleMainAction}
          disabled={isProcessing}
          aria-label={isProcessing ? "Processing" : `Scan ${currentMode.toLowerCase()}`}
          className={`
            w-40 h-40 rounded-full border-8 border-eyefi-bg flex items-center justify-center shadow-2xl transform transition-transform active:scale-95 -mt-16
            ${isProcessing ? 'bg-gray-600 animate-pulse' : 'bg-eyefi-primary'}
          `}
        >
          {isProcessing ? (
            <svg className="animate-spin h-16 w-16 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
             <span className="text-7xl font-bold text-black" role="img" aria-hidden="true">
               {getModeIcon()}
             </span>
          )}
        </button>

        {/* Voice Control Button */}
        <button
          onClick={handleMicClick}
          aria-label={isListening ? "Stop listening" : "Start voice control"}
          aria-pressed={isListening}
          className={`
            w-20 h-20 rounded-full border-4 border-eyefi-bg shadow-xl flex items-center justify-center transition-colors
            ${isListening ? 'bg-eyefi-alert text-white animate-pulse' : 'bg-gray-700 text-white'}
          `}
        >
          <span className="text-4xl">🎙️</span>
        </button>
      </div>
    </div>
  );
};

export default FeatureControls;
