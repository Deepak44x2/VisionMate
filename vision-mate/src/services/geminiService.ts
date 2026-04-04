import { GoogleGenAI } from '@google/genai';
import { AppMode } from '../types';


if (!import.meta.env.VITE_GEMINI_API_KEY) {
  console.error("CRITICAL ERROR: VITE_GEMINI_API_KEY is missing from .env file.");
}

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || 'MISSING_KEY' });

const PROMPTS: Record<AppMode, string> = {
  [AppMode.SCENE]: "Describe the scene in this image concisely for a visually impaired person. Focus on the most important objects, people, and layout. Keep it under 3 sentences.",
  [AppMode.READ]: "Read any text visible in this image. If there is a lot of text, summarize the main points. If there is no text, say 'No text detected'.",
  [AppMode.FIND]: "List the 3 most prominent objects in this image. Format as a simple comma-separated list.",
  [AppMode.MONEY]: "Identify any currency (bills or coins) in this image. State the denomination and currency type clearly. If none, say 'No currency detected'.",
  [AppMode.COLOR]: "What are the dominant colors in this image? Describe them simply (e.g., 'mostly blue with some red')."
};

export const analyzeImage = async (base64Image: string, mode: AppMode): Promise<string> => {
  try {
    const base64Data = base64Image.split(',')[1];

    if (!base64Data) {
      throw new Error("Invalid image data format.");
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: [
        PROMPTS[mode],
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg",
          },
        },
      ],
    });

    const text = response.text;
    
    if (!text) {
        return "I couldn't analyze the image clearly. Please try again.";
    }

    return text.trim();

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, there was an error connecting to the AI service. Please check your internet connection and API key.";
  }
};