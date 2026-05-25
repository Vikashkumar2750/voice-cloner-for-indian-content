import { GoogleGenAI, Modality } from "@google/genai";
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

/**
 * Helper to convert 24000Hz 16-bit Mono raw PCM to a browser-playable WAV Buffer
 */
function pcmToWav(pcmBuffer: Buffer, sampleRate: number): Buffer {
  const wavHeader = Buffer.alloc(44);
  const fileSizeBytes = pcmBuffer.length + 36;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  // Chunk ID: "RIFF"
  wavHeader.write("RIFF", 0);
  // Chunk Size
  wavHeader.writeUInt32LE(fileSizeBytes, 4);
  // Format: "WAVE"
  wavHeader.write("WAVE", 8);
  // Subchunk1 ID: "fmt " (with space)
  wavHeader.write("fmt ", 12);
  // Subchunk1 Size: 16 (for PCM)
  wavHeader.writeUInt32LE(16, 16);
  // Audio Format: 1 (PCM)
  wavHeader.writeUInt16LE(1, 20);
  // Num Channels
  wavHeader.writeUInt16LE(numChannels, 22);
  // Sample Rate
  wavHeader.writeUInt32LE(sampleRate, 24);
  // Byte Rate
  wavHeader.writeUInt32LE(byteRate, 28);
  // Block Align
  wavHeader.writeUInt16LE(blockAlign, 32);
  // Bits Per Sample
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  // Subchunk2 ID: "data"
  wavHeader.write("data", 36);
  // Subchunk2 Size
  wavHeader.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([wavHeader, pcmBuffer]);
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
    const { script, audio, mimeType, presetVoice, emotionalTone } = req.body;
    if (!script) {
      return res.status(400).json({ error: "Please enter a script to synthesize." });
    }

    const ai = getGeminiClient();

    let contents: any[] = [];

    // Determine voice name mappings for Gemini's TTS model
    // Gemini prebuilt voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    let preferredVoice = "Zephyr"; 
    let vocalAnalysisText = "Indian conversational style with standard pitch and friendly pacing";

    if (audio) {
      // 1. Analyze the reference audio using gemini-3.5-flash
      try {
        const analysisResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            {
              inlineData: {
                data: audio,
                mimeType: mimeType || "audio/webm",
              }
            },
            {
              text: `Analyze this vocal sample. Determine if the speaker's vocal register is masculine (male) or feminine (female). 
              Describe their pitch (high, medium, warm, deep), delivery speed (fast, regular, slow), accent details (like Indian English, Hinglish, regional cadence), and typical emotion.
              Provide a clear, descriptive 2-sentence summary of these voice traits. At the very end of your response, output either: [GENDER: MALE] or [GENDER: FEMALE] so we can configure the speaker.`
            }
          ]
        });

        vocalAnalysisText = analysisResponse.text || "warm Indian speaking tone";
        
        // Dynamically select the best-matching prebuilt voice based on analysis
        if (vocalAnalysisText.toUpperCase().includes("[GENDER: FEMALE]")) {
          preferredVoice = vocalAnalysisText.toLowerCase().includes("deep") ? "Fenrir" : "Kore";
        } else {
          if (vocalAnalysisText.toLowerCase().includes("deep")) {
            preferredVoice = "Charon";
          } else if (vocalAnalysisText.toLowerCase().includes("high") || vocalAnalysisText.toLowerCase().includes("crisp")) {
            preferredVoice = "Puck";
          } else {
            preferredVoice = "Zephyr";
          }
        }
      } catch (analysisErr: any) {
        console.error("Vocal sub-analysis failed, falling back to defaults:", analysisErr);
        preferredVoice = "Zephyr";
        vocalAnalysisText = "Conversational Indian English tone";
      }

      const guidedPrompt = `INSTRUCTION: You are an expert voice actor. Mimic this target voice profile perfectly:
"${vocalAnalysisText}".

Adjust your vocal pitch, delivery speed, regional Indian accent, vocal register weight, and stylistic cadence to match these traits accurately.
Maintain a ${emotionalTone || "natural"} emotional flow throughout the text.
Deliver ONLY the requested script. Do NOT include any intro greetings, meta commentaries, annotations, or side sounds. Output only standard, premium high-fidelity speech.

SCRIPT TO SYNTHESIZE:
"${script}"`;

      contents.push({
        text: guidedPrompt
      });

    } else {
      // Preset accent fallback model
      if (presetVoice && presetVoice.gender === "female") {
        preferredVoice = "Kore"; 
      } else if (presetVoice && presetVoice.id === "raj") {
        preferredVoice = "Puck"; 
      } else if (presetVoice && presetVoice.id === "amit") {
        preferredVoice = "Charon"; 
      }

      const accentDescription = presetVoice ? presetVoice.accentPrompt : "conversational Indian English";
      
      const guidedPrompt = `INSTRUCTION: You are a professional voiceover artist from India.
Synthesize the provided script using a highly convincing and natural ${accentDescription}.
Deliver it with a ${emotionalTone || "friendly"} tone and professional accent quality. 
Do NOT include any introduction, placeholders, or meta-comments. Output ONLY the synthesized spoken audio.

SCRIPT TO SYNTHESIZE:
"${script}"`;

      contents.push({
        text: guidedPrompt
      });
    }

    // Call the high-fidelity text-to-speech engine
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: contents,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: preferredVoice },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    const base64Audio = part?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("Unable to synthesize audio from Gemini. No speech data returned.");
    }

    // Transform raw Gemini PCM output (24000Hz) into a browser-friendly standard WAV package
    const wavBuffer = pcmToWav(Buffer.from(base64Audio, "base64"), 24000);
    const wavBase64 = wavBuffer.toString("base64");

    res.json({
      success: true,
      audio: wavBase64,
      mimeType: "audio/wav",
    });

  } catch (error: any) {
    console.error("Synthesizer error:", error);
    res.status(500).json({ error: error.message || "Synthesizer failed to generate cloned voice." });
  }
}
