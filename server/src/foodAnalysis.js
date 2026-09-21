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

/**
 * Send the photo to GPT-4o vision and parse the structured nutrition estimate.
 */
export async function estimateCalories(imageBuffer, mimeType) {
  const OpenAI = await getOpenAI();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const base64 = imageBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Estimate the calories and macros of this meal. Return JSON only.",
            },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1200,
      temperature: 0.2,
    });
  } catch (error) {
    // Surface the real cause instead of a bare "Connection error."
    const detail = error?.message || String(error);
    throw new Error(`OpenAI request failed: ${detail}`);
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("The model returned an empty response.");
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Could not parse the nutrition estimate. Please try again.");
  }
}

/**
 * Demo mode: returns plausible sample data so the full UI can be explored
 * without an OpenAI key. The "analysis" is deterministic per image.
 */
export async function demoEstimate(imageBuffer) {
  // Derive a stable pseudo-random pick from the image bytes.
  let seed = 0;
  for (let i = 0; i < Math.min(imageBuffer.length, 2000); i += 7) {
    seed = (seed + imageBuffer[i]) % 1000;
  }

  const samples = [
    {
      mealName: "Grilled Chicken Bowl",
      items: [
        { name: "Grilled chicken breast", calories: 320, protein: 55, carbs: 0, fat: 7 },
        { name: "White rice", calories: 240, protein: 5, carbs: 53, fat: 1 },
        { name: "Steamed broccoli", calories: 55, protein: 4, carbs: 11, fat: 1 },
      ],
      notes: "Demo estimate — add your OpenAI key to server/.env for real photo analysis.",
    },
    {
      mealName: "Classic Cheeseburger",
      items: [
        { name: "Beef patty (2)", calories: 410, protein: 32, carbs: 0, fat: 32 },
        { name: "Cheese slice", calories: 110, protein: 7, carbs: 1, fat: 9 },
        { name: "Burger bun", calories: 150, protein: 5, carbs: 27, fat: 2 },
      ],
      notes: "Demo estimate — add your OpenAI key to server/.env for real photo analysis.",
    },
    {
      mealName: "Avocado Toast & Eggs",
      items: [
        { name: "Sourdough toast", calories: 180, protein: 6, carbs: 34, fat: 2 },
        { name: "Avocado", calories: 160, protein: 2, carbs: 9, fat: 15 },
        { name: "Fried eggs (2)", calories: 180, protein: 12, carbs: 1, fat: 14 },
      ],
      notes: "Demo estimate — add your OpenAI key to server/.env for real photo analysis.",
    },
    {
      mealName: "Pasta with Tomato Sauce",
      items: [
        { name: "Spaghetti", calories: 420, protein: 14, carbs: 84, fat: 2 },
        { name: "Tomato sauce", calories: 90, protein: 2, carbs: 18, fat: 2 },
        { name: "Parmesan", calories: 110, protein: 10, carbs: 1, fat: 8 },
      ],
      notes: "Demo estimate — add your OpenAI key to server/.env for real photo analysis.",
    },
  ];

  const pick = samples[seed % samples.length];

  const totals = pick.items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    ...pick,
    confidence: "medium",
    totals,
  };
}
