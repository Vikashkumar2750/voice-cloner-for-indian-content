import express from "express";
import dotenv from "dotenv";

// Import Vercel handlers directly to mount them on the local Express server
import analyzeVoiceHandler from "./api/analyze-voice.js";
import localizeScriptHandler from "./api/localize-script.js";
import cloneSynthesizeHandler from "./api/clone-synthesize.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure JSON parser with generous limits for audio payload handling
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Express route mapping - calls Vercel serverless handlers directly
app.post("/api/analyze-voice", analyzeVoiceHandler);
app.post("/api/localize-script", localizeScriptHandler);
app.post("/api/clone-synthesize", cloneSynthesizeHandler);

// Add a health status endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", service: "VaniSynth Backend" });
});

app.listen(PORT, () => {
  console.log(`🚀 VaniSynth Express server running locally on http://localhost:${PORT}`);
  console.log(`- Vocal DNA Scanner: POST http://localhost:${PORT}/api/analyze-voice`);
  console.log(`- Indian Script Localizer: POST http://localhost:${PORT}/api/localize-script`);
  console.log(`- Speech Synthesizer Fallback: POST http://localhost:${PORT}/api/clone-synthesize`);
});
