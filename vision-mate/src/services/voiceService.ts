import type { CommandMapping, VoiceAction } from '../types';
import { getLastTtsEndAt, isTtsSpeaking } from './ttsService';

export type VoiceCommandCallback = (command: VoiceAction) => void;
export type StatusCallback = (isListening: boolean) => void;
export type TranscriptCallback = (text: string) => void;

export class VoiceService {
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
      'hey vision', 'hi vision', 'a vision', 'hey visual', 'vision', 'hey mate', 'wifi', 'hi-fi', 'ok vision', 'okay vision',
      'hola vision', 'bonjour vision', 'hallo vision', 'ciao vision', 'こんにちは vision', '안녕 vision', '你好 vision', 'नमस्ते vision'
    ];
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
    const stopWords = ['stop', 'quiet', 'silence', 'parar', 'detener', 'silencio', 'cállate', 'arrêter', 'tais-toi', 'halt', 'stopp', 'ruhe', 'fermati', 'basta', '止まれ', '静かに', '멈춰', '조용히', '停止', '安静', 'रुको', 'चुप', 'शांत'];
    if (stopWords.some(w => lowerText.includes(w))) {
      this.onCommand('STOP');
      return;
    }
    
    const sosWords = ['sos', 'help me', 'emergency', 'ayuda', 'emergencia', 'au secours', 'urgence', 'hilfe', 'notfall', 'aiuto', 'emergenza', '助けて', '緊急', '도와줘', '응급', '救命', '紧急', 'बचाओ', 'आपातकालीन'];
    if (sosWords.some(w => lowerText.includes(w))) {
      this.onCommand('SOS');
      return;
    }

    const batteryWords = ['battery', 'power', 'charge', 'status', 'batería', 'energía', 'carga', 'batterie', 'puissance', 'akku', 'strom', 'batteria', 'carica', 'バッテリー', '電池', '배터리', '전원', '电池', '电量', 'बैटरी', 'चार्ज'];
    if (batteryWords.some(w => lowerText.includes(w))) {
      this.onCommand('BATTERY');
      return;
    }

    const helpWords = ['help', 'ayuda', 'aide', 'hilfe', 'aiuto', '助け', '도움', '帮助', 'मदद'];
    if (helpWords.some(w => lowerText.includes(w)) && !sosWords.some(w => lowerText.includes(w))) {
      this.onCommand('HELP');
      return;
    }

    const homeWords = ['home', 'back to home', 'go home', 'main screen', 'dashboard'];
    if (homeWords.some(w => lowerText.includes(w))) {
      this.onCommand('HOME');
      return;
    }

    const historyWords = ['history', 'open history', 'show history', 'recent activity', 'recent activities'];
    if (historyWords.some(w => lowerText.includes(w))) {
      this.onCommand('HISTORY');
      return;
    }

    // Determine if the user is asking to scan/analyze right now
    const scanWords = [
      'what is', "what's", 'identify', 'scan', 'tell me', 'read this', 'find this', 'detect', 'who is', 'check',
      'qué es', 'identificar', 'escanear', 'dime', 'lee esto', 'encuentra esto', 'detectar', 'quién es', 'revisar',
      "qu'est-ce que", 'identifier', 'scanner', 'dis-moi', 'lis ça', 'trouve ça', 'détecter', 'qui est', 'vérifier',
      'was ist', 'identifizieren', 'scannen', 'sag mir', 'lies das', 'finde das', 'erkennen', 'wer ist', 'prüfen',
      'cosa è', 'identifica', 'scansiona', 'dimmi', 'leggi questo', 'trova questo', 'rileva', 'chi è', 'controlla',
      '何', '識別', 'スキャン', '教えて', '読んで', '見つけて', '検出', '誰', '確認',
      '뭐야', '식별', '스캔', '말해줘', '읽어줘', '찾아줘', '감지', '누구', '확인',
      '是什么', '识别', '扫描', '告诉我', '读这个', '找到这个', '检测', '是谁', '检查',
      'क्या है', 'पहचानो', 'स्कैन', 'बताओ', 'पढ़ो', 'ढूंढो', 'पता लगाओ', 'कौन है', 'चेक'
    ];
    const wantsScan = scanWords.some(w => lowerText.includes(w));

    let modeChanged = false;

    // Default Commands for Modes
    const sceneWords = ['scene', 'environment', 'around me', 'describe', 'escena', 'entorno', 'a mi alrededor', 'describir', 'scène', 'environnement', 'autour de moi', 'décrire', 'szene', 'umgebung', 'um mich herum', 'beschreiben', 'scena', 'ambiente', 'intorno a me', 'descrivi', 'シーン', '環境', '周り', '説明して', '장면', '환경', '내 주변', '설명해', '场景', '环境', '周围', '描述', 'दृश्य', 'माहौल', 'मेरे आसपास', 'वर्णन करो'];
    const readWords = ['read', 'text', 'word', 'document', 'leer', 'texto', 'palabra', 'documento', 'lire', 'texte', 'mot', 'lesen', 'wort', 'dokument', 'leggi', 'testo', 'parola', '読む', 'テキスト', '単語', '文書', '읽기', '텍스트', '단어', '문서', '阅读', '文本', '单词', '文档', 'पढ़ना', 'टेक्स्ट', 'शब्द', 'दस्तावेज़'];
    const findWords = ['find', 'search', 'locate', 'encontrar', 'buscar', 'localizar', 'trouver', 'chercher', 'localiser', 'finden', 'suchen', 'lokalisieren', 'trova', 'cerca', 'localizza', '見つける', '探す', '配置する', '찾기', '검색', '위치', '寻找', '搜索', '定位', 'ढूंढना', 'खोजना', 'पता लगाना'];
    const moneyWords = ['money', 'cash', 'dollar', 'currency', 'rupee', 'note', 'coin', 'dinero', 'efectivo', 'dólar', 'moneda', 'billete', 'argent', 'espèces', 'devise', 'pièce', 'geld', 'bargeld', 'währung', 'münze', 'soldi', 'contanti', 'dollaro', 'valuta', 'banconota', 'moneta', 'お金', '現金', 'ドル', '通貨', 'ルピー', '紙幣', '硬貨', '돈', '현금', '달러', '통화', '루피', '지폐', '동전', '钱', '现金', '美元', '货币', '卢比', '纸币', '硬币', 'पैसा', 'नकद', 'डॉलर', 'मुद्रा', 'रुपया', 'नोट', 'सिक्का'];
    const colorWords = ['color', 'colour', 'kon sa color', 'konsa color', 'couleur', 'farbe', 'colore', '色', '색상', '颜色', 'रंग'];
    const faceWords = ['face', 'person', 'who is', 'who are', 'cara', 'persona', 'quién es', 'quiénes son', 'visage', 'personne', 'qui est', 'qui sont', 'gesicht', 'person', 'wer ist', 'wer sind', 'viso', 'chi è', 'chi sono', '顔', '人', '誰', '얼굴', '사람', '누구', '脸', '是谁', 'चेहरा', 'व्यक्ति', 'कौन है'];
    const objectWords = ['object', 'item', 'things', 'objeto', 'artículo', 'cosas', 'objet', 'article', 'choses', 'objekt', 'artikel', 'dinge', 'oggetto', 'articolo', 'cose', 'オブジェクト', 'アイテム', '物', '개체', '항목', '사물', '物体', '物品', '东西', 'वस्तु', 'आइटम', 'चीजें'];
    const calculatorWords = ['calculator', 'calculate', 'math', 'calculadora', 'calculatrice', 'taschenrechner', 'calcolatrice', '電卓', '계산기', '计算器', 'कैलकुलेटर'];

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
      modeChanged = true;
    } else if (calculatorWords.some(w => lowerText.includes(w))) {
      this.onCommand('CALCULATOR');
      modeChanged = true;
    }

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
      // Ignore start errors (e.g. if already started)
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