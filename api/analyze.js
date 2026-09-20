import { estimateCalories, demoEstimate } from "../server/src/foodAnalysis.js";

// Vercel Functions reject request bodies larger than 4.5 MB, so guard a little
// under that. The client compresses photos before uploading to stay within it.
const MAX_BYTES = 4_000_000;

export function GET() {
  return Response.json({
    status: "ok",
    mode: process.env.OPENAI_API_KEY ? "live" : "demo",
  });
}

export async function POST(request) {
  try {
    const form = await request.formData();
    const photo = form.get("photo");

    if (!photo) {
      return Response.json({ error: "No photo provided." }, { status: 400 });
    }

    if (typeof photo === "string") {
      return Response.json({ error: "Invalid image data." }, { status: 400 });
    }

    const bytes = new Uint8Array(await photo.arrayBuffer());

    if (bytes.length === 0) {
      return Response.json({ error: "The photo appears to be empty." }, { status: 400 });
    }

    if (bytes.length > MAX_BYTES) {
      return Response.json(
        { error: "That image is too large to upload. Please try a smaller photo." },
        { status: 413 }
      );
    }

    const mimeType = photo.type || "image/jpeg";

    // No API key? Return realistic sample data so the UI is fully testable.
    if (!process.env.OPENAI_API_KEY) {
      const result = await demoEstimate(Buffer.from(bytes));
      return Response.json({ ...result, mode: "demo" });
    }

    const result = await estimateCalories(Buffer.from(bytes), mimeType);
    return Response.json({ ...result, mode: "live" });
  } catch (error) {
    return Response.json(
      { error: error.message || "Could not analyze the photo. Please try again." },
      { status: 500 }
    );
  }
}
