# DrinkingBuddy 🍺

A React Native (Expo) app for tracking your alcohol intake, setting personal limits, and staying responsible. Built with Expo Router + Supabase.

---

## Features

- **Drink logging** — log any drink by type, volume, and ABV; standard drinks are auto-calculated
- **Daily & weekly limits** — visual progress bars and status alerts when approaching your limit
- **Drink history** — browse past 7/30/90 days or all time; delete entries
- **Presets** — save your favourite drinks for one-tap logging
- **Profile** — set weight, gender, and custom limits
- **Authentication** — email/password sign-up & sign-in via Supabase Auth

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 51 / React Native 0.74 |
| Navigation | Expo Router (file-based) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| State | React Context |
| Builds | EAS Build |

---

## Setup

### Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) account
- [Expo Go](https://expo.dev/go) on your phone (iOS or Android)
- For production builds: [EAS CLI](https://docs.expo.dev/eas/) + Expo account

---

### Step 1 — Clone & Install Dependencies

```bash
cd DrinkingBuddy
npm install
```

---

### Step 2 — Create a Free Supabase Project

1. Go to **https://supabase.com** and click **Start for free**
2. Sign up with GitHub or email
3. Click **New project**
4. Fill in:
   - **Name:** `DrinkingBuddy` (or anything you like)
   - **Database password:** generate a strong one and save it somewhere safe
   - **Region:** pick the one closest to you
5. Click **Create new project** — it takes about 60 seconds to provision

---

### Step 3 — Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **+ New query**
3. Open `supabase/schema.sql` from this repo and paste the entire contents
4. Click **Run** (green button, top right)
5. You should see `Success. No rows returned` — that's correct!

This creates:
- `profiles` table (linked to auth users)
- `drink_logs` table
- `drink_presets` table
- Row-Level Security policies (each user can only see their own data)
- Auto-create profile trigger on sign-up

---

### Step 4 — Get Your API Keys

1. In your Supabase project, go to **Settings → API** (left sidebar → gear icon → API)
2. You need two values:
   - **Project URL** — looks like `https://abcdefghijklm.supabase.co`
   - **anon / public key** — starts with `eyJ...` (this is safe to use in apps)

---

### Step 5 — Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Security note:** The `.env` file is in `.gitignore` — it will never be committed. The `anon` key is safe for mobile apps because Row-Level Security prevents users from accessing each other's data.

---

### Step 6 — Run on Your Phone with Expo Go

```bash
npm start
```

This opens the Expo Dev Tools in your terminal. You'll see a QR code.

**On Android:**
1. Install [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) from Google Play
2. Open Expo Go → scan the QR code

**On iPhone:**
1. Install [Expo Go](https://apps.apple.com/app/expo-go/id982107779) from App Store
2. Open the Camera app → point at the QR code → tap the notification

The app will load on your phone. Sign up for an account and start tracking! 🎉

> **Troubleshooting:** If the QR code doesn't work, make sure your phone and computer are on the same Wi-Fi network.

---

## Building for Production

### Prerequisites

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Create a free account at **https://expo.dev** and log in:
   ```bash
   eas login
   ```
3. Link this project to your Expo account:
   ```bash
   eas init
   ```
   When prompted, select **Create a new project** and name it `drinkingbuddy`.

---

### Building for Android (Google Play)

#### Preview build (APK for testing — no Google account needed):
```bash
npm run build:android
# Select "preview" profile
```
EAS will give you a download link for an APK you can install directly on any Android device.

#### Production build (AAB for Google Play Store):
```bash
eas build --platform android --profile production
```

**To publish on Google Play:**
1. Create a [Google Play Console](https://play.google.com/console) account ($25 one-time fee)
2. Create a new app → fill in store listing
3. Upload the `.aab` file EAS provides to **Internal Testing** first
4. Once tested, promote to production

---

### Building for iOS (App Store)

#### Requirements:
- Apple Developer account ($99/year) — https://developer.apple.com
- A Mac or use EAS's cloud build (no Mac needed!)

#### Build:
```bash
eas build --platform ios --profile production
```

EAS will ask to handle code signing automatically — say **yes**. It will create a provisioning profile and certificate in your Apple account.

**To publish on App Store:**
1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app (use bundle ID: `com.drinkingbuddy.app`)
3. Fill in metadata, screenshots, pricing
4. Submit the build EAS uploaded for review

#### Submit automatically via EAS:
Update `eas.json` with your Apple credentials:
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your@apple.com",
      "ascAppId": "1234567890",
      "appleTeamId": "ABCDE12345"
    }
  }
}
```
Then run:
```bash
eas submit --platform ios
```

---

### Build both platforms at once:
```bash
npm run build:all
```

---

## Project Structure

```
DrinkingBuddy/
├── app/
│   ├── _layout.tsx          # Root layout (AuthProvider, StatusBar)
│   ├── index.tsx            # Entry point (redirects based on auth)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx      # Landing / onboarding screen
│   │   ├── sign-in.tsx      # Login screen
│   │   └── sign-up.tsx      # Registration screen
│   └── (tabs)/
│       ├── _layout.tsx      # Tab bar configuration
│       ├── index.tsx        # Home dashboard
│       ├── log.tsx          # Log a drink
│       ├── history.tsx      # Drink history
│       └── profile.tsx      # User profile & settings
├── contexts/
│   └── AuthContext.tsx      # Auth state, session management
├── lib/
│   └── supabase.ts          # Supabase client
├── types/
│   └── database.ts          # TypeScript types for DB tables
├── supabase/
│   └── schema.sql           # Database schema (run in Supabase SQL Editor)
├── assets/
│   └── images/              # App icons, splash screen
├── app.json                 # Expo app config
├── eas.json                 # EAS Build profiles
├── .env.example             # Environment variable template
└── package.json
```

---

## Standard Drinks Formula

The app uses the internationally recognised formula:

```
standard_drinks = (volume_ml × abv_fraction × 789) / 10000
```

Where:
- `abv_fraction` = ABV% / 100
- `789` = density of ethanol (g/L) × 1000

Example: 375ml beer at 5% ABV = `(375 × 0.05 × 789) / 10000 = 1.48 standard drinks`

---

## Responsible Drinking Guidelines

The app's default limits are based on widely accepted guidelines:
- **Daily:** no more than 4 standard drinks
- **Weekly:** no more than 10–14 standard drinks

These are defaults only — users can set their own limits in the Profile screen.

---

## License

MIT
