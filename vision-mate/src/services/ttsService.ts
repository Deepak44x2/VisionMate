// src/services/ttsService.ts

export const speak = (text: string) => {
  // Check if the browser supports speech synthesis
  if (!('speechSynthesis' in window)) {
    console.error("Text-to-Speech is not supported in this browser.");
    return;
  }

  // Cancel any ongoing speech before starting a new one
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Optional: Customize the voice
  // We try to find a clear, natural-sounding English voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(voice => 
    voice.name.includes('Google US English') || 
    voice.name.includes('Samantha') || 
    voice.lang === 'en-US'
  );

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  // Set the rate slightly faster than normal (visually impaired users often prefer faster speech)
  utterance.rate = 1.1;
  utterance.pitch = 1.0;

  // Speak!
  window.speechSynthesis.speak(utterance);
};

export const stopSpeaking = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};