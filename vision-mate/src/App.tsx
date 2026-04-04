import React, { useState, useRef, useEffect, useCallback } from 'react';
import Camera, { type CameraHandle } from './components/Camera';
import HomeDashboard from './components/HomeDashboard';
import FeatureControls from './components/FeatureControls';
import SOSButton from './components/SOSButton';
import BatteryIndicator from './components/BatteryIndicator';
import VoiceSettingsModal from './components/VoiceSettingsModal';
import { AppMode, type CommandMapping, type VoiceAction, type KnownFace, SupportedLanguage } from './types';
import { analyzeImage } from './services/geminiService';
import { speakText, vibrate, stopSpeech, setTtsLanguage } from './services/ttsService';
import { VoiceService } from './services/voiceService';
import Login from './components/Login';

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.SCENE);
  const [activeView, setActiveView] = useState<'HOME' | 'FEATURE'>('HOME');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<string>("Say 'Hey Vision' to start.");
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customMappings, setCustomMappings] = useState<CommandMapping[]>([]);
  const [emergencyContact, setEmergencyContact] = useState<string>(''); // Default empty
  const [user, setUser] = useState<{name: string, isGuest: boolean} | null>(null);
  const [knownFaces, setKnownFaces] = useState<KnownFace[]>([]);
  const [language, setLanguage] = useState<SupportedLanguage>(SupportedLanguage.EN);
  const [transcript, setTranscript] = useState<string>('');
  
  const cameraRef = useRef<CameraHandle>(null);
  const voiceServiceRef = useRef<VoiceService | null>(null);

  // Refs to access latest state inside voice callback
  const handleAnalyzeRef = useRef<() => void>(() => {});
  const activeViewRef = useRef(activeView);
  
  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);
  
  // Load settings from local storage
  useEffect(() => {
    // Load User
    const savedUser = localStorage.getItem('eyefi_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to load user", e);
      }
    }

    // Load Mappings
    const savedMappings = localStorage.getItem('eyefi_voice_mappings');
    if (savedMappings) {
      try {
        setCustomMappings(JSON.parse(savedMappings));
      } catch (e) {
        console.error("Failed to load mappings", e);
      }
    }

    // Load Emergency Contact
    const savedContact = localStorage.getItem('eyefi_emergency_contact');
    if (savedContact) {
      setEmergencyContact(savedContact);
    }

    // Load Known Faces
    const savedFaces = localStorage.getItem('eyefi_known_faces');
    if (savedFaces) {
      try {
        setKnownFaces(JSON.parse(savedFaces));
      } catch (e) {
        console.error("Failed to load known faces", e);
      }
    }
    
    // Load Language
    const savedLanguage = localStorage.getItem('eyefi_language') as SupportedLanguage;
    if (savedLanguage && Object.values(SupportedLanguage).includes(savedLanguage)) {
      setLanguage(savedLanguage);
      setTtsLanguage(savedLanguage);
    }
  }, []);

  // Update VoiceService with latest mappings
  useEffect(() => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.setMappings(customMappings);
    }
  }, [customMappings]);
  
  // Update VoiceService with latest language
  useEffect(() => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.setLanguage(language);
    }
  }, [language]);

  // Check for API Key on mount (Vite exposes only VITE_* via import.meta.env)
  useEffect(() => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      setApiKeyMissing(true);
      speakText("System Error. Gemini API key is missing.");
    } else {
      speakText("Eye-Fi Ready. Listening for Hey Vision.");
    }
  }, []);

  const handleModeChange = useCallback((mode: AppMode) => {
    setCurrentMode(mode);
    setActiveView('FEATURE');
    setLastResult(`Switched to ${mode.toLowerCase()} mode.`);
    speakText(`${mode.toLowerCase()} mode`);
  }, []);

  const handleBackToHome = useCallback(() => {
    setActiveView('HOME');
    setLastResult("Say 'Hey Vision' to start.");
    speakText("Returned to Home Dashboard.");
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (isProcessing) return;
    if (!cameraRef.current) return;

    setIsProcessing(true);
    vibrate(50); 
    stopSpeech(); // Stop any previous speech

    try {
      const imageBase64 = cameraRef.current.capture();
      
      if (imageBase64) {
        const textResult = await analyzeImage(imageBase64, currentMode, knownFaces, language);
        setLastResult(textResult);
        speakText(textResult, true); 
        vibrate([50, 50]);
      } else {
        speakText("Camera capture failed. Please ensure adequate lighting.");
      }
    } catch (error) {
      console.error(error);
      speakText("An error occurred during analysis.");
    } finally {
      setIsProcessing(false);
    }
  }, [currentMode, isProcessing, knownFaces, language]);

  // Keep ref updated
  useEffect(() => {
    handleAnalyzeRef.current = handleAnalyze;
  }, [handleAnalyze]);

  const handleSOS = useCallback(() => {
    vibrate([200, 100, 200, 100, 200]); // SOS pattern vibe
    
    // Check if contact is configured
    if (!emergencyContact) {
      speakText("Emergency contact not configured. Please open settings to add a number.");
      setShowSettings(true);
      return;
    }

    speakText("Emergency initiated. Fetching location...", true);
    
    const triggerWhatsApp = (locationText: string) => {
      const message = `SOS! I need help. ${locationText}`;
      // Clean number just in case
      const cleanNumber = emergencyContact.replace(/[^0-9]/g, '');
      const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
      
      speakText("Opening WhatsApp to send alert.", true);
      window.location.href = url;
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
          speakText("Location found. Sending alert.", true);
          // Small delay to let TTS start before switching app context
          setTimeout(() => triggerWhatsApp(`My real-time location: ${mapsUrl}`), 1000);
        },
        (error) => {
          console.error("SOS Location Error:", error);
          speakText("Location unavailable. Sending text without coordinates.", true);
          setTimeout(() => triggerWhatsApp("(Location unavailable)"), 1000);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      speakText("Location not supported. Sending text.", true);
      setTimeout(() => triggerWhatsApp("(Location not supported)"), 1000);
    }
  }, [emergencyContact]);

  // Initialize Voice Service
  useEffect(() => {
    const service = new VoiceService(
      (command: VoiceAction) => {
        // Handle mapped commands
        switch(command) {
          case 'WAKE':
            vibrate(50); // Feedback that "Hey Vision" was heard
            // We don't speak here to avoid interrupting the user's command flow
            break;
          case 'SCENE': handleModeChange(AppMode.SCENE); break;
          case 'READ': handleModeChange(AppMode.READ); break;
          case 'FIND': handleModeChange(AppMode.FIND); break;
          case 'MONEY': handleModeChange(AppMode.MONEY); break;
          case 'COLOR': handleModeChange(AppMode.COLOR); break;
          case 'OBJECT': handleModeChange(AppMode.OBJECT); break;
          case 'FACE': handleModeChange(AppMode.FACE); break;
          case 'CALCULATOR': handleModeChange(AppMode.CALCULATOR); break;
          case 'SCAN': 
            if (activeViewRef.current === 'FEATURE') {
              // If already in a feature, just scan using that feature
              handleAnalyzeRef.current(); 
            } else {
              speakText("Please select a feature first.");
            }
            break;
          case 'STOP':
            stopSpeech();
            vibrate(50);
            break;
          case 'HELP':
            speakText("Say Hey Vision, then Scene, Read, Find, Money, Color, Face, or Calculator. Say Scan to analyze.");
            break;
          case 'BATTERY':
            if ('getBattery' in navigator) {
              (navigator as any).getBattery().then((battery: any) => {
                const level = Math.round(battery.level * 100);
                speakText(`Battery is at ${level} percent${battery.charging ? ' and charging' : ''}.`);
              });
            } else {
              speakText("Battery status is not available on this device.");
            }
            break;
          case 'SOS':
            handleSOS();
            break;
        }
      },
      (listening) => {
        setIsListening(listening);
      },
      (text) => {
        setTranscript(text);
      }
    );

    service.setMappings(customMappings);
    voiceServiceRef.current = service;
    
    // Attempt auto-start (might fail until user interaction, but we try)
    service.start();

    // Cleanup on unmount
    return () => {
      service.stop();
    };
  }, [handleModeChange, handleSOS]); 

  const toggleMic = () => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.toggle();
    }
  };

  const handleSaveMappings = (newMappings: CommandMapping[]) => {
    setCustomMappings(newMappings);
    localStorage.setItem('eyefi_voice_mappings', JSON.stringify(newMappings));
  };

  const handleSaveContact = (contact: string) => {
    setEmergencyContact(contact);
    localStorage.setItem('eyefi_emergency_contact', contact);
  };

  const handleSaveKnownFaces = (faces: KnownFace[]) => {
    setKnownFaces(faces);
    try {
      localStorage.setItem('eyefi_known_faces', JSON.stringify(faces));
    } catch (e) {
      console.error("Failed to save known faces (might be too large for localStorage)", e);
      speakText("Error saving face. Image might be too large.");
    }
  };

  const handleSaveLanguage = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setTtsLanguage(lang);
    localStorage.setItem('eyefi_language', lang);
    speakText("Language updated.");
  };

  const handleLogin = (name: string, isGuest: boolean) => {
    const newUser = { name, isGuest };
    setUser(newUser);
    localStorage.setItem('eyefi_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('eyefi_user');
    speakText("Logged out.");
  };

  const handleScreenTap = (e: React.MouseEvent) => {
    // If modal is open, let modal handle clicks
    if (showSettings) return;

    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    if ((e.target as HTMLElement).tagName === 'SELECT') return;

    // If tap, also try to ensure voice service is running (for mobile autoplay policies)
    if (voiceServiceRef.current && !isListening) {
        voiceServiceRef.current.start();
    }

    // Debounce tap to avoid conflict with double tap or scroll
    speakText(lastResult);
  };

  if (apiKeyMissing) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-center p-6 text-eyefi-alert">
        <h1 className="text-3xl font-bold mb-4">Configuration Error</h1>
        <p className="text-white text-lg">
          Set <code className="text-eyefi-primary">VITE_GEMINI_API_KEY</code> in{' '}
          <code className="text-eyefi-primary">vision-mate/.env</code>, then restart{' '}
          <code className="text-eyefi-primary">npm run dev</code>.
        </p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div 
      className="h-screen w-screen flex flex-col bg-eyefi-bg overflow-hidden"
      onClick={handleScreenTap}
    >
      {/* Utilities */}
      <BatteryIndicator />
      
      {/* Settings Modal */}
      <VoiceSettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        mappings={customMappings}
        onSave={handleSaveMappings}
        emergencyContact={emergencyContact}
        onSaveContact={handleSaveContact}
        knownFaces={knownFaces}
        onSaveKnownFaces={handleSaveKnownFaces}
        language={language}
        onSaveLanguage={handleSaveLanguage}
      />

      {activeView === 'HOME' ? (
        <HomeDashboard
          user={user}
          onSelectFeature={handleModeChange}
          onTriggerSOS={handleSOS}
          onOpenSettings={() => setShowSettings(true)}
          onLogout={handleLogout}
          isListening={isListening}
          onToggleMic={toggleMic}
        />
      ) : (
        <>
          {/* Header for Feature View */}
          <header className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start bg-gradient-to-b from-black to-transparent h-24 pointer-events-none">
            <div>
              <h1 className="text-eyefi-primary font-bold text-xl drop-shadow-md">Eye-Fi</h1>
              <p className="text-white text-xs opacity-80 drop-shadow-md">
                {currentMode} MODE
              </p>
            </div>
            <div className="pointer-events-auto mr-20">
              <SOSButton onTrigger={handleSOS} />
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 relative">
            {currentMode === AppMode.CALCULATOR ? (
              <Calculator transcript={transcript} />
            ) : (
              <>
                <Camera ref={cameraRef} isActive={!showSettings && activeView === 'FEATURE'} />
                
                {/* Result Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-6 min-h-[160px] flex items-end justify-center pb-12">
                   <div className="text-center max-w-2xl w-full">
                     <p className="text-eyefi-primary text-2xl md:text-3xl font-bold leading-snug drop-shadow-md bg-black/40 p-4 rounded-xl">
                       {isProcessing ? "Analyzing..." : lastResult}
                     </p>
                     {isListening && (
                       <div className="mt-4 flex items-center justify-center gap-3 bg-eyefi-alert/20 border border-eyefi-alert px-4 py-2 rounded-full inline-flex">
                         <span className="relative flex h-4 w-4">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-eyefi-alert opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-4 w-4 bg-eyefi-alert"></span>
                         </span>
                         <p className="text-white text-lg font-bold tracking-wide">
                           Listening for 'Hey Vision'...
                         </p>
                       </div>
                     )}
                     {!isListening && (
                        <p className="text-gray-400 text-lg mt-4 font-bold bg-black/50 px-4 py-2 rounded-full inline-block">
                         Voice Off - Tap Mic to Start
                       </p>
                     )}
                   </div>
                </div>
              </>
            )}
          </main>

          {/* Footer Controls */}
          <footer className="z-20">
            <FeatureControls
              currentMode={currentMode}
              isProcessing={isProcessing}
              onAnalyze={handleAnalyze}
              isListening={isListening}
              onToggleMic={toggleMic}
              onBack={handleBackToHome}
            />
          </footer>
        </>
      )}
    </div>
  );
};

export default App;
