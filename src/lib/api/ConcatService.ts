/**
 * ConcatService - Step 4: 视频拼接
 * 
 * 使用 FFmpeg 将多个视频片段拼接成完整视频
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { FinalOutput } from "./types";

export interface ConcatOptions {
  outputDir?: string;
  outputFileName?: string;
}

export interface ConcatResult {
  outputPath: string;
  duration: string;
  fileSize: string;
}

export class ConcatService {
  private outputDir: string;

  constructor(outputDir: string = "./output") {
    this.outputDir = outputDir;
    
    // 确保输出目录存在
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 拼接视频片段
   * @param videoPaths 视频文件路径数组
   * @param outputFileName 输出文件名
   */
  async concatVideos(
    videoPaths: string[],
    outputFileName: string = "final_video.mp4"
  ): Promise<ConcatResult> {
    console.log("╔═══════════════════════════════════════════════════════════╗");
    console.log("║          SciVid.AI - Video Concatenation                  ║");
    console.log("║                   Powered by FFmpeg                       ║");
    console.log("╚═══════════════════════════════════════════════════════════╝");
    console.log();

    if (videoPaths.length === 0) {
      throw new Error("No video paths provided");
    }

    // 过滤有效的视频路径
    const validPaths = videoPaths.filter(p => p && fs.existsSync(p));
    
    if (validPaths.length === 0) {
      throw new Error("No valid video files found");
    }

    console.log("📹 Input videos:");
    validPaths.forEach((v, i) => console.log(`   ${i + 1}. ${v}`));

    const outputPath = path.join(this.outputDir, outputFileName);
    console.log(`📦 Output: ${outputPath}`);
    console.log();

    try {
      // 创建临时文件列表
      const tempDir = path.join(this.outputDir, "temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const listFile = path.join(tempDir, "concat_list.txt");
      const listContent = validPaths.map((v) => `file '${path.resolve(v)}'`).join("\n");
      fs.writeFileSync(listFile, listContent);

      console.log("🔧 Concatenating videos with FFmpeg...");
      console.log();

      // 使用 FFmpeg concat demuxer
      const ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}"`;
      
      console.log(`   Running: ${ffmpegCmd}`);
      console.log();

      execSync(ffmpegCmd, { stdio: "inherit" });

      // 清理临时文件
      fs.unlinkSync(listFile);
      fs.rmdirSync(tempDir, { recursive: true });

      console.log();
      console.log("═══════════════════════════════════════════════════════════");
      console.log(`✅ Video concatenation complete!`);
      console.log(`📦 Output saved: ${outputPath}`);

      // 获取文件信息
      const stats = fs.statSync(outputPath);
      const fileSize = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;
      
      // 估算时长（假设每个片段约 8 秒）
      const estimatedDuration = `${Math.round(validPaths.length * 8)}s`;

      console.log(`📊 File size: ${fileSize}`);

      return {
        outputPath,
        duration: estimatedDuration,
        fileSize,
      };

    } catch (error) {
      console.error("❌ Concatenation failed:");
      console.error(error);
      throw error;
    }
  }

  /**
   * 从 FinalOutput 拼接所有视频
   * 
   * 使用 videoPaths 字段（按视频组顺序排列）
   */
  async concatFromFinalOutput(
    finalOutput: FinalOutput,
    outputFileName?: string
  ): Promise<ConcatResult> {
    // 优先使用 videoPaths（已按视频组顺序排列）
    let videoPaths: string[] = [];
    
    if (finalOutput.videoPaths && finalOutput.videoPaths.length > 0) {
      videoPaths = finalOutput.videoPaths.filter(p => p && !p.startsWith('blob:'));
      console.log(`📹 Using videoPaths from FinalOutput: ${videoPaths.length} videos`);
    } else {
      // 回退：从 scenes 提取唯一的 video_path
      const uniquePaths = new Set<string>();
      finalOutput.scenes.forEach(scene => {
        if (scene.video_path && !scene.video_path.startsWith('blob:')) {
          uniquePaths.add(scene.video_path);
        }
      });
      videoPaths = Array.from(uniquePaths);
      console.log(`📹 Extracted unique video paths from scenes: ${videoPaths.length} videos`);
    }

    if (videoPaths.length === 0) {
      throw new Error("No valid video paths in FinalOutput. Videos might be blob URLs which cannot be concatenated on server.");
    }

    if (videoPaths.length === 1) {
      console.log("ℹ️ Only one video, no concatenation needed.");
      return {
        outputPath: videoPaths[0],
        duration: "~8s",
        fileSize: "N/A",
      };
    }

    const fileName = outputFileName || 'final.mp4';
    
    return this.concatVideos(videoPaths, fileName);
  }
}
