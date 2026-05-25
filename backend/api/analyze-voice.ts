import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required to clone voices.");
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
    const { audio, mimeType } = req.body;
    if (!audio) {
      return res.status(400).json({ error: "Missing sound input data to analyze." });
    }

    const ai = getGeminiClient();
    
    const audioPart = {
      inlineData: {
        mimeType: mimeType || "audio/webm",
        data: audio,
      },
    };

    const textPart = {
      text: `Analyze the pitch, cadence, pacing, emotional undertone, gender, and regional Indian accent characteristics of the speaker in this audio. 
      Return a response strictly in JSON format. Do not place any markdown wrapping like \`\`\`json around it.
      
      The JSON object must have exactly these keys:
      {
        "accent": "Name of regional accent (e.g. Mumbai Hinglish, South Indian English, Delhi Punjabi Accented, etc.)",
        "pitch": "Description of pitch (e.g. high/warm/crisp/deep)",
        "tempo": "Speech tempo description (e.g., dynamic, syncopated, leisurely)",
        "gender": "Assumed gender/vocal register profile",
        "cloningConfidence": "Calculated cloning style match confidence as a percentage (e.g., 94%)",
        "summary": "A friendly 1-2 sentence description of their vocal profile, highlighting what makes their modern Indian delivery special.",
        "insights": [
          "Vocal habit 1 (e.g. slight elongation of vowels)",
          "Vocal habit 2 (e.g. unique Hinglish cadence)",
          "Vocal habit 3 (e.g. warm, authoritative tone suitable for branding)"
        ],
        "suggestedCharacters": [
          "Type of content this voice is ideal for (e.g. Tech Reviewer, Bollywood narrator, Corporate explaining)"
        ]
      }`,
    };

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [audioPart, textPart],
      config: {
        responseMimeType: "application/json",
      }
    });

    const parsedData = JSON.parse(result.text || "{}");
    res.json({ success: true, analysis: parsedData });
  } catch (error: any) {
    console.error("Error analyzing audio:", error);
    res.status(500).json({ error: error.message || "Failed to analyze voice profile" });
  }
}
