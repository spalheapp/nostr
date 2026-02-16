
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const summarizeFeed = async (contents: string[]) => {
  const prompt = `Based on these recent social media posts, give me a quick 3-bullet point summary of what people are talking about right now: \n\n${contents.join('\n---\n')}`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: "You are Agito AI, a helpful social media assistant. Keep summaries punchy and engaging.",
      temperature: 0.7,
    },
  });

  // Fix: Directly accessing the .text property as per best practices
  return response.text;
};

export const suggestPostImprovement = async (draft: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Help me make this social media post more engaging or concise: "${draft}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestion: { type: Type.STRING },
          explanation: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["suggestion", "explanation", "hashtags"]
      }
    }
  });

  try {
    // Fix: Using .text property and trimming the output string before parsing JSON
    const jsonStr = response.text?.trim() || '{}';
    return JSON.parse(jsonStr);
  } catch (e) {
    return { suggestion: response.text || "", explanation: "", hashtags: [] };
  }
};
