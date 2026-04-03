import React, { useState, useRef } from 'react';
import Camera, { type CameraHandle } from './components/Camera';
import FeatureControls from './components/FeatureControls';
import { AppMode } from './types';

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.SCENE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>("Ready to assist. Select a mode and tap Analyze.");
  
  const cameraRef = useRef<CameraHandle>(null);

  const handleAnalyze = () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setResult("Capturing image...");

    //Capture the image from the camera
    const imageBase64 = cameraRef.current?.capture();

    if (!imageBase64) {
      setResult("Error: Could not capture image from camera.");
      setIsProcessing(false);
      return;
    }

    setResult("Processing image with AI...");
    
    setTimeout(() => {
      console.log("Captured Image Data (First 100 chars):", imageBase64.substring(0, 100) + "...");
      setResult(`Simulated AI analysis complete for ${currentMode} mode.`);
      setIsProcessing(false);
    }, 2000);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-vision-bg overflow-hidden">
      {/* Header */}
      <header className="p-6 pb-4 z-10 bg-gradient-to-b from-black to-transparent absolute top-0 left-0 right-0">
        <h1 className="text-vision-primary font-bold text-3xl tracking-tight drop-shadow-md">Vision Mate</h1>
        <p className="text-white text-sm opacity-90 mt-1 drop-shadow-md">Real-time awareness assistant</p>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col">
        <div className="flex-1 relative">
          <Camera ref={cameraRef} />
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-6 pt-32 pb-8">
          <p className="text-white text-xl font-medium bg-black/70 p-4 rounded-xl backdrop-blur-md border border-gray-800 shadow-xl">
            {result}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="z-10 bg-black">
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