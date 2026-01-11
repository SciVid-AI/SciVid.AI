/**
 * SciVid.AI Pipeline 测试脚本
 * 
 * 使用方法:
 *   npx tsx scripts/test-pipeline.ts <pdf-path> [style]
 * 
 * 示例:
 *   npx tsx scripts/test-pipeline.ts ./test.pdf cinematic
 *   npx tsx scripts/test-pipeline.ts ./paper.pdf anime
 * 
 * 可用风格: cinematic, academic, anime, minimalist
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// 加载环境变量
config({ path: '.env.local' });
config(); // 也尝试加载 .env

import { SciVidPipeline, runFullPipeline } from '../src/lib/api';
import type { VideoStyle, PipelineProgress } from '../src/lib/api/types';

const AVAILABLE_STYLES: VideoStyle[] = ['cinematic', 'academic', 'anime', 'minimalist'];

function printUsage() {
  console.log("\n📖 Usage: npx tsx scripts/test-pipeline.ts <pdf-path> [style]");
  console.log("\n🎨 Available styles:");
  AVAILABLE_STYLES.forEach(style => {
    const descriptions: Record<VideoStyle, string> = {
      cinematic: "电影风格 - 史诗感、戏剧性光影",
      academic: "学术风格 - 专业严谨、数据可视化",
      anime: "动漫风格 - Pixar/Spider-Verse 风格",
      minimalist: "极简风格 - 3Blue1Brown 式数学可视化"
    };
    console.log(`  ${style.padEnd(12)} - ${descriptions[style]}`);
  });
  console.log("\n📝 Examples:");
  console.log("  npx tsx scripts/test-pipeline.ts ./test.pdf");
  console.log("  npx tsx scripts/test-pipeline.ts ./paper.pdf anime");
  console.log("  npx tsx scripts/test-pipeline.ts ./paper.pdf academic");
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║       🧪 SciVid.AI Pipeline Test Script                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  // 检查 API Key
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("❌ Error: GOOGLE_API_KEY not found");
    console.log("\n💡 Please create a .env.local file with:");
    console.log("   GOOGLE_API_KEY=your_api_key_here");
    process.exit(1);
  }
  console.log("✅ API Key found");

  // 获取命令行参数
  const pdfPath = process.argv[2];
  const styleArg = process.argv[3] as VideoStyle | undefined;

  if (!pdfPath) {
    console.error("❌ Error: PDF path is required");
    printUsage();
    process.exit(1);
  }

  // 检查文件是否存在
  const absolutePath = path.resolve(pdfPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Error: PDF file not found: ${absolutePath}`);
    process.exit(1);
  }
  console.log(`✅ PDF found: ${absolutePath}`);

  // 验证风格参数
  const style: VideoStyle = styleArg || 'cinematic';
  if (!AVAILABLE_STYLES.includes(style)) {
    console.error(`❌ Error: Unknown style "${styleArg}"`);
    printUsage();
    process.exit(1);
  }
  console.log(`✅ Style: ${style}`);
  console.log();

  // 读取 PDF 文件
  const pdfBuffer = fs.readFileSync(absolutePath);
  const fileName = path.basename(absolutePath);

  // 进度回调
  const onProgress = (progress: PipelineProgress) => {
    const stepEmoji: Record<string, string> = {
      script: '📝',
      images: '🖼️',
      videos: '🎬',
      concat: '🔗',
    };
    console.log(`${stepEmoji[progress.step] || '▶️'} [${progress.step}] ${progress.message} (${progress.progress}%)`);
    if (progress.detail) {
      console.log(`   → ${progress.detail}`);
    }
  };

  try {
    // 运行 Pipeline
    const result = await runFullPipeline(pdfBuffer, fileName, {
      apiKey,
      style,
      outputDir: './output',
      onProgress,
    });

    // 输出结果
    console.log();
    console.log("═══════════════════════════════════════════════════════════");
    console.log("🎉 Test completed successfully!");
    console.log();
    console.log("📊 Result Summary:");
    console.log(`   Title: ${result.finalOutput.title}`);
    console.log(`   Field: ${result.finalOutput.scientific_field}`);
    console.log(`   Style: ${result.finalOutput.style}`);
    console.log(`   Scenes: ${result.finalOutput.scenes.length}`);
    
    if (result.concatResult) {
      console.log();
      console.log("🎥 Final Video:");
      console.log(`   Path: ${result.concatResult.outputPath}`);
      console.log(`   Duration: ${result.concatResult.duration}`);
      console.log(`   Size: ${result.concatResult.fileSize}`);
    }

    // 保存结果 JSON
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = `./output/result-${timestamp}.json`;
    
    // 创建不含 base64 的精简版本
    const outputData = {
      ...result.finalOutput,
      scenes: result.finalOutput.scenes.map(scene => ({
        ...scene,
        image_base64: scene.image_base64 ? '[BASE64_DATA]' : null,
      })),
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log();
    console.log(`💾 Result saved: ${outputPath}`);

  } catch (error) {
    console.error();
    console.error("❌ Pipeline failed:");
    console.error(error);
    process.exit(1);
  }
}

main();
