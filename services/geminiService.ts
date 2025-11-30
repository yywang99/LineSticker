
import { GoogleGenAI, Type } from "@google/genai";
import { MODEL_IMAGE, MODEL_TEXT } from "../constants";
import { StickerPrompt, GenerationConfig } from "../types";

// Helper to strip data:image/...;base64, prefix
const cleanBase64 = (dataUrl: string) => {
  return dataUrl.split(',')[1] || dataUrl;
};

// --- Prompt Engineering (As requested in User Prompt) ---
const getModelInstruction = (
    prompt: StickerPrompt, 
    addText: boolean, 
    isAnimeStyle: boolean, 
    enableDepthOfField?: boolean,
    maskColor: 'green' | 'blue' = 'green'
) => {
    // 基礎風格設定
    const styleBase = isAnimeStyle 
        ? "cute, expressive 1:1 aspect ratio anime-style chat sticker" 
        : "photorealistic, expressive, high-detail 1:1 aspect ratio chat sticker";

    const styleNegative = isAnimeStyle
        ? "Do not alter the person's core facial structure."
        : "Do not alter the person's core facial structure or transform them into a 2D character.";

    let styleExtras = "";
    if (enableDepthOfField) {
        styleExtras = " Apply a cinematic shallow depth of field (bokeh) effect. Render the face and key expressions in razor-sharp focus while slightly softening the edges and non-essential details to create a strong 3D pop-out effect.";
    }

    // Configure Background Color
    let bgInstruction = "";
    if (maskColor === 'blue') {
        bgInstruction = `3. **BACKGROUND**: The background MUST be a solid, flat PURE BLUE (RGB: 0, 0, 255) without gradient, noise, or heavy shadows.`;
    } else {
        bgInstruction = `3. **BACKGROUND**: The background MUST be a solid, flat LIME GREEN (RGB: 0, 255, 0) without gradient, noise, or heavy shadows.`;
    }

    let instruction = `
    The highest priority is to maintain the exact facial features, likeness, and perceived gender of the person in the provided reference photo.
    Transform the person into a ${styleBase} based on the following action: "${prompt.base}".${styleExtras}
    
    CRITICAL DESIGN REQUIREMENTS (DIE-CUT STICKER):
    1. **WHITE OUTLINE**: The entire subject (character + text) MUST be surrounded by a THICK, CONTINUOUS WHITE BORDER (approx 15px width). This is mandatory to create the "sticker" look.
    2. **POPPING EFFECT**: Add a subtle drop shadow *behind* the white outline to separate it from the background.
    ${bgInstruction}
    4. The final image should be a high-quality PNG.
    ${styleNegative}
    `;

    // --- 重點修改：文字生成邏輯 (支援中文) ---
    if (addText && prompt.memeText) {
        instruction += `
        \nTEXT RENDRING INSTRUCTION:
        Incorporate the text "${prompt.memeText}" into the sticker design.
        - The text must be legible and stylized (bubble or comic font).
        - **IMPORTANT: If the text contains Chinese characters, render them in a bold, cute, Traditional Chinese (繁體中文) compatible font style.**
        - **CRITICAL: Apply a distinct BLACK OUTLINE (approx 2px stroke) around the text characters to ensure high readability and meme-style aesthetic.**
        - The text should visually overlap or be connected to the character, sharing the same white sticker outline.
        `;
    }
    return instruction;
};

export const checkApiKey = async (): Promise<boolean> => {
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
        await window.aistudio.openSelectKey();
        return await window.aistudio.hasSelectedApiKey();
    }
    return true;
  }
  // Fallback for non-AI Studio environments (local dev with .env)
  return !!process.env.API_KEY;
};

