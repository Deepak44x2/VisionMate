

export const speak = (text: string) => {
  
  if (!('speechSynthesis' in window)) {
    console.error("Text-to-Speech is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(voice => 
    voice.name.includes('Google US English') || 
    voice.name.includes('Samantha') || 
    voice.lang === 'en-US'
  );

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  
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