let currentLanguage = 'en-US';
let ttsSpeaking = false;
let lastTtsEndAt = 0;

export const setTtsLanguage = (lang: string) => {
  currentLanguage = lang;
};

export const speakText = (text: string, force: boolean = false) => {
  if (!window.speechSynthesis) return;

  // Cancel current speech if forced or if piling up
  if (force || window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    ttsSpeaking = false;
    lastTtsEndAt = Date.now();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0; 
  utterance.pitch = 1.0;
  utterance.lang = currentLanguage;
  
  // Prefer a clear voice for the selected language
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang.includes(currentLanguage) && v.name.includes('Google')) 
    || voices.find(v => v.lang.includes(currentLanguage)) 
    || voices[0];
    
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onstart = () => {
    ttsSpeaking = true;
  };
  utterance.onend = () => {
    ttsSpeaking = false;
    lastTtsEndAt = Date.now();
  };
  utterance.onerror = () => {
    ttsSpeaking = false;
    lastTtsEndAt = Date.now();
  };

  window.speechSynthesis.speak(utterance);
};

export const stopSpeech = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    ttsSpeaking = false;
    lastTtsEndAt = Date.now();
  }
};

export const vibrate = (pattern: number | number[]) => {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const isTtsSpeaking = () => ttsSpeaking || (window.speechSynthesis?.speaking ?? false);
export const getLastTtsEndAt = () => lastTtsEndAt;