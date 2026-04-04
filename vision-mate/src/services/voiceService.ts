import type { CommandMapping, VoiceAction } from '../types';
import { getLastTtsEndAt, isTtsSpeaking } from './ttsService';

export type VoiceCommandCallback = (command: VoiceAction) => void;
export type StatusCallback = (isListening: boolean) => void;
export type TranscriptCallback = (text: string) => void;

export class voiceService {
  recognition: any;
  isListening: boolean = false;
  private onCommand: VoiceCommandCallback;
  private onStatusChange: StatusCallback;
  private onTranscript?: TranscriptCallback;
  private restartTimer: any = null;
  private stoppingIntentionally: boolean = false;
  private customMappings: CommandMapping[] = [];
  private networkErrorBackoff: boolean = false;
  private readonly TTS_ECHO_GUARD_MS = 1200;
  
  // Wake Word Configuration
  private lastWakeTime: number = 0;
  private readonly WAKE_WINDOW = 8000; // 8 seconds active listening after wake word

  constructor(onCommand: VoiceCommandCallback, onStatusChange: StatusCallback, onTranscript?: TranscriptCallback) {
    this.onCommand = onCommand;
    this.onStatusChange = onStatusChange;
    this.onTranscript = onTranscript;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false; // Restart manually for stability
      this.recognition.lang = 'en-US';
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        // Ignore microphone input while app TTS is playing or right after it ends.
        if (isTtsSpeaking() || (Date.now() - getLastTtsEndAt() < this.TTS_ECHO_GUARD_MS)) {
          return;
        }
        console.log("Heard:", transcript);
        if (this.onTranscript) this.onTranscript(transcript);
        this.processCommand(transcript);
        this.networkErrorBackoff = false; 
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        
        if (event.error === 'network') {
          this.networkErrorBackoff = true;
          return;
        }

        console.warn("Speech Recognition Error:", event.error);
      };

