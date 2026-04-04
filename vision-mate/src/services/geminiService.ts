import { AppMode } from "../types";

export const analyzeImage = async (
  imageBase64: string,
  mode: AppMode
): Promise<string> => {
  try {
    const API_KEY = "vision-AIzaSyDLSTcsMsS9FhJt4S8MpNgsKXLAF-rM_JY/.env";

    let prompt = "Describe the image clearly.";

    if (mode === AppMode.SCENE) {
      prompt = "Describe the scene clearly for a visually impaired person.";
    } else if (mode === AppMode.MONEY) {
      prompt = "Identify the currency and tell the amount clearly.";
    } else {
      // fallback (covers TEXT / OBJECT if not in enum)
      prompt = "Describe what is visible in the image in simple words.";
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No result found"
    );

  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error analyzing image";
  }
};
