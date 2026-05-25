import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required to localize scripts.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export default async function handler(req: any, res: any) {
  // CORS Headers support
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are supported on this endpoint." });
  }

  try {
    const { script, targetLocale, emotionalTone } = req.body;
    if (!script) {
      return res.status(400).json({ error: "No video script supplied." });
    }

    const ai = getGeminiClient();

    const prompt = `You are a professional video scriptwriter specializing in localized Indian content.
    Take the following raw script and optimize it for a ${targetLocale} audience with a ${emotionalTone} emotional tone.
    - Rewrite it using local Indian terms, conversational phrases, or regional flavor (e.g., if Hinglish, blend Hindi + English naturally; if South Indian, make it sound professional yet localized).
    - Insert micro pacing notations in square brackets like [pause], [excitedly], or [warmly] if suitable to help the voice generator.
    - Keep the core information and overall length intact.
    - Do NOT wrap the output in markdown, just return the polished final rewritten script.

    Original Script:
    "${script}"`;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ success: true, localizedScript: result.text?.trim() });
  } catch (error: any) {
    console.error("Error localizing script:", error);
    res.status(500).json({ error: error.message || "Failed to rewrite script" });
  }
}
