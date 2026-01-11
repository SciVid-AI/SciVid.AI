import * as fs from "fs";
import * as path from "path";
import { GoogleGenAI, Video } from "@google/genai";
import {
  ScriptWithImages,
  SceneWithImage,
  SceneWithVideo,
  FinalOutput,
} from "../types/script.js";

/**
 * VideoGenerationService
 *
 * 为剧本中的场景生成视频片段
 * 使用 Google Veo 3.1 (Image-to-Video & Extend Video)
 */
export class VideoGenerationService {
  private ai: GoogleGenAI;
  private apiKey: string;
  private outputDir: string;
  private pollInterval: number;

  constructor(options: {
    apiKey: string;
    outputDir?: string;
    pollInterval?: number;
  }) {
    this.apiKey = options.apiKey;
    this.ai = new GoogleGenAI({ apiKey: options.apiKey });
    this.outputDir = options.outputDir || "./output/videos";
    this.pollInterval = options.pollInterval || 10000; // 10 秒轮询

    // 确保输出目录存在
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 构建完整的 Veo 提示词（包含画面描述 + 旁白）
   * Veo 3 支持生成带语音的视频
   */
  private buildFullPrompt(scene: SceneWithImage): string {
    // 组合视觉描述和旁白
    // Veo 3 会根据 prompt 中的对话/旁白生成相应的语音
    return `${scene.visual_description}

Narration (voiceover, clear and engaging tone): "${scene.voiceover}"`;
  }

  /**
   * 从图片生成视频 (FRAMES_TO_VIDEO 模式)
   */
  private async generateFromImage(
    prompt: string,
    imageBase64: string,
    sceneId: number
  ): Promise<Video> {
    console.log(`  🎬 FRAMES_TO_VIDEO: Generating from anchor image...`);

    // 移除 data:image/png;base64, 前缀
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    let operation = await this.ai.models.generateVideos({
      model: "veo-3.1-generate-preview",
      prompt: prompt,
      image: {
        imageBytes: cleanBase64,
        mimeType: "image/png",
      },
      config: {
        numberOfVideos: 1,
        aspectRatio: "16:9",
      },
    });

    // 轮询等待完成
    while (!operation.done) {
      console.log(`  ⏳ Waiting for video generation (scene ${sceneId})...`);
      await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
      operation = await this.ai.operations.getVideosOperation({ operation });
    }

    const video = operation.response?.generatedVideos?.[0]?.video;
    if (!video) {
      throw new Error(`No video generated for scene ${sceneId}`);
    }

    return video;
  }

  /**
   * 扩展已有视频 (EXTEND_VIDEO 模式)
   */
  private async extendVideo(
    prompt: string,
    inputVideo: Video,
    sceneId: number
  ): Promise<Video> {
    console.log(`  🔄 EXTEND_VIDEO: Extending previous video...`);

    let operation = await this.ai.models.generateVideos({
      model: "veo-3.1-generate-preview",
      prompt: prompt,
      video: inputVideo,
      config: {
        numberOfVideos: 1,
        // EXTEND_VIDEO 模式不需要 aspectRatio
      },
    });

    // 轮询等待完成
    while (!operation.done) {
      console.log(`  ⏳ Waiting for video extension (scene ${sceneId})...`);
      await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
      operation = await this.ai.operations.getVideosOperation({ operation });
    }

    const video = operation.response?.generatedVideos?.[0]?.video;
    if (!video) {
      throw new Error(`No video generated for scene ${sceneId}`);
    }

    return video;
  }

  /**
   * 下载视频文件
   */
  private async downloadVideo(
    videoUri: string,
    outputPath: string
  ): Promise<void> {
    console.log(`  📥 Downloading video...`);

    const url = decodeURIComponent(videoUri);
    const fetchUrl = url.includes("?")
      ? `${url}&key=${this.apiKey}`
      : `${url}?key=${this.apiKey}`;

    const res = await fetch(fetchUrl);

    if (!res.ok) {
      throw new Error(`Failed to fetch video: ${res.status} ${res.statusText}`);
    }

    const videoBlob = await res.blob();
    const buffer = Buffer.from(await videoBlob.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    console.log(`  ✅ Video saved: ${outputPath}`);
  }

  /**
   * 主函数：为剧本生成视频
   */
  async generateVideos(script: ScriptWithImages): Promise<FinalOutput> {
    console.log("🎥 Starting video generation...");
    console.log(`📊 Total scenes: ${script.scenes.length}`);
    console.log(`🎨 Style: ${script.style}`);
    console.log();

    const scenesWithVideo: SceneWithVideo[] = [];
    let previousVideo: Video | null = null;

    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      const isFirstScene = i === 0;

      console.log(`═══════════════════════════════════════════════════`);
      console.log(`📍 Scene ${scene.id} (${scene.timestamp}):`);
      console.log(`   Motion: ${scene.motion_intensity}`);
      console.log(`   Has anchor image: ${scene.image_base64 !== null}`);
      console.log(`   Voiceover: "${scene.voiceover.substring(0, 50)}..."`);

      let video: Video;
      const videoPath = path.join(this.outputDir, `scene_${scene.id}.mp4`);

      // 构建包含旁白的完整 prompt
      const fullPrompt = this.buildFullPrompt(scene);

      try {
        if (scene.image_base64 !== null) {
          // 有锚点图 → FRAMES_TO_VIDEO
          video = await this.generateFromImage(
            fullPrompt,
            scene.image_base64,
            scene.id
          );
        } else if (previousVideo !== null) {
          // 无锚点图但有上一段视频 → EXTEND_VIDEO
          video = await this.extendVideo(
            fullPrompt,
            previousVideo,
            scene.id
          );
        } else if (isFirstScene) {
          // 第一个场景没有锚点图 → 报错
          throw new Error(
            "First scene must have an anchor image (image_base64)"
          );
        } else {
          // 不应该到达这里
          throw new Error(
            `Scene ${scene.id} has no anchor image and no previous video`
          );
        }

        // 下载视频
        if (video.uri) {
          await this.downloadVideo(video.uri, videoPath);
        } else {
          throw new Error(`Video URI is missing for scene ${scene.id}`);
        }

        // 保存当前视频对象供下一次扩展使用
        previousVideo = video;

        // 添加到结果
        scenesWithVideo.push({
          ...scene,
          video_path: videoPath,
          video_uri: video.uri,
        });

        console.log(`   ✅ Scene ${scene.id} completed!`);
      } catch (error) {
        console.error(`   ❌ Failed to generate video for scene ${scene.id}:`);
        console.error(error);
        throw error;
      }

      console.log();
    }

    console.log("═══════════════════════════════════════════════════");
    console.log(`✅ Video generation complete!`);
    console.log(`   Total videos: ${scenesWithVideo.length}`);

    return {
      title: script.title,
      scientific_field: script.scientific_field,
      style: script.style,
      scenes: scenesWithVideo,
    };
  }
}
