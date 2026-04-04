import { AppMode } from '../types';

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export type VoiceCommand = 
  | { type: 'CHANGE_MODE', mode: AppMode }
  | { type: 'ANALYZE' }
  | { type: 'SOS' }
  | { type: 'UNKNOWN', text: string };

export class VoiceService {
  private recognition: any = null;
  private isListening: boolean = false;
  private onCommandCallback: ((command: VoiceCommand) => void) | null = null;
  private wakeWordActive: boolean = false;
  private wakeWordTimeout: NodeJS.Timeout | null = null;
  private restartTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (!SpeechRecognition) {
      console.error("Speech Recognition is not supported in this browser.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true; 
    this.recognition.interimResults = false; 
    this.recognition.lang = 'en-US';

    this.recognition.onresult = this.handleResult.bind(this);
    
    this.recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
    };

    this.recognition.onsoundstart = () => {
      console.log("🎤 Microphone is picking up sound...");
    };

    this.recognition.onspeechstart = () => {
      console.log("🗣️ Browser detects human speech...");
    };

    this.recognition.onend = () => {
      console.log("Speech recognition ended.");
      if (this.isListening) {
        if (this.restartTimeout) clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
            console.log("Attempting to restart speech recognition...");
            try {
              this.recognition.start();
            } catch (e) {
              console.error("Failed to restart recognition:", e);
            }
        }, 1000);
      }
    };
  }

  public startListening(callback: (command: VoiceCommand) => void) {
    if (!this.recognition) return;
    this.onCommandCallback = callback;
    this.isListening = true;
    try {
      this.recognition.start();
      console.log("Voice recognition started. Listening for 'Hey Vision'...");
    } catch (e) {
      console.log("Recognition already started.");
    }
  }

  public stopListening() {
    this.isListening = false;
    if (this.restartTimeout) clearTimeout(this.restartTimeout);
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  private handleResult(event: any) {
    const current = event.resultIndex;
    const transcript = event.results[current][0].transcript.toLowerCase().trim();
    
    console.log("Heard:", transcript);

    // Fuzzy matching for the wake word
    if (
      transcript.includes("hey vision") || 
      transcript.includes("hi vision") || 
      transcript.includes("okay vision") ||
      transcript.includes("division") || // Added based on your logs!
      transcript.includes("a vision") ||
      transcript.includes("hey listen")||
      transcript.includes("revision") 

    ) {
      this.activateWakeWord();
      return;
    }

    if (this.wakeWordActive) {
      this.processCommand(transcript);
    }
  }

  private activateWakeWord() {
    this.wakeWordActive = true;
    console.log("Wake word detected! Listening for command...");
    
    if (this.wakeWordTimeout) clearTimeout(this.wakeWordTimeout);
    
    this.wakeWordTimeout = setTimeout(() => {
      this.wakeWordActive = false;
      console.log("Wake word window closed.");
    }, 8000); 
  }

  private processCommand(transcript: string) {
    if (!this.onCommandCallback) return;

    let command: VoiceCommand = { type: 'UNKNOWN', text: transcript };

    if (transcript.includes("sos") || transcript.includes("help me") || transcript.includes("emergency")) {
      command = { type: 'SOS' };
    }
    else if (transcript.includes("scan") || transcript.includes("analyze") || transcript.includes("what is this") || transcript.includes("tell me")) {
      command = { type: 'ANALYZE' };
    }
    else if (transcript.includes("scene") || transcript.includes("environment") || transcript.includes("around me")) {
      command = { type: 'CHANGE_MODE', mode: AppMode.SCENE };
    }
    else if (transcript.includes("read") || transcript.includes("text") || transcript.includes("document")) {
      command = { type: 'CHANGE_MODE', mode: AppMode.READ };
    }
    else if (transcript.includes("find") || transcript.includes("search") || transcript.includes("locate")) {
      command = { type: 'CHANGE_MODE', mode: AppMode.FIND };
    }
    else if (transcript.includes("money") || transcript.includes("cash") || transcript.includes("currency") || transcript.includes("dollar")) {
      command = { type: 'CHANGE_MODE', mode: AppMode.MONEY };
    }
    else if (transcript.includes("color") || transcript.includes("colour")) {
      command = { type: 'CHANGE_MODE', mode: AppMode.COLOR };
    }

    if (command.type !== 'UNKNOWN') {
      this.onCommandCallback(command);
      this.wakeWordActive = false;
      if (this.wakeWordTimeout) clearTimeout(this.wakeWordTimeout);
    }
  }
}

export const voiceService = new VoiceService();