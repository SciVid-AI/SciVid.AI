/**
 * SciVid.AI 分步测试脚本
 * 
 * 可以单独测试每个步骤：
 *   npx tsx scripts/test-steps.ts script <pdf-path> [style]     # 只测试剧本生成
 *   npx tsx scripts/test-steps.ts images <script.json> [style]  # 只测试图片生成
 *   npx tsx scripts/test-steps.ts videos <script-with-images.json>  # 只测试视频生成
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

import { ScriptService } from '../src/lib/api/ScriptService';
import { ImageService } from '../src/lib/api/ImageService';
import { VideoService } from '../src/lib/api/VideoService';
import type { VideoStyle, ScriptOutput, ScriptWithImages } from '../src/lib/api/types';

const AVAILABLE_STYLES: VideoStyle[] = ['cinematic', 'academic', 'anime', 'minimalist'];

function printUsage() {
  console.log("\n📖 Usage:");
  console.log("  npx tsx scripts/test-steps.ts script <pdf-path> [style]");
  console.log("  npx tsx scripts/test-steps.ts images <script.json> [style]");
  console.log("  npx tsx scripts/test-steps.ts videos <script-with-images.json>");
  console.log("\n🎨 Available styles: cinematic, academic, anime, minimalist");
}

async function testScript(pdfPath: string, style: VideoStyle) {
  console.log("━━━ Testing Step 1: Script Generation ━━━");
  
  const apiKey = process.env.GOOGLE_API_KEY!;
  const pdfBuffer = fs.readFileSync(pdfPath);
  const fileName = path.basename(pdfPath);

  const service = new ScriptService(apiKey);
  const script = await service.generateScript(pdfBuffer, fileName, { style });

  // 保存结果
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = `./output/script-${timestamp}.json`;
  
  if (!fs.existsSync('./output')) {
    fs.mkdirSync('./output', { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(script, null, 2));
  
  console.log();
  console.log("✅ Script generated!");
  console.log(`   Title: ${script.title}`);
  console.log(`   Scenes: ${script.scenes.length}`);
  console.log(`   Saved: ${outputPath}`);
  console.log();
  console.log("📝 Next step:");
  console.log(`   npx tsx scripts/test-steps.ts images ${outputPath} ${style}`);
}

async function testImages(scriptPath: string, style: VideoStyle) {
  console.log("━━━ Testing Step 2: Image Generation ━━━");
  
  const apiKey = process.env.GOOGLE_API_KEY!;
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  const script: ScriptOutput = JSON.parse(scriptContent);

  const service = new ImageService({
    apiKey,
    outputDir: './output/images',
  });
  const result = await service.generateImages(script, style);

  // 保存结果
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = `./output/script-with-images-${timestamp}.json`;
  
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  
  // 保存精简版（不含 base64）
  const previewPath = `./output/script-with-images-preview-${timestamp}.json`;
  const preview = {
    ...result,
    scenes: result.scenes.map(s => ({
      ...s,
      image_base64: s.image_base64 ? '[BASE64_DATA]' : null,
    })),
  };
  fs.writeFileSync(previewPath, JSON.stringify(preview, null, 2));
  
  const imageCount = result.scenes.filter(s => s.image_base64).length;
  console.log();
  console.log("✅ Images generated!");
  console.log(`   Images: ${imageCount}/${result.scenes.length}`);
  console.log(`   Full output: ${outputPath}`);
  console.log(`   Preview: ${previewPath}`);
  console.log();
  console.log("📝 Next step:");
  console.log(`   npx tsx scripts/test-steps.ts videos ${outputPath}`);
}

async function testVideos(scriptWithImagesPath: string) {
  console.log("━━━ Testing Step 3: Video Generation ━━━");
  
  const apiKey = process.env.GOOGLE_API_KEY!;
  const content = fs.readFileSync(scriptWithImagesPath, 'utf-8');
  const scriptWithImages: ScriptWithImages = JSON.parse(content);

  const service = new VideoService(apiKey);
  const result = await service.generateVideos(scriptWithImages);

  // 保存结果
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = `./output/final-output-${timestamp}.json`;
  
  // 保存精简版
  const preview = {
    ...result,
    scenes: result.scenes.map(s => ({
      ...s,
      image_base64: s.image_base64 ? '[BASE64_DATA]' : null,
    })),
  };
  fs.writeFileSync(outputPath, JSON.stringify(preview, null, 2));
  
  console.log();
  console.log("✅ Videos generated!");
  console.log(`   Videos: ${result.scenes.length}`);
  console.log(`   Output: ${outputPath}`);
  console.log();
  console.log("🎉 All steps completed!");
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║       🧪 SciVid.AI Step-by-Step Test                       ║");
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

  const step = process.argv[2];
  const inputPath = process.argv[3];
  const styleArg = process.argv[4] as VideoStyle | undefined;

  if (!step || !inputPath) {
    printUsage();
    process.exit(1);
  }

  const style: VideoStyle = styleArg || 'cinematic';
  if (!AVAILABLE_STYLES.includes(style)) {
    console.error(`❌ Unknown style: ${styleArg}`);
    printUsage();
    process.exit(1);
  }

  const absolutePath = path.resolve(inputPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ File not found: ${absolutePath}`);
    process.exit(1);
  }

  try {
    switch (step) {
      case 'script':
        await testScript(absolutePath, style);
        break;
      case 'images':
        await testImages(absolutePath, style);
        break;
      case 'videos':
        await testVideos(absolutePath);
        break;
      default:
        console.error(`❌ Unknown step: ${step}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error();
    console.error("❌ Test failed:");
    console.error(error);
    process.exit(1);
  }
}

main();
