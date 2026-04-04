import React, { useState } from 'react';
import { AppMode } from '../types';
import { speakText, vibrate } from '../services/ttsService';
import { TileCard } from './TileCard';
import { VoiceButton } from './VoiceButton';
import { StatusIndicator } from './StatusIndicator';
import { Camera, FileText, Search, Banknote, Users, Palette, Calculator, Eye, AlertCircle, Home, Clock, Settings, HelpCircle } from 'lucide-react';

interface HomeDashboardProps {
  user: { name: string; isGuest: boolean };
  onSelectFeature: (mode: AppMode) => void;
  onTriggerSOS: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onHomeNav: () => void;
  onHistory: () => void;
  onHelp: () => void;
  isListening: boolean;
  onToggleMic: () => void;
  isProcessing: boolean;
  statusMessage?: string;
}

const iconMap = {
  Camera,
  FileText,
  Search,
  Banknote,
  Users,
  Palette,
  Calculator,
  Eye,
  AlertCircle,
};

type BottomAction = 'home' | 'history' | 'settings' | 'help';

const HomeDashboard: React.FC<HomeDashboardProps> = ({
  user,
  onSelectFeature,
  onTriggerSOS,
  onOpenSettings,
  onLogout,
  isListening,
  onToggleMic,
  isProcessing,
  statusMessage,
  onHomeNav,
  onHistory,
  onHelp,
}) => {
  const [activeAction, setActiveAction] = useState<BottomAction>('home');

  const handleTileSelect = (mode: AppMode, label: string) => {
    console.log('handleTileSelect called with mode:', mode, 'label:', label);
    vibrate(50);
    speakText(`Opening ${label} mode.`);
    onSelectFeature(mode);
  };

  const tiles = [
    { mode: AppMode.OBJECT, label: 'Detect Object', icon: 'Camera', color: 'bg-yellow-500' },
    { mode: AppMode.READ, label: 'Read Text', icon: 'FileText', color: 'bg-yellow-400' },
    { mode: AppMode.FIND, label: 'Find Items', icon: 'Search', color: 'bg-yellow-500' },
    { mode: AppMode.MONEY, label: 'Identify Currency', icon: 'Banknote', color: 'bg-yellow-400' },
    { mode: AppMode.FACE, label: 'Recognize Faces', icon: 'Users', color: 'bg-yellow-500' },
    { mode: AppMode.COLOR, label: 'Color Detection', icon: 'Palette', color: 'bg-yellow-400' },
    { mode: AppMode.CALCULATOR, label: 'Calculator', icon: 'Calculator', color: 'bg-yellow-500' },
    { mode: AppMode.SCENE, label: 'Scene Analysis', icon: 'Eye', color: 'bg-yellow-400'},
    { mode: AppMode.SOS, label: 'SOS', icon: 'AlertCircle', color: 'bg-red-500', isSOS: true },
  ];
  const featureTiles = tiles.filter(tile => !tile.isSOS);
  const sosTile = tiles.find(tile => tile.isSOS);

  return (
    <div className="flex flex-col h-full w-full bg-black overflow-y-auto pb-safe">
      <header className="grid grid-cols-3 items-center p-4 bg-gray-900 border-b border-gray-800">
        <div>
          <h1 className="text-3xl font-bold text-eyefi-primary">Vision AI</h1>
          <p className="text-gray-400">Welcome, {user.name}</p>
        </div>
        <div className="flex flex-col items-center gap-2 justify-center">
          <VoiceButton isListening={isListening} onClick={() => { vibrate(50); onToggleMic(); }} />
          <StatusIndicator isListening={isListening} isProcessing={isProcessing} message={statusMessage} />
        </div>
        <div className="flex justify-end">
          <button onClick={onLogout} className="p-8 bg-gray-800 rounded-full text-xl border border-gray-700">
            🚪
          </button>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 space-y-8 pb-24">

        <div className="grid grid-cols-2 gap-6">
          {featureTiles.map(tile => {
            const Icon = iconMap[tile.icon as keyof typeof iconMap];
            return (
              <TileCard
                key={tile.label}
                icon={Icon}
                label={tile.label}
                accentColor={tile.color}
                ariaLabel={`Open ${tile.label}`}
                onClick={() => {
                  if (tile.isSOS) {
                    vibrate([200, 100, 200]);
                    onTriggerSOS();
                    return;
                  }
                  handleTileSelect(tile.mode, tile.label);
                }}
              />
            );
          })}
        </div>

        {sosTile && (
          <div className="flex justify-center">
            <div className="w-full max-w-sm">
              <TileCard
                icon={iconMap[sosTile.icon as keyof typeof iconMap]}
                label={sosTile.label}
                accentColor={sosTile.color}
                ariaLabel={`Open ${sosTile.label}`}
                onClick={() => {
                  vibrate([200, 100, 200]);
                  onTriggerSOS();
                }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          {[
            { id: 'home', label: 'Home', icon: Home, action: onHomeNav },
            { id: 'history', label: 'History', icon: Clock, action: onHistory },
            { id: 'settings', label: 'Settings', icon: Settings, action: onOpenSettings },
            { id: 'help', label: 'Help', icon: HelpCircle, action: onHelp },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeAction === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveAction(item.id as BottomAction);
                  item.action();
                }}
                className={`px-3 py-2 rounded-xl text-white font-bold flex flex-col items-center justify-center gap-1 transition ${
                  isActive
                    ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-black' : 'text-white'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HomeDashboard;