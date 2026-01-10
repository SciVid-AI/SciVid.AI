import "dotenv/config";
import { ScriptGenerationService } from "./services/ScriptGenerationService.js";
import * as fs from "fs";
import * as path from "path";

/**
 * 主入口函数
 */
async function main() {
  // 检查 API Key
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("❌ Error: GOOGLE_API_KEY environment variable is not set");
    console.log("Please create a .env file with your Google AI API key:");
    console.log("  GOOGLE_API_KEY=your_api_key_here");
    process.exit(1);
  }

  // 获取 PDF 路径（从命令行参数或默认路径）
  const pdfPath = process.argv[2] || "./data/paper.pdf";
  
  // 检查文件是否存在
  const absolutePath = path.resolve(pdfPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Error: PDF file not found: ${absolutePath}`);
    console.log("\nUsage: npm run generate <path-to-pdf>");
    console.log("Example: npm run generate ./data/my-paper.pdf");
    process.exit(1);
  }

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║       🎬 Paper-Video: Script Generation Module            ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  try {
    // 初始化服务
    const service = new ScriptGenerationService(apiKey);
    
    // 生成剧本
    const script = await service.generateScript(pdfPath);
    
    // 输出结果
    console.log("\n" + "═".repeat(60));
    console.log("📜 GENERATED SCRIPT");
    console.log("═".repeat(60));
    console.log(JSON.stringify(script, null, 2));
    
    // 保存结果到文件
    const outputDir = "./output";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = path.join(outputDir, `script-${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(script, null, 2));
    
    console.log("\n" + "═".repeat(60));
    console.log(`💾 Script saved to: ${outputPath}`);
    console.log("═".repeat(60));
    
    // 打印摘要
    console.log("\n📊 Summary:");
    console.log(`   Title: ${script.title}`);
    console.log(`   Field: ${script.scientific_field}`);
    console.log(`   Scenes: ${script.scenes.length}`);
    console.log("\n🎉 Script generation complete!");
    
  } catch (error) {
    console.error("\n❌ Script generation failed:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.message.includes("model")) {
        console.log("\n💡 Tip: If the model is not available, try updating the model name in the service.");
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// 运行主函数
main();
