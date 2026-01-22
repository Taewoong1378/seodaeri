import { GoogleGenAI } from '@google/genai';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OUTPUT_DIR = path.join(process.cwd(), 'apps', 'web', 'public', 'images', 'banners');

// =============================================================================
// 배너 타입별 설정
// =============================================================================

type BannerType = 'carousel' | 'small' | 'benefit';

const BANNER_TYPE_CONFIG: Record<BannerType, { ratio: string; size: string; description: string }> = {
  carousel: {
    ratio: '16:9',
    size: '1K',
    description: 'Wide cinematic banner for main dashboard carousel',
  },
  small: {
    ratio: '3:1',
    size: '1K',
    description: 'Thin horizontal banner for between content sections',
  },
  benefit: {
    ratio: '1:1',
    size: '1K',
    description: 'Square icon/thumbnail for benefit banners',
  },
};

// =============================================================================
// 브랜드별 스타일 정의
// =============================================================================

const BRAND_STYLES = {
  // TIGER ETF (미래에셋) - 오렌지 + 네이비
  tiger: {
    colors: 'warm ORANGE/RED to deep NAVY BLUE',
    accent: 'orange/gold',
    style: `
- **Background**: Dramatic gradient from warm ORANGE/RED on the LEFT to deep NAVY BLUE on the RIGHT
- **Atmosphere**: Cinematic fog/mist effects, light streams, ethereal glow
- **Circuit Patterns**: Subtle circuit board patterns (orange circuits on left, blue circuits on right)
- **Text Style**: 3D metallic ORANGE/GOLD text with glow effect
`,
  },

  // SOL ETF (신한자산운용) - 블루 그라데이션
  sol: {
    colors: 'BRIGHT CYAN/SKY BLUE to DEEP ROYAL BLUE',
    accent: 'cyan/blue',
    style: `
- **Background**: Elegant gradient from BRIGHT CYAN/SKY BLUE on the LEFT to DEEP ROYAL BLUE on the RIGHT
- **Atmosphere**: Clean, professional with soft light rays and subtle particle effects
- **Design Elements**: Flowing wave patterns and geometric shapes suggesting stability
- **Text Style**: 3D metallic BLUE text with bright glow effect
`,
  },

  // KODEX ETF (삼성자산운용) - 블루 + 퍼플
  kodex: {
    colors: 'DEEP NAVY BLUE to DARK PURPLE/INDIGO',
    accent: 'silver/white',
    style: `
- **Background**: Premium gradient from DEEP NAVY BLUE to DARK PURPLE/INDIGO
- **Atmosphere**: Sophisticated, premium feel with subtle starfield or constellation patterns
- **Design Elements**: Clean lines, geometric precision, minimalist
- **Text Style**: 3D metallic SILVER/WHITE text with blue glow
`,
  },

  // RISE ETF (KB자산운용) - 옐로우/골드 + 브라운
  rise: {
    colors: 'BRIGHT GOLDEN YELLOW to DEEP BROWN/BRONZE',
    accent: 'gold/bronze',
    style: `
- **Background**: Warm gradient from BRIGHT GOLDEN YELLOW on the LEFT to DEEP BROWN/BRONZE on the RIGHT
- **Atmosphere**: Luxurious, prestigious feel with golden light rays and warm glow
- **Design Elements**: Elegant curves, premium textures suggesting wealth
- **Text Style**: 3D metallic GOLD text with bright glow effect
`,
  },

  // KIWOOM (키움증권) - 핑크/로즈
  kiwoom: {
    colors: 'VIBRANT PINK to DEEP ROSE/MAGENTA',
    accent: 'pink/rose',
    style: `
- **Background**: Bold gradient from VIBRANT PINK on the LEFT to DEEP ROSE/MAGENTA on the RIGHT
- **Atmosphere**: Energetic, dynamic with light particles and modern feel
- **Design Elements**: Modern geometric shapes, gift/reward visual elements
- **Text Style**: 3D metallic WHITE/PINK text with rose glow effect
`,
  },
};

// =============================================================================
// 배너 타입별 프롬프트 생성
// =============================================================================

