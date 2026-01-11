import { VideoStyle } from './types';

/**
 * 风格提示词映射 - 用于图片生成
 */
export const STYLE_PROMPT_MAP: Record<VideoStyle, string> = {
  cinematic:
    "cinematic film style, dramatic lighting, high contrast, movie-like composition, volumetric rays, hyper-realistic",
  academic:
    "scientific illustration, technical diagram style, clean and precise, Nature/Science journal quality, electron microscopy aesthetic",
  anime:
    "Pixar/Disney animation style, stylized 3D render, vibrant colors, expressive lighting, Spider-Verse aesthetic",
  minimalist:
    "3Blue1Brown style, dark background with deep blue, clean geometric shapes, mathematical visualization, vector graphics",
};

/**
 * 风格描述 - 用于剧本生成
 */
export const STYLE_DESCRIPTIONS: Record<VideoStyle, string> = {
  cinematic: `**Cinematic Style**: Epic, movie-like visuals with dramatic camera movements.
- Camera: Sweeping dolly shots, dramatic zooms, slow-motion reveals
- Lighting: High contrast, volumetric rays, dramatic shadows
- Textures: Hyper-realistic materials, glossy surfaces, metallic reflections
- Color: Deep blacks, rich highlights, color grading like Hollywood films`,

  academic: `**Academic/Hardcore Research Style**: Professional scientific visualization with rigorous accuracy.
- Camera: Steady, methodical movements, focus on data and diagrams, smooth transitions between figures
- Lighting: Clean, clinical, laboratory-style lighting, even illumination for clarity
- Textures: Technical diagrams, molecular structures rendered accurately, electron microscopy aesthetics
- Color: Scientific publication color schemes (Nature/Science/Cell style), precise data visualization palettes
- Elements: Include proper scientific labels, scale bars, statistical annotations, pathway diagrams
- Typography: Clean sans-serif fonts, proper scientific notation, Greek symbols where appropriate
- Tone: Authoritative, precise, peer-review quality visuals that could appear in a journal figure`,

  anime: `**American Animation Style**: Western cartoon aesthetic inspired by Pixar, Disney, and modern streaming animations (Arcane, Spider-Verse).
- Camera: Dynamic 3D camera movements, dramatic depth of field, cinematic angles like Into the Spider-Verse
- Lighting: Stylized volumetric lighting, expressive shadows, rim lights for character pop
- Textures: Painterly brushstroke overlays, subtle cel-shading, mixed-media effects
- Color: Bold saturated palettes, complementary color contrasts, expressive color grading
- Characters: Expressive faces, exaggerated proportions, fluid squash-and-stretch motion
- Effects: Particle effects, motion blur, comic-book style impact frames`,

  minimalist: `**Minimalist Style (3Blue1Brown-inspired)**: Clean, math-first visuals that build intuition step-by-step.
- Camera: Smooth, purposeful movements that guide attention; elegant transitions between concepts
- Visuals: Simple geometric shapes, vectors, graphs, and diagrams; NO clutter or decoration
- Animation: Fluid, continuous morphing; objects transform and connect logically; motion reveals relationships
- Color: Dark background (deep blue/black) with vibrant accent colors (blue, yellow, pink, green) for different elements
- Typography: Clean mathematical notation, equations that animate and transform
- Approach: Visual metaphors that make abstract concepts tangible; each frame serves a pedagogical purpose
- Pacing: Let animations breathe—show one idea at a time, build complexity gradually`
};

/**
 * 负向提示词
 */
export const NEGATIVE_PROMPT =
  "text, watermark, logo, cartoon, distorted anatomy, blurry, low quality, ugly, deformed, extra limbs";

/**
 * 可用风格列表
 */
export const AVAILABLE_STYLES: VideoStyle[] = [
  "cinematic",
  "academic",
  "anime",
  "minimalist"
];

/**
 * 风格显示名称
 */
export const STYLE_DISPLAY_NAMES: Record<VideoStyle, string> = {
  cinematic: "电影风格 - 史诗感、戏剧性光影",
  academic: "学术风格 - 专业严谨、数据可视化",
  anime: "动漫风格 - Pixar/Spider-Verse 风格",
  minimalist: "极简风格 - 3Blue1Brown 式数学可视化"
};
