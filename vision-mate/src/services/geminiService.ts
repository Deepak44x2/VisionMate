import { GoogleGenAI, type Part } from "@google/genai";
import type { KnownFace } from '../types';
import { AppMode, SupportedLanguage } from '../types';


// Ensure the key is a string and not null/undefined
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 

const genAI = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

/** Strip data-URL wrapper; reject empty or malformed captures (e.g. `data:,`). */
const rawBase64FromImageDataUrl = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) {
    const comma = trimmed.indexOf(',');
    if (comma === -1) return null;
    const header = trimmed.slice(0, comma).toLowerCase();
    const payload = trimmed.slice(comma + 1).replace(/\s/g, '');
    if (!header.includes('base64') || !payload || payload.length < 32) return null;
    return payload;
  }
  const payload = trimmed.replace(/\s/g, '');
  return payload.length >= 32 ? payload : null;
};

const mimeFromDataUrl = (input: string): 'image/jpeg' | 'image/png' | 'image/webp' => {
  const h = input.slice(0, 40).toLowerCase();
  if (h.includes('image/png')) return 'image/png';
  if (h.includes('image/webp')) return 'image/webp';
  return 'image/jpeg';
};

const getPromptForMode = (mode: AppMode, language: SupportedLanguage): string => {
  const langName = getLanguageName(language);
  const basePrompt = (() => {
    switch (mode) {
      case AppMode.SCENE:
        return "Briefly describe the scene in front of me for a visually impaired person. Mention obstacles or dangers immediately. Keep it under 30 words.";
      case AppMode.READ:
        return "Read all visible text in this image clearly. If no text, say 'No text found'. Do not describe the font or background.";
      case AppMode.FIND:
        return "List the top 3 prominent objects in this image. Format: Object 1, Object 2, Object 3.";
      case AppMode.OBJECT:
        return "Detect and list all distinct objects visible in this image. Be concise. Example: 'Laptop, Coffee Mug, Chair, Water Bottle'.";
      case AppMode.MONEY:
        return "Identify any currency notes or coins in the image. State the currency and value clearly. If none, say 'No currency detected'.";
      case AppMode.COLOR:
        return "Analyze the colors in this image. Identify the dominant color and specific shades (e.g., crimson, navy, pastel). Describe where these colors are located (e.g., 'on the left', 'at the bottom'). Format as a natural sentence like: 'The dominant color is [color], with [other color] on the [location].' Keep it brief.";
      case AppMode.FACE:
        return "Identify the people in the Target Image. If they match any of the Reference Faces provided, state their name. If they are famous celebrities, state their name. Otherwise, describe their appearance briefly (e.g., 'a young man with glasses'). Be concise.";
      default:
        return "Describe this image.";
    }
  })();

  return `${basePrompt}\n\nIMPORTANT: You MUST respond entirely in the ${langName} language.`;
};

const getLanguageName = (lang: SupportedLanguage): string => {
  switch (lang) {
    case SupportedLanguage.EN: return 'English';
    case SupportedLanguage.ES: return 'Spanish';
    case SupportedLanguage.FR: return 'French';
    case SupportedLanguage.DE: return 'German';
    case SupportedLanguage.IT: return 'Italian';
    case SupportedLanguage.JA: return 'Japanese';
    case SupportedLanguage.KO: return 'Korean';
    case SupportedLanguage.ZH: return 'Simplified Chinese';
    case SupportedLanguage.HI: return 'Hindi';
    default: return 'English';
  }
};

export const analyzeImage = async (base64Image: string, mode: AppMode, knownFaces: KnownFace[] = [], language: SupportedLanguage = SupportedLanguage.EN): Promise<string> => {
  try {
    const prompt = getPromptForMode(mode, language);

    if (!genAI) {
      return "System Error: Gemini API key is missing. Configure `VITE_GEMINI_API_KEY` and restart.";
    }

    const cleanBase64 = rawBase64FromImageDataUrl(base64Image);
    if (!cleanBase64) {
      return "No camera image yet. Wait a moment for the preview, then try again.";
    }

    const parts: Part[] = [];

    // If in FACE mode, add known faces as context
    if (mode === AppMode.FACE && knownFaces.length > 0) {
      knownFaces.forEach(face => {
        const refB64 = rawBase64FromImageDataUrl(face.imageBase64);
        if (!refB64) return;
        parts.push({ text: `Reference Face for: ${face.name}` });
        parts.push({
          inlineData: {
            mimeType: mimeFromDataUrl(face.imageBase64),
            data: refB64
          }
        });
      });
      parts.push({ text: "Target Image to analyze:" });
    }

    // Add the target image
    parts.push({
      inlineData: {
        mimeType: mimeFromDataUrl(base64Image),
        data: cleanBase64
      }
    });

    // Add the prompt
    parts.push({ text: prompt });

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: parts
      }
    });

    return response.text || "I couldn't understand the image.";
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);

    const msg = error.message || error.toString();
    
    if (msg.includes('401') || msg.includes('API key')) {
      return "Invalid API Key. Please check your settings.";
    }
    if (msg.toLowerCase().includes('leaked') || msg.toLowerCase().includes('reported as leaked')) {
      return "Your Gemini API key was reported as leaked (403 PERMISSION_DENIED). Create a new API key in Google AI Studio and update `VITE_GEMINI_API_KEY`. Note: API keys in a frontend bundle are not secure; move Gemini calls to a backend for long-term fix.";
    }
    if (msg.includes('403')) {
      return "Access denied. API Key may not have permission for this model.";
    }
    if (msg.includes('429')) {
      return "Too many requests. Please try again later.";
    }
    if (msg.includes('503') || msg.includes('500')) {
      return "Service unavailable. Please try again later.";
    }
    if (msg.includes('fetch failed') || msg.includes('NetworkError')) {
      return "Network connection failed. Please check your internet.";
    }
    if (msg.includes('Base64') || msg.includes('INVALID_ARGUMENT')) {
      return "Image data was invalid. Let the camera preview load, then capture again.";
    }

    return "An error occurred during analysis. Please try again.";
  }
};