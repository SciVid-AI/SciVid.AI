/**
 * Step 3: Video Generation Entry Point
 *
 * 使用方法:
 *   npm run videos <script-with-images.json>
 *
 * 示例:
 *   npm run videos ./output/script-with-images-full-2026-01-11T00-16-06-719Z.json
 */

import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { VideoGenerationService } from "./services/VideoGenerationService.js";
import { ScriptWithImages, FinalOutput } from "./types/script.js";

// 加载环境变量
config();

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║          ScholarLens - Step 3: Video Generation           ║");
  console.log("║                   Powered by Veo 3.1                       ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log();

  // 获取命令行参数
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("❌ Usage: npm run videos <script-with-images.json>");
    console.error("");
    console.error("Example:");
    console.error(
      "  npm run videos ./output/script-with-images-full-2026-01-11T00-16-06-719Z.json"
    );
    process.exit(1);
  }

  const inputPath = args[0];

  // 检查输入文件是否存在
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // 检查 API Key
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("❌ GOOGLE_API_KEY not found in environment variables");
    console.error("   Please set GOOGLE_API_KEY in your .env file");
    process.exit(1);
  }

  try {
    // 读取 Step 2 输出的 JSON
    console.log(`📂 Loading script: ${inputPath}`);
    const scriptContent = fs.readFileSync(inputPath, "utf-8");
    const script: ScriptWithImages = JSON.parse(scriptContent);

    console.log(`📝 Title: ${script.title}`);
    console.log(`🔬 Field: ${script.scientific_field}`);
    console.log(`🎨 Style: ${script.style}`);
    console.log(`📊 Scenes: ${script.scenes.length}`);
    console.log();

    // 统计锚点图和扩展场景
    const anchorScenes = script.scenes.filter((s) => s.image_base64 !== null);
    const extendScenes = script.scenes.filter((s) => s.image_base64 === null);
    console.log(`🖼️  Scenes with anchor images: ${anchorScenes.length}`);
    console.log(`🔄 Scenes to extend: ${extendScenes.length}`);
    console.log();

    // 初始化服务
    const videoService = new VideoGenerationService({
      apiKey: apiKey,
      outputDir: "./output/videos",
      pollInterval: 10000, // 10 秒轮询
    });

    // 生成视频
    const result: FinalOutput = await videoService.generateVideos(script);

    // 保存结果
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputFileName = `final-output-${timestamp}.json`;
    const outputPath = path.join("./output", outputFileName);

    // 保存完整版本（包含 base64）
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`💾 Full output saved: ${outputPath}`);

    // 保存精简版本（不含 base64，方便查看）
    const previewResult = {
      ...result,
      scenes: result.scenes.map((scene) => ({
        ...scene,
        image_base64: scene.image_base64 ? "[BASE64_DATA]" : null,
      })),
    };
    const previewFileName = `final-output-preview-${timestamp}.json`;
    const previewPath = path.join("./output", previewFileName);
    fs.writeFileSync(previewPath, JSON.stringify(previewResult, null, 2));
    console.log(`📋 Preview saved: ${previewPath}`);

    console.log();
    console.log("═══════════════════════════════════════════════════════════");
    console.log("🎉 Video generation complete!");
    console.log();
    console.log("Generated videos:");
    result.scenes.forEach((scene) => {
      console.log(`  - Scene ${scene.id}: ${scene.video_path}`);
    });
    console.log();
    console.log("Next steps:");
    console.log("  1. Review generated videos in ./output/videos/");
    console.log("  2. Use FFmpeg to concatenate videos if needed");
    console.log("  3. Add voiceover audio track");
  } catch (error) {
    console.error("❌ Video generation failed:");
    console.error(error);
    process.exit(1);
  }
}

main();
