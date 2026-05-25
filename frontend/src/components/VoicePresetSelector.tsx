import { PresetVoice } from "../types";
import { REGIONAL_INDIAN_PRESETS } from "../data";
import { Play, ClipboardCopy, Sparkles } from "lucide-react";

interface VoicePresetSelectorProps {
  selectedPresetId: string | null;
  onSelectPreset: (preset: PresetVoice) => void;
  onCopyExample: (text: string) => void;
}

export function VoicePresetSelector({
  selectedPresetId,
  onSelectPreset,
  onCopyExample,
}: VoicePresetSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
            Option A: Choose a Regional Indian Persona
          </h3>
        </div>
        <span className="text-[11px] font-mono bg-orange-950/40 text-orange-400 px-2 py-0.5 rounded-full border border-orange-900/50">
          Instant Accents Presets
        </span>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Don&apos;t want to record or upload a personal voice? Choose a custom model specifically designed to capture India&apos;s rich regional vocal identities.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {REGIONAL_INDIAN_PRESETS.map((voice) => {
          const isSelected = selectedPresetId === voice.id;
          return (
            <div
              key={voice.id}
              onClick={() => onSelectPreset(voice)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden h-full ${
                isSelected
                  ? "bg-slate-900/90 border-[#E05A47] ring-1 ring-[#E05A47]/40 shadow-lg shadow-orange-950/10"
                  : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/30"
              }`}
            >
              {/* Regional Accent Indicator Stripe */}
              <div 
                className={`absolute top-0 left-0 right-0 h-1 transition-all ${
                  isSelected ? "bg-[#E05A47]" : "bg-slate-800 group-hover:bg-slate-700"
                }`}
              />

              <div className="space-y-2 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-2xl" id={`avatar-${voice.id}`} aria-hidden="true">{voice.avatar}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase tracking-wider ${
                    voice.gender === "female" 
                      ? "bg-fuchsia-950/60 text-fuchsia-400 border border-fuchsia-900/20" 
                      : "bg-cyan-950/60 text-cyan-400 border border-cyan-900/20"
                  }`}>
                    {voice.gender === "female" ? "Female" : "Male"}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-100 flex items-center space-x-1.5 text-sm">
                    <span>{voice.name}</span>
                    <span className="text-slate-500 font-normal text-xs font-mono">• {voice.region}</span>
                  </h4>
                  <p className="text-[11px] text-[#E05A47] font-medium mt-0.5">{voice.accent}</p>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed pt-1 border-t border-slate-900/60">
                  {voice.accentPrompt}
                </p>
              </div>

              <div className="flex items-center justify-between gap-1 mt-4 pt-3 border-t border-slate-900">
                <button
                  type="button"
                  title="Use sample script"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyExample(voice.exampleText);
                  }}
                  className="flex items-center space-x-1 text-[11px] text-slate-300 hover:text-orange-400 transition bg-slate-900 hover:bg-slate-800 px-2 py-1 rounded"
                >
                  <ClipboardCopy className="w-3 h-3" />
                  <span>Sample Script</span>
                </button>
                <div className={`p-1 rounded-full ${isSelected ? "bg-orange-950 text-[#E05A47]" : "bg-slate-900 text-slate-500 group-hover:text-slate-300"}`}>
                  <Play className="w-3.5 h-3.5 fill-current" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