function generatePrompt(
  brand: keyof typeof BRAND_STYLES,
  bannerType: BannerType,
  title: string,
  elements: string,
  theme: string
): string {
  const brandStyle = BRAND_STYLES[brand];
  const typeConfig = BANNER_TYPE_CONFIG[bannerType];

  if (bannerType === 'benefit') {
    // 1:1 아이콘 스타일
    return `Create a premium, modern square icon/badge for ${brand.toUpperCase()} ETF.

CRITICAL REQUIREMENTS:
- **Aspect Ratio**: Exactly 1:1 (square)
- **Style**: Clean, minimal, app icon style
- **Background**: Circular or rounded square gradient using ${brandStyle.colors}
${brandStyle.style}

ICON DESIGN:
- Central element: A stylized, glowing symbol representing ${theme}
- Elements to include: ${elements}
- Keep design simple and recognizable at small sizes
- Use glossy/glass material effect
- Add subtle glow/shine effect

BRAND IDENTITY:
- Include "${brand.toUpperCase()}" text if space allows, or just a symbolic mark
- Use ${brandStyle.accent} as the primary accent color
- Professional financial brand aesthetic

DO NOT include:
- Complex detailed illustrations
- Too much text
- Busy backgrounds
`;
  }

  if (bannerType === 'small') {
    // 3:1 얇은 가로형 배너
    return `Create a sleek, thin horizontal banner for ${brand.toUpperCase()} ETF.

CRITICAL REQUIREMENTS:
- **Aspect Ratio**: Exactly 3:1 (wide and thin)
- **Style**: Modern, minimal, gradient-based
- **Background**: Smooth gradient using ${brandStyle.colors}
${brandStyle.style}

BANNER DESIGN:
- Left side: Small icon or symbol representing ${theme}
- Center/Right: Space for text overlay (will be added programmatically)
- Elements: ${elements}
- Keep design clean and uncluttered
- Add subtle texture or pattern

COMPOSITION:
- ${typeConfig.description}
- Professional financial product marketing quality
- Subtle floating elements, not overwhelming
`;
  }

  // carousel - 16:9 wide banner
  return `Create a cinematic, high-end 3D banner image for ${brand.toUpperCase()} ETF.

CRITICAL STYLE REQUIREMENTS:
${brandStyle.style}

TEXT REQUIREMENTS:
- "${brand.toUpperCase()} ETF" logo in the upper center area with 3D metallic ${brandStyle.accent} text
- Product name "${title}" at the BOTTOM in large 3D text with metallic/chrome effect

3D FLOATING ELEMENTS:
- Glossy, futuristic 3D icons floating around the text
- Elements: ${elements}
- Glass/chrome material with subtle reflections
- Light trails and energy streams connecting elements

COMPOSITION:
- Wide 16:9 cinematic banner format
- Centered text with floating 3D elements around
- Professional financial product marketing quality
- Theme: ${theme}
- The Korean text "${title}" must be accurate and prominent
`;
}

// =============================================================================
// 배너 데이터 정의
// =============================================================================

interface BannerConfig {
  slug: string;
  title: string;
  brand: keyof typeof BRAND_STYLES;
  elements: string;
  theme: string;
  types: BannerType[]; // 생성할 배너 타입들
}

