import { GoogleGenAI } from "@google/genai";
import mime from "mime";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OUTPUT_DIR = path.join(process.cwd(), "public", "judgement-day");

const BASE_STYLE = `
Create a high-end, cinematic 3D abstract illustration for an AI security challenge website.

CRITICAL STYLE REQUIREMENTS:
- **Aesthetic**: "Dark, Cold, Professional AI Security".
- **Visual Style**: Abstract 3D environment, similar to Spline 3D scenes. Dark void background with glowing elements.
- **Background**: Deepest black (#000000) with very subtle deep navy/purple fog. NO gradients looking like a generic background.
- **Lighting**: Cinematic, moody, dramatic rim lighting.
- **Composition**: Cinematic wide shot (16:9). NOT a centered icon. A scene or object floating in a dark void.
- **Texture**: Glass, polished dark metal, emissive lights (neon/laser).
- **Mood**: Serious, high-stakes, futuristic, cyber-security.
- **NO TEXT** anywhere.
`;

const TRACKS = [
  {
    slug: "track1-unsafe-action",
    concept:
      'A futuristic digital barrier or node turning INTENSE RED (#EF4444). It represents a system breach, a "STOP" command being ignored, or a dangerous action being executed. The red glow should look dangerous and unstable against the dark cold metal environment. Glitch effects or sharp jagged shapes.',
  },
  {
    slug: "track2-unsafe-inaction",
    concept:
      "A subtle, fading ORANGE (#F97316) signal in a vast dark network. It represents negligence, a missed warning, or a signal dying out. A lonely glowing ember or pulse that is being overlooked in a complex dark structure. Muted, quiet danger.",
  },
];

async function main(): Promise<void> {
  console.log("🖼️  Track Image Generator (Cinematic Dark 3D)");
  console.log("=============================================");

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created: ${OUTPUT_DIR}`);
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  for (const track of TRACKS) {
    console.log(`\nGenerating image for: ${track.slug}`);
    console.log(`Concept: ${track.concept}`);

    const prompt = `${BASE_STYLE}

SCENE DESCRIPTION:
${track.concept}

Additional details:
- Camera: Wide angle, slight depth of field blurring the background.
- Color Palette: Dominant Black, with the specific accent color (Red for Track 1, Orange for Track 2) being the ONLY main light source.
- Material: High-gloss black plastic, dark obsidian, frosted glass.
`;

    try {
      const response = await ai.models.generateContentStream({
        model: "gemini-3-pro-image-preview",
        config: {
          responseModalities: ["IMAGE", "TEXT"],
          imageConfig: {
            imageSize: "1K", // Changed to 1K for better quality/speed balance
          },
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      });

      let saved = false;
      for await (const chunk of response) {
        if (!chunk.candidates?.[0]?.content?.parts) continue;

        const part = chunk.candidates[0].content.parts[0];

        if (part.inlineData) {
          const inlineData = part.inlineData;
          const fileExtension =
            mime.getExtension(inlineData.mimeType || "image/png") || "png";
          const buffer = Buffer.from(inlineData.data || "", "base64");
          const outputPath = path.join(
            OUTPUT_DIR,
            `${track.slug}.${fileExtension}`
          );

          await writeFile(outputPath, buffer);
          console.log(`✓ Saved: ${outputPath}`);
          saved = true;
        } else if (part.text) {
          console.log(`AI: ${part.text}`);
        }
      }

      if (!saved) {
        console.error(`✗ No image was generated for ${track.slug}`);
      }
    } catch (error) {
      console.error(`Error generating ${track.slug}:`, error);
    }
  }

  console.log("\n✅ Done!");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
