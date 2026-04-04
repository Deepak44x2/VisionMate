import React, { useState, useRef, useEffect, useCallback } from 'react';
import Camera, { type CameraHandle } from './components/Camera';
import Onboarding from './components/Onboarding';
import HomeDashboard from './components/HomeDashboard';
import FeatureControls from './components/FeatureControls';
import SOSButton from './components/SOSButton';
import BatteryIndicator from './components/BatteryIndicator';
import VoiceSettingsModal from './components/VoiceSettingsModal';
import Calculator from './components/Calculator';
import { AppMode, SupportedLanguage, type CommandMapping, type VoiceAction, type KnownFace } from './types';
import { analyzeImage, locateTargetObject } from './services/geminiService';
import { speakText, vibrate, stopSpeech, setTtsLanguage } from './services/ttsService';
import { VoiceService } from './services/voiceService';
import Login from './components/Login';
import { loadLocalDetector, locateTargetLocally, canonicalizeTargetLabel } from './services/localObjectService';

interface HistoryItem {
  type: string;
  result: string;
  timestamp: number;
}

interface HelpItem {
  icon: string;
  title: string;
  description: string;
  command: string;
}

const HISTORY_STORAGE_KEY = 'eyefi_history';
const HELP_INTRO_TEXT = 'Welcome to Vision AI help. You can control the app using voice commands.';
const HELP_SPOKEN_TEXT = 'Say Hey Vision or Tap the mic, then Scene, Read, Find, Money, Color, Face, or Calculator. Say Scan to analyze.';

const HELP_ITEMS: HelpItem[] = [
  { icon: '🌍', title: 'Scene (Environment Analysis)', description: 'Describes the full environment in front of you.', command: 'Hey Vision, Scene' },
  { icon: '🧱', title: 'Object (Object Detection)', description: 'Focuses on identifying objects and items.', command: 'Hey Vision, Object' },
  { icon: '📖', title: 'Read (Text Reading)', description: 'Reads printed or digital text aloud.', command: 'Hey Vision, Read' },
  { icon: '🔍', title: 'Find (Object Finder)', description: 'Helps locate specific items around you.', command: 'Hey Vision, Find' },
  { icon: '💵', title: 'Money (Currency Detection)', description: 'Identifies banknotes and currency values.', command: 'Hey Vision, Money' },
  { icon: '🎨', title: 'Color Detection', description: 'Tells you the dominant color of an item.', command: 'Hey Vision, Color' },
  { icon: '🙂', title: 'Face Recognition', description: 'Recognizes saved faces and identifies people.', command: 'Hey Vision, Face' },
  { icon: '🧮', title: 'Calculator', description: 'Performs spoken math calculations.', command: 'Hey Vision, Calculator' },
  { icon: '🆘', title: 'SOS / Emergency', description: 'Triggers emergency alert workflow.', command: 'Hey Vision, SOS' },
  { icon: '📷', title: 'Scan Mode', description: 'Analyzes what camera currently sees.', command: 'Hey Vision, Scan' },
];

