import * as fs from "fs";
import * as path from "path";
import { GoogleGenAI } from "@google/genai";
import {
  ScriptOutput,
  ScriptWithImages,
  SceneWithImage,
  VideoStyle,
  Scene,
} from "../types/script.js";

/**
 * 风格到 Prompt 前缀的映射
 */
const STYLE_PROMPT_MAP: Record<VideoStyle, string> = {
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
 * 负向提示词
 */
const NEGATIVE_PROMPT =
  "text, watermark, logo, cartoon, distorted anatomy, blurry, low quality, ugly, deformed, extra limbs";

/**
 * ImageGenerationService
 *
 * 为剧本中的关键场景生成视觉锚点图片
 * 使用 Google Imagen 4.0 (最强图像生成模型)
 */
export class ImageGenerationService {
  private ai: GoogleGenAI;
  private outputDir: string;

  constructor(options: {
    apiKey: string;
    outputDir?: string;
  }) {
    this.ai = new GoogleGenAI({ apiKey: options.apiKey });
    this.outputDir = options.outputDir || "./output/images";

    // 确保输出目录存在
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 判断是否需要为该场景生成图片
   */
  private shouldGenerateImage(scene: Scene, isFirstScene: boolean): boolean {
    // 第一个场景必须生成
    if (isFirstScene) {
      return true;
    }
    // Low motion intensity 场景生成图片作为锚点
    if (scene.motion_intensity === "Low") {
      return true;
    }
    // Medium/High motion 让 Veo 自由发挥
    return false;
  }

  /**
   * 构建 Imagen 3 的 Prompt
   */
  private buildPrompt(scene: Scene, style: VideoStyle): string {
    const stylePrefix = STYLE_PROMPT_MAP[style];
    return `${stylePrefix}, ${scene.visual_description}, 4k resolution, highly detailed, scientific accuracy`;
  }

  /**
   * 调用 Imagen 4.0 生成图片
   * 使用 Google 最强的图像生成模型
   */
  private async generateImageWithImagen(
    prompt: string,
    sceneId: number
  ): Promise<{ base64: string; path: string }> {
    console.log(`  🎨 Calling Imagen 4.0 for scene ${sceneId}...`);

    try {
      // 使用 @google/genai SDK 调用 Imagen 4.0
      // 将负向提示词合并到主提示词中
      const fullPrompt = `${prompt}. Avoid: ${NEGATIVE_PROMPT}`;
      
      const response = await this.ai.models.generateImages({
        model: "imagen-4.0-generate-001",
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: "16:9",
        },
      });

      // 提取图片数据
      const generatedImage = response.generatedImages?.[0];
      if (!generatedImage?.image?.imageBytes) {
        throw new Error("No image data in response");
      }

      const base64Data = generatedImage.image.imageBytes;

      // 保存到本地文件
      const imagePath = path.join(this.outputDir, `scene_${sceneId}.png`);
      const imageBuffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(imagePath, imageBuffer);

      console.log(`  ✅ Image saved: ${imagePath}`);

      return {
        base64: `data:image/png;base64,${base64Data}`,
        path: imagePath,
      };
    } catch (error) {
      console.error(`  ❌ Failed to generate image for scene ${sceneId}:`, error);
      throw error;
    }
  }

  /**
   * 主函数：为剧本生成视觉锚点图片
   */
  async generateImages(
    script: ScriptOutput,
    style: VideoStyle
  ): Promise<ScriptWithImages> {
    console.log("🖼️  Starting image generation...");
    console.log(`📊 Total scenes: ${script.scenes.length}`);
    console.log(`🎨 Style: ${style}`);
    console.log();

    const scenesWithImages: SceneWithImage[] = [];
    let generatedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      const isFirstScene = i === 0;

      console.log(`📍 Scene ${scene.id} (${scene.timestamp}):`);
      console.log(`   Motion: ${scene.motion_intensity}`);

      if (this.shouldGenerateImage(scene, isFirstScene)) {
        // 生成图片
        const prompt = this.buildPrompt(scene, style);
        console.log(`   Prompt: ${prompt.substring(0, 100)}...`);

        try {
          const { base64, path: imagePath } = await this.generateImageWithImagen(
            prompt,
            scene.id
          );

          scenesWithImages.push({
            ...scene,
            image_path: imagePath,
            image_base64: base64,
          });
          generatedCount++;
        } catch (error) {
          // 生成失败时设为 null
          console.log(`   ⚠️ Using null for failed generation`);
          scenesWithImages.push({
            ...scene,
            image_path: null,
            image_base64: null,
          });
        }
      } else {
        // 跳过生成
        console.log(`   ⏭️ Skipped (motion: ${scene.motion_intensity})`);
        scenesWithImages.push({
          ...scene,
          image_path: null,
          image_base64: null,
        });
        skippedCount++;
      }

      console.log();
    }

    console.log("═".repeat(50));
    console.log(`✅ Image generation complete!`);
    console.log(`   Generated: ${generatedCount} images`);
    console.log(`   Skipped: ${skippedCount} scenes`);

    return {
      title: script.title,
      scientific_field: script.scientific_field,
      style: style,
      scenes: scenesWithImages,
    };
  }

}
