import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { speak } from '../services/ttsService';

const SOSButton: React.FC = () => {
  const [isLocating, setIsLocating] = useState(false);

  const handleSOS = () => {
    // Vibrate intensely to confirm the button was pressed
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 500]);
    }
    
    speak("Activating emergency SOS. Locating you now.");
    setIsLocating(true);

    if (!navigator.geolocation) {
      speak("GPS is not supported on this device.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsLink = https://www.google.com/maps/search/?api=1&query=${latitude},${longitude};
        
        const message = EMERGENCY: I am visually impaired and need assistance. Here is my exact location: ${mapsLink};
        
        // Encode the message for a URL
        const encodedMessage = encodeURIComponent(message);
        
        // Open WhatsApp with the pre-filled message
        // Note: In a real app, you'd let them configure an emergency contact number.
        // For the hackathon, we just open the app so they can pick a contact.
        window.open(https://wa.me/?text=${encodedMessage}, '_blank');
        
        speak("Location found. Opening WhatsApp.");
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        speak("Failed to get your location. Please check GPS permissions.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <button
      onClick={handleSOS}
      disabled={isLocating}
      className={`absolute top-6 right-6 z-50 p-4 rounded-full shadow-lg transition-transform active:scale-90 flex items-center justify-center ${
        isLocating ? 'bg-gray-600 animate-pulse' : 'bg-eyefi-alert hover:bg-red-600'
      }`}
      aria-label="Emergency SOS"
    >
      <AlertTriangle size={28} className="text-white" />
    </button>
  );
};

export default SOSButton;