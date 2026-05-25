# VaniSynth - Voice Clone & Indian Audioover Studio

VaniSynth is a premium, state-of-the-art voice cloning studio tailored specifically for modern Indian content creators, educators, and advertisers. 

It provides **true identical same-to-same voice cloning** by integrating with the local **Voicebox Desktop App** (running at `http://127.0.0.1:17493`), alongside a robust cloud fallback powered by **Google Gemini Multimodal Speech Synthesis**. 

The codebase has been restructured into clean, dedicated folders (`frontend/`, `backend/`, and `database/`) for better understanding, modular maintainability, and one-click cloud deployment.

---

## 🎨 Design Theme: Desi Masala Slate
The studio features a premium dark visual palette designed to wow creators at first sight. Built with vibrant saffron-marigold accents (`#E05A47`), smooth CSS glassmorphism, responsive grids, and canvas-based biometric voice waveform animators that oscillate rhythmically in sync with active recording or audio playbacks.

---

## 📂 Project Architecture

```
voice-cloner-for-indian-content/
├── frontend/           # React SPA build with Vite + TypeScript + Tailwind
│   ├── src/            # UI components, data structures, and app core
│   │   ├── components/ # VoiceRecordUpload, VoicePresetSelector, VoiceWaveform, ScriptWorkspace
│   │   ├── main.tsx    # React client entry point
│   │   ├── index.css   # Saffron theme overrides, glass-panels, custom scrollbar
│   │   └── data.ts     # Regional voice datasets (Rajiv, Priya, Amit, Karthik, Kavita)
│   ├── index.html      # SEO metadata & Outfit/Inter Google Font loader
│   ├── package.json    # Frontend script commands and asset packages
│   └── vite.config.ts  # Vite configs & local /api/* proxy configurations
├── backend/            # Express Node Server & Serverless Vercel Handlers
│   ├── api/            # Vercel Serverless Function handlers (Node + TypeScript)
│   │   ├── analyze-voice.ts     # Voice sample dialect scanner using Gemini 3.5
│   │   ├── localize-script.ts   # Translates scripts to Hinglish, classic Hindi, etc.
│   │   └── clone-synthesize.ts  # Audio speech generator fallback
│   ├── server.ts       # Express server for local development environment
│   └── package.json    # Backend specific packages (Google GenAI SDK, Express)
├── database/           # Persistent data structures & migrations
│   ├── schema.sql      # PostgreSQL tables (voice_profiles, generations, scripts)
│   └── supabase-setup.md # Tutorial for setting up a free database on Supabase
├── vercel.json         # Unified Vercel configuration routing /api/* -> backend/api/*
├── package.json        # Workspace orchestrator booting dev servers concurrently
└── README.md           # This master documentation handbook
```

---

## 🎙️ Dual Cloning Modes

### 1. Local Voicebox Mode (Identical Same-to-Same Voice Cloning)
* **How it works:** Communicates directly with the **Voicebox** REST API on your machine (`http://127.0.0.1:17493`). 
* **Benefits:** Unlimited zero-shot identical voice replication, processing entirely locally on your GPU. It pings and displays your local voice profiles directly in VaniSynth, lets you train new voice profiles, select high-performance engines (such as **Kokoro** or **Qwen CustomVoice**), and streams high-fidelity WAV speech instantly.
* **Prerequisites:**
  1. Download and install [Voicebox](https://voicebox.sh).
  2. Launch the Voicebox Desktop App.
  3. VaniSynth will automatically detect the server and show a `🟢 Local Voicebox Active` badge in the header.

### 2. Gemini Cloud Fallback Mode (Accent Dialect Matching)
* **How it works:** Routes requests through the modular backend to the **Google Gemini TTS engine** (`gemini-3.1-flash-tts-preview` and `gemini-3.5-flash`).
* **Benefits:** Useful when Voicebox is offline or when running purely in a serverless environment (such as on Vercel) without a local desktop helper.
* **Functionality:** Scans vocal biometric signatures (pitch, tempo, regional Indian dialect habits) and maps those metrics onto prebuilt voice templates (Puck, Kore, Charon, Fenrir, Zephyr), delivering convincing Hinglish or Hindi accent styles.

---

## 🚀 Getting Started (Running Locally)

1. **Clone the repository & enter the folder:**
   ```bash
   cd voice-cloner-for-indian-content
   ```

2. **Configure Environment Variables:**
   Create a `.env` file inside the `backend/` folder (or copy `.env.example`) and add your Gemini API Key:
   ```env
   GEMINI_API_KEY="your-google-gemini-api-key"
   ```

3. **Install Dependencies for all workspaces:**
   Using the root orchestrator:
   ```bash
   npm run install-all
   ```

4. **Boot up Development Servers:**
   Launch the Express backend (running on port `3000`) and the Vite React frontend dev server (running on port `5173` with api proxies) concurrently:
   ```bash
   # Starts the server inside backend/
   npm run dev
   ```
   *Open [http://localhost:5173](http://localhost:5173) inside your browser to start cloning!*

---

## ☁️ Deploying to Vercel

VaniSynth is configured as a Vercel Monorepo out-of-the-box. Deploying takes less than 2 minutes:

1. Install the Vercel CLI locally (or link your GitHub repository to the Vercel dashboard):
   ```bash
   npm install -g vercel
   ```
2. Run the deployment trigger in the root project folder:
   ```bash
   vercel
   ```
3. Add your `GEMINI_API_KEY` environmental variable inside the Vercel Project Settings dashboard.
4. Redeploy or run `vercel --prod` to push your changes live! 

*Vercel will build the React client inside `frontend/` as static assets and deploy our TypeScript API endpoints inside `backend/api/` as high-performance Serverless Functions.*

---

## 🗄️ Database Setup (Supabase)

To enable persistent histories and user profiles in the cloud:
1. Navigate to the `database/` folder.
2. Read the instructions in **[supabase-setup.md](database/supabase-setup.md)** to provision a free PostgreSQL database.
3. Run the migrations in **[schema.sql](database/schema.sql)** using Supabase's SQL Editor to set up tables.
4. Connect the database URI to Vercel or your local `.env` configuration.
