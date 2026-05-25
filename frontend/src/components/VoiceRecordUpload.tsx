import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Upload, Sparkles, Check, AlertCircle, RefreshCw, Volume2 } from "lucide-react";
import { VoiceAnalysis } from "../types";

interface VoiceRecordUploadProps {
  onAudioReady: (base64Data: string | null, mimeType: string | null, localUrl: string | null) => void;
  audioLocalUrl: string | null;
  audioB64: string | null;
  audioMime: string | null;
  onAnalysisResult: (analysis: VoiceAnalysis | null) => void;
  analysisResult: VoiceAnalysis | null;
}

export function VoiceRecordUpload({
  onAudioReady,
  audioLocalUrl,
  audioB64,
  audioMime,
  onAnalysisResult,
  analysisResult,
}: VoiceRecordUploadProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatDuration = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Clean = base64String.split(",")[1];
        resolve(base64Clean);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const startRecording = async () => {
    try {
      setAnalysisError(null);
      onAnalysisResult(null);
      audioChunksRef.current = [];
      setRecordDuration(0);
      durationRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      let options = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options = { mimeType: "audio/webm;codecs=opus" };
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "audio/webm" };
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        options = { mimeType: "audio/ogg;codecs=opus" };
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options = { mimeType: "audio/mp4" };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const finalMimeType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
        const localUrl = URL.createObjectURL(audioBlob);
        
        try {
          const base64Data = await blobToBase64(audioBlob);
          onAudioReady(base64Data, finalMimeType, localUrl);
          setFileName(`Captured Mic Sample (${formatDuration(durationRef.current)})`);
          setFileMimeType(finalMimeType);
        } catch (e) {
          console.error("Base64 conversion failed", e);
          setAnalysisError("Audio data conversion failed. Please try again.");
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          const next = prev >= 29 ? 30 : prev + 1;
          durationRef.current = next;
          if (prev >= 29) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access failed", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError" || err.name === "SecurityError") {
        setAnalysisError("Mic integration was blocked. If running inside a limited preview framing environment, click 'Open in New Tab' on the top-right to run Voice Cloning flawlessly!");
      } else {
        setAnalysisError("Could not access microphone: " + err.message + ". Please verify your input device.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processAudioFile = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      setAnalysisError("Unsupported document type. Please drop an audio file (.mp3, .wav, .m4a, etc.).");
      return;
    }

    setAnalysisError(null);
    onAnalysisResult(null);
    setFileName(file.name);
    setFileMimeType(file.type);

    const localUrl = URL.createObjectURL(file);
    try {
      const base64Data = await blobToBase64(file);
      onAudioReady(base64Data, file.type, localUrl);
    } catch (e) {
      setAnalysisError("Error reading voice file.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAudioFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processAudioFile(e.target.files[0]);
    }
  };

  const scanVoiceDNA = async () => {
    if (!audioLocalUrl) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const storedAudio = audioB64 || sessionStorage.getItem("ref_audio_b64") || "";
      const storedMime = audioMime || fileMimeType || sessionStorage.getItem("ref_audio_mime") || "audio/webm";

      if (!storedAudio) {
        throw new Error("Vocal raw data is empty. Please re-capture or upload again.");
      }

      const response = await fetch("/api/analyze-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: storedAudio,
          mimeType: storedMime,
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
        throw new Error(data.error || "Analyzing voice signature failed.");
      }

      onAnalysisResult(data.analysis);
    } catch (error: any) {
      console.error(error);
      setAnalysisError(error.message || "Something went wrong while scanning voice signature.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAllAudio = () => {
    onAudioReady(null, null, null);
    setFileName(null);
    setFileMimeType(null);
    onAnalysisResult(null);
    setAnalysisError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-2">
          <Mic className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
            Option B: Clone Your Personal Voice (or upload)
          </h3>
        </div>
        <span className="text-[11px] font-mono bg-[#E05A47]/10 text-orange-400 px-2 py-0.5 rounded-full border border-[#E05A47]/20">
          Personal Bio Cloner
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Record Mic or File Upload */}
        <div className="space-y-3">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all min-h-[160px] ${
              dragActive
                ? "border-orange-500 bg-orange-950/10"
                : audioLocalUrl
                ? "border-emerald-600/50 bg-emerald-950/5"
                : "border-slate-800 bg-slate-950/20 hover:border-slate-700"
            }`}
          >
            {audioLocalUrl ? (
              <div className="space-y-3 w-full">
                <div className="flex items-center justify-center space-x-2 text-emerald-400">
                  <div className="bg-emerald-950/60 p-2 rounded-full border border-emerald-900/40">
                    <Check className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-sm">Vocal Sample Registered</span>
                </div>
                
                <div className="text-xs text-slate-300 font-mono line-clamp-1 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                  {fileName || "Captured Sample"}
                </div>

                <div className="flex items-center justify-center space-x-2 pt-1">
                  <audio src={audioLocalUrl} controls className="h-8 max-w-full rounded text-sm outline-none" />
                  <button
                    type="button"
                    onClick={resetAllAudio}
                    className="p-1 px-3 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white rounded transition flex items-center space-x-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Redo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                {isRecording ? (
                  <div className="space-y-2">
                    <div className="flex justify-center items-center">
                      <div className="w-3 h-3 bg-red-600 rounded-full animate-ping absolute" />
                      <div className="w-3 h-3 bg-red-600 rounded-full" />
                    </div>
                    <p className="text-sm font-semibold text-red-500 animate-pulse font-mono">
                      RECORDING: {formatDuration(recordDuration)} / 00:30
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Speak clearly into your microphone in English, Hindi, or your mother tongue.
                    </p>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="mt-2 inline-flex items-center space-x-2 bg-red-950/65 border border-red-800 hover:bg-red-900 text-red-100 rounded-full px-5 py-2 text-xs font-semibold cursor-pointer transition shadow-md shadow-red-950/20"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>Stop Sample Capture</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={startRecording}
                        className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-full px-5 py-2.5 text-xs transition shadow-md shadow-orange-950/30 cursor-pointer"
                      >
                        <Mic className="w-4 h-4" />
                        <span>Record Mic (30s)</span>
                      </button>

                      <span className="text-slate-500 text-xs font-mono">OR</span>

                      <label className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold rounded-full px-4 py-2.5 text-xs cursor-pointer transition">
                        <Upload className="w-4 h-4" />
                        <span>Upload Audio File</span>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleFileInput}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
                      Drag and drop your audio snippet here. Best results with clean, background-noise-free vocal recordings.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {audioLocalUrl && !analysisResult && (
            <button
              type="button"
              onClick={scanVoiceDNA}
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center space-x-2 bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700/50 text-indigo-100 py-2.5 px-4 rounded-xl text-xs font-semibold select-none cursor-pointer transition disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Scanning Vocal DNA with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Run Voice Signature Analysis</span>
                </>
              )}
            </button>
          )}

          {analysisError && (
            <div className="flex items-start space-x-2 bg-red-950/20 border border-red-900/40 p-3 rounded-lg text-xs text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{analysisError}</span>
            </div>
          )}
        </div>

        {/* Vocal DNA Certificate */}
        <div className="h-full">
          {isAnalyzing ? (
            <div className="h-full min-h-[160px] bg-indigo-950/10 border border-indigo-900/30 rounded-xl p-5 flex flex-col justify-center items-center text-center space-y-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-900/30 border-t-indigo-500 animate-spin" />
                <Sparkles className="w-5 h-5 text-indigo-450 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-indigo-300 font-mono">Biometric Speech Analysis</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                  Gemini is mapping your unique speech traits: pitch range, syllable stress, regional state enunciation, and local tone profile.
                </p>
              </div>
            </div>
          ) : analysisResult ? (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3 text-slate-300">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <h4 className="text-xs font-bold font-mono tracking-wider text-indigo-400 uppercase flex items-center space-x-1.5">
                  <Volume2 className="w-4 h-4" />
                  <span>Your Cloned Speech DNA Certificate</span>
                </h4>
                <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-900/40 px-2 py-0.5 rounded font-mono font-bold">
                  MATCH accuracy: {analysisResult.cloningConfidence}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-900/40 p-2 rounded border border-slate-900">
                  <span className="text-slate-550 block text-[9px] uppercase tracking-wider">Accent Accent Profile</span>
                  <span className="text-slate-100 font-bold block truncate mt-0.5">{analysisResult.accent}</span>
                </div>
                <div className="bg-slate-900/40 p-2 rounded border border-slate-900">
                  <span className="text-slate-550 block text-[9px] uppercase tracking-wider">Vocal Pitch BIAS</span>
                  <span className="text-slate-100 font-bold block truncate mt-0.5">{analysisResult.pitch}</span>
                </div>
                <div className="bg-slate-900/40 p-2 rounded border border-slate-900">
                  <span className="text-slate-550 block text-[9px] uppercase tracking-wider">Rhythmic Tempo</span>
                  <span className="text-slate-100 font-bold block truncate mt-0.5">{analysisResult.tempo}</span>
                </div>
                <div className="bg-slate-900/40 p-2 rounded border border-slate-900">
                  <span className="text-slate-550 block text-[9px] uppercase tracking-wider">Dynamic Register</span>
                  <span className="text-slate-100 font-bold block truncate mt-0.5">{analysisResult.gender}</span>
                </div>
              </div>

              <div className="space-y-1 pt-1.5">
                <span className="text-[10px] uppercase font-mono tracking-wider block text-indigo-400">Analysis Summary</span>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/20 p-2.5 rounded-lg border border-slate-900 border-dashed">
                  {analysisResult.summary}
                </p>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-slate-900">
                <span className="text-[10px] uppercase font-mono tracking-wider block text-emerald-400">Key Syllable Habits:</span>
                <ul className="text-[11px] space-y-1 text-slate-400 pl-4 list-disc">
                  {analysisResult.insights.slice(0, 3).map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[160px] bg-slate-950/20 border border-slate-900 rounded-xl p-5 flex flex-col justify-center items-center text-center text-slate-500">
              <Mic className="w-10 h-10 stroke-1 text-slate-700 mb-2 animate-pulse" />
              <p className="text-xs max-w-sm leading-relaxed text-slate-400">
                Unlock biometric audio cloning by capturing or uploading a voice sample on the left.
              </p>
              <p className="text-[10px] text-slate-500 max-w-[260px] mt-1">
                Gemini will dynamically read the phonetic spectrum of your voice to perfectly map localized inflection parameters onto any script!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
