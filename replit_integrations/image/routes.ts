import type { Express } from "express";
import { openai } from "./client";

export function registerImageRoutes(app: Express) {
  app.post("/api/images/generate", async (req, res) => {
    const { prompt, size = "1024x1024" } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ message: "prompt is required" });
    }

    try {
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: size as "1024x1024" | "512x512" | "256x256",
      });

      const imageData = response.data[0];
      res.json({
        b64_json: imageData?.b64_json,
        revised_prompt: (imageData as any)?.revised_prompt,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: errMsg });
    }
  });
}