const BANNERS: BannerConfig[] = [
  // ===== TIGER ETF =====
  {
    slug: 'tiger-tech10',
    title: 'TIGER 미국테크TOP10',
    brand: 'tiger',
    elements: 'Glowing microchip/CPU, cloud computing icon, smartphone, circuit patterns',
    theme: 'US Big Tech investment (Apple, NVIDIA, Microsoft)',
    types: ['carousel', 'small', 'benefit'],
  },
  {
    slug: 'tiger-sp500',
    title: 'TIGER 미국S&P500',
    brand: 'tiger',
    elements: '3D bar chart, dollar sign, skyscraper, globe with America',
    theme: 'US S&P 500 stable index investment',
    types: ['carousel', 'small'],
  },
  {
    slug: 'tiger-nasdaq100',
    title: 'TIGER 미국나스닥100',
    brand: 'tiger',
    elements: 'Rocket ship, innovation light bulb, data hologram, tech icons',
    theme: 'NASDAQ 100 technology growth stocks',
    types: ['carousel', 'small'],
  },
  {
    slug: 'tiger-dividend',
    title: 'TIGER 미국배당다우존스',
    brand: 'tiger',
    elements: 'Golden coins, money bag, growing plant with coins, piggy bank',
    theme: 'Monthly dividend ETF, passive income',
    types: ['carousel', 'small'],
  },
  {
    slug: 'tiger-semiconductor',
    title: 'TIGER 미국반도체',
    brand: 'tiger',
    elements: 'Multiple microchips, AI brain, server rack, semiconductor wafer',
    theme: 'Philadelphia Semiconductor Index, AI revolution',
    types: ['carousel', 'small'],
  },
  // TIGER benefit icon
  {
    slug: 'tiger-benefit',
    title: 'TIGER ETF',
    brand: 'tiger',
    elements: 'Tiger symbol, chart arrow, ETF badge',
    theme: 'TIGER ETF brand icon - smart US investment',
    types: ['benefit'],
  },

  // ===== SOL ETF =====
  {
    slug: 'sol-dividend',
    title: 'SOL 미국배당다우존스',
    brand: 'sol',
    elements: 'Stacking coins with blue glow, dividend calendar, growth chart, dollar bills',
    theme: 'Korean SCHD - monthly dividend ETF',
    types: ['carousel', 'small'],
  },
  {
    slug: 'sol-sp500',
    title: 'SOL 미국S&P500',
    brand: 'sol',
    elements: 'US flag elements, upward trending chart, corporate buildings, globe',
    theme: 'US S&P 500 index investment',
    types: ['carousel', 'small'],
  },
  {
    slug: 'sol-nasdaq100',
    title: 'SOL 미국나스닥100',
    brand: 'sol',
    elements: 'Tech company logos abstract, innovation symbols, data streams, rocket',
    theme: 'NASDAQ 100 technology growth',
    types: ['carousel', 'small'],
  },
  {
    slug: 'sol-gold',
    title: 'SOL 금현물',
    brand: 'sol',
    elements: 'Gold bars stacking, gold coins, treasure chest, golden glow effects',
    theme: 'Physical gold investment, safe haven asset',
    types: ['carousel', 'small'],
  },
  // SOL benefit icon
  {
    slug: 'sol-benefit',
    title: 'SOL ETF',
    brand: 'sol',
    elements: 'Sun/Sol symbol, dividend coin, ETF badge',
    theme: 'SOL ETF brand icon - smart dividend investment',
    types: ['benefit'],
  },

  // ===== KODEX ETF =====
  {
    slug: 'kodex-sp500',
    title: 'KODEX 미국S&P500',
    brand: 'kodex',
    elements: 'Premium chart visualization, corporate towers, US market symbols, globe',
    theme: 'US S&P 500 premium index investment',
    types: ['carousel', 'small'],
  },
  {
    slug: 'kodex-nasdaq100',
    title: 'KODEX 미국나스닥100',
    brand: 'kodex',
    elements: 'Holographic displays, tech innovation icons, futuristic UI elements',
    theme: 'NASDAQ 100 tech-forward investment',
    types: ['carousel', 'small'],
  },
  {
    slug: 'kodex-dividend',
    title: 'KODEX 미국배당프리미엄',
    brand: 'kodex',
    elements: 'Premium coins with silver glow, dividend flow visualization, wealth symbols',
    theme: 'Premium dividend income strategy',
    types: ['carousel', 'small'],
  },
  {
    slug: 'kodex-semiconductor',
    title: 'KODEX 미국반도체',
    brand: 'kodex',
    elements: 'Advanced microprocessors, quantum computing elements, AI neural network',
    theme: 'US Semiconductor industry leadership',
    types: ['carousel', 'small'],
  },
  // KODEX benefit icon
  {
    slug: 'kodex-benefit',
    title: 'KODEX ETF',
    brand: 'kodex',
    elements: 'K symbol, premium badge, ETF mark',
    theme: 'KODEX ETF brand icon - premium investment',
    types: ['benefit'],
  },

  // ===== RISE ETF =====
  {
    slug: 'rise-sp500',
    title: 'RISE 미국S&P500',
    brand: 'rise',
    elements: 'Golden trophy, rising stairs, US landmarks silhouette, success symbols',
    theme: 'US S&P 500 prosperity investment',
    types: ['carousel', 'small'],
  },
  {
    slug: 'rise-nasdaq100',
    title: 'RISE 미국나스닥100',
    brand: 'rise',
    elements: 'Golden rocket, innovation crown, tech achievements, growth tree',
    theme: 'NASDAQ 100 growth and prosperity',
    types: ['carousel', 'small'],
  },
  {
    slug: 'rise-dividend',
    title: 'RISE 미국배당귀족',
    brand: 'rise',
    elements: 'Golden crown, treasure pile, aristocratic symbols, flowing gold',
    theme: 'Dividend Aristocrats - elite dividend stocks',
    types: ['carousel', 'small'],
  },
  {
    slug: 'rise-kospi',
    title: 'RISE 코스피200',
    brand: 'rise',
    elements: 'Korean flag elements, Namsan tower silhouette, Korean corporate symbols',
    theme: 'Korean KOSPI 200 index investment',
    types: ['carousel', 'small'],
  },
  // RISE benefit icon
  {
    slug: 'rise-benefit',
    title: 'RISE ETF',
    brand: 'rise',
    elements: 'Rising arrow, golden sun, ETF badge',
    theme: 'RISE ETF brand icon - successful investment',
    types: ['benefit'],
  },

  // ===== KIWOOM =====
  {
    slug: 'kiwoom-event',
    title: '키움증권 X 서대리',
    brand: 'kiwoom',
    elements: 'Gift box, dollar signs, celebration confetti, reward badge',
    theme: 'Special subscriber benefits - $40 bonus + 95% FX discount',
    types: ['carousel', 'small'],
  },
  {
    slug: 'kiwoom-overseas',
    title: '키움증권 해외주식',
    brand: 'kiwoom',
    elements: 'Globe with stock charts, US/Korea flags, trading screens',
    theme: 'Overseas stock trading with lowest fees',
    types: ['carousel', 'small'],
  },
  // KIWOOM benefit icon
  {
    slug: 'kiwoom-benefit',
    title: '키움증권',
    brand: 'kiwoom',
    elements: 'Gift icon, dollar coin, reward badge',
    theme: 'Kiwoom Securities brand icon - investment benefits',
    types: ['benefit'],
  },
];

