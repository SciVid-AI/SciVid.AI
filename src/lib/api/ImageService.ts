/**
 * ImageService - Step 2: Script → Images
 * 
 * 使用 Gemini 3 Pro Image Preview 为剧本生成视觉锚点图片
 */

import * as fs from "fs";
import * as path from "path";
import { GoogleGenAI } from "@google/genai";
import {
  ScriptOutput,
  ScriptWithImages,
  SceneWithImage,
  VideoStyle,
  Scene,
} from "./types";
import { STYLE_PROMPT_MAP, NEGATIVE_PROMPT } from "./constants";

export interface ImageServiceOptions {
  apiKey: string;
  outputDir?: string;
}

export class ImageService {
  private ai: GoogleGenAI;
  private outputDir: string;

  constructor(apiKeyOrOptions: string | ImageServiceOptions) {
    if (typeof apiKeyOrOptions === 'string') {
      this.ai = new GoogleGenAI({ apiKey: apiKeyOrOptions });
      this.outputDir = "./output/images";
    } else {
      this.ai = new GoogleGenAI({ apiKey: apiKeyOrOptions.apiKey });
      this.outputDir = apiKeyOrOptions.outputDir || "./output/images";
    }

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
   * 构建图片生成 Prompt
   */
  private buildPrompt(scene: Scene, style: VideoStyle): string {
    const stylePrefix = STYLE_PROMPT_MAP[style];
    return `${stylePrefix}, ${scene.visual_description}, 4k resolution, highly detailed, scientific accuracy`;
  }

  /**
   * 保存 Base64 图片到本地文件
   */
  private saveImageToFile(base64Data: string, sceneId: number): string {
    // 移除 data:image/xxx;base64, 前缀
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(cleanBase64, "base64");
    
    const imagePath = path.join(this.outputDir, `scene_${sceneId}.png`);
    fs.writeFileSync(imagePath, imageBuffer);
    
    console.log(`  💾 Image saved: ${imagePath}`);
    return imagePath;
  }

  /**
   * 调用 Gemini 3 Pro Image Preview 生成图片
   */
  private async generateImageWithGemini(
    prompt: string,
    sceneId: number
  ): Promise<{ base64: string; path: string }> {
    console.log(`  🎨 Calling Gemini 3 Pro Image Preview for scene ${sceneId}...`);

    try {
      const fullPrompt = `${prompt}. Avoid: ${NEGATIVE_PROMPT}`;
      
      const response = await this.ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: fullPrompt,
        config: {
          responseModalities: ["image", "text"],
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "4K",
          },
        },
      });

      // 提取图片数据
      const candidate = response.candidates?.[0];
      if (!candidate?.content?.parts) {
        throw new Error("No content in response");
      }

      let base64Data: string | null = null;
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) {
          base64Data = part.inlineData.data;
          break;
        }
      }

      if (!base64Data) {
        throw new Error("No image data in response");
      }

      const fullBase64 = `data:image/png;base64,${base64Data}`;
      
      // 保存图片到文件
      const imagePath = this.saveImageToFile(fullBase64, sceneId);

      console.log(`  ✅ Image generated for scene ${sceneId}`);

      return {
        base64: fullBase64,
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
    style: VideoStyle,
    onProgress?: (sceneId: number, total: number) => void
  ): Promise<ScriptWithImages> {
    console.log("🖼️  Starting image generation...");
    console.log(`📊 Total scenes: ${script.scenes.length}`);
    console.log(`🎨 Style: ${style}`);
    console.log(`📁 Output directory: ${this.outputDir}`);
    console.log();

    const scenesWithImages: SceneWithImage[] = [];
    let generatedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      const isFirstScene = i === 0;

      console.log(`📍 Scene ${scene.id}:`);
      console.log(`   Motion: ${scene.motion_intensity}`);

      onProgress?.(i + 1, script.scenes.length);

      if (this.shouldGenerateImage(scene, isFirstScene)) {
        const prompt = this.buildPrompt(scene, style);
        console.log(`   Prompt: ${prompt.substring(0, 80)}...`);

        try {
          const { base64, path: imagePath } = await this.generateImageWithGemini(prompt, scene.id);

          scenesWithImages.push({
            ...scene,
            image_path: imagePath,
            image_base64: base64,
          });
          generatedCount++;
        } catch (error) {
          console.log(`   ⚠️ Using null for failed generation`);
          scenesWithImages.push({
            ...scene,
            image_path: null,
            image_base64: null,
          });
        }
      } else {
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
    console.log(`   Saved to: ${this.outputDir}`);

    return {
      title: script.title,
      scientific_field: script.scientific_field,
      style: style,
      scenes: scenesWithImages,
    };
  }
}