const modeToHistoryType = (mode: AppMode): string => {
  switch (mode) {
    case AppMode.OBJECT: return 'Object Detection';
    case AppMode.READ: return 'Text Read';
    case AppMode.FIND: return 'Find Items';
    case AppMode.MONEY: return 'Currency';
    case AppMode.COLOR: return 'Color Detection';
    case AppMode.FACE: return 'Face Recognition';
    case AppMode.CALCULATOR: return 'Calculator';
    case AppMode.SCENE: return 'Scene Analysis';
    default: return 'Activity';
  }
};

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.SCENE);
  const [activeView, setActiveView] = useState<'HOME' | 'FEATURE' | 'HISTORY' | 'HELP'>('HOME');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
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
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [lastHistorySpoken, setLastHistorySpoken] = useState<string>('');
  const [lastHelpSpoken, setLastHelpSpoken] = useState<string>('');
  // FIND session lock (strict control flow)
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [targetItem, setTargetItem] = useState<string>('');
  const [isAwaitingTarget, setIsAwaitingTarget] = useState<boolean>(false);
  const [findStatus, setFindStatus] = useState<string>('Waiting for target...');
  const [findDirection, setFindDirection] = useState<'LEFT' | 'RIGHT' | 'CENTER' | null>(null);
  
  const cameraRef = useRef<CameraHandle>(null);
  const voiceServiceRef = useRef<VoiceService | null>(null);
  const findIntervalRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const errorPauseUntilRef = useRef<number>(0);
  const lastGeminiCallAtRef = useRef<number>(0);
  const isSessionActiveRef = useRef<boolean>(false);
  const isAwaitingTargetRef = useRef<boolean>(false);
  const hasSpokenScanningStartedRef = useRef<boolean>(false);
  const lastScanSpeechAtRef = useRef<number>(0);

  const lastSpokenTextRef = useRef<string>('');
  const lastSpokenTimeRef = useRef<number>(0);
  const lastSpokenDirectionRef = useRef<'LEFT' | 'RIGHT' | 'CENTER' | null>(null);
  const targetItemLabelRef = useRef<string>('');
  const currentModeRef = useRef<AppMode>(AppMode.SCENE);
  const lastUiStatusRef = useRef<string>('');
  const lastUiDirectionRef = useRef<'LEFT' | 'RIGHT' | 'CENTER' | null>(null);

  // Refs to access latest state inside voice callback
  const handleAnalyzeRef = useRef<() => void>(() => {});
  const activeViewRef = useRef(activeView);
  
  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);

  useEffect(() => {
    currentModeRef.current = currentMode;
  }, [currentMode]);

  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  useEffect(() => {
    isAwaitingTargetRef.current = isAwaitingTarget;
  }, [isAwaitingTarget]);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    // Prime voices early; some browsers don't speak reliably until voices are loaded.
    window.speechSynthesis.getVoices();
    const onVoicesChanged = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
    };
  }, []);
  
  // Load settings from local storage
  useEffect(() => {
    // Load User
    const savedUser = localStorage.getItem('eyefi_user');
    const hasSavedUser = Boolean(savedUser);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to load user", e);
      }
    }

    // Load onboarding status
    const onboardingStatus = localStorage.getItem('eyefi_onboarding_done');
    if (onboardingStatus === 'true') {
      setHasCompletedOnboarding(true);
    }

    // Startup routing (STRICT):
    // - If already logged in on this device, always open Home Dashboard
    // - Otherwise follow Onboarding -> Login -> Home (no restoring FEATURE/scene on cold open)
    if (hasSavedUser) {
      setActiveView('HOME');
      localStorage.setItem('eyefi_active_view', 'HOME');
    } else {
      setActiveView('HOME');
      localStorage.setItem('eyefi_active_view', 'HOME');
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

    // Load History
    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory) as HistoryItem[];
        if (Array.isArray(parsed)) {
          setHistoryItems(parsed.slice(0, 6));
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const appendHistory = useCallback((type: string, result: string) => {
    const item: HistoryItem = {
      type,
      result,
      timestamp: Date.now(),
    };
    setHistoryItems((prev) => {
      const updated = [item, ...prev].slice(0, 6);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
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

  // Check for API Key on mount
  useEffect(() => {
    // Vite only exposes `VITE_*` variables via `import.meta.env`
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      setApiKeyMissing(true);
      speakText("System Error. Gemini API key is missing.");
    } else {
      speakText("Vision AI Ready. Listening for Hey Vision.");
    }
  }, []);

  const handleModeChange = useCallback((mode: AppMode) => {
    console.log('handleModeChange called with mode:', mode);
    if (activeViewRef.current === 'FEATURE' && currentModeRef.current === mode) {
      return;
    }
    setCurrentMode(mode);
    setActiveView('FEATURE');
    localStorage.setItem('eyefi_active_view', 'FEATURE');
    localStorage.setItem('eyefi_current_mode', mode);
    setLastResult(`Switched to ${mode.toLowerCase()} mode.`);
    speakText(`${mode.toLowerCase()} mode`);
  }, []);

  const handleBackToHome = useCallback(() => {
    setActiveView('HOME');    localStorage.setItem('eyefi_active_view', 'HOME');    setLastResult("Say 'Hey Vision' to start.");
    speakText("Returned to Home Dashboard.");
  }, []);

  const handleShowHistory = useCallback(() => {
    setActiveView('HISTORY');
    localStorage.setItem('eyefi_active_view', 'HISTORY');
    setLastResult('History view: Recent actions and results.');
  }, []);

  const handleShowHelp = useCallback(() => {
    setActiveView('HELP');
    localStorage.setItem('eyefi_active_view', 'HELP');
    setLastResult('Help view: voice commands and usage tips.');
    setLastHelpSpoken(HELP_SPOKEN_TEXT);
    speakText(HELP_SPOKEN_TEXT, true);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (isProcessing) return;
    if (!cameraRef.current) return;
    if (currentMode === AppMode.FIND) return;

    setIsProcessing(true);
    vibrate(50); 
    stopSpeech(); // Stop any previous speech

    try {
      const imageBase64 = cameraRef.current.capture();
      
      if (imageBase64) {
        const textResult = await analyzeImage(imageBase64, currentMode, knownFaces, language);
        setLastResult(textResult);
        appendHistory(modeToHistoryType(currentMode), textResult);
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
  }, [appendHistory, currentMode, isProcessing, knownFaces, language]);

  type FindDirection = 'LEFT' | 'RIGHT' | 'CENTER';

  const normalizeStr = useCallback((v: string) => v.toLowerCase().trim(), []);

  const extractTargetItemFromTranscript = useCallback(
    (raw: string): string | null => {
      const text = raw.toLowerCase().trim();
      if (!text) return null;

      // Stop words: never treat as target.
      if (text.includes('stop finding') || text.includes('stop search') || /\bdone\b/.test(text)) return null;
      if (text.includes('repeat')) return null;

      // Remove common command phrasing so only the item remains.
      const cleaned = text
        .replace(/\b(hey vision|please|can you|could you|locate|search for|look for|find)\b/g, '')
        .replace(/\b(the|a|an)\b/g, '')
        // If the user says "near / at / on / in ..." then the rest is location context; ignore it.
        .replace(/\b(near|at|on|in|under|beside|next to|behind|in front of|with)\b.*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleaned) return null;
      if (cleaned === 'what do you want to find?' || cleaned === 'what do you want to find') return null;
      return cleaned;
    },
    []
  );

  const speakControlled = useCallback((message: string) => {
    const now = Date.now();
    const lastMsg = lastSpokenTextRef.current;
    const lastTime = lastSpokenTimeRef.current;

    // Anti-spam: never repeat the exact same message within 4 seconds.
    if (message === lastMsg && now - lastTime < 4000) return;

    speakText(message, true);
    lastSpokenTextRef.current = message;
    lastSpokenTimeRef.current = now;
  }, []);

  const setUiStateIfChanged = useCallback((status: string, direction: FindDirection | null) => {
    if (status !== lastUiStatusRef.current) {
      lastUiStatusRef.current = status;
      setFindStatus(status);
      setLastResult(status);
    }
    if (direction !== lastUiDirectionRef.current) {
      lastUiDirectionRef.current = direction;
      setFindDirection(direction);
    }
  }, []);

  const cancelFindSession = useCallback((opts?: { message?: string }) => {
    const shouldSpeak = Boolean(opts?.message) && (isSessionActiveRef.current || isAwaitingTargetRef.current);

    // Stop everything immediately.
    if (findIntervalRef.current) {
      window.clearInterval(findIntervalRef.current);
      findIntervalRef.current = null;
    }

    isProcessingRef.current = false;
    errorPauseUntilRef.current = 0;

    // Reset all session state.
    isSessionActiveRef.current = false;
    isAwaitingTargetRef.current = false;
    hasSpokenScanningStartedRef.current = false;
    lastScanSpeechAtRef.current = 0;
    lastGeminiCallAtRef.current = 0;
    lastSpokenDirectionRef.current = null;
    lastSpokenTextRef.current = '';
    lastSpokenTimeRef.current = 0;
    lastUiStatusRef.current = '';
    lastUiDirectionRef.current = null;

    setIsSessionActive(false);
    setIsAwaitingTarget(false);
    setTargetItem('');
    targetItemLabelRef.current = '';
    setFindDirection(null);
    setFindStatus('Waiting for target...');

    if (shouldSpeak) {
      stopSpeech();
      vibrate(50);
      setLastResult(opts?.message || '');
      speakControlled(opts!.message!);
    }
  }, [speakControlled]);

  const promptForTargetOnce = useCallback(() => {
    // Session lock: ask once, then capture target once.
    if (isSessionActiveRef.current || isAwaitingTargetRef.current) return;

    isSessionActiveRef.current = false;
    isAwaitingTargetRef.current = true;

    hasSpokenScanningStartedRef.current = false;
    lastScanSpeechAtRef.current = 0;
    lastSpokenDirectionRef.current = null;

    // Reset voice anti-spam state so the prompt is always heard.
    lastSpokenTextRef.current = '';
    lastSpokenTimeRef.current = 0;

    setIsSessionActive(false);
    setIsAwaitingTarget(true);
    setTargetItem('');
    targetItemLabelRef.current = '';

    setUiStateIfChanged('Waiting for target...', null);
    speakControlled('What do you want to find?');
  }, [speakControlled, setUiStateIfChanged]);

  const endFindSessionOnFound = useCallback(() => {
    if (findIntervalRef.current) {
      window.clearInterval(findIntervalRef.current);
      findIntervalRef.current = null;
    }
    isProcessingRef.current = false;
    errorPauseUntilRef.current = 0;
    isSessionActiveRef.current = false;
    isAwaitingTargetRef.current = false;

    setIsSessionActive(false);
    setIsAwaitingTarget(false);
  }, []);

  const startFindSession = useCallback(
    async (capturedTargetSpoken: string) => {
      const canonicalTarget = canonicalizeTargetLabel(capturedTargetSpoken);
      if (!canonicalTarget) return;

      // Strict: once item name is set, never ask again and never go back to listening.
      if (findIntervalRef.current) {
        window.clearInterval(findIntervalRef.current);
        findIntervalRef.current = null;
      }

      isProcessingRef.current = false;
      errorPauseUntilRef.current = 0;
      lastGeminiCallAtRef.current = 0;

      lastScanSpeechAtRef.current = 0;
      lastSpokenDirectionRef.current = null;
      lastSpokenTextRef.current = '';
      lastSpokenTimeRef.current = 0;
      lastUiStatusRef.current = '';
      lastUiDirectionRef.current = null;

      isSessionActiveRef.current = true;
      isAwaitingTargetRef.current = false;
      hasSpokenScanningStartedRef.current = true;
      lastGeminiCallAtRef.current = 0;

      targetItemLabelRef.current = canonicalTarget;
      setTargetItem(canonicalTarget);
      setIsAwaitingTarget(false);
      setIsSessionActive(true);

      // UI initialization.
      setUiStateIfChanged('Scanning', null);
      setLastResult('Scanning');

      // Speak exactly once at session start.
      lastSpokenTextRef.current = '';
      lastSpokenTimeRef.current = 0;
      speakControlled('Scanning started');

      // Start local model best-effort.
      loadLocalDetector().catch(() => {});

      // Ensure only one interval exists.
      if (findIntervalRef.current) {
        window.clearInterval(findIntervalRef.current);
        findIntervalRef.current = null;
      }

      const NOT_FOUND_SPEECH_INTERVAL_MS = 7000; // within 6–8 seconds
      const GEMINI_MIN_INTERVAL_MS = 4000; // reduce API load while staying guided
      const FOUND_AREA_THRESHOLD = 0.14;
      const LEFT_ZONE_THRESHOLD = 0.34;
      const RIGHT_ZONE_THRESHOLD = 0.66;

      findIntervalRef.current = window.setInterval(() => {
        if (!isSessionActiveRef.current) return;
        if (Date.now() < errorPauseUntilRef.current) return;
        if (!cameraRef.current) return;
        if (isProcessingRef.current) return;

        isProcessingRef.current = true;

        void (async () => {
          try {
            const now = Date.now();
            const frameCanvas = cameraRef.current!.captureCanvas();
            if (!frameCanvas) return;

            let candidate: { x: number; y: number; area: number; confidence: number; found: boolean; detectedLabel?: string } | null =
              null;

            // 1) Local detection (target-only)
            const localLocate = await locateTargetLocally(frameCanvas, capturedTargetSpoken);
            if (
              localLocate &&
              localLocate.found &&
              normalizeStr(localLocate.detectedLabel) === normalizeStr(targetItemLabelRef.current)
            ) {
              candidate = localLocate;
            }

            // 2) Gemini fallback (only when local missed)
            if (!candidate) {
              if (now - lastGeminiCallAtRef.current >= GEMINI_MIN_INTERVAL_MS) {
                lastGeminiCallAtRef.current = now;
                const imageBase64 = cameraRef.current!.capture();
                if (imageBase64) {
                  const locate = await locateTargetObject(imageBase64, targetItemLabelRef.current, language);

                  if (locate?.rateLimited) {
                    errorPauseUntilRef.current = Date.now() + 3000;
                    speakControlled('System busy, retrying');
                    return;
                  }

                  if (
                    locate?.found &&
                    locate.detectedLabel &&
                    normalizeStr(locate.detectedLabel) === normalizeStr(targetItemLabelRef.current)
                  ) {
                    candidate = {
                      x: locate.x,
                      y: locate.y,
                      area: locate.area,
                      confidence: locate.confidence,
                      found: true,
                      detectedLabel: locate.detectedLabel,
                    };
                  }
                }
              }
            }

            // Guidance logic (target-only; ignore everything else)
            if (candidate) {
              const isMirroredView = cameraRef.current!.getViewInfo().isMirrored ?? false;
              const normalizedX = isMirroredView ? 1 - candidate.x : candidate.x;

              let direction: FindDirection;
              if (normalizedX < LEFT_ZONE_THRESHOLD) direction = 'LEFT';
              else if (normalizedX > RIGHT_ZONE_THRESHOLD) direction = 'RIGHT';
              else direction = 'CENTER';

              const isLargeEnough = candidate.area >= FOUND_AREA_THRESHOLD;

              if (direction === 'CENTER' && isLargeEnough) {
                const foundMsg = "Found it! It's right in front of you";
                appendHistory('Find Items', foundMsg);
                setUiStateIfChanged('Found', 'CENTER');
                speakControlled(foundMsg);
                endFindSessionOnFound();
                return;
              }

              if (direction === 'LEFT') {
                setUiStateIfChanged('Move Left', 'LEFT');
                if (lastSpokenDirectionRef.current !== 'LEFT') {
                  speakControlled('Move left');
                  lastSpokenDirectionRef.current = 'LEFT';
                }
              } else if (direction === 'RIGHT') {
                setUiStateIfChanged('Move Right', 'RIGHT');
                if (lastSpokenDirectionRef.current !== 'RIGHT') {
                  speakControlled('Move right');
                  lastSpokenDirectionRef.current = 'RIGHT';
                }
              } else {
                // CENTER but not large enough
                setUiStateIfChanged('Move closer', 'CENTER');
                if (lastSpokenDirectionRef.current !== 'CENTER') {
                  speakControlled('Move closer');
                  lastSpokenDirectionRef.current = 'CENTER';
                }
              }
            } else {
              // Not found: scanning guidance throttled.
              lastSpokenDirectionRef.current = null; // allow movement voice again when re-acquired
              setUiStateIfChanged('Scanning', null);

              if (now - lastScanSpeechAtRef.current >= NOT_FOUND_SPEECH_INTERVAL_MS) {
                speakControlled('Scanning... move camera slowly');
                lastScanSpeechAtRef.current = now;
              }
            }
          } catch {
            errorPauseUntilRef.current = Date.now() + 3000;
            speakControlled('System busy, retrying');
          } finally {
            isProcessingRef.current = false;
          }
        })();
      }, 2000);
    },
    [
      appendHistory,
      canonicalizeTargetLabel,
      endFindSessionOnFound,
      language,
      loadLocalDetector,
      locateTargetLocally,
      locateTargetObject,
      normalizeStr,
      speakControlled,
      setUiStateIfChanged,
    ]
  );

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
          // handled above
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
          case 'FIND':
            // If we are already in FIND view, treat this as "start next search"
            // instead of trying to re-enter the same mode (which early-returns).
            if (
              currentModeRef.current === AppMode.FIND &&
              activeViewRef.current === 'FEATURE' &&
              !isSessionActiveRef.current &&
              !isAwaitingTargetRef.current
            ) {
              promptForTargetOnce();
            } else {
              handleModeChange(AppMode.FIND);
            }
            break;
          case 'STOP':
            if (
              currentModeRef.current === AppMode.FIND &&
              (isSessionActiveRef.current || isAwaitingTargetRef.current)
            ) {
              cancelFindSession();
            }
            stopSpeech();
            vibrate(50);
            break;
          case 'HELP':
            handleShowHelp();
            break;
          case 'BATTERY':
            if ('getBattery' in navigator) {
              const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> };
              nav.getBattery?.().then((battery) => {
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
          case 'HOME':
            handleBackToHome();
            break;
          case 'HISTORY':
            handleShowHistory();
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
  }, [cancelFindSession, handleModeChange, handleSOS, handleShowHelp, handleShowHistory, promptForTargetOnce]); 

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

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
    localStorage.setItem('eyefi_onboarding_done', 'true');
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

  useEffect(() => {
    if (currentMode === AppMode.FIND && activeView === 'FEATURE') {
      // Session lock: ask once, only when neither scanning nor already waiting.
      if (!isSessionActiveRef.current && !isAwaitingTargetRef.current) {
        promptForTargetOnce();
      }
      return;
    }

    // Leaving FIND view: cancel silently (no extra voice spam).
    if (isSessionActiveRef.current || isAwaitingTargetRef.current) {
      cancelFindSession();
    }
  }, [activeView, cancelFindSession, currentMode, promptForTargetOnce]);

  useEffect(() => {
    if (currentMode !== AppMode.FIND || !transcript) return;

    const lower = transcript.toLowerCase();

    // Stop command (user control)
    const wantsStop =
      lower.includes('stop finding') ||
      lower.includes('stop search') ||
      /\bdone\b/.test(lower);

    if (wantsStop) {
      cancelFindSession({ message: 'Stopped finding.' });
      return;
    }

    // Capture item name ONCE (session lock). After that we never ask again.
    if (isSessionActiveRef.current) return;
    if (!isAwaitingTargetRef.current) return;

    const extracted = extractTargetItemFromTranscript(lower);
    if (!extracted) return;

    startFindSession(extracted);
  }, [cancelFindSession, currentMode, extractTargetItemFromTranscript, startFindSession, transcript]);

  useEffect(() => {
    if (activeView !== 'HISTORY') return;

    if (historyItems.length === 0) {
      const msg = 'No history available';
      setLastHistorySpoken(msg);
      speakText(msg, true);
      return;
    }

    const latest = historyItems[0];
    const msg = `Last activity: ${latest.result}`;
    setLastHistorySpoken(msg);
    speakText(msg, true);
  }, [activeView, historyItems]);

  useEffect(() => {
    if (activeView !== 'HISTORY') return;
    if (!transcript) return;

    const lower = transcript.toLowerCase();
    if (lower.includes('repeat')) {
      if (lastHistorySpoken) {
        speakText(lastHistorySpoken, true);
      }
      return;
    }

    if (lower.includes('hey vision home') || lower.includes('home')) {
      handleBackToHome();
    }
  }, [activeView, handleBackToHome, lastHistorySpoken, transcript]);

  useEffect(() => {
    if (activeView !== 'HELP') return;
    setLastHelpSpoken(HELP_SPOKEN_TEXT);
    // Delay one tick so screen transition completes before speaking.
    const timer = window.setTimeout(() => {
      speakText(HELP_SPOKEN_TEXT, true);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'HELP') return;
    if (!transcript) return;

    const lower = transcript.toLowerCase();
    if (lower.includes('repeat help') || (lower.includes('repeat') && lower.includes('help'))) {
      if (lastHelpSpoken) {
        speakText(lastHelpSpoken, true);
      }
      return;
    }

    if (lower.includes('hey vision home')) {
      handleBackToHome();
    }
  }, [activeView, handleBackToHome, lastHelpSpoken, transcript]);

  if (apiKeyMissing) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-center p-6 text-eyefi-alert">
        <h1 className="text-3xl font-bold mb-4">Configuration Error</h1>
        <p className="text-white text-lg">
          `VITE_GEMINI_API_KEY` environment variable is missing.
        </p>
      </div>
    );
  }

  if (!hasCompletedOnboarding) {
    return <Onboarding onComplete={completeOnboarding} />;
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
                onHomeNav={handleBackToHome}
                onHistory={handleShowHistory}
                onHelp={handleShowHelp}
                isListening={isListening}
                isProcessing={isProcessing}
                statusMessage={isListening ? "Listening for Hey Vision..." : isProcessing ? "Processing..." : ''}
                onToggleMic={toggleMic}
              />
            ) : activeView === 'HISTORY' ? (
              <div className="h-full w-full overflow-y-auto bg-black text-white p-6 md:p-8">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-4xl font-bold mb-3">History</h2>
                  <p className="text-lg text-gray-200 mb-6">Recent activities (latest first)</p>

                  {historyItems.length === 0 ? (
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center">
                      <p className="text-3xl font-semibold text-white">No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {historyItems.slice(0, 6).map((item) => (
                        <div
                          key={`${item.timestamp}-${item.result}`}
                          className="bg-gray-900 border border-gray-700 rounded-2xl p-5"
                        >
                          <p className="text-xl font-bold text-eyefi-primary">{item.type}</p>
                          <p className="text-2xl font-semibold text-white mt-2">{item.result}</p>
                          <p className="text-sm text-gray-300 mt-3">
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={handleBackToHome} className="mt-8 px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl">Back to Home</button>
                </div>
              </div>
            ) : activeView === 'HELP' ? (
              <div className="h-full w-full overflow-y-auto bg-black text-white p-6 md:p-8">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-4xl md:text-5xl font-bold mb-3">Vision AI Help</h2>
                  <p className="text-xl text-gray-100 mb-2">{HELP_INTRO_TEXT}</p>
                  <div className="mb-8" />

                  <div className="space-y-4">
                    {HELP_ITEMS.map((item) => (
                      <div key={item.title} className="bg-gray-900 border-2 border-gray-700 rounded-2xl p-5 md:p-6">
                        <div className="flex items-start gap-4">
                          <span className="text-3xl" aria-hidden>{item.icon}</span>
                          <div className="flex-1">
                            <h3 className="text-2xl md:text-3xl font-bold text-eyefi-primary">{item.title}</h3>
                            <p className="text-xl text-white mt-2">{item.description}</p>
                            <p className="text-lg text-yellow-300 mt-3">Say: {item.command}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleBackToHome} className="mt-8 px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl text-lg">
                    Back to Home
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Header for Feature View */}
                <header className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start bg-gradient-to-b from-black to-transparent h-24 pointer-events-none">
                  <div>
                    <h1 className="text-eyefi-primary font-bold text-xl drop-shadow-md">Vision AI</h1>
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
                      <Camera
                        ref={cameraRef}
                        isActive={
                          !showSettings
                          && activeView === 'FEATURE'
                          && (
                            currentMode !== AppMode.FIND
                            || isSessionActive
                            || isAwaitingTarget
                            || findStatus === 'Found'
                          )
                        }
                      />

                      {/* Result Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-6 min-h-[160px] flex items-end justify-center pb-12">
                         <div className="text-center max-w-2xl w-full">
                           <p className="text-eyefi-primary text-2xl md:text-3xl font-bold leading-snug drop-shadow-md bg-black/40 p-4 rounded-xl">
                             {isProcessing ? "Analyzing..." : lastResult}
                           </p>
                           {currentMode === AppMode.FIND && (
                             <div className="mt-4 bg-black/70 border-2 border-yellow-300 rounded-xl p-4 text-left">
                              <p className="text-2xl font-bold text-yellow-300">Finding: {targetItem || 'Waiting...'}</p>
                               <p className="text-xl font-semibold text-white mt-2">Status: {findStatus}</p>
                               <p className="text-5xl font-bold text-yellow-200 mt-3 text-center" aria-live="polite">
                                 {findDirection === 'LEFT' ? '⬅' : findDirection === 'RIGHT' ? '➡' : findDirection === 'CENTER' ? '⬤' : '⟳'}
                               </p>
                             </div>
                           )}
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
                    onAnalyze={() => {
                      if (currentMode === AppMode.FIND) {
                        if (!isSessionActiveRef.current && !isAwaitingTargetRef.current) {
                          promptForTargetOnce();
                        }
                        return;
                      }
                      handleAnalyze();
                    }}
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