-- SQL Schema for VaniSynth - Voice Clone & Indian Audioover Studio
-- Compatible with PostgreSQL / Supabase DB

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Voice Profiles Table
CREATE TABLE IF NOT EXISTS voice_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    language VARCHAR(10) DEFAULT 'en',
    voice_type VARCHAR(20) DEFAULT 'cloned' CHECK (voice_type IN ('cloned', 'preset', 'designed')),
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'neutral')),
    accent_name VARCHAR(100), -- e.g. "Mumbai Hinglish", "Bengaluru Techie"
    accent_prompt TEXT, -- Detailed instructions for the synthesizer
    avatar_emoji VARCHAR(10) DEFAULT '🎙️',
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast profile search by type
CREATE INDEX IF NOT EXISTS idx_voice_profiles_type ON voice_profiles(voice_type);

-- 2. Speech Generations Table
CREATE TABLE IF NOT EXISTS generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES voice_profiles(id) ON DELETE SET NULL,
    script_text TEXT NOT NULL,
    emotional_tone VARCHAR(50) DEFAULT 'natural', -- e.g. "excited", "informative"
    engine VARCHAR(50) DEFAULT 'gemini' CHECK (engine IN ('gemini', 'kokoro', 'qwen', 'browser')),
    language VARCHAR(10) DEFAULT 'en',
    audio_url TEXT, -- Cloud storage URL or local path
    duration NUMERIC(6,2), -- duration in seconds
    is_favorited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for searching histories by profile
CREATE INDEX IF NOT EXISTS idx_generations_profile ON generations(profile_id);
CREATE INDEX IF NOT EXISTS idx_generations_created ON generations(created_at DESC);

-- 3. Scripts Sandbox Table
CREATE TABLE IF NOT EXISTS scripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    raw_content TEXT NOT NULL,
    localized_content TEXT,
    target_locale VARCHAR(100), -- e.g. "Mumbai Hinglish", "Lucknow pure Hindi"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for auto updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_voice_profiles_modtime
    BEFORE UPDATE ON voice_profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_scripts_modtime
    BEFORE UPDATE ON scripts
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();