      this.recognition.onend = () => {
        if (this.isListening && !this.stoppingIntentionally) {
          const delay = this.networkErrorBackoff ? 2000 : 100;
          
          this.restartTimer = setTimeout(() => {
            try {
              if (this.isListening) {
                // Check online status before retrying if network failed previously
                if (this.networkErrorBackoff && !navigator.onLine) {
                   return; 
                }
                this.recognition.start();
              }
            } catch (e) {
              // Ignore
            }
          }, delay);
        } else {
          this.isListening = false;
          this.onStatusChange(false);
        }
      };
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
    }
  }

  setLanguage(lang: string) {
    if (this.recognition) {
      this.recognition.lang = lang;
      // If currently listening, we need to restart to apply the new language
      if (this.isListening) {
        this.stop();
        setTimeout(() => this.start(), 100);
      }
    }
  }

  setMappings(mappings: CommandMapping[]) {
    this.customMappings = mappings;
  }

  processCommand(text: string) {
    const lowerText = text.toLowerCase();
    
    // 1. Check for Wake Word
    // Includes variations for accents/misinterpretations and multiple languages
    const wakeWords = [
      'hey vision', 'hi vision', 'a vision', 'hey visual', 'vision' ];
    const hasWakeWord = wakeWords.some(w => lowerText.includes(w));

    if (hasWakeWord) {
      this.lastWakeTime = Date.now();
      // Notify App that wake word was detected (to trigger beep/vibe)
      this.onCommand('WAKE'); 
    }

    // 2. Gatekeeper: Only proceed if wake word seen recently
    if (!hasWakeWord && (Date.now() - this.lastWakeTime > this.WAKE_WINDOW)) {
      // Ignore this input
      return;
    }

    // Reset wake time so they can chain commands without saying "Hey Vision" again immediately
    this.lastWakeTime = Date.now();

    // 3. Process Commands
    
    // Check Custom Mappings First
    for (const mapping of this.customMappings) {
      if (lowerText.includes(mapping.phrase.toLowerCase())) {
        console.log(`Custom match: "${mapping.phrase}"`);
        this.onCommand(mapping.action);
        return;
      }
    }

    // High Priority Commands (Stop, SOS, Battery, Help)
    const stopWords = ['stop', 'quiet', 'silence', ];
    if (stopWords.some(w => lowerText.includes(w))) {
      this.onCommand('STOP');
      return;
    }
    
    const sosWords = ['sos', 'help me', 'emergency'];
    if (sosWords.some(w => lowerText.includes(w))) {
      this.onCommand('SOS');
      return;
    }

    const batteryWords = ['battery', 'power', 'charge'];
    if (batteryWords.some(w => lowerText.includes(w))) {
      this.onCommand('BATTERY');
      return;
    }

    const helpWords = ['help'];
    if (helpWords.some(w => lowerText.includes(w)) && !sosWords.some(w => lowerText.includes(w))) {
      this.onCommand('HELP');
      return;
    }

    const homeWords = ['home', 'back to home', 'go home', 'main screen', 'dashboard'];
    if (homeWords.some(w => lowerText.includes(w))) {
      this.onCommand('HOME');
      return;
    }

    const historyWords = ['history', 'open history', 'show history'];
    if (historyWords.some(w => lowerText.includes(w))) {
      this.onCommand('HISTORY');
      return;
    }

    // Determine if the user is asking to scan/analyze right now
    const scanWords = [
      'what is', "what's", 'identify', 'scan', 'tell me', 'read this', 'find this', 'detect', 'who is', 'check'
    ];
    const wantsScan = scanWords.some(w => lowerText.includes(w));

    let modeChanged = false;

    // Default Commands for Modes
    const sceneWords = ['scene', 'environment', 'around me', 'describe'];
    const readWords = ['read', 'text', 'word', 'document'];
    const findWords = ['find', 'search', 'locate'];
    const moneyWords = ['money', 'cash'];
    const colorWords = ['color', 'colour'];
    const faceWords = ['face', 'person', 'who is'];
    const objectWords = ['object', 'item', 'things'];

    if (sceneWords.some(w => lowerText.includes(w))) {
      this.onCommand('SCENE');
      modeChanged = true;
    } else if (readWords.some(w => lowerText.includes(w))) {
      this.onCommand('READ');
      modeChanged = true;
    } else if (findWords.some(w => lowerText.includes(w))) {
      this.onCommand('FIND');
      modeChanged = true;
    } else if (moneyWords.some(w => lowerText.includes(w))) {
      this.onCommand('MONEY');
      modeChanged = true;
    } else if (colorWords.some(w => lowerText.includes(w))) {
      this.onCommand('COLOR');
      modeChanged = true;
    } else if (faceWords.some(w => lowerText.includes(w))) {
      this.onCommand('FACE');
      modeChanged = true;
    } else if (objectWords.some(w => lowerText.includes(w))) {
      this.onCommand('OBJECT');
      modeChanged = true; }

    // Handle Scanning Logic
    if (modeChanged && wantsScan) {
      // If they changed mode AND asked a question (e.g. "what is this currency"), trigger scan after a short delay
      setTimeout(() => this.onCommand('SCAN'), 1500);
    } else if (!modeChanged && wantsScan) {
      // If they just said "what is this" or "scan" without a specific mode, emit SCAN
      this.onCommand('SCAN');
    }
  }

  toggle() {
    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  }

  start() {
    if (!this.recognition) return;
    this.stoppingIntentionally = false;
    this.isListening = true;
    this.lastWakeTime = 0; // Require wake word to reduce accidental triggers from ambient noise
    this.onStatusChange(true);
    try {
      this.recognition.start();
    } catch (e) {
      // Ignore already started errors
    }
  }

  stop() {
    if (!this.recognition) return;
    this.stoppingIntentionally = true;
    this.isListening = false;
    this.onStatusChange(false);
    if (this.restartTimer) clearTimeout(this.restartTimer);
    try {
        this.recognition.stop();
    } catch(e) { /* ignore */ }
  }
}