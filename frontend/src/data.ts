import { PresetVoice } from "./types";

export const REGIONAL_INDIAN_PRESETS: PresetVoice[] = [
  {
    id: "raj",
    name: "Rajiv",
    accent: "Bengaluru Techie (Indian English)",
    gender: "male",
    avatar: "💻",
    region: "Karnataka",
    accentPrompt: "soft, polite Bengaluru IT developer Indian English, with measured pacing, professional structure, and precise, friendly pronunciations of modern technical parameters",
    exampleText: "Hey guys, welcome back to the channel. Today we are testing this brand new 5G gadget which will solve your connection issues. Let's dive in!"
  },
  {
    id: "priya",
    name: "Priya",
    accent: "Mumbai Ad Anchor (Fluent News English)",
    gender: "female",
    avatar: "🎙️",
    region: "Maharashtra",
    accentPrompt: "metropolitan Mumbai news host style, highly standard, premium, neutral-to-posh Indian corporate English, with exceptionally smooth clarity and authoritative voiceover cadence",
    exampleText: "This festive season, bring home the luxury of sustainable living. Over two lakh families have upgraded their homes with our smart appliances. Choose better today."
  },
  {
    id: "amit",
    name: "Amit",
    accent: "Delhi Influencer (Energetic Hinglish)",
    gender: "male",
    avatar: "🔥",
    region: "Delhi NCR",
    accentPrompt: "Delhi Hinglish millennial social media creator accent, fast-paced, highly energetic, conversational, blending colloquial Hindi slang like 'bhai', 'dosto', 'ekdum next-level' naturally",
    exampleText: "O bhai sahib! Aaj tumhara bhai dikhane wala hai Delhi ka best street food joint. Video ko end tak dekhna, share karna mat bhoolna!"
  },
  {
    id: "karthik",
    name: "Karthik",
    accent: "Chennai Educator (Academic English-Tamil)",
    gender: "male",
    avatar: "🎓",
    region: "Tamil Nadu",
    accentPrompt: "academic South Indian English with gentle Tamil-inflected pronunciation, scholarly pacing, reassuring tone, highly articulate and extremely trustworthy",
    exampleText: "In this session, we will examine the gravitational forces. Please open page forty-five. Note down this simple formula for your board exams."
  },
  {
    id: "kavita",
    name: "Kavita",
    accent: "Lucknow Storyteller (Sweet Classic Hindi)",
    gender: "female",
    avatar: "🌸",
    region: "Uttar Pradesh",
    accentPrompt: "Lucknow classical polite pure Hindi voice, comforting, poetic, highly respectful, carrying cultural elegance and sweet musical diction suitable for descriptive storytelling",
    exampleText: "नमस्ते दोस्तों। आज की कहानी है एक अनोखे सफर की, जहाँ पहाड़ों के पीछे छिपा था एक छोटा सा गाँव। चलिए सुनते हैं इस प्यारी सी दास्तान को।"
  }
];

export const EMOTIONAL_TONE_OPTIONS = [
  { id: "natural", label: "Natural & Calm (प्राकृतिक)", icon: "🎯" },
  { id: "excited", label: "Excited Bollywood Ad (धमाकेदार)", icon: "🔥" },
  { id: "informative", label: "Informative Tech Review (ज्ञानवर्धक)", icon: "💡" },
  { id: "storytelling", label: "Scenic Storyteller (भावुक/मधुर)", icon: "📖" },
  { id: "corporate", label: "Corporate (व्यावसायिक)", icon: "👔" }
];

export const DESIGN_WORDS = {
  themeName: "Masala Slate Theme",
  accentColor: "#E05A47"  // Indian Saffron-Marigold Warm Red
};