// =============================================================================
// 이미지 생성 함수
// =============================================================================

async function generateBanner(
  ai: GoogleGenAI,
  banner: BannerConfig,
  bannerType: BannerType
): Promise<boolean> {
  const typeConfig = BANNER_TYPE_CONFIG[bannerType];
  const prompt = generatePrompt(
    banner.brand,
    bannerType,
    banner.title,
    banner.elements,
    banner.theme
  );

  // 파일명에 타입 접미사 추가
  const suffix = bannerType === 'carousel' ? '' : `-${bannerType}`;
  const outputPath = path.join(OUTPUT_DIR, banner.brand, `banner-${banner.slug}${suffix}.png`);

  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash-exp-image-generation',
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: {
          imageSize: typeConfig.size,
        },
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    });

    for await (const chunk of response) {
      if (!chunk.candidates?.[0]?.content?.parts) continue;

      const part = chunk.candidates[0].content.parts[0];

      if (part.inlineData) {
        const inlineData = part.inlineData;
        const mimeType = inlineData.mimeType || 'image/png';
        const fileExtension = mimeType.split('/')[1] || 'png';
        const buffer = Buffer.from(inlineData.data || '', 'base64');
        const finalPath = outputPath.replace('.png', `.${fileExtension}`);

        await writeFile(finalPath, buffer);
        console.log(`   ✅ Saved: ${finalPath}`);
        return true;
      } else if (part.text) {
        // AI response text (optional logging)
      }
    }

    return false;
  } catch (error) {
    console.error(`   ❌ Error:`, error);
    return false;
  }
}

