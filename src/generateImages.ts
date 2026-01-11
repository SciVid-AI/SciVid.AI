import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { ImageGenerationService } from "./services/ImageGenerationService.js";
import { ScriptOutput, VideoStyle } from "./types/script.js";

/**
 * Step 2 入口：为剧本生成视觉锚点图片
 * 使用 Imagen 4.0 (Google 最强图像生成模型)
 * 与 Step 1 使用相同的 GOOGLE_API_KEY
 */
async function main() {
  // 检查 API Key (与 Step 1 相同)
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("❌ Error: GOOGLE_API_KEY environment variable is not set");
    console.log("\nPlease set your Google API Key in .env file:");
    console.log("  GOOGLE_API_KEY=your-api-key");
    process.exit(1);
  }

  // 获取输入参数
  const scriptPath = process.argv[2];
  const styleArg = process.argv[3] as VideoStyle | undefined;

  if (!scriptPath) {
    console.log("\nUsage: npm run images <script.json> [style]");
    console.log("\nArguments:");
    console.log("  script.json  Path to Step 1 output JSON file");
    console.log("  style        Visual style (cinematic|academic|anime|minimalist)");
    console.log("\nExamples:");
    console.log("  npm run images ./output/script.json cinematic");
    console.log("  npm run images ./output/script.json anime");
    process.exit(1);
  }

  // 读取剧本文件
  const absolutePath = path.resolve(scriptPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Error: Script file not found: ${absolutePath}`);
    process.exit(1);
  }

  let script: ScriptOutput;
  try {
    const content = fs.readFileSync(absolutePath, "utf-8");
    script = JSON.parse(content);
  } catch (error) {
    console.error("❌ Error: Failed to parse script JSON");
    process.exit(1);
  }

  // 验证剧本结构
  if (!script.title || !script.scenes || !Array.isArray(script.scenes)) {
    console.error("❌ Error: Invalid script structure");
    process.exit(1);
  }

  // 默认风格
  const style: VideoStyle = styleArg || "cinematic";

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║       🖼️  Paper-Video: Image Generation Module             ║");
  console.log("║          Using Imagen 4.0 (Google's Best Image Model)      ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log(`📄 Script: ${absolutePath}`);
  console.log(`🎨 Style: ${style}`);
  console.log();

  try {
    // 初始化服务 - 使用与 Step 1 相同的 API Key
    const service = new ImageGenerationService({
      apiKey,
    });

    // 生成图片
    const result = await service.generateImages(script, style);

    // 保存结果
    const outputDir = "./output";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = path.join(outputDir, `script-with-images-${timestamp}.json`);
    
    // 保存时不包含 base64 数据（太大），只保留路径
    const outputForFile = {
      ...result,
      scenes: result.scenes.map((scene) => ({
        ...scene,
        image_base64: scene.image_base64 ? "[BASE64_DATA]" : null,
      })),
    };
    fs.writeFileSync(outputPath, JSON.stringify(outputForFile, null, 2));

    // 同时保存完整版本（包含 base64，用于 Step 3）
    const fullOutputPath = path.join(outputDir, `script-with-images-full-${timestamp}.json`);
    fs.writeFileSync(fullOutputPath, JSON.stringify(result, null, 2));

    console.log();
    console.log("═".repeat(60));
    console.log(`💾 Output saved:`);
    console.log(`   Preview: ${outputPath}`);
    console.log(`   Full: ${fullOutputPath}`);
    console.log("═".repeat(60));

    // 打印摘要
    const imagesGenerated = result.scenes.filter((s) => s.image_path !== null).length;
    console.log("\n📊 Summary:");
    console.log(`   Title: ${result.title}`);
    console.log(`   Style: ${result.style}`);
    console.log(`   Total scenes: ${result.scenes.length}`);
    console.log(`   Images generated: ${imagesGenerated}`);
    console.log("\n🎉 Image generation complete!");

  } catch (error) {
    console.error("\n❌ Image generation failed:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
