import React from 'react';
import { AppMode } from '../types';
import { Eye, BookOpen, Search, DollarSign, Palette } from 'lucide-react';

interface Props {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onAnalyze: () => void;
  isProcessing: boolean;
}

const FeatureControls: React.FC<Props> = ({ currentMode, onModeChange, onAnalyze, isProcessing }) => {
  const modes = [
    { id: AppMode.SCENE, icon: Eye, label: 'Scene' },
    { id: AppMode.READ, icon: BookOpen, label: 'Read' },
    { id: AppMode.FIND, icon: Search, label: 'Find' },
    { id: AppMode.MONEY, icon: DollarSign, label: 'Money' },
    { id: AppMode.COLOR, icon: Palette, label: 'Color' },
  ];

  return (
    <div className="w-full flex flex-col gap-4 p-4 bg-black">
      {/* Scrollable Mode Selector */}
      <div className="flex overflow-x-auto gap-3 pb-2" style={{ scrollbarWidth: 'none' }}>
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`flex flex-col items-center justify-center min-w-[85px] h-24 rounded-2xl transition-colors ${
                isActive ? 'bg-eyefi-primary text-black' : 'bg-gray-800 text-white'
              }`}
            >
              <Icon size={32} className="mb-2" />
              <span className="text-sm font-bold">{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Massive Action Button */}
      <button
        onClick={onAnalyze}
        disabled={isProcessing}
        className={`w-full py-6 rounded-3xl text-2xl font-bold transition-all ${
          isProcessing ? 'bg-gray-600 text-gray-400' : 'bg-eyefi-primary text-black active:scale-95'
        }`}
      >
        {isProcessing ? 'Analyzing...' : 'Analyze'}
      </button>
    </div>
  );
};

export default FeatureControls;