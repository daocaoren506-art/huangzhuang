import { GoogleGenAI } from "@google/genai";
import { SubjectCategory, ItemType } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

// --- Dynamic Pose & Angle Systems ---

const POSES = {
  [SubjectCategory.PERSON]: [
    "standing confidently with hands in pockets",
    "walking towards the camera like a runway model",
    "sitting elegantly on a chair",
    "leaning casually against a wall",
    "standing with crossed arms",
    "looking over the shoulder",
    "posing with one hand on hip",
    "in a dynamic action pose"
  ],
  [SubjectCategory.ANIMAL]: [
    "sitting obediently",
    "standing alert",
    "lying down comfortably",
    "running joyfully",
    "looking curiously at the camera"
  ],
  [SubjectCategory.OBJECT]: [
    "placed on a minimal podium",
    "floating in mid-air",
    "resting on a textured surface",
    "held by a hand"
  ]
};

const ANGLES = [
  "eye-level shot",
  "low angle shot for a heroic look",
  "high angle shot",
  "slight 3/4 profile view",
  "close-up shot"
];

const getRandomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const generateClothingFromText = async (prompt: string): Promise<string> => {
  const ai = getAiClient();
  
  // Using nano banana (flash-image) for generating the clothing item
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: `Generate a high-quality, isolated flat-lay image of a clothing item or accessory. Description: ${prompt}. The background should be simple or white.` }
      ]
    },
    config: {
        imageConfig: {
            aspectRatio: "1:1"
        }
    }
  });

  // Parse response for image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

export const generateVirtualTryOn = async (
    faceBase64: string, 
    clothBase64: string, 
    category: SubjectCategory,
    itemType: ItemType = 'clothing'
): Promise<string> => {
  const ai = getAiClient();

  const facePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: faceBase64
    }
  };

  const clothPart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: clothBase64
    }
  };

  // 1. Select Random Pose & Angle
  const poses = POSES[category] || POSES[SubjectCategory.PERSON];
  // If it's an accessory (like glasses), we prefer close-ups or headshots for people
  const effectivePoses = (category === SubjectCategory.PERSON && itemType === 'accessory') 
    ? ["headshot portrait", "close-up of the face", "upper body portrait"] 
    : poses;
    
  const randomPose = getRandomElement(effectivePoses);
  const randomAngle = getRandomElement(ANGLES);

  // 2. Build Prompt
  let promptText = "";
  
  const baseInstruction = "Generate a photorealistic image. The first image is the Subject. The second image is the Item to be worn/applied.";

  switch(category) {
      case SubjectCategory.ANIMAL:
          promptText = `${baseInstruction} 
            Subject: An animal (keep breed/fur exactly). 
            Action: The animal is wearing the item.
            Pose: ${randomPose}.
            Camera: ${randomAngle}.
            Details: Cinematic lighting, realistic fur texture.`;
          break;

      case SubjectCategory.OBJECT:
          promptText = `${baseInstruction} 
            Subject: An object. 
            Action: The object is wrapped in or styled with the item/material.
            Pose: ${randomPose}.
            Camera: ${randomAngle}.
            Details: Product photography, studio lighting, 4k.`;
          break;

      case SubjectCategory.PERSON:
      default:
          if (itemType === 'accessory') {
              promptText = `${baseInstruction}
                Subject: A person (maintain facial features/identity).
                Action: The person is wearing the accessory (e.g., glasses on eyes, hat on head, necklace on neck).
                Pose: ${randomPose}.
                Camera: ${randomAngle}.
                Details: Fashion photography, high detail, sharp focus.`;
          } else {
              promptText = `${baseInstruction}
                Subject: A person (maintain facial features/identity).
                Action: The person is wearing the clothing outfit. Fit it naturally to the body.
                Pose: ${randomPose}.
                Camera: ${randomAngle}.
                Details: Fashion photography, professional lighting, realistic fabric texture.`;
          }
          break;
  }

  const promptPart = { text: promptText };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [facePart, clothPart, promptPart]
    },
     config: {
        imageConfig: {
            aspectRatio: "3:4" 
        }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  
  // If no image, check for text feedback (sometimes model refuses)
  const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
  if (textPart) {
      console.warn("Model returned text instead of image:", textPart.text);
      throw new Error("AI 无法生成图片 (可能被安全策略拦截)。请尝试换一张图片或重试。");
  }

  throw new Error("Failed to generate try-on image");
};

export const generateTurnaround = async (
    faceBase64: string,
    clothBase64: string,
    category: SubjectCategory
): Promise<string> => {
    const ai = getAiClient();

    const facePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: faceBase64
        }
    };

    const clothPart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: clothBase64
        }
    };

    let subjectPrompt = "person";
    if (category === SubjectCategory.ANIMAL) subjectPrompt = "animal";
    if (category === SubjectCategory.OBJECT) subjectPrompt = "object";

    const promptText = `
        Generate a character sheet with 3 distinct full-body views of the same ${subjectPrompt} wearing the provided clothing.
        Arranged horizontally in this order:
        1. Front View
        2. Side View (Profile)
        3. Back View
        Ensure consistent lighting, white background, and exact same outfit across all three views.
        High resolution, photorealistic fashion photography style.
    `;

    const promptPart = { text: promptText };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [facePart, clothPart, promptPart]
        },
        config: {
            imageConfig: {
                aspectRatio: "16:9" // Wide aspect ratio for multiple views
            }
        }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("Failed to generate turnaround views");
};