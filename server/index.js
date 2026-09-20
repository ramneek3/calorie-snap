import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { estimateCalories, demoEstimate } from "./src/foodAnalysis.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "20mb" }));

// Accept photos either as multipart/form-data uploads or as base64 JSON.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mode: process.env.OPENAI_API_KEY ? "live" : "demo",
  });
});

app.post("/api/analyze", upload.single("photo"), async (req, res) => {
  try {
    const hasApiKey = Boolean(process.env.OPENAI_API_KEY);

    let imageBuffer = null;
    let mimeType = "image/jpeg";

    if (req.file) {
      imageBuffer = req.file.buffer;
      mimeType = req.file.mimetype;
    } else if (typeof req.body.photo === "string") {
      // Base64 data URL, e.g. "data:image/jpeg;base64,...."
      const match = req.body.photo.match(/^data:(.+?);base64,(.*)$/s);
      if (!match) {
        return res.status(400).json({ error: "Invalid image data." });
      }
      mimeType = match[1];
      imageBuffer = Buffer.from(match[2], "base64");
    } else {
      return res.status(400).json({ error: "No photo provided." });
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      return res.status(400).json({ error: "The photo appears to be empty." });
    }

    // No API key? Return realistic sample data so the UI is fully testable.
    if (!hasApiKey) {
      const result = await demoEstimate(imageBuffer);
      return res.json({ ...result, mode: "demo" });
    }

    const result = await estimateCalories(imageBuffer, mimeType);
    return res.json({ ...result, mode: "live" });
  } catch (error) {
    console.error("Analyze failed:", error);
    return res.status(500).json({
      error: error.message || "Could not analyze the photo. Please try again.",
    });
  }
});

app.listen(PORT, () => {
  const mode = process.env.OPENAI_API_KEY ? "live (GPT-4o)" : "DEMO (no API key)";
  console.log(`🍽️  Calorie tracker API running on http://localhost:${PORT} — ${mode}`);
});
