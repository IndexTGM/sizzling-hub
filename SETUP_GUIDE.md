# 🚀 Full-Stack App Setup Guide: Next.js + React Native (Android APK) + Supabase

This guide walks you through setting up a monorepo with **Next.js** (Web), **React Native** (Android Mobile), and **Supabase** (Backend/Database) — from scratch to a production APK.

---

## 📋 Prerequisites

Install these on your machine first:

| Tool | Download |
|------|----------|
| **Node.js 18+** | [nodejs.org](https://nodejs.org/) |
| **Git** | [git-scm.com](https://git-scm.com/) |
| **Android Studio** | [developer.android.com/studio](https://developer.android.com/studio) |
| **JDK 17** | Included with Android Studio or [Adoptium](https://adoptium.net/) |
| **VS Code** | [code.visualstudio.com](https://code.visualstudio.com/) |

> ⚠️ **Windows users**: Enable WSL2 or use PowerShell as Administrator for Android builds.

---

## 1️⃣ PROJECT STRUCTURE (Monorepo)

```
sizzling-hub/
├── apps/
│   ├── web/                 # Next.js app
│   └── mobile/              # React Native (Expo) app
├── packages/
│   └── shared/              # Shared types, utils, supabase client
├── supabase/                # Supabase local config (optional)
└── package.json             # Root workspace config
```

---

## 2️⃣ SETUP: ROOT MONOREPO

```bash
# Create root directory
mkdir sizzling-hub && cd sizzling-hub

# Initialize root package.json with workspaces
npm init -y
```

Edit `package.json`:
```json
{
  "name": "sizzling-hub",
  "private": true,
  "workspaces": ["apps/*", "packages/*"]
}
```

---

## 3️⃣ SETUP: NEXT.JS (WEB APP)

```bash
# First, create the apps directory from the project root
mkdir apps

# Create the web app using create-next-app
# Windows (cmd / PowerShell): use quotes around the path alias
npx create-next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Mac / Linux: same command works
npx create-next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# If you get "path is not writable", the apps/ folder doesn't exist yet — run `mkdir apps` first

cd apps/web
npm install @supabase/supabase-js @supabase/ssr
```

### Supabase Client for Next.js (Server + Client)

Create `apps/web/src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
```

Create `apps/web/src/lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
};
```

### Environment Variables

Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
```

---

## 4️⃣ SETUP: REACT NATIVE (ANDROID MOBILE)

```bash
# From root, create Expo app
npx create-expo-app@latest apps/mobile --template tabs

cd apps/mobile
npm install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

### Supabase Client for React Native

Create `apps/mobile/lib/supabase.ts`:
```ts
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Environment Variables

Create `apps/mobile/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
```

---

## 5️⃣ SETUP: SUPABASE DATABASE

### 5.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → Sign in
2. Click **"New Project"**
3. Fill in: Organization, Name, Database Password, Region
4. Wait ~2 minutes for the database to provision

### 5.2 Get API Keys

Go to **Project Settings → API** and copy:
- **Project URL** → use as `SUPABASE_URL`
- **anon public key** → use as `SUPABASE_ANON_KEY`

### 5.3 Create Tables (SQL)

Go to **SQL Editor** in your Supabase dashboard and run:

```sql
-- Example: Users profile table (extends auth.users)
CREATE TABLE profiles (
  id        UUID REFERENCES auth.users(id) PRIMARY KEY,
  username  TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies: Users can read all profiles, update only their own
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Example: Posts table
CREATE TABLE posts (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read posts"
  ON posts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE USING (auth.uid() = user_id);
```

### 5.4 Enable Auth Providers (Optional)

Go to **Authentication → Providers** and enable:
- **Email** (default, already on)
- **Google**, **GitHub**, etc. (set up OAuth credentials)

---

## 6️⃣ SHARED PACKAGE (Optional but Recommended)

```bash
mkdir -p packages/shared
cd packages/shared
npm init -y
```

Edit `packages/shared/package.json`:
```json
{
  "name": "@sizzling-hub/shared",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0"
  }
}
```

This is where you'd put shared TypeScript types, constants, and a unified Supabase client if needed.

---

## 7️⃣ BUILDING THE ANDROID APK

### 7.1 Using Expo (EAS Build) — RECOMMENDED

```bash
cd apps/mobile

# Install EAS CLI
npm install -g eas-cli

# Login to your Expo account
eas login

# Configure build
eas build:configure
```

This creates `eas.json`. Edit it:
```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

Build the APK:
```bash
# Build preview APK (for testing)
eas build --platform android --profile preview
```

The APK will upload to Expo's servers. You'll get a download link.

### 7.2 Using React Native CLI (Bare Workflow)

If you ejected from Expo or use bare React Native:

```bash
cd apps/mobile/android

# Generate debug APK
./gradlew assembleDebug

# Generate release APK
./gradlew assembleRelease

# Output location:
# android/app/build/outputs/apk/debug/app-debug.apk
# android/app/build/outputs/apk/release/app-release.apk
```

> ⚠️ For release APK, you need a **keystore**. Generate one:
> ```bash
> keytool -genkeypair -v -keystore release.keystore \
>   -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
> ```

### 7.3 Android Studio Setup for Local Builds

1. Open **Android Studio** → **SDK Manager**
2. Install: **Android SDK Platform 34**, **Build-Tools 34.0.0**, **NDK**
3. Set environment variables (Windows PowerShell):
   ```powershell
   [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', "$env:LOCALAPPDATA\Android\Sdk", 'User')
   ```
4. Add to PATH: `%ANDROID_HOME%\platform-tools`

---

## 8️⃣ DEVELOPMENT WORKFLOW

### Start Web App (Next.js)
```bash
cd apps/web
npm run dev
# → http://localhost:3000
```

### Start Mobile App (Expo)
```bash
cd apps/mobile

# Start Expo dev server
npx expo start

# Press 'a' for Android emulator
# Or scan QR code with Expo Go app on your phone
```

### Run Supabase Locally (Optional)
```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase init
supabase start
```

---

## 9️⃣ DEPLOYMENT

| Platform | Service | Command |
|----------|---------|---------|
| **Next.js (Web)** | Vercel | `vercel` or connect GitHub repo |
| **Next.js (Web)** | Netlify | Connect repo, set build command to `next build` |
| **Mobile APK** | Expo EAS | `eas build --platform android --profile production` |
| **Mobile Play Store** | Expo EAS | `eas submit --platform android` |
| **Supabase** | Supabase Cloud | Already deployed (managed) |

---

## 🔐 SECURITY BEST PRACTICES

1. **Never expose `service_role` key** in client code — server-side only
2. **Always enable Row Level Security (RLS)** on tables
3. **Use `.env` files** and never commit them to Git
4. **Validate user input** both client-side and server-side
5. **Use Supabase Auth** (never roll your own auth unless you know what you're doing)

---

## 📦 COMPLETE package.json FOR EACH APP

### Root `package.json`
```json
{
  "name": "sizzling-hub",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "web": "npm run dev -w apps/web",
    "mobile": "npx expo start -w apps/mobile",
    "lint": "npm run lint -w apps/web"
  }
}
```

---

## 🎯 NEXT STEPS

1. [ ] Create Supabase project and get API keys
2. [ ] Run SQL to create your database tables  
3. [ ] Set up Next.js app with Supabase client
4. [ ] Set up React Native app with Supabase client
5. [ ] Implement authentication (email/password or OAuth)
6. [ ] Build and test CRUD operations
7. [ ] Generate APK via `eas build`
8. [ ] Test on a physical Android device

---

> 💡 **Pro Tip**: Start with the web app first to prototype your UI and database interactions. Once that works, replicate the logic in the mobile app. Both share the same Supabase backend!