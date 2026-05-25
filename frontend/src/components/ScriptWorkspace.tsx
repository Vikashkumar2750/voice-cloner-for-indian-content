import { useState } from "react";
import { FileText, Sparkles, RefreshCw, Layers } from "lucide-react";

interface ScriptWorkspaceProps {
  script: string;
  onScriptChange: (value: string) => void;
  onLocalizeComplete: (localizedValue: string) => void;
}

const LOCALIZATION_PRESETS = [
  {
    id: "hinglish",
    label: "Mumbai/Delhi Hinglish Influencer",
    description: "Generates trendy vlogging tone combining local Hindi & English words seamlessly",
    localePrompt: "modern, upbeat Indian Hinglish (vlogger-style blend of Hindi & English words without full translation)",
  },
  {
    id: "south-eng",
    label: "Professional South Indian Style",
    description: "Focuses on clean, respectful pronunciations with high clarity suitable for academic or corporate media",
    localePrompt: "polite, precise corporate South Indian educational English with clear syllable timing",
  },
  {
    id: "bollywood",
    label: "High-Energy Bollywood Launch Ad",
    description: "Injects immense drama, massive exclamation, and punchy tagline rhythms",
    localePrompt: "high-drama, rich vocabulary, energetic theatrical Bollywood ad speech (Hindi/English)",
  },
  {
    id: "sanskari",
    label: "Gentle Lucknow Storytelling (Pure Hindi)",
    description: "Sweet, soft, and highly respectful traditional storytelling voice styling",
    localePrompt: "extremely polite, traditional pure literary Hindi with elegant Urdu-inspired etiquettes ('taleem', 'tehzeeb', 'guftagu')",
  }
];

export function ScriptWorkspace({
  script,
  onScriptChange,
  onLocalizeComplete,
}: ScriptWorkspaceProps) {
  const [selectedPresetId, setSelectedPresetId] = useState(LOCALIZATION_PRESETS[0].id);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);

  const getPlaceholderText = () => {
    return `Add your video script or content transcript here...\n\nExample:\n"Hey guys, welcome back to our startup channel. In this video, we cloned our vocal cords and built a voiceover assistant using Gemini. Watch until the end of the clip for step-by-step guidance!"`;
  };

  const handleLocalize = async () => {
    if (!script.trim()) {
      setRewriteError("Please type or paste some script text first to localize.");
      return;
    }
    setIsRewriting(true);
    setRewriteError(null);

    const preset = LOCALIZATION_PRESETS.find((p) => p.id === selectedPresetId);
    const targetLocale = preset ? preset.localePrompt : "conversational Indian Hinglish";

    try {
      const response = await fetch("/api/localize-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: script,
          targetLocale: targetLocale,
          emotionalTone: "dynamic",
        }),
      });

      let data: any;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        const cleanMsg = text.includes("<!DOCTYPE") || text.includes("<html")
          ? "The server did not return JSON. It might still be starting up or restarting. Please wait a few seconds and try again!"
          : text.slice(0, 250);
        throw new Error(cleanMsg || `Server responded with status ${response.status}`);
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to customize voice script styling.");
      }

      onLocalizeComplete(data.localizedScript);
    } catch (error: any) {
      console.error(error);
      setRewriteError("Rewrite failure: " + (error.message || "Could not polish script. Try again."));
    } finally {
      setIsRewriting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
            Step 3: Setup Your Video Script & Indian Localizer
          </h3>
        </div>
        <span className="text-[11px] font-mono bg-orange-950/40 text-orange-400 px-2 py-0.5 rounded-full border border-orange-900/50">
          Indian Script Sandbox
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Input Text Box */}
        <div className="lg:col-span-2 space-y-2">
          <label htmlFor="script-editor" className="text-xs text-slate-400 font-medium block">
            Draft Your Video Transcript / Voiceover Speech
          </label>
          <textarea
            id="script-editor"
            value={script}
            onChange={(e) => onScriptChange(e.target.value)}
            placeholder={getPlaceholderText()}
            className="w-full h-80 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-slate-200 text-sm focus:border-[#E05A47] focus:ring-1 focus:ring-[#E05A47]/40 outline-none leading-relaxed transition-all resize-none shadow-inner"
          />
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>Character Count: {script.length} chars</span>
            <span>Recommended limit: ~1500 chars for optimal audio delivery</span>
          </div>
        </div>

        {/* Localization Options */}
        <div className="space-y-3 bg-slate-950/30 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono text-slate-300 uppercase flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-orange-500" />
              <span>Desi Localization Optimizer</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Indians respond best to content that speaks their vocabulary. Select a target style blueprint and optimize your raw transcript instantly!
            </p>

            <div className="space-y-2">
              <label htmlFor="localizer-preset" className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                Target Regional Dialect
              </label>
              <select
                id="localizer-preset"
                value={selectedPresetId}
                onChange={(e) => {
                  setSelectedPresetId(e.target.value);
                  setRewriteError(null);
                }}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 outline-none focus:border-[#E05A47]"
              >
                {LOCALIZATION_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-850 rounded-lg text-[11px] text-slate-400 leading-relaxed min-h-[75px] flex items-center justify-center">
              {LOCALIZATION_PRESETS.find((p) => p.id === selectedPresetId)?.description}
            </div>
          </div>

          <div className="space-y-2.5 pt-4">
            {rewriteError && (
              <p className="text-[10px] text-red-400 font-mono text-center">
                {rewriteError}
              </p>
            )}

            <button
              type="button"
              onClick={handleLocalize}
              disabled={isRewriting || !script.trim()}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white py-2.5 px-4 rounded-xl text-xs font-bold cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-orange-950/20"
            >
              {isRewriting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Gemini Localizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Optimize for Indian Listeners</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
