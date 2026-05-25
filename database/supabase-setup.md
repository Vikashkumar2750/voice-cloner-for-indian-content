# Supabase Cloud Database Integration Guide

This guide describes how to connect **VaniSynth** to a free cloud PostgreSQL database hosted on **Supabase** to store voice profiles, localized scripts, and vocal synthesis histories.

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in or create a free account.
2. In the dashboard, click **New Project**.
3. Choose an organization, enter a **Project Name** (e.g., `vanisynth-db`), set a secure **Database Password**, and select a region closest to your Vercel deployment (e.g., `South Asia (Mumbai)` or `East US`).
4. Click **Create new project** and wait a few minutes for the project to provision.

---

## Step 2: Initialize Database Schema

Once your project is ready:
1. Navigate to the **SQL Editor** tab from the left sidebar navigation menu (the `>_` terminal icon).
2. Click **New Query** to create a blank script workspace.
3. Open the [schema.sql](schema.sql) file from this repository, copy its entire contents, and paste it into the Supabase SQL editor.
4. Click **Run** on the bottom right.
5. You should see a success response stating `Success. No rows returned.`. Your tables (`voice_profiles`, `generations`, and `scripts`) are now created!

---

## Step 3: Link DB Connection Details

To connect your backend server (or Vercel serverless functions) to Supabase:
1. Navigate to **Project Settings** (the cogwheel icon at the bottom of the left sidebar).
2. Go to **Database**.
3. Scroll down to the **Connection string** section. Select the **URI** format.
4. Copy the connection string. It will look like this:
   ```
   postgresql://postgres.[your-project-id]:[your-password]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
   ```
5. Replace `[your-password]` with the database password you chose in Step 1.
6. Save this URI to your environment variables file `.env` or in the Vercel dashboard:
   ```env
   DATABASE_URL="postgresql://postgres.example:[password]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
   ```

---

## Step 4: Verify Dashboard Data

From the **Table Editor** (the grid icon in the left menu), you can select your newly created tables to browse records, add rows, or check column properties. Your application is now backed by a professional cloud SQL engine!
