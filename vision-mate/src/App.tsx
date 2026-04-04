import React, { useState, useRef, useEffect } from 'react';
import Camera, {  type CameraHandle } from './components/Camera';
import FeatureControls from './components/FeatureControls';
import { AppMode } from './types';
import { analyzeImage } from './services/geminiService';
import { speak, stopSpeaking } from './services/ttsService'; // Import TTS

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.SCENE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>("Ready to assist. Select a mode and tap Analyze.");
  
  const cameraRef = useRef<CameraHandle>(null);

  // Stop speaking if the component unmounts
  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const handleAnalyze = async () => {
    if (isProcessing) return;
    
    // Stop any current speech when starting a new scan
    stopSpeaking();
    
    setIsProcessing(true);
    setResult("Capturing image...");

    // Optional: Add a tiny vibration to let the user know the button was pressed
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    try {
      const imageBase64 = cameraRef.current?.capture();

      if (!imageBase64) {
        const errorMsg = "Error: Could not capture image from camera.";
        setResult(errorMsg);
        speak(errorMsg);
        setIsProcessing(false);
        return;
      }

      setResult("Analyzing with Gemini...");
      
      const aiResponse = await analyzeImage(imageBase64, currentMode);
      
      setResult(aiResponse);
      
      // Speak the result out loud!
      speak(aiResponse);

    } catch (error) {
      console.error("Analysis failed:", error);
      const errorMsg = "An error occurred during analysis.";
      setResult(errorMsg);
      speak(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex justify-center items-center">
      <div className="h-[100dvh] w-full max-w-md flex flex-col bg-eyefi-bg relative shadow-2xl overflow-hidden">
        
        <header className="p-6 pb-4 z-10 bg-gradient-to-b from-black to-transparent absolute top-0 left-0 right-0">
          <h1 className="text-eyefi-primary font-bold text-3xl tracking-tight drop-shadow-md">Vision Mate</h1>
          <p className="text-white text-sm opacity-90 mt-1 drop-shadow-md">Real-time awareness assistant</p>
        </header>

        <main className="flex-1 relative bg-black overflow-hidden">
          <div className="absolute inset-0">
            <Camera ref={cameraRef} />
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-6 pt-32 pb-6">
            <p className="text-white text-lg font-medium bg-black/80 p-4 rounded-xl backdrop-blur-md border border-gray-700 shadow-xl">
              {result}
            </p>
          </div>
        </main>

        <footer className="z-20 bg-black border-t border-gray-800 shrink-0">
          <FeatureControls 
            currentMode={currentMode} 
            onModeChange={setCurrentMode} 
            onAnalyze={handleAnalyze}
            isProcessing={isProcessing}
          />
        </footer>
      </div>
    </div>
  );
};

export default App;