/**
 * SciVid Pipeline - 完整的 PDF 到视频转换流程
 * 
 * Chain of Thought:
 * Step 1: PDF → Script (Gemini 分析论文生成剧本)
 * Step 2: Script → Images (Gemini Image 生成关键帧)
 * Step 3: Script + Images → Videos (Veo 生成视频)
 * Step 4: Videos → Final Video (FFmpeg 拼接)
 */

import { ScriptService } from "./ScriptService";
import { ImageService } from "./ImageService";
import { VideoService } from "./VideoService";
import { ConcatService, ConcatResult } from "./ConcatService";
import {
  VideoStyle,
  ScriptOutput,
  ScriptWithImages,
  FinalOutput,
  PipelineProgress,
  ProgressCallback,
} from "./types";

export interface PipelineOptions {
  apiKey: string;
  style: VideoStyle;
  outputDir?: string;
  onProgress?: ProgressCallback;
}

export interface FullPipelineResult {
  finalOutput: FinalOutput;
  concatResult?: ConcatResult;
}

export class SciVidPipeline {
  private scriptService: ScriptService;
  private imageService: ImageService;
  private videoService: VideoService;
  private concatService: ConcatService;
  private style: VideoStyle;
  private onProgress?: ProgressCallback;
  private outputDir: string;

  constructor(options: PipelineOptions) {
    this.outputDir = options.outputDir || "./output";
    this.scriptService = new ScriptService(options.apiKey);
    this.imageService = new ImageService({
      apiKey: options.apiKey,
      outputDir: `${this.outputDir}/images`,
    });
    this.videoService = new VideoService(options.apiKey);
    this.concatService = new ConcatService(this.outputDir);
    this.style = options.style;
    this.onProgress = options.onProgress;
  }

  private reportProgress(progress: PipelineProgress) {
    this.onProgress?.(progress);
    console.log(`[${progress.step}] ${progress.message} (${progress.progress}%)`);
    if (progress.detail) {
      console.log(`  → ${progress.detail}`);
    }
  }

  /**
   * Step 1: PDF → Script
   */
  async generateScript(pdfBuffer: Buffer, fileName: string): Promise<ScriptOutput> {
    this.reportProgress({
      step: 'script',
      message: '正在分析论文...',
      progress: 0,
      detail: '上传 PDF 文件到 Gemini',
    });

    const script = await this.scriptService.generateScript(pdfBuffer, fileName, {
      style: this.style,
    });

    this.reportProgress({
      step: 'script',
      message: '剧本生成完成',
      progress: 100,
      detail: `生成了 ${script.scenes.length} 个场景`,
    });

    return script;
  }

  /**
   * Step 2: Script → Images
   */
  async generateImages(script: ScriptOutput): Promise<ScriptWithImages> {
    this.reportProgress({
      step: 'images',
      message: '正在生成关键帧图片...',
      progress: 0,
    });

    const scriptWithImages = await this.imageService.generateImages(
      script,
      this.style,
      (current, total) => {
        const progress = Math.round((current / total) * 100);
        this.reportProgress({
          step: 'images',
          message: `生成图片 ${current}/${total}`,
          progress,
          detail: `场景 ${current}`,
        });
      }
    );

    this.reportProgress({
      step: 'images',
      message: '图片生成完成',
      progress: 100,
      detail: `生成了 ${scriptWithImages.scenes.filter(s => s.image_base64).length} 张锚点图`,
    });

    return scriptWithImages;
  }

