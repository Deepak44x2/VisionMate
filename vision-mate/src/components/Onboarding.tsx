import { useState } from 'react';

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: 'Tap the Mic and Speak',
      description: 'Use your voice to control Vision AI. Just tap the microphone button and speak your command.',
    },
    {
      title: 'Use Tiles for Quick Access',
      description: 'Large, colorful tiles give you instant access to all features. Simply tap any tile to get started.',
    },
    {
      title: 'We Guide You with Voice',
      description: 'Every action provides clear audio feedback. Adjust settings anytime to match your preferences.',
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => onComplete();

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full space-y-12 text-center">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-16 inline-flex mx-auto">
            <span className="text-6xl">🎙️</span>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">{slide.title}</h1>
            <p className="text-2xl md:text-3xl text-white/80 leading-relaxed">{slide.description}</p>
          </div>

          <div className="flex justify-center gap-3">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-3 rounded-full transition-all ${index === currentSlide ? 'w-12 bg-yellow-500' : 'w-3 bg-white/30'}`}
                aria-label={`Slide ${index + 1} of ${slides.length}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <button
          onClick={handleNext}
          className="w-full py-8 px-6 bg-yellow-500 hover:bg-yellow-400 text-black rounded-3xl text-2xl font-bold transition-all transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-yellow-500 flex items-center justify-center gap-3"
          aria-label={currentSlide < slides.length - 1 ? 'Next slide' : 'Get started'}
        >
          {currentSlide < slides.length - 1 ? 'Next' : "Let's Get Started"}
        </button>

        {currentSlide < slides.length - 1 && (
          <button
            onClick={handleSkip}
            className="w-full py-6 px-6 text-white/60 hover:text-white text-xl font-bold transition-all focus:outline-none focus:ring-4 focus:ring-white/30 rounded-2xl"
            aria-label="Skip onboarding"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
