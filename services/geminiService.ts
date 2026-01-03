import { GoogleGenAI, Type } from "@google/genai";
import { Scene, Character, Dialogue } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateSceneDialogues = async (
  sceneContext: string,
  characters: Character[]
): Promise<Dialogue[]> => {
  const ai = getAiClient();
  if (!ai) return [];

  const characterDescriptions = characters
    .map((c) => `${c.name} (ID: ${c.id})`)
    .join(", ");

  const prompt = `
    Create a script for a visual novel scene. 
    Context: ${sceneContext}.
    Characters available: ${characterDescriptions}.
    
    Return a JSON array of dialogues. Each dialogue should have:
    - characterId: The ID of the character speaking (or null if narrator).
    - text: The dialogue text.
    - expression: A simple emotion string (happy, sad, angry, neutral).
    
    Limit to 5-8 lines of dialogue.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              characterId: { type: Type.STRING, nullable: true },
              text: { type: Type.STRING },
              expression: { type: Type.STRING },
            },
            required: ["text"],
          },
        },
      },
    });

    const result = JSON.parse(response.text || "[]");
    // Add fake IDs
    return result.map((r: any) => ({ ...r, id: crypto.randomUUID() }));
  } catch (error) {
    console.error("Error generating dialogues:", error);
    return [];
  }
};

export const generateNovelIdeas = async (): Promise<string[]> => {
  const ai = getAiClient();
  if (!ai) return ["A magical school adventure", "A cyberpunk detective story"];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "List 3 unique and catchy visual novel concepts/titles with a 1-sentence hook.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    return ["A slice of life in a coffee shop", "Space opera romance"];
  }
};

export const generateCharacterAvatar = async (description: string): Promise<string | null> => {
  const ai = getAiClient();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `High quality visual novel character sprite, ${description}, isolated on white background, anime art style, detailed, upper body portrait.` }]
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
           return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating avatar:", error);
    return null;
  }
};