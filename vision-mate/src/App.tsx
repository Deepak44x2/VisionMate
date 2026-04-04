import React, { useState, useRef, useEffect } from 'react';
import Camera, { type CameraHandle } from './components/Camera';
import FeatureControls from './components/FeatureControls';
import SOSButton from './components/SOSButton';
import { AppMode, type VoiceAction } from './types';
import { analyzeImage } from './services/geminiService';

import { voiceService as VoiceServiceClass } from './services/voiceService';
import { stopSpeech } from './services/ttsService';
import { Mic, MicOff } from 'lucide-react'; 

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.SCENE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>("Ready. Say 'Hey Vision' or tap Analyze.");
  const [isListening, setIsListening] = useState(false);
  const [manualListening, setManualListening] = useState(false);
  
  const cameraRef = useRef<CameraHandle>(null);
  const currentModeRef = useRef(currentMode);
  const voiceRef = useRef<InstanceType<typeof VoiceServiceClass> | null>(null);

const [theme, setTheme] = useState("dark");

useEffect(() => {
  const savedTheme = localStorage.getItem("theme") || "dark";
  setTheme(savedTheme);
}, []);

useEffect(() => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}, [theme]);

  useEffect(() => {
    currentModeRef.current = currentMode;
  }, [currentMode]);

  useEffect(() => {
    const modeByAction: Partial<Record<VoiceAction, AppMode>> = {
      SCENE: AppMode.SCENE,
      READ: AppMode.READ,
      FIND: AppMode.FIND,
      MONEY: AppMode.MONEY,
      COLOR: AppMode.COLOR,
      OBJECT: AppMode.OBJECT,
      FACE: AppMode.FACE,
    };

    const handleVoiceAction = (action: VoiceAction) => {
      console.log("Executing voice action:", action);
      setManualListening(false);

      const mode = modeByAction[action];
      if (mode) {
        setCurrentMode(mode);
        setResult(`Mode changed to ${mode}. Say 'Scan' to analyze.`);
        return;
      }

      switch (action) {
        case 'WAKE':
          if ('vibrate' in navigator) navigator.vibrate(30);
          setResult("Listening... Say Scan or choose a mode.");
          break;
        case 'SOS': {
          const sosBtn = document.getElementById('sos-button');
          if (sosBtn) sosBtn.click();
          break;
        }
        case 'STOP':
          stopSpeech();
          break;
        case 'SCAN':
          executeAnalysis(currentModeRef.current);
          break;
        case 'HELP':
          setResult("Say 'Hey Vision', then try Scan, a mode like Money or Scene, or SOS.");
          break;
        case 'BATTERY':
        case 'HOME':
        case 'HISTORY':
          setResult(`${action}: use on-screen controls when available.`);
          break;
        default:
          break;
      }
    };

    const instance = new VoiceServiceClass(handleVoiceAction, setIsListening);
    voiceRef.current = instance;

    try {
      instance.start();
    } catch (e) {
      console.error("Failed to start voice service:", e);
    }

    return () => {
      stopSpeech();
      instance.stop();
      voiceRef.current = null;
    };
  }, []);

  const executeAnalysis = async (modeToUse: AppMode) => {
    if (isProcessing) return;
    stopSpeech();
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
        
        setIsProcessing(false);
        return;
      }

      setResult("Analyzing with Gemini...");
      const aiResponse = await analyzeImage(imageBase64, modeToUse);
      setResult(aiResponse);
      

    } catch (error) {
      console.error("Analysis failed:", error);
      const errorMsg = "An error occurred during analysis.";
      setResult(errorMsg);
      
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyzeClick = () => {
    executeAnalysis(currentMode);
  };

  const handleSosTrigger = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    setResult('SOS pressed. If you need emergency services, contact local authorities or emergency number.');
  };

  const toggleManualListening = () => {
    if (manualListening) {
      setManualListening(false);
      setResult("Manual listening stopped.");
    } else {
      setManualListening(true);
      setResult("Listening... Say a command like 'Scan' or 'Money mode'.");
      voiceRef.current?.activateWakeWord(); 
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex justify-center items-center">
      <div className="h-[100dvh] w-full max-w-md flex flex-col bg-eyefi-bg relative shadow-2xl overflow-hidden">

        <div id="sos-button-container">
          <SOSButton onTrigger={handleSosTrigger} />
        </div>

        <header className="p-6 pb-4 z-10 bg-gradient-to-b from-black to-transparent absolute top-0 left-0 right-0 pointer-events-none flex justify-between items-start">
          <div>
            <h1 className="text-eyefi-primary font-bold text-3xl tracking-tight drop-shadow-md">Vision Mate</h1>
            <p className="text-white text-sm opacity-90 mt-1 drop-shadow-md">Real-time awareness assistant</p>
          </div>
          
          <button 
            onClick={toggleManualListening}
            className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-md border pointer-events-auto transition-all ${
              manualListening 
                ? 'bg-eyefi-primary/20 border-eyefi-primary text-eyefi-primary animate-pulse shadow-[0_0_15px_rgba(255,215,0,0.5)]' 
                : isListening 
                  ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                  : 'bg-red-500/20 border-red-500/50 text-red-400'
            }`}
          >
            {manualListening || isListening ? <Mic size={18} /> : <MicOff size={18} />}
            <span className="text-xs font-bold uppercase tracking-wider">
              {manualListening ? 'Listening...' : isListening ? 'Auto Mic' : 'Mic Off'}
            </span>
          </button>
        </header>

        <main className="flex-1 relative bg-black overflow-hidden">
          <div className="absolute inset-0">
            <Camera ref={cameraRef} isActive={true} />
          </div>

          {isProcessing && (
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="w-full h-1 bg-eyefi-primary absolute top-0 animate-scan shadow-[0_0_20px_rgba(255,215,0,0.8)]"></div>
              <div className="w-16 h-16 border-4 border-eyefi-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-eyefi-primary font-bold mt-4 text-lg tracking-widest animate-pulse">ANALYZING...</p>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-6 pt-32 pb-6 z-20">
            <p className="text-white text-lg font-medium bg-black/80 p-4 rounded-xl backdrop-blur-md border border-gray-700 shadow-xl transition-all">
              {result}
            </p>
          </div>
        </main>

        <footer className="z-30 bg-black border-t border-gray-800 shrink-0">
          <FeatureControls
            currentMode={currentMode}
            onAnalyze={handleAnalyzeClick}
            isProcessing={isProcessing}
            isListening={manualListening || isListening}
            onToggleMic={toggleManualListening}
            onBack={() => {
              setCurrentMode(AppMode.SCENE);
              setResult("Scene mode. Say 'Hey Vision' or tap Analyze.");
            }}
          />
        </footer>

      </div>
    </div>
  );
};

export default App;
