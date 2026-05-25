# VaniSynth Database Layer

This folder houses the SQL definition structures and guides for connecting **VaniSynth** to a highly scalable cloud database.

## Contents
- **[schema.sql](schema.sql)**: Complete database tables schema (for voice profiles, text generation history, and localized scripts) targeting PostgreSQL.
- **[supabase-setup.md](supabase-setup.md)**: Setup guides for creating a free project on Supabase and connecting it to our serverless functions.

## Rationale
By maintaining a dedicated database layer, this project separates styling/UI logic (the React client) from data-persistence configurations (the PostgreSQL tables), enabling simple integration and scaling.
