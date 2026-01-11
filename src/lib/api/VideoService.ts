/**
 * VideoService - Step 3: Script + Images → Videos
 * 
 * 使用 Veo 3.1 为剧本生成视频片段
 * 
 * 视频分组逻辑：
 * - 每个有锚点图片的场景（第一个 + motion_intensity: Low）开始一个新视频
 * - 后续没有锚点图片的场景 extend 当前视频
 * - 最终输出多个视频文件，需要后续拼接
 */

import * as fs from "fs";
import * as path from "path";
import { GoogleGenAI, Video } from "@google/genai";
import {
  ScriptWithImages,
  SceneWithImage,
  SceneWithVideo,
  FinalOutput,
  VideoGroupInfo,
} from "./types";

export interface VideoServiceOptions {
  apiKey: string;
  outputDir?: string;
  pollInterval?: number;
}

/**
 * 视频分组信息
 */
export interface VideoGroup {
  videoIndex: number;      // 视频编号（1, 2, 3...）
  startSceneId: number;    // 起始场景 ID
  endSceneId: number;      // 结束场景 ID（用于命名视频文件）
  scenes: SceneWithImage[]; // 包含的场景列表
  videoPath?: string;       // 最终视频路径
}

export class VideoService {
  private ai: GoogleGenAI;
  private apiKey: string;
  private outputDir: string;
  private pollInterval: number;

