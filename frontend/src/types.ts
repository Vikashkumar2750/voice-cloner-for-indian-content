export interface PresetVoice {
  id: string;
  name: string;
  accent: string;
  gender: "male" | "female";
  avatar: string;
  accentPrompt: string;
  exampleText: string;
  region: string;
}

export interface VoiceAnalysis {
  accent: string;
  pitch: string;
  tempo: string;
  gender: string;
  cloningConfidence: string;
  summary: string;
  insights: string[];
  suggestedCharacters: string[];
}

export interface CloneHistoryItem {
  id: string;
  timestamp: string;
  title: string;
  script: string;
  audioUrl: string;
  voiceName: string;
  mode: "clone" | "preset";
  locale: string;
  emotion: string;
}
