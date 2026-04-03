import React, { useState } from 'react';
import Camera from './components/Camera';
import FeatureControls from './components/FeatureControls';
import { AppMode } from './types';

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.SCENE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>("Ready to assist. Select a mode and tap Analyze.");

  const handleAnalyze = () => {
    setIsProcessing(true);
    setResult("Processing image...");
    
    // Fake delay to simulate AI processing for now
    setTimeout(() => {
      setResult(`Simulated result for ${currentMode} mode.`);
      setIsProcessing(false);
    }, 2000);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-eyefi-bg overflow-hidden">
      {/* Header */}
      <header className="p-6 pb-4">
        <h1 className="text-eyefi-primary font-bold text-3xl tracking-tight">Vision Mate</h1>
        <p className="text-white text-sm opacity-80 mt-1">Real-time awareness assistant</p>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative border-y border-gray-800 flex flex-col">
        <div className="flex-1 relative">
          <Camera />
        </div>
        
        {/* Result Overlay (Shows what the AI "sees") */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pt-20">
          <p className="text-white text-xl font-medium bg-black/60 p-4 rounded-xl backdrop-blur-sm border border-gray-800">
            {result}
          </p>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="pb-6">
        <FeatureControls 
          currentMode={currentMode} 
          onModeChange={setCurrentMode} 
          onAnalyze={handleAnalyze}
          isProcessing={isProcessing}
        />
      </footer>
    </div>
  );
};

export default App;