  constructor(apiKeyOrOptions: string | VideoServiceOptions) {
    if (typeof apiKeyOrOptions === 'string') {
      this.apiKey = apiKeyOrOptions;
      this.outputDir = "./output/videos";
      this.pollInterval = 10000;
    } else {
      this.apiKey = apiKeyOrOptions.apiKey;
      this.outputDir = apiKeyOrOptions.outputDir || "./output/videos";
      this.pollInterval = apiKeyOrOptions.pollInterval || 10000;
    }
    
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });

    // 确保输出目录存在
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 将场景按锚点图片分组
   * 
   * 逻辑：遇到下一个有锚点图片的场景时，结束当前视频组
   * 视频命名用该组的最后一个场景 ID（即 endSceneId）
   */
  private groupScenesByAnchor(scenes: SceneWithImage[]): VideoGroup[] {
    const groups: VideoGroup[] = [];
    let currentGroup: VideoGroup | null = null;
    let videoIndex = 0;

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const isLastScene = i === scenes.length - 1;

      if (scene.image_base64 !== null) {
        // 有锚点图片 → 先结束上一个视频组，再开始新的
        if (currentGroup) {
          // 设置上一组的 endSceneId
          currentGroup.endSceneId = currentGroup.scenes[currentGroup.scenes.length - 1].id;
        }
        
        videoIndex++;
        currentGroup = {
          videoIndex,
          startSceneId: scene.id,
          endSceneId: scene.id, // 暂时设为自己，后续会更新
          scenes: [scene],
        };
        groups.push(currentGroup);
      } else if (currentGroup) {
        // 没有锚点图片 → 加入当前组
        currentGroup.scenes.push(scene);
      } else {
        // 边界情况：第一个场景没有图片（不应该发生）
        console.warn(`⚠️ Scene ${scene.id} has no anchor and no previous group`);
      }

      // 如果是最后一个场景，确保 endSceneId 正确
      if (isLastScene && currentGroup) {
        currentGroup.endSceneId = scene.id;
      }
    }

    return groups;
  }

  /**
   * 构建完整的 Veo 提示词（包含画面描述 + 旁白）
   */
  private buildFullPrompt(scene: SceneWithImage): string {
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

    // 移除 data:image/xxx;base64, 前缀
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
    
    console.log(`  ✓ Video generated with URI: ${video.uri ? 'YES' : 'NO'}`);
    
    // 确保视频完全可用（给 Veo 后端更多处理时间）
    console.log(`  ⏱️ Waiting for video to be fully available for chaining...`);
    await new Promise((resolve) => setTimeout(resolve, 10000)); // 10秒缓冲

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
    
    // 确保输入视频有 URI（表示已完全生成）
    if (!inputVideo.uri) {
      throw new Error(`Input video for scene ${sceneId} does not have a URI. Video may not be fully processed.`);
    }
    
    // 添加短暂延迟，确保 Veo 后端已完全处理视频
    console.log(`  ⏱️ Waiting for input video to be fully processed...`);
    await new Promise((resolve) => setTimeout(resolve, 5000)); // 5秒缓冲

    let operation = await this.ai.models.generateVideos({
      model: "veo-3.1-generate-preview",
      prompt: prompt,
      video: inputVideo,
      config: {
        numberOfVideos: 1,
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
   * 下载视频到本地文件
   */
  private async downloadVideo(videoUri: string, outputPath: string): Promise<void> {
    console.log(`  📥 Downloading video to ${outputPath}...`);

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
   * 生成单个视频组
   * 
   * 视频命名用 endSceneId（该组最后一个场景的 ID）
   */
  private async generateVideoGroup(
    group: VideoGroup,
    onProgress?: (sceneId: number, total: number, status: string) => void
  ): Promise<{ video: Video; videoPath: string; sceneResults: SceneWithVideo[] }> {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`📹 Video Group ${group.videoIndex}: Scenes ${group.scenes.map(s => s.id).join(', ')}`);
    console.log(`   Will be saved as: video_${group.endSceneId}.mp4`);
    console.log(`${"═".repeat(60)}`);

    let currentVideo: Video | null = null;
    const sceneResults: SceneWithVideo[] = [];

    for (let i = 0; i < group.scenes.length; i++) {
      const scene = group.scenes[i];
      const isFirstInGroup = i === 0;

      console.log(`\n📍 Scene ${scene.id}:`);
      console.log(`   Voiceover: "${scene.voiceover.substring(0, 50)}..."`);

      onProgress?.(scene.id, group.scenes.length, 'generating');

      const fullPrompt = this.buildFullPrompt(scene);

      if (isFirstInGroup && scene.image_base64) {
        // 第一个场景：从图片生成
        currentVideo = await this.generateFromImage(
          fullPrompt,
          scene.image_base64,
          scene.id
        );
      } else if (currentVideo) {
        // 后续场景：扩展视频
        currentVideo = await this.extendVideo(
          fullPrompt,
          currentVideo,
          scene.id
        );
      } else {
        throw new Error(`Scene ${scene.id} cannot be processed`);
      }

      // 记录场景结果（暂不下载，最后统一下载）
      sceneResults.push({
        ...scene,
        video_path: '', // 稍后填充
        video_uri: currentVideo.uri || '',
      });

      console.log(`   ✅ Scene ${scene.id} processed`);
      onProgress?.(scene.id, group.scenes.length, 'completed');
    }

    // 下载最终视频 - 用 endSceneId 命名
    const videoPath = path.join(this.outputDir, `video_${group.endSceneId}.mp4`);
    if (currentVideo?.uri) {
      await this.downloadVideo(currentVideo.uri, videoPath);
    }

    // 更新所有场景的 video_path
    sceneResults.forEach(s => s.video_path = videoPath);

    return { video: currentVideo!, videoPath, sceneResults };
  }

  /**
   * 主函数：为剧本生成视频
   */
  async generateVideos(
    script: ScriptWithImages,
    onProgress?: (sceneId: number, total: number, status: string) => void
  ): Promise<FinalOutput> {
    console.log("🎥 Starting video generation...");
    console.log(`📊 Total scenes: ${script.scenes.length}`);
    console.log(`🎨 Style: ${script.style}`);
    console.log(`📁 Output directory: ${this.outputDir}`);

    // 按锚点图片分组
    const groups = this.groupScenesByAnchor(script.scenes);
    
    console.log(`\n📹 Video groups: ${groups.length}`);
    groups.forEach(g => {
      console.log(`   video_${g.endSceneId}.mp4: Scenes ${g.scenes.map(s => s.id).join(', ')} (anchor: scene ${g.startSceneId})`);
    });

    // 生成每个视频组
    const allSceneResults: SceneWithVideo[] = [];
    const videoPaths: string[] = [];

    for (const group of groups) {
      const { videoPath, sceneResults } = await this.generateVideoGroup(group, onProgress);
      allSceneResults.push(...sceneResults);
      videoPaths.push(videoPath);
      group.videoPath = videoPath;
    }

    // 按场景 ID 排序
    allSceneResults.sort((a, b) => a.id - b.id);

    // 构建视频组信息
    const videoGroupInfos: VideoGroupInfo[] = groups.map(g => ({
      videoIndex: g.videoIndex,
      startSceneId: g.startSceneId,
      endSceneId: g.endSceneId,
      sceneIds: g.scenes.map(s => s.id),
      videoPath: g.videoPath,
    }));

    console.log(`\n${"═".repeat(60)}`);
    console.log(`✅ Video generation complete!`);
    console.log(`   Total videos: ${groups.length}`);
    console.log(`   Video files:`);
    videoPaths.forEach((p, i) => console.log(`     ${i + 1}. ${p}`));
    console.log(`\n💡 Use ConcatService to merge these videos into one.`);

    return {
      title: script.title,
      scientific_field: script.scientific_field,
      style: script.style,
      scenes: allSceneResults,
      videoGroups: videoGroupInfos,
      videoPaths: videoPaths,
    };
  }
}
