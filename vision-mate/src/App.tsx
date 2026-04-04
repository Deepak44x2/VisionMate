import React, { useState, useRef, useEffect } from 'react';
import Camera, {type CameraHandle } from './components/Camera';
import FeatureControls from './components/FeatureControls';
import SOSButton from './components/SOSButton';
import { AppMode } from './types';
import { analyzeImage } from './services/geminiService';
import { speak, stopSpeaking } from './services/ttsService';
import { voiceService, type VoiceCommand } from './services/voiceService'; 
import { Mic } from 'lucide-react'; 

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.SCENE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>("Ready. Say 'Hey Vision' or tap Analyze.");
  const [isListening, setIsListening] = useState(false);
  
  const cameraRef = useRef<CameraHandle>(null);
  
  // We need a ref to the current mode so the voice callback always has the latest value
  const currentModeRef = useRef(currentMode);
  useEffect(() => {
    currentModeRef.current = currentMode;
  }, [currentMode]);

  // Start voice recognition on mount
  useEffect(() => {
    const handleVoiceCommand = (command: VoiceCommand) => {
      console.log("Executing voice command:", command);
      
      switch (command.type) {
        case 'SOS':
          const sosBtn = document.getElementById('sos-button');
          if (sosBtn) sosBtn.click();
          break;
        case 'CHANGE_MODE':
          setCurrentMode(command.mode);
          speak(`Switched to ${command.mode.toLowerCase()} mode.`);
          setResult(`Mode changed to ${command.mode}. Say 'Scan' to analyze.`);
          break;
        case 'ANALYZE':
          executeAnalysis(currentModeRef.current);
          break;
      }
    };

    try {
      voiceService.startListening(handleVoiceCommand);
      setIsListening(true);
    } catch (e) {
      console.error("Failed to start voice service:", e);
    }

    return () => {
      stopSpeaking();
      voiceService.stopListening();
    };
  }, []);

  const executeAnalysis = async (modeToUse: AppMode) => {
    if (isProcessing) return;
    
    stopSpeaking();
    setIsProcessing(true);
    setResult("Capturing image...");

    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    try {
      const imageBase64 = cameraRef.current?.capture();

      if (!imageBase64) {
        const errorMsg = "Error: Could not capture image.";
        setResult(errorMsg);
        speak(errorMsg);
        setIsProcessing(false);
        return;
      }

      setResult("Analyzing with Gemini...");
      
      const aiResponse = await analyzeImage(imageBase64, modeToUse);
      
      setResult(aiResponse);
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

  const handleAnalyzeClick = () => {
    executeAnalysis(currentMode);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex justify-center items-center">
      <div className="h-[100dvh] w-full max-w-md flex flex-col bg-eyefi-bg relative shadow-2xl overflow-hidden">
        
        <div id="sos-button-container">
           <SOSButton />
        </div>

        <header className="p-6 pb-4 z-10 bg-gradient-to-b from-black to-transparent absolute top-0 left-0 right-0 pointer-events-none flex justify-between items-start">
          <div>
            <h1 className="text-eyefi-primary font-bold text-3xl tracking-tight drop-shadow-md">Vision Mate</h1>
            <p className="text-white text-sm opacity-90 mt-1 drop-shadow-md">Real-time awareness assistant</p>
          </div>
          
          <div className={`mt-2 flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md border ${isListening ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/20 border-red-500/50'}`}>
            <Mic size={16} className={isListening ? 'text-green-400 animate-pulse' : 'text-red-400'} />
            <span className="text-xs font-medium text-white">{isListening ? 'Listening' : 'Mic Off'}</span>
          </div>
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
            onAnalyze={handleAnalyzeClick}
            isProcessing={isProcessing}
          />
        </footer>
      </div>
    </div>
  );
};

export default App;