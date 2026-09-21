# 🍽️ CalorieSnap

Snap a photo of your meal and get an instant calorie + macro estimate, powered by GPT-4o vision.

![architecture](https://img.shields.io/badge/stack-Node%20%2B%20Express%20%2B%20React%20%2B%20Vite-22c55e)

## What it does

1. **Upload a photo** of your meal (drag & drop or file picker).
2. The backend sends the image to **GPT-4o vision**, which identifies the dish and its components.
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
│   └── src/foodAnalysis.js   # GPT-4o vision call + demo-mode fallback
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

The app runs in **demo mode** until you add an OpenAI key — you'll get sample
data so you can try the full UI right away.

To analyze real photos:

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys).
2. Copy `server/.env.example` to `server/.env`.
3. Paste your key:
   ```
   OPENAI_API_KEY=sk-...
   ```
4. Restart the server (`npm run dev:server`). The badge in the top-right will
   switch from **Demo mode** to **Live · GPT-4o**.

## Notes & caveats

- Calorie estimates from photos are **approximate** — portion sizes are guessed
  from visual cues. Use them as a guide, not medical advice.
- Images are sent to OpenAI for analysis and are not stored on the server.
- Login is **local-only**: credentials are never transmitted and exist purely
  to personalise the app. Don't reuse a real password.
- The demo-mode response is deterministic per image, so the same photo always
  returns the same sample meal.
