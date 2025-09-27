import { GoogleGenAI, Modality } from "@google/genai";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable not set' });
  }

  try {
    const { base64ImageData, mimeType, prompt } = req.body;

    if (!base64ImageData || !mimeType || !prompt) {
      return res.status(400).json({ error: 'base64ImageData, mimeType, and prompt are required' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const imagePart = {
      inlineData: {
        data: base64ImageData,
        mimeType: mimeType,
      },
    };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const editedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        return res.status(200).json({ editedImage });
      }
    }

    res.status(500).json({ error: "No image was returned from the edit operation." });
  } catch (error) {
    console.error("Error editing image:", error);
    res.status(500).json({ error: "Failed to edit image." });
  }
}