  /**
   * Step 3: Script + Images → Videos
   */
  async generateVideos(scriptWithImages: ScriptWithImages): Promise<FinalOutput> {
    this.reportProgress({
      step: 'videos',
      message: '正在生成视频片段...',
      progress: 0,
    });

    const finalOutput = await this.videoService.generateVideos(
      scriptWithImages,
      (sceneId, total, status) => {
        const progress = Math.round((sceneId / total) * 100);
        this.reportProgress({
          step: 'videos',
          message: `渲染视频 ${sceneId}/${total}`,
          progress,
          detail: status === 'generating' ? '正在生成...' : '完成',
        });
      }
    );

    this.reportProgress({
      step: 'videos',
      message: '视频生成完成',
      progress: 100,
      detail: `生成了 ${finalOutput.scenes.length} 个视频片段`,
    });

    return finalOutput;
  }

  /**
   * Step 4: Videos → Final Video (拼接)
   */
  async concatVideos(finalOutput: FinalOutput): Promise<ConcatResult> {
    this.reportProgress({
      step: 'concat',
      message: '正在拼接视频...',
      progress: 0,
    });

    const concatResult = await this.concatService.concatFromFinalOutput(finalOutput);

    this.reportProgress({
      step: 'concat',
      message: '视频拼接完成',
      progress: 100,
      detail: `输出文件: ${concatResult.outputPath}`,
    });

    return concatResult;
  }

  /**
   * 运行完整 Pipeline（包含拼接）
   */
  async runFull(pdfBuffer: Buffer, fileName: string): Promise<FullPipelineResult> {
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║       🎬 SciVid.AI Pipeline - Chain of Thought            ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log();
    console.log(`📄 File: ${fileName}`);
    console.log(`🎨 Style: ${this.style}`);
    console.log();

    // Step 1: PDF → Script
    console.log("━━━ Step 1: PDF → Script ━━━");
    const script = await this.generateScript(pdfBuffer, fileName);
    console.log();

    // Step 2: Script → Images
    console.log("━━━ Step 2: Script → Images ━━━");
    const scriptWithImages = await this.generateImages(script);
    console.log();

    // Step 3: Script + Images → Videos
    console.log("━━━ Step 3: Images → Videos ━━━");
    const finalOutput = await this.generateVideos(scriptWithImages);
    console.log();

    // Step 4: Videos → Final Video
    console.log("━━━ Step 4: Concatenate Videos ━━━");
    let concatResult: ConcatResult | undefined;
    try {
      concatResult = await this.concatVideos(finalOutput);
    } catch (error) {
      console.log("⚠️ Video concatenation skipped (videos might be blob URLs)");
      console.log("   Use local video paths for server-side concatenation");
    }
    console.log();

    console.log("═══════════════════════════════════════════════════════════");
    console.log("🎉 Pipeline completed successfully!");
    console.log(`   Title: ${finalOutput.title}`);
    console.log(`   Field: ${finalOutput.scientific_field}`);
    console.log(`   Scenes: ${finalOutput.scenes.length}`);
    if (concatResult) {
      console.log(`   Final Video: ${concatResult.outputPath}`);
      console.log(`   Duration: ${concatResult.duration}`);
      console.log(`   Size: ${concatResult.fileSize}`);
    }
    console.log("═══════════════════════════════════════════════════════════");

    return { finalOutput, concatResult };
  }

  /**
   * 运行 Pipeline（不包含拼接，用于前端）
   */
  async run(pdfBuffer: Buffer, fileName: string): Promise<FinalOutput> {
    const result = await this.runFull(pdfBuffer, fileName);
    return result.finalOutput;
  }
}

/**
 * 便捷函数：创建并运行完整 Pipeline
 */
export async function runPipeline(
  pdfBuffer: Buffer,
  fileName: string,
  options: PipelineOptions
): Promise<FinalOutput> {
  const pipeline = new SciVidPipeline(options);
  return pipeline.run(pdfBuffer, fileName);
}

/**
 * 便捷函数：运行完整 Pipeline（包含拼接）
 */
export async function runFullPipeline(
  pdfBuffer: Buffer,
  fileName: string,
  options: PipelineOptions
): Promise<FullPipelineResult> {
  const pipeline = new SciVidPipeline(options);
  return pipeline.runFull(pdfBuffer, fileName);
}
