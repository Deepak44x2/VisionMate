import React from 'react';
import { AppMode } from '../types';
import { vibrate } from '../services/ttsService';

interface HomeDashboardProps {
  user: {name: string, isGuest: boolean};
  onSelectFeature: (mode: AppMode) => void;
  onTriggerSOS: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  isListening: boolean;
  onToggleMic: () => void;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({
  user,
  onSelectFeature,
  onTriggerSOS,
  onOpenSettings,
  onLogout,
  isListening,
  onToggleMic
}) => {

  const features = [
    { mode: AppMode.SCENE, icon: '👁️', label: 'Scene', color: 'bg-blue-600' },
    { mode: AppMode.READ, icon: '📝', label: 'Read', color: 'bg-green-600' },
    { mode: AppMode.FIND, icon: '🔍', label: 'Find', color: 'bg-purple-600' },
    { mode: AppMode.MONEY, icon: '💵', label: 'Money', color: 'bg-yellow-600' },
    { mode: AppMode.COLOR, icon: '🎨', label: 'Color', color: 'bg-pink-600' },
    { mode: AppMode.FACE, icon: '👤', label: 'Face', color: 'bg-indigo-600' },
    { mode: AppMode.OBJECT, icon: '📦', label: 'Object', color: 'bg-orange-600' },
    { mode: AppMode.CALCULATOR, icon: '🧮', label: 'Calculator', color: 'bg-teal-600' },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-black overflow-y-auto pb-safe">
      <header className="flex justify-between items-center p-6 bg-gray-900 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-eyefi-primary">Eye-Fi</h1>
          <p className="text-gray-400">Welcome, {user.name}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={onOpenSettings} className="p-3 bg-gray-800 rounded-full text-xl border border-gray-700">
            ⚙️
          </button>
          <button onClick={onLogout} className="p-3 bg-gray-800 rounded-full text-xl border border-gray-700">
            🚪
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 grid grid-cols-2 gap-4 auto-rows-max">
        {features.map((f) => (
          <button
            key={f.mode}
            onClick={() => {
              vibrate(50);
              onSelectFeature(f.mode);
            }}
            className={`${f.color} rounded-3xl p-6 flex flex-col items-center justify-center gap-4 active:scale-95 transition-transform shadow-lg border-2 border-transparent focus:border-white outline-none`}
          >
            <span className="text-6xl">{f.icon}</span>
            <span className="text-white font-bold text-xl">{f.label}</span>
          </button>
        ))}
      </div>

      <div className="p-6 flex justify-between items-center bg-gray-900 border-t border-gray-800">
        <button
          onClick={() => {
            vibrate(50);
            onToggleMic();
          }}
          className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-xl transition-colors ${isListening ? 'bg-eyefi-alert animate-pulse' : 'bg-gray-700'}`}
        >
          🎙️
        </button>

        <button
          onClick={() => {
            vibrate([200, 100, 200]);
            onTriggerSOS();
          }}
          className="bg-eyefi-alert text-white font-bold text-2xl py-6 px-12 rounded-full shadow-xl active:scale-95 transition-transform border-4 border-red-800"
        >
          SOS
        </button>
      </div>
    </div>
  );
};

export default HomeDashboard;
