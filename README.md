# 🍽️ CalorieSnap

Snap a photo of your meal and get an instant calorie + macro estimate, powered by AI vision models (free via OpenRouter, or OpenAI GPT-4o).

![architecture](https://img.shields.io/badge/stack-Node%20%2B%20Express%20%2B%20React%20%2B%20Vite-22c55e)

## What it does

1. **Upload a photo** of your meal (drag & drop or file picker).
2. The backend sends the image to a **vision model** (a free OpenRouter model by default, with a second model as fallback), which identifies the dish and its components.
3. You get back **total calories, protein, carbs, and fat**, plus a per-item breakdown.
4. Every analysis is saved to your **meal history**, grouped by day.

## Pages

| Page | What's there |
| --- | --- |
| **Home** (`/`) | Photo upload + nutrition estimate, plus today's calorie count |
| **Previous Meals** (`/meals`) | Meal history grouped by day, with search and delete |
| **Daily Goals** (`/goals`) | Calorie goal editor, progress ring, macro bars, 7-day chart |
| **Login** (`/login`) | Local-only sign-in (or continue as guest) |

## Project structure

```
calorie tracker/
├── package.json              # Root: runs both client and server with one command
├── server/                   # Express API
│   ├── index.js              # /api/analyze endpoint (accepts uploads or base64)
│   └── src/foodAnalysis.js   # vision model call (OpenRouter / OpenAI) + demo-mode fallback
└── client/                   # React + Vite frontend
    └── src/
        ├── App.jsx           # Routes
        ├── auth.jsx          # Local-only auth context
        ├── store.jsx         # Meal + goal store (localStorage)
        ├── components/Navbar.jsx
        └── pages/            # Home, PreviousMeals, DailyGoals, Login
```

## Getting started

```bash
# 1. Install dependencies for the root, server, and client (root install also covers the Vercel function)
npm run install:all

# 2. Start both the API (localhost:3001) and the web app (localhost:5173)
npm run dev
```

Then open **http://localhost:5173** and upload a food photo.

## Enabling real photo analysis

The app runs in **demo mode** until you add an API key — you'll get sample
data so you can try the full UI right away.

To analyze real photos:

1. Get a free API key from [OpenRouter](https://openrouter.ai/settings/keys) (no card needed).
2. Copy `server/.env.example` to `server/.env`.
3. Paste your key:
   ```
   OPENROUTER_API_KEY=sk-or-...
   ```
4. Restart the server (`npm run dev:server`). The yellow **Demo mode** banner disappears.

By default the app uses `nvidia/nemotron-3.5-super-vl:free` and falls back to
`google/gemma-4-31b-it:free` if the first model fails. Set `OPENROUTER_MODEL` to use a
specific model, or set `OPENAI_API_KEY` instead to use GPT-4o (paid).

On Vercel, add `OPENROUTER_API_KEY` under **Project → Settings → Environment Variables**
and redeploy.

## Notes & caveats

- Calorie estimates from photos are **approximate** — portion sizes are guessed
  from visual cues. Use them as a guide, not medical advice.
- Images are sent to the configured AI provider (OpenRouter or OpenAI) for analysis and are not stored on the server.
- Login is **local-only**: credentials are never transmitted and exist purely
  to personalise the app. Don't reuse a real password.
- Demo mode returns one of four sample meals (picked from a hash of the image) and
  shows a banner saying so; it does not look at the photo.
- Free models take roughly 5–15 seconds per photo and can be rate-limited.