export const generateSticker = async (
  base64Image: string, 
  prompt: StickerPrompt,
  config: GenerationConfig
): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct the full prompt using the specialized engineering
    const systemInstruction = getModelInstruction(
        prompt, 
        config.addText, 
        config.isAnimeStyle, 
        config.enableDepthOfField,
        config.maskColor
    );
    
    // Using gemini-3-pro-image-preview as requested
    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: {
        parts: [
          {
            text: systemInstruction
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64(base64Image)
            }
          }
        ]
      },
      config: {
          imageConfig: {
              aspectRatio: "1:1",
              imageSize: "1K" // High quality for stickers
          }
      }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    return null;

  } catch (error) {
    console.error("Sticker generation failed:", error);
    throw error;
  }
};

export const generateIdeas = async (description: string): Promise<StickerPrompt[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // System prompt for idea generation (Traditional Chinese focus)
        const systemPrompt = `You are a creative assistant that generates fun, expressive, and culturally relevant chat sticker ideas for Taiwan LINE users.
        Your goal is to brainstorm a diverse set of 16 to 20 sticker concepts based on the user's input theme.

        Key Requirements:
        1. **Emotional & Stylistic Spectrum**: 
           - **High Intensity**: Exploding rage, hysterical laughter, dramatic sobbing, eyes popping out in shock.
           - **Low Intensity/Subtle**: Deadpan stare (眼神死), awkward polite smile, judging look, spacing out, dissociation.
           - **Complex Emotions**: "Smiling through pain", "Confused but accepting", "Smug satisfaction", "Mental breakdown", "Internal screaming".
           - **Surreal/Exaggerated**: Soul leaving body, turning into stone/dust, surrounded by dark aura, glitching out, heavenly ascension.
        
        2. **Visual Variety**:
           - **Action-Oriented**: Flipping a table, rolling on the floor, giving a chef's kiss, holding a sign.
           - **Lighting/Atmosphere**: Dramatic spotlight (interrogation style), gloomy rain cloud, holy light, sparkles and flowers, burning flames.
        
        3. **Cultural Context**: Incorporate trending Taiwan internet slang and relatable scenarios (e.g., work fatigue, food cravings, shopping spree, "Mondays", "Salary thief").
        
        4. **Visual Description**: The \`base\` prompt must be a highly descriptive English prompt for an image generator. Mention facial expressions, lighting, specific visual effects (e.g., "dramatic spotlight", "anime speed lines", "sparkles").

        Output Format:
        Return a valid JSON array of objects. Each object must have:
        - \`id\`: A unique English identifier.
        - \`base\`: A detailed English description of the visual action and expression.
        - \`memeText\`: A short, punchy caption in Traditional Chinese (繁體中文).

        Example Prompts for Reference:
        - *Dramatic*: { "base": "A person kneeling on the ground in heavy rain, screaming at the sky, dramatic cinematic lighting", "memeText": "不！！！" }
        - *Deadpan*: { "base": "Close-up of a person with a completely blank, soulless expression, staring directly at camera, grey background", "memeText": "喔是喔" }
        - *Cute*: { "base": "A person making a heart shape with their hands, blushing heavily, with pink bubbles and sparkles surrounding them", "memeText": "愛你" }
        - *Sarcastic*: { "base": "A person giving a thumbs up while their background is on fire, forced smile", "memeText": "沒事兒" }
        - *Dissociated*: { "base": "Person staring into void, universe background, semi-transparent ghost separating from body", "memeText": "我是誰我在哪" }
        - *Greedy*: { "base": "Person with dollar signs in eyes, holding piles of gold, drooling cartoonishly", "memeText": "錢錢" }

        Output JSON Structure Example:
        [
          { "id": "shocked", "base": "A person with jaw dropping to the floor, eyes popping out, cartoon style shock effects", "memeText": "真假？！" },
          { "id": "tired", "base": "A person melting into a puddle on the floor, soul leaving the body, ghost spirit floating up, exhausted expression", "memeText": "心好累" }
        ]`;

        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: description,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            base: { type: Type.STRING },
                            memeText: { type: Type.STRING }
                        },
                        required: ["id", "base", "memeText"]
                    }
                }
            }
        });

        const text = response.text;
        if (!text) return [];
        return JSON.parse(text) as StickerPrompt[];

    } catch (error) {
        console.error("Idea generation failed:", error);
        return [];
    }
}
