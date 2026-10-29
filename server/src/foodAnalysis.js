// "openai" is imported lazily so this module loads even where the package
// isn't installed (e.g. the Vercel function bundle in demo mode). It is only
// resolved when a real analysis is actually requested.
let OpenAIImpl = null;
async function getOpenAI() {
  if (!OpenAIImpl) {
    const mod = await import("openai");
    OpenAIImpl = mod.default;
  }
  return OpenAIImpl;
}

const SYSTEM_PROMPT = `You are a nutrition expert who estimates calories and macros from food photos.
Analyze the image and identify the meal and its individual components.
Estimate total calories, protein, carbs, and fat for the whole plate.
Be realistic and use standard portion sizes. If the image is not food, say so.
ALWAYS respond with valid JSON only, no markdown, matching this exact shape:
{
  "mealName": "string",
  "confidence": "high" | "medium" | "low",
  "items": [{ "name": "string", "calories": number, "protein": number, "carbs": number, "fat": number }],
  "totals": { "calories": number, "protein": number, "carbs": number, "fat": number },
  "notes": "string"
}
Numbers are in grams (except calories). Round to whole numbers.`;

// OpenRouter (free vision models) is preferred; OpenAI is the paid alternative.
// The second OpenRouter model is a fallback for when the first is busy or down.
const OPENROUTER_MODELS = [
  "nvidia/nemotron-3.5-super-vl:free",
  "google/gemma-4-31b-it:free",
];

function aiConfig() {
  // OPENROUTER_KEY is accepted too, since that is a common way to name it
  const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
  if (openRouterKey) {
    const custom = process.env.OPENROUTER_MODEL;
    return {
      provider: "openrouter",
      apiKey: openRouterKey,
      baseURL: "https://openrouter.ai/api/v1",
      models: custom ? [custom] : OPENROUTER_MODELS,
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      models: [process.env.OPENAI_MODEL || "gpt-4o"],
    };
  }
  return null;
}

/** "live" when a vision API key is configured, otherwise "demo". */
export function analysisMode() {
  return aiConfig() ? "live" : "demo";
}

/**
 * Send the photo to a vision model and parse the structured nutrition estimate.
 * Tries each configured model in turn and reports every failure if all of them fail.
 */
export async function estimateCalories(imageBuffer, mimeType) {
  const config = aiConfig();
  const OpenAI = await getOpenAI();
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    // Keep two attempts inside the 60 s function limit
    timeout: 25_000,
    maxRetries: 0,
  });

  const dataUrl = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
  const failures = [];

  for (const model of config.models) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Estimate the calories and macros of this meal. Return JSON only." },
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1200,
        temperature: 0.2,
      });
      const estimate = normalizeEstimate(parseJson(completion.choices[0]?.message?.content));
      return { ...estimate, model };
    } catch (error) {
      failures.push(`${model}: ${error?.message || String(error)}`);
    }
  }

  throw new Error(`Photo analysis failed. ${failures.join(" | ")}`);
}

// Free models sometimes wrap JSON in ```json fences or add a sentence around it.
function parseJson(raw) {
  if (!raw) throw new Error("The model returned an empty response.");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("The model did not return JSON.");
  return JSON.parse(raw.slice(start, end + 1));
}

const num = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0);

// Coerce numbers and recompute totals from the items so the two always agree.
function normalizeEstimate(data) {
  const items = (Array.isArray(data.items) ? data.items : []).map((item) => ({
    name: String(item.name || "Unknown item"),
    calories: num(item.calories),
    protein: num(item.protein),
    carbs: num(item.carbs),
    fat: num(item.fat),
  }));
  const totals = items.length
    ? sumItems(items)
    : {
        calories: num(data.totals?.calories),
        protein: num(data.totals?.protein),
        carbs: num(data.totals?.carbs),
        fat: num(data.totals?.fat),
      };
  return {
    mealName: String(data.mealName || "Unknown meal"),
    confidence: ["high", "medium", "low"].includes(data.confidence) ? data.confidence : "low",
    items,
    totals,
    notes: data.notes ? String(data.notes) : "",
  };
}

function sumItems(items) {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/**
 * Demo mode: returns plausible sample data so the full UI can be explored
 * without an API key. The "analysis" is deterministic per image.
 */
const DEMO_NOTE =
  "Sample data, not an analysis of your photo. Set OPENROUTER_API_KEY to analyze real photos.";

export async function demoEstimate(imageBuffer) {
  // Pick a sample from a hash of the whole image. The first bytes of a JPEG are
  // mostly identical headers, so hashing only those gave every photo the same meal.
  let seed = 0;
  for (let i = 0; i < imageBuffer.length; i++) {
    seed = (seed * 31 + imageBuffer[i]) >>> 0;
  }

  const samples = [
    {
      mealName: "Grilled Chicken Bowl",
      items: [
        { name: "Grilled chicken breast", calories: 320, protein: 55, carbs: 0, fat: 7 },
        { name: "White rice", calories: 240, protein: 5, carbs: 53, fat: 1 },
        { name: "Steamed broccoli", calories: 55, protein: 4, carbs: 11, fat: 1 },
      ],
      notes: DEMO_NOTE,
    },
    {
      mealName: "Classic Cheeseburger",
      items: [
        { name: "Beef patty (2)", calories: 410, protein: 32, carbs: 0, fat: 32 },
        { name: "Cheese slice", calories: 110, protein: 7, carbs: 1, fat: 9 },
        { name: "Burger bun", calories: 150, protein: 5, carbs: 27, fat: 2 },
      ],
      notes: DEMO_NOTE,
    },
    {
      mealName: "Avocado Toast & Eggs",
      items: [
        { name: "Sourdough toast", calories: 180, protein: 6, carbs: 34, fat: 2 },
        { name: "Avocado", calories: 160, protein: 2, carbs: 9, fat: 15 },
        { name: "Fried eggs (2)", calories: 180, protein: 12, carbs: 1, fat: 14 },
      ],
      notes: DEMO_NOTE,
    },
    {
      mealName: "Pasta with Tomato Sauce",
      items: [
        { name: "Spaghetti", calories: 420, protein: 14, carbs: 84, fat: 2 },
        { name: "Tomato sauce", calories: 90, protein: 2, carbs: 18, fat: 2 },
        { name: "Parmesan", calories: 110, protein: 10, carbs: 1, fat: 8 },
      ],
      notes: DEMO_NOTE,
    },
  ];

  const pick = samples[seed % samples.length];

  const totals = sumItems(pick.items);

  return {
    ...pick,
    confidence: "medium",
    totals,
  };
}
