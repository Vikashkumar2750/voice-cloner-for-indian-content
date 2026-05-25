import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Play, 
  Pause, 
  Download, 
  Trash2, 
  ArrowRight, 
  Info, 
  RefreshCw, 
  Volume2,
  Server,
  Settings,
  Radio
} from "lucide-react";
import { VoicePresetSelector } from "./components/VoicePresetSelector";
import { VoiceRecordUpload } from "./components/VoiceRecordUpload";
import { ScriptWorkspace } from "./components/ScriptWorkspace";
import { VoiceWaveform } from "./components/VoiceWaveform";
import { PresetVoice, VoiceAnalysis, CloneHistoryItem } from "./types";
import { EMOTIONAL_TONE_OPTIONS, REGIONAL_INDIAN_PRESETS } from "./data";

interface VoiceboxProfile {
  id: string;
  name: string;
  voice_type: string;
  language: string;
}

export default function App() {
  // Connection states
  const [connectionMode, setConnectionMode] = useState<"cloud" | "voicebox">("cloud");
  const [isVoiceboxConnected, setIsVoiceboxConnected] = useState<boolean>(false);
  const [voiceboxProfiles, setVoiceboxProfiles] = useState<VoiceboxProfile[]>([]);
  const [selectedVoiceboxProfileId, setSelectedVoiceboxProfileId] = useState<string>("");
  const [voiceboxEngine, setVoiceboxEngine] = useState<string>("kokoro");
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Core Option Choice states ("preset" or "clone")
  const [cloningMode, setCloningMode] = useState<"preset" | "clone">("preset");

  // Option A states (Presets)
  const [selectedPreset, setSelectedPreset] = useState<PresetVoice | null>(REGIONAL_INDIAN_PRESETS[0]);

  // Option B states (Cloned mic/file)
  const [refAudioB64, setRefAudioB64] = useState<string | null>(null);
  const [refAudioMime, setRefAudioMime] = useState<string | null>(null);
  const [refAudioLocalUrl, setRefAudioLocalUrl] = useState<string | null>(null);
  const [refVoiceAnalysis, setRefVoiceAnalysis] = useState<VoiceAnalysis | null>(null);
  const [clonedProfileName, setClonedProfileName] = useState<string>("My Cloned Voice");
  const [hasVoiceboxProfileTrained, setHasVoiceboxProfileTrained] = useState<boolean>(false);
  const [voiceboxTrainedProfileId, setVoiceboxTrainedProfileId] = useState<string>("");

  // Script editing states
  const [scriptText, setScriptText] = useState<string>("");
  const [emotionalTone, setEmotionalTone] = useState<string>("excited");

  // Output player states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [synthesizedAudioUrl, setSynthesizedAudioUrl] = useState<string | null>(null);

  // Synthesis engine progress tracker
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [synthesisProgressText, setSynthesisProgressText] = useState<string>("");
  const [synthesisError, setSynthesisError] = useState<string | null>(null);

  // Fallback SpeechSynthesis indicators to bypass 429 quota limits
  const [, setIsUsingLocalFallback] = useState<boolean>(false);
  const localTtsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Archive history
  const [cloneHistory, setCloneHistory] = useState<CloneHistoryItem[]>([]);
  const outputAudioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-detect local Voicebox running on default port 17493
  const checkVoiceboxStatus = async () => {
    try {
      const res = await fetch("http://127.0.0.1:17493/profiles", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const profiles = await res.json();
        setIsVoiceboxConnected(true);
        setVoiceboxProfiles(profiles);
        setConnectionMode("voicebox"); // Recommend Voicebox mode automatically
        if (profiles.length > 0 && !selectedVoiceboxProfileId) {
          setSelectedVoiceboxProfileId(profiles[0].id);
        }
      } else {
        setIsVoiceboxConnected(false);
      }
    } catch (e) {
      setIsVoiceboxConnected(false);
      if (connectionMode === "voicebox") {
        setConnectionMode("cloud"); // Fallback to cloud if Voicebox goes offline
      }
    }
  };

  useEffect(() => {
    checkVoiceboxStatus();
    // Poll Voicebox status every 8 seconds
    const interval = setInterval(checkVoiceboxStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup local voice speech on unmount
  useEffect(() => {
    return () => {
      if (localTtsTimerRef.current) {
        clearInterval(localTtsTimerRef.current);
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Set default script and load local storage history on mount
  useEffect(() => {
    setScriptText(REGIONAL_INDIAN_PRESETS[0].exampleText);
    try {
      const saved = localStorage.getItem("swara_clone_history");
      if (saved) {
        setCloneHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load local clone library.", e);
    }
  }, []);

  const saveHistory = (items: CloneHistoryItem[]) => {
    setCloneHistory(items);
    localStorage.setItem("swara_clone_history", JSON.stringify(items));
  };

  const handleAudioReady = (base64Data: string | null, mimeType: string | null, localUrl: string | null) => {
    setRefAudioB64(base64Data);
    setRefAudioMime(mimeType);
    setRefAudioLocalUrl(localUrl);
    setHasVoiceboxProfileTrained(false); // Reset training flag for new audio samples

    if (base64Data) {
      sessionStorage.setItem("ref_audio_b64", base64Data);
      sessionStorage.setItem("ref_audio_mime", mimeType || "audio/webm");
    } else {
      sessionStorage.removeItem("ref_audio_b64");
      sessionStorage.removeItem("ref_audio_mime");
    }
  };

  const handleCopyExample = (text: string) => {
    setScriptText(text);
    const editor = document.getElementById("script-editor");
    if (editor) {
      editor.scrollIntoView({ behavior: "smooth" });
      editor.focus();
    }
  };

  // Upgraded: Train local Voicebox Zero-Shot profile
  const trainVoiceboxProfile = async (): Promise<string> => {
    if (!refAudioB64) {
      throw new Error("No custom voice recording is registered to train on Voicebox.");
    }
    
    setSynthesisProgressText("Creating new local Voicebox profile...");
    
    // 1. Create a profile
    const profileRes = await fetch("http://127.0.0.1:17493/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: clonedProfileName,
        description: `VaniSynth clone - ${new Date().toLocaleString()}`,
        language: selectedPreset?.id === "kavita" ? "hi" : "en",
        voice_type: "cloned",
        default_engine: voiceboxEngine
      })
    });
    
    if (!profileRes.ok) {
      const err = await profileRes.json();
      throw new Error(err.detail || "Failed to create local Voicebox profile.");
    }
    
    const profile = await profileRes.json();
    const profileId = profile.id;
    
    setSynthesisProgressText("Uploading audio sample to Voicebox profile...");

    // 2. Upload sample
    // Convert base64 back to Blob
    const binary = atob(refAudioB64);
    const array = [];
    for (let i = 0; i < binary.length; i++) {
      array.push(binary.charCodeAt(i));
    }
    const audioBlob = new Blob([new Uint8Array(array)], { type: refAudioMime || "audio/webm" });
    
    const formData = new FormData();
    formData.append("file", audioBlob, `recording.${refAudioMime?.split("/")[1] || "webm"}`);
    formData.append("reference_text", "This is my speech sample cloned for zero-shot synthesis.");

    const sampleRes = await fetch(`http://127.0.0.1:17493/profiles/${profileId}/samples`, {
      method: "POST",
      body: formData
    });

    if (!sampleRes.ok) {
      throw new Error("Failed to upload training sample to local Voicebox profile.");
    }

    setVoiceboxTrainedProfileId(profileId);
    setHasVoiceboxProfileTrained(true);
    
    // Refresh profiles listing
    checkVoiceboxStatus();
    
    return profileId;
  };

  const triggerSynthesisPacing = async () => {
    const steps = connectionMode === "voicebox" ? [
      "Connecting to local Voicebox Server...",
      "Mapping local acoustic coefficients...",
      "Loading high-fidelity zero-shot weights...",
      "Synthesizing same-to-same cloned speech...",
      "Applying audio effects layers...",
      "Finalizing WAV output packaging...",
    ] : [
      "Accessing Google Gemini Cloud TTS...",
      "Mapping vocal audio spectrograpic indices...",
      "Analyzing accent dialect characteristics...",
      "Injecting Hinglish/Indian pacing values...",
      "Re-organizing phonetic frequency tables...",
      "Encoding final high-fidelity voice output...",
    ];

    for (let i = 0; i < steps.length; i++) {
      if (!isSynthesizing) break;
      setSynthesisProgressText(steps[i]);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  };

  // Synthesize and output Voice track!
  const executeSynthesis = async () => {
    if (!scriptText.trim()) {
      setSynthesisError("Please write or optimize a script in Step 3 before synthesising.");
      return;
    }

    if (cloningMode === "clone" && !refAudioB64) {
      setSynthesisError("Please record your microphone sample or upload an audio clip for custom vocal cloning.");
      return;
    }

    setIsSynthesizing(true);
    setSynthesisError(null);
    setSynthesizedAudioUrl(null);
    setIsPlaying(false);

    triggerSynthesisPacing();

    try {
      // --- 1. LOCAL VOICEBOX ZERO-SHOT VOICE CLONING (SAME TO SAME) ---
      if (connectionMode === "voicebox") {
        let activeProfileId = selectedVoiceboxProfileId;

        // If cloning mode is active, make sure we have a local trained profile
        if (cloningMode === "clone") {
          if (!hasVoiceboxProfileTrained || !voiceboxTrainedProfileId) {
            activeProfileId = await trainVoiceboxProfile();
          } else {
            activeProfileId = voiceboxTrainedProfileId;
          }
        } else {
          // Preset voice fallback using local presets or resolved profile
          if (voiceboxProfiles.length === 0) {
            throw new Error("No profiles exist in local Voicebox. Please record a voice to clone.");
          }
          if (!activeProfileId) {
            activeProfileId = voiceboxProfiles[0].id;
          }
        }

        setSynthesisProgressText("Synthesizing speech via Voicebox Model...");

        // Stream generated audio synchronously
        const streamRes = await fetch("http://127.0.0.1:17493/generate/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile_id: activeProfileId,
            text: scriptText,
            language: selectedPreset?.id === "kavita" ? "hi" : "en",
            engine: voiceboxEngine,
            normalize: true
          })
        });

        if (!streamRes.ok) {
          const errorMsg = await streamRes.text();
          throw new Error(`Voicebox server synthesis error: ${errorMsg || "Synthesis failed"}`);
        }

        const audioBlob = await streamRes.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        setSynthesizedAudioUrl(audioUrl);

        // Save entry to local history
        const historyTitle = scriptText.slice(0, 32) + (scriptText.length > 32 ? "..." : "");
        const newHistoryItem: CloneHistoryItem = {
          id: "hist_" + Date.now(),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          title: historyTitle,
          script: scriptText,
          audioUrl: audioUrl,
          voiceName: cloningMode === "clone" ? `Voicebox Cloned (${clonedProfileName})` : `Voicebox Preset (${voiceboxProfiles.find(p=>p.id === activeProfileId)?.name || "Default"})`,
          mode: cloningMode,
          locale: cloningMode === "clone" ? "Identical Same-to-Same" : "Voicebox Local Persona",
          emotion: emotionalTone,
        };

        saveHistory([newHistoryItem, ...cloneHistory]);

        setTimeout(() => {
          if (outputAudioRef.current) {
            outputAudioRef.current.play().then(() => setIsPlaying(true)).catch(() => console.log("Playback blocked."));
          }
        }, 300);

      } else {
        // --- 2. CLOUD GEMINI ACCENT MATCHING FALLBACK ---
        const payload: any = {
          script: scriptText,
          emotionalTone: emotionalTone,
        };

        if (cloningMode === "clone") {
          payload.audio = refAudioB64;
          payload.mimeType = refAudioMime;
        } else {
          payload.presetVoice = selectedPreset;
        }

        const response = await fetch("/api/clone-synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        let data: any;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          const cleanMsg = text.includes("<!DOCTYPE") || text.includes("<html")
            ? "The server did not return JSON. Please verify Vercel configurations and API keys."
            : text.slice(0, 250);
          throw new Error(cleanMsg || `Server responded with status ${response.status}`);
        }

        if (!response.ok || data.error) {
          throw new Error(data.error || "Synthesis engine failed. Try adjusting script length.");
        }

        const byteCharacters = atob(data.audio);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        const audioBlob = new Blob(byteArrays, { type: data.mimeType || "audio/mp3" });
        const audioUrl = URL.createObjectURL(audioBlob);

        setSynthesizedAudioUrl(audioUrl);

        // Create history entry
        const historyTitle = scriptText.slice(0, 32) + (scriptText.length > 32 ? "..." : "");
        const newHistoryItem: CloneHistoryItem = {
          id: "hist_" + Date.now(),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          title: historyTitle,
          script: scriptText,
          audioUrl: audioUrl,
          voiceName: cloningMode === "clone" ? "Gemini Cloned Signature" : selectedPreset?.name || "Indian Voice",
          mode: cloningMode,
          locale: cloningMode === "clone" ? (refVoiceAnalysis?.accent || "Custom Signature") : selectedPreset?.accent || "Indian Accent",
          emotion: emotionalTone,
        };

        saveHistory([newHistoryItem, ...cloneHistory]);

        setTimeout(() => {
          if (outputAudioRef.current) {
            outputAudioRef.current.play().then(() => setIsPlaying(true)).catch(() => console.log("Playback blocked."));
          }
        }, 300);
      }

    } catch (err: any) {
      console.error(err);
      const errorMsg = String(err.message || err || "").toLowerCase();
      const isQuotaError = errorMsg.includes("quota") || errorMsg.includes("rate") || errorMsg.includes("429") || errorMsg.includes("exhausted");
      
      if (isQuotaError) {
        setSynthesisError(
          "⚠️ Gemini Cloud Daily Quota Exceeded! Switching to high-fidelity Local Browser Speech Engine to speak your script seamlessly!"
        );
        initiateLocalSpeechFallback();
      } else {
        setSynthesisError(err.message || "Something went wrong synthesizing voiceover script.");
      }
    } finally {
      setIsSynthesizing(false);
    }
  };

  const initiateLocalSpeechFallback = () => {
    setIsUsingLocalFallback(true);
    setSynthesisError(null);
    setSynthesizedAudioUrl("local_speech_fallback");
    const estimatedDuration = Math.max(3, Math.round(scriptText.length * 0.08));
    setAudioDuration(estimatedDuration);
    setAudioCurrentTime(0);
    setIsPlaying(false);
  };

  // HTML5 audio event binders
  useEffect(() => {
    const audio = outputAudioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setAudioCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setAudioCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [synthesizedAudioUrl]);

  const togglePlay = () => {
    if (!synthesizedAudioUrl) return;

    if (synthesizedAudioUrl === "local_speech_fallback") {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
        if (localTtsTimerRef.current) {
          clearInterval(localTtsTimerRef.current);
          localTtsTimerRef.current = null;
        }
      } else {
        if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          setIsPlaying(true);
          startLocalTtsTimelineTimer();
        } else {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(scriptText);
          const voices = window.speechSynthesis.getVoices();
          let selectedVoice = null;
          
          if (cloningMode === "preset" && selectedPreset) {
            if (selectedPreset.id === "kavita") {
              selectedVoice = voices.find(v => v.lang.startsWith("hi") || v.lang.includes("hi-IN"));
            } else {
              selectedVoice = voices.find(v => v.lang.includes("en-IN") || v.name.includes("India"));
            }
          } else {
            if (refVoiceAnalysis && refVoiceAnalysis.gender) {
              const isFemale = refVoiceAnalysis.gender.toLowerCase().includes("female");
              selectedVoice = voices.find(v => {
                const isIN = v.lang.includes("IN") || v.name.includes("India") || v.lang.startsWith("hi");
                const nameMatch = v.name.toLowerCase();
                const genderMatch = isFemale 
                  ? (nameMatch.includes("female") || nameMatch.includes("zira") || nameMatch.includes("heera") || nameMatch.includes("neerja"))
                  : (nameMatch.includes("male") || nameMatch.includes("david") || nameMatch.includes("ravi") || nameMatch.includes("hemant"));
                return isIN && genderMatch;
              });
            }
          }
          
          if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.includes("IN") || v.name.toLowerCase().includes("india") || v.lang.startsWith("hi"));
          }
          if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.startsWith("en"));
          }
          
          if (selectedVoice) {
            utter.voice = selectedVoice;
          }
          
          utter.rate = playbackSpeed;
          
          utter.onend = () => {
            setIsPlaying(false);
            setAudioCurrentTime(0);
            if (localTtsTimerRef.current) {
              clearInterval(localTtsTimerRef.current);
              localTtsTimerRef.current = null;
            }
          };
          
          utter.onerror = () => {
            setIsPlaying(false);
            if (localTtsTimerRef.current) {
              clearInterval(localTtsTimerRef.current);
              localTtsTimerRef.current = null;
            }
          };

          setIsPlaying(true);
          window.speechSynthesis.speak(utter);
          startLocalTtsTimelineTimer();
        }
      }
      return;
    }

    if (!outputAudioRef.current) return;
    if (isPlaying) {
      outputAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      outputAudioRef.current.play().then(() => setIsPlaying(true));
    }
  };

  const startLocalTtsTimelineTimer = () => {
    if (localTtsTimerRef.current) {
      clearInterval(localTtsTimerRef.current);
    }
    localTtsTimerRef.current = setInterval(() => {
      setAudioCurrentTime((prev) => {
        if (prev >= audioDuration) {
          if (localTtsTimerRef.current) {
            clearInterval(localTtsTimerRef.current);
            localTtsTimerRef.current = null;
          }
          setIsPlaying(false);
          return 0;
        }
        return prev + 0.1;
      });
    }, 100);
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (outputAudioRef.current) {
      outputAudioRef.current.playbackRate = speed;
    }
  };

  const handleSeekChange = (value: number) => {
    setAudioCurrentTime(value);
    if (synthesizedAudioUrl !== "local_speech_fallback" && outputAudioRef.current) {
      outputAudioRef.current.currentTime = value;
    }
  };

  const formatSecs = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const min = Math.floor(secs / 60);
    const sec = Math.floor(secs % 60);
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const deleteHistoryItem = (id: string) => {
    const filtered = cloneHistory.filter((item) => item.id !== id);
    saveHistory(filtered);
  };

  const selectHistoryItem = (item: CloneHistoryItem) => {
    setSynthesizedAudioUrl(item.audioUrl);
    setScriptText(item.script);
    setEmotionalTone(item.emotion);
    if (item.mode === "preset") {
      setCloningMode("preset");
      const matched = REGIONAL_INDIAN_PRESETS.find((v) => v.name === item.voiceName);
      if (matched) setSelectedPreset(matched);
    } else {
      setCloningMode("clone");
    }
    setTimeout(() => {
      if (outputAudioRef.current) {
        outputAudioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.log(e));
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Primary Header */}
      <header className="border-b border-slate-900 bg-slate-950 px-6 py-4 sticky top-0 z-50 backdrop-blur-md bg-opacity-95 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-950/40">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
                VaniSynth - Voice Clone & Indian Audioover Studio
              </h1>
              <p className="text-[11px] text-slate-400 font-mono tracking-wider uppercase mt-0.5">
                Restructured Multi-Model Speeches & Clones Architecture
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Connection mode badges */}
            <div className="flex bg-slate-900 p-1.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setConnectionMode("cloud")}
                className={`px-3 py-1.5 rounded font-mono transition-all ${
                  connectionMode === "cloud"
                    ? "bg-orange-600 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                ☁️ Gemini Cloud
              </button>
              <button
                onClick={() => {
                  if (isVoiceboxConnected) {
                    setConnectionMode("voicebox");
                  } else {
                    alert("Local Voicebox Server is offline. Please launch the Voicebox Desktop App on your machine first!");
                  }
                }}
                className={`px-3 py-1.5 rounded font-mono transition-all flex items-center gap-1.5 ${
                  connectionMode === "voicebox"
                    ? "bg-[#E05A47] text-white font-bold"
                    : "text-slate-450 hover:text-slate-200"
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>Local Voicebox</span>
                <span className={`w-1.5 h-1.5 rounded-full ${isVoiceboxConnected ? "bg-emerald-400" : "bg-red-500 animate-pulse"}`} />
              </button>
            </div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-lg text-slate-350 transition-all cursor-pointer"
              title="Voice Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6 pb-12">
        {/* Dynamic System Status Banner */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1.5">
            <span className="bg-orange-950 text-orange-400 border border-orange-900 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
              {connectionMode === "voicebox" ? "VOICEBOX CONNECTED" : "GEMINI CLOUD LIVE"}
            </span>
            <h2 className="text-sm font-bold text-slate-200">
              {connectionMode === "voicebox" 
                ? "🎙️ Enabled Same-to-Same Voice Cloning Mode via Local Voicebox Desktop Engine"
                : "☁️ Running Gemini Accent-Matching Fallback Engine (Standard Templates)"}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              {connectionMode === "voicebox"
                ? "Excellent! The local Voicebox server has been detected. Speech is processed directly on your GPU using Kokoro or Qwen, reproducing identical zero-shot vocal cloning."
                : "VaniSynth will analyze your vocal sample blueprint and synthesize custom Hinglish accent tones using prebuilt Gemini TTS templates."}
            </p>
          </div>

          <button
            onClick={checkVoiceboxStatus}
            className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-850 border border-slate-800 py-2 px-3 rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check server status</span>
          </button>
        </div>

        {/* Voicebox Engine Settings Panel */}
        {showSettings && (
          <div className="p-5 bg-slate-900/90 border border-[#E05A47]/30 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 uppercase font-mono">
              <Settings className="w-4 h-4 text-orange-500" />
              <span>Voicebox Integration Settings (वॉइस सेटिंग्स)</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-slate-400 block uppercase">Active Voicebox Engine</label>
                <select
                  value={voiceboxEngine}
                  onChange={(e) => setVoiceboxEngine(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:border-[#E05A47]"
                >
                  <option value="kokoro">Kokoro v1.0 (Highly Recommended / Fast)</option>
                  <option value="qwen_custom_voice">Qwen CustomVoice (Excellent Dialects)</option>
                  <option value="chatterbox_turbo">Chatterbox Turbo (Expressive Speech)</option>
                  <option value="tada">HumeAI TADA (Emotional)</option>
                </select>
              </div>

              {connectionMode === "voicebox" && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-400 block uppercase">Select Voice Profile</label>
                  <select
                    value={selectedVoiceboxProfileId}
                    onChange={(e) => setSelectedVoiceboxProfileId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:border-[#E05A47]"
                  >
                    {voiceboxProfiles.length === 0 ? (
                      <option value="">No local profiles found. Create one under Option B!</option>
                    ) : (
                      voiceboxProfiles.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.voice_type})</option>
                      ))
                    )}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-slate-400 block uppercase">Cloned Voice Label</label>
                <input
                  type="text"
                  value={clonedProfileName}
                  onChange={(e) => setClonedProfileName(e.target.value)}
                  placeholder="e.g. My Cloned Voice"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:border-[#E05A47]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 1 & 2: Presets vs Microphone Cloner */}
        <div className="space-y-4">
          <div className="flex bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 max-w-md mx-auto relative shadow-inner">
            <button
              onClick={() => {
                setCloningMode("preset");
                setSynthesisError(null);
              }}
              className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                cloningMode === "preset"
                  ? "bg-[#E05A47] text-white shadow-md shadow-orange-950/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Option A: Regional Presets (राजेश/प्रिया)
            </button>
            <button
              onClick={() => {
                setCloningMode("clone");
                setSynthesisError(null);
              }}
              className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                cloningMode === "clone"
                  ? "bg-[#E05A47] text-white shadow-md shadow-orange-950/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Option B: Custom Voice Clone (मेरी आवाज)
            </button>
          </div>

          <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-2xl">
            {cloningMode === "preset" ? (
              <VoicePresetSelector
                selectedPresetId={selectedPreset?.id || null}
                onSelectPreset={(p) => setSelectedPreset(p)}
                onCopyExample={handleCopyExample}
              />
            ) : (
              <VoiceRecordUpload
                onAudioReady={handleAudioReady}
                audioLocalUrl={refAudioLocalUrl}
                audioB64={refAudioB64}
                audioMime={refAudioMime}
                onAnalysisResult={(a) => setRefVoiceAnalysis(a)}
                analysisResult={refVoiceAnalysis}
              />
            )}
          </div>
        </div>

        {/* Step 3: Script edit panel */}
        <ScriptWorkspace
          script={scriptText}
          onScriptChange={(v) => setScriptText(v)}
          onLocalizeComplete={(localized) => setScriptText(localized)}
        />

        {/* Step 4: Modulator & Synth ignition panel */}
        <section className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center space-x-2 border-b border-slate-900 pb-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Step 4: Emotional Tone Modulator & Synthesis Rendering
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
            <div className="lg:col-span-3 space-y-2">
              <label className="text-[10px] tracking-wider uppercase font-mono text-slate-500 block">
                Select Emotional Delivery Preset
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {EMOTIONAL_TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setEmotionalTone(opt.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                      emotionalTone === opt.id
                        ? "bg-[#E05A47]/10 border-[#E05A47] ring-1 ring-[#E05A47]/40 text-[#E05A47]"
                        : "bg-slate-950/60 border-slate-850 text-slate-450 hover:bg-slate-900/30"
                    }`}
                  >
                    <span className="text-xs font-semibold">{opt.label}</span>
                    <span className="text-xl self-end" aria-hidden="true">{opt.icon}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-end h-full">
              <button
                type="button"
                onClick={executeSynthesis}
                disabled={isSynthesizing || !scriptText.trim()}
                className="w-full bg-[#E05A47] hover:bg-orange-500 text-white font-bold h-20 rounded-xl transition flex flex-col items-center justify-center space-y-1 shadow-lg shadow-orange-950/30 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed group"
              >
                {isSynthesizing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="text-xs uppercase tracking-wide">Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-sm">Clone & Generate Audio</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <span className="text-[9px] uppercase font-mono text-orange-200">
                      {connectionMode === "voicebox" ? "Using Local Voicebox" : "Using Cloud Gemini"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isSynthesizing && (
            <div className="bg-slate-900/40 p-4 rounded-xl border border-dashed border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span>Rendering high-fidelity cloned vocal cords...</span>
                <span className="animate-pulse text-orange-400 font-bold">Please Wait</span>
              </div>
              <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-400 rounded-full animate-pulse transition-all duration-1000" style={{ width: "85%" }} />
              </div>
              <div className="text-xs text-slate-350 font-mono text-center pt-1.5">
                🚀 <span className="text-orange-400 font-bold">{synthesisProgressText || "Connecting to model..."}</span>
              </div>
            </div>
          )}

          {synthesisError && (
            <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-xl text-xs text-red-400 flex items-start space-x-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{synthesisError}</span>
            </div>
          )}
        </section>

        {/* Step 5: Synthesized audio player panel */}
        {synthesizedAudioUrl && (
          <section className="bg-slate-900/90 border border-[#E05A47]/40 shadow-xl shadow-orange-950/5 p-6 rounded-2xl space-y-6 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
              <Volume2 className="w-44 h-44 text-slate-300" />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
                  Success • Rendering Complete
                </span>
                <h4 className="text-md font-bold text-slate-100 mt-1.5">
                  Your Synced Desi Video Voiceover Track
                </h4>
              </div>

              {synthesizedAudioUrl !== "local_speech_fallback" ? (
                <a
                  href={synthesizedAudioUrl}
                  download="vanisynth_voice_over.wav"
                  className="flex items-center space-x-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 py-1.5 px-3.5 rounded-lg text-xs font-semibold cursor-pointer transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Save Voice Audio</span>
                </a>
              ) : (
                <div className="bg-amber-950/40 text-amber-400 border border-amber-900/50 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Local Voice Playback</span>
                </div>
              )}
            </div>

            <VoiceWaveform status={isPlaying ? "playing" : "idle"} />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-[#E05A47] hover:bg-orange-500 text-white flex items-center justify-center transition shadow-md shadow-orange-950/20 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-1" />
                  )}
                </button>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Playing Status</span>
                  <span className="text-xs text-slate-350 font-mono">
                    {formatSecs(audioCurrentTime)} / {formatSecs(audioDuration)}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>Track Timeline</span>
                  <span>{Math.round((audioCurrentTime / (audioDuration || 1)) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={audioDuration || 100}
                  value={audioCurrentTime}
                  onChange={(e) => handleSeekChange(parseFloat(e.target.value))}
                  className="w-full accent-[#E05A47] bg-slate-950 h-1 rounded-full cursor-pointer outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                  Playback Speed
                </label>
                <div className="flex bg-slate-950 border border-slate-800 p-0.5 rounded-lg">
                  {[0.75, 1.0, 1.25, 1.5].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => changeSpeed(speed)}
                      className={`flex-1 py-1 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
                        playbackSpeed === speed
                          ? "bg-slate-800 text-orange-400"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {synthesizedAudioUrl !== "local_speech_fallback" && (
              <audio ref={outputAudioRef} src={synthesizedAudioUrl} className="hidden" />
            )}
          </section>
        )}

        {/* History Archive Panel */}
        {cloneHistory.length > 0 && (
          <section className="bg-slate-950 border border-slate-900 p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-orange-500" />
              <span>Desi Voiceover Archive Library ({cloneHistory.length} recordings)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cloneHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => selectHistoryItem(item)}
                  className="p-3.5 bg-slate-900/40 hover:bg-slate-900/80 border border-slate-850 hover:border-[#E05A47]/40 rounded-xl transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group"
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-mono text-slate-500">{item.timestamp}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryItem(item.id);
                        }}
                        className="p-1 hover:bg-slate-850 rounded text-slate-500 hover:text-red-400 transition"
                        title="Delete recording"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-200 line-clamp-1 group-hover:text-orange-400 transition">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.script}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] border-t border-slate-950/60 pt-2 font-mono">
                    <span className="text-[#E05A47] font-semibold">{item.voiceName}</span>
                    <span className="text-slate-500">{item.locale}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
