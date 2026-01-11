'use server';

/**
 * Server Actions for SciVid.AI Pipeline
 * 本地运行版本 - 每步保存 JSON，避免 body size 限制
 */

import { ScriptService } from '@/lib/api/ScriptService';
import { ImageService } from '@/lib/api/ImageService';
import { VideoService } from '@/lib/api/VideoService';
import { ConcatService } from '@/lib/api/ConcatService';
import type { ScriptOutput, ScriptWithImages, FinalOutput, VideoStyle } from '@/lib/api/types';
import * as fs from 'fs';
import * as path from 'path';

// 输出到 public 目录，前端可以通过 /output/xxx 访问
const OUTPUT_BASE = './public/output';

// 生成唯一的 session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Step 1: 生成剧本，保存为 JSON
 */
export async function generateScript(
  pdfBase64: string,
  fileName: string,
  style: VideoStyle
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }

    const sessionId = generateSessionId();
    const sessionDir = path.join(OUTPUT_BASE, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const scriptService = new ScriptService(apiKey);
    const script = await scriptService.generateScript(pdfBuffer, fileName, { style });

    // 保存为 JSON
    const scriptPath = path.join(sessionDir, 'script.json');
    fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));
    console.log(`✅ Script saved: ${scriptPath}`);

    return { success: true, sessionId };
  } catch (error) {
    console.error('Script generation failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Step 2: 读取 script.json，生成图片，保存为 scriptWithImages.json
 */
export async function generateImages(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }

    const sessionDir = path.join(OUTPUT_BASE, sessionId);
    const scriptPath = path.join(sessionDir, 'script.json');
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script not found: ${scriptPath}`);
    }

    const script: ScriptOutput = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
    
    const imageService = new ImageService({
      apiKey,
      outputDir: path.join(sessionDir, 'images'),
    });
    const scriptWithImages = await imageService.generateImages(script, script.style as VideoStyle);

    // 保存为 JSON
    const scriptWithImagesPath = path.join(sessionDir, 'scriptWithImages.json');
    fs.writeFileSync(scriptWithImagesPath, JSON.stringify(scriptWithImages, null, 2));
    console.log(`✅ ScriptWithImages saved: ${scriptWithImagesPath}`);

    return { success: true };
  } catch (error) {
    console.error('Image generation failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Step 3: 读取 scriptWithImages.json，生成视频，保存为 finalOutput.json
 */
export async function generateVideos(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }

    const sessionDir = path.join(OUTPUT_BASE, sessionId);
    const scriptWithImagesPath = path.join(sessionDir, 'scriptWithImages.json');
    
    if (!fs.existsSync(scriptWithImagesPath)) {
      throw new Error(`ScriptWithImages not found: ${scriptWithImagesPath}`);
    }

    const scriptWithImages: ScriptWithImages = JSON.parse(fs.readFileSync(scriptWithImagesPath, 'utf-8'));
    
    const videoService = new VideoService({
      apiKey,
      outputDir: path.join(sessionDir, 'videos'),
      pollInterval: 10000,
    });
    const finalOutput = await videoService.generateVideos(scriptWithImages);

    // 保存为 JSON
    const finalOutputPath = path.join(sessionDir, 'finalOutput.json');
    fs.writeFileSync(finalOutputPath, JSON.stringify(finalOutput, null, 2));
    console.log(`✅ FinalOutput saved: ${finalOutputPath}`);

    return { success: true };
  } catch (error) {
    console.error('Video generation failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Step 4: 读取 finalOutput.json，拼接视频
 */
export async function concatVideos(
  sessionId: string
): Promise<{ success: boolean; data?: { outputPath: string; duration: string; fileSize: string }; error?: string }> {
  try {
    const sessionDir = path.join(OUTPUT_BASE, sessionId);
    const finalOutputPath = path.join(sessionDir, 'finalOutput.json');
    
    if (!fs.existsSync(finalOutputPath)) {
      throw new Error(`FinalOutput not found: ${finalOutputPath}`);
    }

    const finalOutput: FinalOutput = JSON.parse(fs.readFileSync(finalOutputPath, 'utf-8'));
    
    const concatService = new ConcatService(sessionDir);
    const result = await concatService.concatFromFinalOutput(finalOutput);

    return { success: true, data: result };
  } catch (error) {
    console.error('Video concatenation failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * 获取最终结果数据（用于前端显示）
 */
export async function getResult(
  sessionId: string
): Promise<{ success: boolean; data?: FinalOutput; sessionPath?: string; error?: string }> {
  try {
    const sessionDir = path.join(OUTPUT_BASE, sessionId);
    const finalOutputPath = path.join(sessionDir, 'finalOutput.json');
    
    if (!fs.existsSync(finalOutputPath)) {
      throw new Error(`FinalOutput not found for session: ${sessionId}`);
    }

    const finalOutput: FinalOutput = JSON.parse(fs.readFileSync(finalOutputPath, 'utf-8'));
    
    // 转换路径为前端可访问的 URL
    const sessionPath = `/output/${sessionId}`;
    
    return { 
      success: true, 
      data: finalOutput,
      sessionPath 
    };
  } catch (error) {
    console.error('Get result failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * 获取 API Key 状态
 */
export async function checkApiKeyStatus(): Promise<boolean> {
  return !!process.env.GOOGLE_API_KEY;
}
