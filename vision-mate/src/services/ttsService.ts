// src/services/ttsService.ts

export const speak = (text: string) => {
  // Check if the browser supports speech synthesis
  if (!('speechSynthesis' in window)) {
    console.error("Text-to-Speech is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();

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

  // Set the rate slightly faster than normal (visually impaired users often prefer faster speech)
  utterance.rate = 1.1;
  utterance.pitch = 1.0;

  // Speak!
  window.speechSynthesis.speak(utterance);
};

export const stopSpeech = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

export const vibrate = (pattern: number | number[]) => {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};