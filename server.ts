import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: AI-powered color grading settings generator
  app.post("/api/gemini/grade", async (req, res) => {
    try {
      const { prompt, frameImage } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback response with beautiful default parameters if API Key is not set yet
        return res.json({
          brightness: 100,
          contrast: 112,
          saturation: 125,
          hueRotate: 0,
          sepia: 15,
          grayscale: 0,
          temperature: 15,
          tint: -5,
          vignette: 20,
          shadows: { r: 120, g: 124, b: 135 }, // Cool shadows
          midtones: { r: 132, g: 128, b: 124 }, // Warm midtones
          highlights: { r: 140, g: 132, b: 120 }, // Warm golden highlights
          explanation: "Cinematic Warm style applied! (AI Demo: Add your GEMINI_API_KEY in Settings > Secrets for customized styles based on actual frames)."
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Construct multimodal contents payload
      const contents: any[] = [];
      
      // If a frame image is sent from the front-end, attach it to contents
      if (frameImage && frameImage.includes(",")) {
        const parts = frameImage.split(",");
        const mimeType = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
        const base64Data = parts[1];
        contents.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }

      const systemPrompt = `You are an expert Hollywood Colorist and Film Editor. 
The user has attached a frame from their video (if available above) and wants to color grade it to achieve this specific vibe/aesthetic/look: "${prompt}".
Analyze the visual characteristics (exposure, highlights, shadows, original colors, skin tones, composition) of the video frame image, and then suggest the exact color grading adjustments to transform it into the target vibe.

Return a JSON object that strictly adheres to this schema:
{
  "brightness": number (from 50 to 150, where 100 is normal),
  "contrast": number (from 50 to 150, where 100 is normal),
  "saturation": number (from 0 to 200, where 100 is normal),
  "hueRotate": number (from -180 to 180, where 0 is normal),
  "sepia": number (from 0 to 100, where 0 is none),
  "grayscale": number (from 0 to 100, where 0 is none),
  "temperature": number (from -50 to 50, where 0 is normal. Positive adds warm orange/red tint, negative adds cool blue tint),
  "tint": number (from -50 to 50, where 0 is normal. Positive adds green tint, negative adds magenta tint),
  "vignette": number (from 0 to 100, where 0 is none),
  "shadows": {
    "r": number (offset 0-255, normal 128. Positive adds red tint, negative reduces red tint),
    "g": number (offset 0-255, normal 128),
    "b": number (offset 0-255, normal 128)
  },
  "midtones": {
    "r": number (offset 0-255, normal 128),
    "g": number (offset 0-255, normal 128),
    "b": number (offset 0-255, normal 128)
  },
  "highlights": {
    "r": number (offset 0-255, normal 128),
    "g": number (offset 0-255, normal 128),
    "b": number (offset 0-255, normal 128)
  },
  "explanation": "Write a highly professional colorist commentary (2-3 sentences) explaining your artistic color decisions based on the actual video frame provided. Detail how your changes will adjust the source lighting and hues (e.g. 'Since your source image has strong warm lights, I offset the highlights into a soft cool cyan to balance skin tones, while shifting the shadows to midnight teal.'). IMPORTANT: If the user's prompt is in Urdu, Hindi, or Roman Urdu, write the explanation in beautiful Roman Urdu / Hindi (using Urdu/Hindi terms in Latin alphabets) combined with a short English translation so it is highly engaging and native for them!"
}

Design guidelines for standard moods:
- "Teal & Orange": shadows should have elevated blue/cyan (r~120, g~125, b~138), highlights/midtones should have elevated red/yellow (r~138, g~128, b~120), temperature ~ 15.
- "Matrix Green": saturation ~ 85, contrast ~ 115, tint ~ 15 (green), midtones & shadows green-shifted (g~140, r~120, b~120).
- "Vintage / Retro": contrast ~ 90, saturation ~ 80, sepia ~ 20, temperature ~ 12, highlights/midtones slightly warm.
- "Cyberpunk / Synthwave": saturation ~ 140, contrast ~ 120, highlights magenta (r~145, g~115, b~140), shadows blue-cyan (r~115, g~130, b~145).
- "Moody / Horror": contrast ~ 130, saturation ~ 65, brightness ~ 85, temperature ~ -15 (cold blue), shadows cool (b~135).
- "Golden Hour": temperature ~ 25, tint ~ -5, midtones warm (r~135, g~126, b~115).`;

      contents.push(systemPrompt);

      // Query Gemini 3.5 Flash for the grading parameters
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              brightness: { type: Type.NUMBER },
              contrast: { type: Type.NUMBER },
              saturation: { type: Type.NUMBER },
              hueRotate: { type: Type.NUMBER },
              sepia: { type: Type.NUMBER },
              grayscale: { type: Type.NUMBER },
              temperature: { type: Type.NUMBER },
              tint: { type: Type.NUMBER },
              vignette: { type: Type.NUMBER },
              shadows: {
                type: Type.OBJECT,
                properties: {
                  r: { type: Type.NUMBER },
                  g: { type: Type.NUMBER },
                  b: { type: Type.NUMBER }
                },
                required: ["r", "g", "b"]
              },
              midtones: {
                type: Type.OBJECT,
                properties: {
                  r: { type: Type.NUMBER },
                  g: { type: Type.NUMBER },
                  b: { type: Type.NUMBER }
                },
                required: ["r", "g", "b"]
              },
              highlights: {
                type: Type.OBJECT,
                properties: {
                  r: { type: Type.NUMBER },
                  g: { type: Type.NUMBER },
                  b: { type: Type.NUMBER }
                },
                required: ["r", "g", "b"]
              },
              explanation: { type: Type.STRING }
            },
            required: [
              "brightness", "contrast", "saturation", "hueRotate", 
              "sepia", "grayscale", "temperature", "tint", "vignette",
              "shadows", "midtones", "highlights", "explanation"
            ]
          }
        }
      });

      const responseText = response.text?.trim() || "{}";
      const gradingData = JSON.parse(responseText);
      res.json(gradingData);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Failed to generate color grading settings.", details: error.message });
    }
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