// =============================================================================
// 메인 함수
// =============================================================================

async function main(): Promise<void> {
  console.log('🏦 ETF Banner Image Generator (Multi-Type Support)');
  console.log('===================================================');
  console.log('Brands: TIGER, SOL, KODEX, RISE, KIWOOM');
  console.log('Types: carousel (16:9), small (3:1), benefit (1:1)\n');

  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is required.');
    console.log('Usage: GEMINI_API_KEY=your_key npx tsx scripts/generate-etf-banners.ts');
    console.log('\nOptions:');
    console.log('  [brand]     - Generate only specific brand (tiger, sol, kodex, rise, kiwoom)');
    console.log('  [type]      - Generate only specific type (carousel, small, benefit)');
    console.log('  --force     - Regenerate existing images');
    console.log('\nExamples:');
    console.log('  npx tsx scripts/generate-etf-banners.ts tiger benefit --force');
    console.log('  npx tsx scripts/generate-etf-banners.ts benefit');
    process.exit(1);
  }

  // 브랜드별 폴더 생성
  const brands = ['tiger', 'sol', 'kodex', 'rise', 'kiwoom', 'all'];
  for (const brand of brands) {
    const brandDir = path.join(OUTPUT_DIR, brand);
    if (!existsSync(brandDir)) {
      await mkdir(brandDir, { recursive: true });
      console.log(`📁 Created: ${brandDir}`);
    }
  }

  // CLI 인자 파싱
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const forceRegenerate = process.argv.includes('--force');

  let targetBrand: keyof typeof BRAND_STYLES | undefined;
  let targetType: BannerType | undefined;

  for (const arg of args) {
    if (['tiger', 'sol', 'kodex', 'rise', 'kiwoom'].includes(arg)) {
      targetBrand = arg as keyof typeof BRAND_STYLES;
    } else if (['carousel', 'small', 'benefit'].includes(arg)) {
      targetType = arg as BannerType;
    }
  }

  // 필터링
  let bannersToGenerate = BANNERS;
  if (targetBrand) {
    bannersToGenerate = bannersToGenerate.filter((b) => b.brand === targetBrand);
  }

  if (bannersToGenerate.length === 0) {
    console.error(`❌ No banners found for the specified filters`);
    process.exit(1);
  }

  // 생성할 배너 카운트
  let totalToGenerate = 0;
  for (const banner of bannersToGenerate) {
    const types = targetType ? banner.types.filter((t) => t === targetType) : banner.types;
    totalToGenerate += types.length;
  }

  console.log(`\n📋 Banners to generate: ${totalToGenerate}`);
  if (targetBrand) console.log(`   Filter: brand=${targetBrand}`);
  if (targetType) console.log(`   Filter: type=${targetType}`);
  console.log('');

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  let successCount = 0;
  let skipCount = 0;

  for (const banner of bannersToGenerate) {
    const types = targetType ? banner.types.filter((t) => t === targetType) : banner.types;

    for (const bannerType of types) {
      const suffix = bannerType === 'carousel' ? '' : `-${bannerType}`;
      const outputPath = path.join(OUTPUT_DIR, banner.brand, `banner-${banner.slug}${suffix}.png`);

      // 이미 존재하면 스킵
      if (existsSync(outputPath) && !forceRegenerate) {
        console.log(`⏭️  Skipping: ${banner.slug} (${bannerType}) - already exists`);
        skipCount++;
        continue;
      }

      console.log(`\n🎨 [${banner.brand.toUpperCase()}] Generating: ${banner.slug} (${bannerType})`);
      console.log(`   Title: ${banner.title}`);
      console.log(`   Ratio: ${BANNER_TYPE_CONFIG[bannerType].ratio}`);

      const success = await generateBanner(ai, banner, bannerType);

      if (success) {
        successCount++;
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log('\n===================================================');
  console.log(`✅ Generated: ${successCount} banners`);
  console.log(`⏭️  Skipped: ${skipCount} banners`);
  console.log(`📁 Output: ${OUTPUT_DIR}`);

  if (skipCount > 0) {
    console.log('\n💡 Tip: Use --force to regenerate existing images');
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
