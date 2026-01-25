import { GoogleGenAI } from '@google/genai';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OUTPUT_DIR = path.join(process.cwd(), 'apps', 'web', 'public', 'images', 'banners');

// Tiger ETF 시네마틱 스타일 (참고 이미지 기반)
const TIGER_STYLE = `
Create a cinematic, high-end 3D banner image for TIGER ETF investment product.

CRITICAL STYLE REQUIREMENTS:
- **Background**: Dramatic gradient from warm orange/red on the LEFT to deep navy blue on the RIGHT
- **Atmosphere**: Cinematic fog/mist effects, light streams, ethereal glow
- **Circuit Patterns**: Subtle circuit board patterns on both sides (orange circuits on left, blue circuits on right)

TEXT REQUIREMENTS (MUST INCLUDE):
- "TIGER ETF" logo in the upper center area:
  - "TIGER" in 3D metallic ORANGE/GOLD text with glow effect
  - "ETF" in 3D metallic NAVY BLUE text
- Product name at the BOTTOM in large 3D ORANGE text with metallic/chrome effect

3D FLOATING ELEMENTS:
- Glossy, futuristic 3D icons floating around the text
- Elements should have glass/chrome material with subtle reflections
- Light trails and energy streams connecting elements

COMPOSITION:
- Wide 16:9 cinematic banner format
- Centered text with floating 3D elements around
- Professional financial product marketing quality
- Dark, moody but premium feeling
`;

// Tiger ETF 배너 이미지 정의
const TIGER_BANNERS = [
  {
    slug: 'banner-tiger-tech10',
    title: 'TIGER 미국테크TOP10',
    concept: `TEXT TO INCLUDE:
- Upper center: "TIGER ETF" (TIGER in orange 3D, ETF in navy 3D)
- Bottom: "TIGER 미국테크TOP10" in large orange 3D metallic text

FLOATING 3D ELEMENTS:
- Glowing microchip/CPU with cyan light
- Cloud computing icon with connected dots
- Smartphone with glowing screen
- Circuit board patterns

THEME: US Big Tech investment (representing Apple, NVIDIA, Microsoft, etc.)`,
  },
  {
    slug: 'banner-tiger-sp500',
    title: 'TIGER 미국S&P500',
    concept: `TEXT TO INCLUDE:
- Upper center: "TIGER ETF" (TIGER in orange 3D, ETF in navy 3D)
- Bottom: "TIGER 미국S&P500" in large orange 3D metallic text

FLOATING 3D ELEMENTS:
- 3D bar chart going upward
- Dollar sign with golden glow
- Modern skyscraper/building
- Globe with America highlighted

THEME: US S&P 500 stable index investment`,
  },
  {
    slug: 'banner-tiger-nasdaq100',
    title: 'TIGER 미국나스닥100',
    concept: `TEXT TO INCLUDE:
- Upper center: "TIGER ETF" (TIGER in orange 3D, ETF in navy 3D)
- Bottom: "TIGER 미국나스닥100" in large orange 3D metallic text

FLOATING 3D ELEMENTS:
- Rocket ship launching upward
- Innovation light bulb with glow
- Data visualization hologram
- Tech company abstract icons

THEME: NASDAQ 100 technology growth stocks, innovation`,
  },
  {
    slug: 'banner-tiger-dividend',
    title: 'TIGER 미국배당다우존스',
    concept: `TEXT TO INCLUDE:
- Upper center: "TIGER ETF" (TIGER in orange 3D, ETF in navy 3D)
- Bottom: "TIGER 미국배당다우존스" in large orange 3D metallic text

FLOATING 3D ELEMENTS:
- Golden coins stacking and floating
- Money bag with dollar sign
- Growing plant with coins as leaves
- Piggy bank with golden glow

THEME: Monthly dividend ETF, passive income, wealth building`,
  },
  {
    slug: 'banner-tiger-semiconductor',
    title: 'TIGER 미국반도체',
    concept: `TEXT TO INCLUDE:
- Upper center: "TIGER ETF" (TIGER in orange 3D, ETF in navy 3D)
- Bottom: "TIGER 미국반도체" in large orange 3D metallic text

FLOATING 3D ELEMENTS:
- Multiple glowing microchips/processors
- AI brain with circuit patterns
- Server rack with blinking lights
- Semiconductor wafer

THEME: Philadelphia Semiconductor Index, AI revolution`,
  },
];

async function main(): Promise<void> {
  console.log('🐯 Tiger ETF Banner Image Generator (Cinematic Style)');
  console.log('======================================================');

  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is required. Set it as an environment variable.');
    console.log('Usage: GEMINI_API_KEY=your_key npx tsx scripts/generate-tiger-banners.ts');
    process.exit(1);
  }

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created: ${OUTPUT_DIR}`);
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  for (const banner of TIGER_BANNERS) {
    console.log(`\n🎨 Generating: ${banner.slug}`);
    console.log(`   Title: ${banner.title}`);

    const prompt = `${TIGER_STYLE}

SPECIFIC BANNER DETAILS:
${banner.concept}

IMPORTANT REMINDERS:
- Background gradient: Orange/red (left) → Navy blue (right)
- Include fog/mist atmospheric effects
- Circuit patterns on both sides
- All 3D elements should be glossy and futuristic
- The Korean text must be accurate: "${banner.title}"
- Text should have metallic 3D effect with subtle glow
`;

    try {
      const response = await ai.models.generateContentStream({
        model: 'gemini-2.0-flash-exp-image-generation',
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: {
            imageSize: '1K',
          },
        },
        contents: [
          {
            role: 'user',
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
          const mimeType = inlineData.mimeType || 'image/png';
          const fileExtension = mimeType.split('/')[1] || 'png';
          const buffer = Buffer.from(inlineData.data || '', 'base64');
          const finalPath = path.join(OUTPUT_DIR, `${banner.slug}.${fileExtension}`);

          await writeFile(finalPath, buffer);
          console.log(`   ✅ Saved: ${finalPath}`);
          saved = true;
        } else if (part.text) {
          console.log(`   AI: ${part.text}`);
        }
      }

      if (!saved) {
        console.error(`   ❌ No image was generated for ${banner.slug}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`   ❌ Error generating ${banner.slug}:`, error);
    }
  }

  console.log('\n✅ Done! Check the generated images at:');
  console.log(`   ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
