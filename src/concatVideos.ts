/**
 * Video Concatenation Script
 *
 * 将多个视频片段拼接成一个完整视频
 *
 * 使用方法:
 *   npm run concat <video1.mp4> <video2.mp4> ... <output.mp4>
 *
 * 示例:
 *   npm run concat ./output/videos/scene_4.mp4 ./output/videos/scene_6.mp4 ./output/final.mp4
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║          ScholarLens - Video Concatenation                ║");
  console.log("║                   Powered by FFmpeg                       ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log();

  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error("❌ Usage: npm run concat <video1.mp4> <video2.mp4> ... <output.mp4>");
    console.error("");
    console.error("Example:");
    console.error("  npm run concat ./output/videos/scene_4.mp4 ./output/videos/scene_6.mp4 ./output/final.mp4");
    process.exit(1);
  }

  // 最后一个参数是输出文件
  const outputPath = args[args.length - 1];
  const inputVideos = args.slice(0, -1);

  // 验证输入文件存在
  for (const video of inputVideos) {
    if (!fs.existsSync(video)) {
      console.error(`❌ Video not found: ${video}`);
      process.exit(1);
    }
  }

  console.log("📹 Input videos:");
  inputVideos.forEach((v, i) => console.log(`   ${i + 1}. ${v}`));
  console.log(`📦 Output: ${outputPath}`);
  console.log();

  try {
    // 创建临时文件列表
    const tempDir = "./output/temp";
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const listFile = path.join(tempDir, "concat_list.txt");
    const listContent = inputVideos.map((v) => `file '${path.resolve(v)}'`).join("\n");
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

    console.log();
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`✅ Video concatenation complete!`);
    console.log(`📦 Output saved: ${outputPath}`);

    // 获取文件大小
    const stats = fs.statSync(outputPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📊 File size: ${sizeMB} MB`);

  } catch (error) {
    console.error("❌ Concatenation failed:");
    console.error(error);
    process.exit(1);
  }
}

main();
