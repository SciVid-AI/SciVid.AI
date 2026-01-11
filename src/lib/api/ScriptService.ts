/**
 * ScriptService - Step 1: PDF → Script
 * 
 * 使用 Gemini 将 PDF 论文转换为视频剧本
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { ScriptOutput, StyleConfig, VideoStyle } from "./types";
import { STYLE_DESCRIPTIONS } from "./constants";
import { ScriptOutputSchema } from "./schema";

export class ScriptService {
  private genAI: GoogleGenerativeAI;
  private fileManager: GoogleAIFileManager;
  private modelName: string;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.fileManager = new GoogleAIFileManager(apiKey);
    this.modelName = "gemini-3-pro-preview";
  }

  /**
   * 上传文件到 Gemini 并等待处理完成
   */
  private async uploadToGemini(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<string> {
    console.log(`📤 Uploading file: ${fileName}`);

    // 创建临时文件用于上传
    const tempPath = `/tmp/${fileName}`;
    const fs = await import('fs');
    fs.writeFileSync(tempPath, fileBuffer);

    const uploadResult = await this.fileManager.uploadFile(tempPath, {
      mimeType,
      displayName: fileName,
    });

    // 清理临时文件
    fs.unlinkSync(tempPath);

    const uploadedFileName = uploadResult.file.name;
    console.log(`📁 File uploaded: ${uploadedFileName}`);

    // 轮询等待文件状态变为 ACTIVE
    let file = await this.fileManager.getFile(uploadedFileName);
    let attempts = 0;
    const maxAttempts = 30;

    while (file.state === FileState.PROCESSING) {
      if (attempts >= maxAttempts) {
        throw new Error("File processing timeout");
      }
      
      console.log(`⏳ Waiting for file processing... (${attempts + 1}/${maxAttempts})`);
      await this.sleep(2000);
      file = await this.fileManager.getFile(uploadedFileName);
      attempts++;
    }

    if (file.state === FileState.FAILED) {
      throw new Error(`File processing failed: ${file.name}`);
    }

    console.log(`✅ File ready: ${file.uri}`);
    return file.uri;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 构建系统提示词
   */
  private buildSystemInstruction(styleConfig: StyleConfig): string {
    const styleGuide = STYLE_DESCRIPTIONS[styleConfig.style];

    return `You are a world-class science communicator and viral video director. Your mission is to bridge the gap between cutting-edge scientific research and TikTok-style viral content.

## Your Task
Analyze the uploaded scientific paper and transform it into a TikTok/Reels-style video script.

## Thinking Process (You MUST follow these steps internally)
1. **Identify the Core Discovery**: Find the paper's "Aha!" moment - what makes this research exciting and newsworthy?
2. **Visualize the Mechanism**: How can microscopic processes (molecules binding, cells dividing, reactions occurring) be shown in the specified visual style?
3. **Simplify with Metaphors**: Translate jargon into everyday language that anyone can understand.

## Visual Style Guide (CRITICAL - Follow This Exactly)
${styleGuide}

## Output Constraints (STRICT)

### Voiceover Rules:
- **Language**: English ONLY
- **Style**: Conversational, punchy, energetic
- **Structure**: Short sentences. No complex clauses. Use rhetorical questions to hook viewers.
- **Length**: Voiceover should be 0.5-1 second SHORTER than the video duration (leave visual breathing room at the end)
- **Word count**: Word count should be 15-20 words per scene
- **NO academic jargon** - if a term is necessary, immediately explain it
- **SYNC with visuals**: The voiceover MUST describe exactly what's happening on screen at that moment

### Visual Description Rules:
- **Language**: English ONLY (required for Veo 3 video generation)
- **Format**: MUST follow the "${styleConfig.style}" style guide above with specific details about:
  - Camera movements appropriate to the style
  - Lighting that matches the aesthetic
  - Materials and textures consistent with the style
  - Color palette that fits the chosen style
- **Scientific Accuracy**: Visuals MUST be scientifically accurate - no artistic liberties that misrepresent the science
- **Style Consistency**: Every scene MUST maintain the same visual style throughout
- **SYNC with voiceover**: Visual description MUST match the voiceover content exactly. If voiceover says "the virus attaches", the visual MUST show attachment.

### Scene Structure:
- Generate **exactly 9-10 scenes** (NO MORE than 10 scenes)
- More scenes = smoother transitions, less content per scene
- Structure guideline from hook (most surprising finding), to build understanding step-by-step, to impact, significance, future implications

### Key Scientific Concepts:
- List the actual scientific entities that should appear in each visual
- These will be used to ensure visual accuracy

Remember: You're not dumbing down science - you're making it ACCESSIBLE and EXCITING in the ${styleConfig.style} style!`;
  }

  /**
   * 主生成函数：将 PDF 论文转化为剧本
   */
  async generateScript(
    pdfBuffer: Buffer,
    fileName: string,
    styleConfig: StyleConfig = { style: "cinematic" }
  ): Promise<ScriptOutput> {
    try {
      console.log("🎬 Starting script generation...");
      console.log(`📄 Processing: ${fileName}`);
      console.log(`🎨 Style: ${styleConfig.style}`);

      // Step 1: 上传 PDF 文件
      const fileUri = await this.uploadToGemini(pdfBuffer, fileName, "application/pdf");

      // Step 2: 配置模型
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: this.buildSystemInstruction(styleConfig),
      });

      // Step 3: 配置生成参数
      const generationConfig = {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: ScriptOutputSchema,
      };

      console.log("🧠 Generating script with AI reasoning...");

      // Step 4: 发送请求
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                fileData: {
                  mimeType: "application/pdf",
                  fileUri: fileUri,
                },
              },
              {
                text: "Analyze this scientific paper and generate a viral video script following the exact JSON schema provided. Make it engaging, accurate, and visually stunning.",
              },
            ],
          },
        ],
        generationConfig,
      });

      const response = result.response;
      const text = response.text();

      console.log("✨ Script generated successfully!");

      // Step 5: 解析并返回结果
      const scriptOutput: ScriptOutput = {
        ...JSON.parse(text),
        style: styleConfig.style,
      };
      
      // 验证输出结构
      this.validateOutput(scriptOutput);
      
      return scriptOutput;
    } catch (error) {
      console.error("❌ Error generating script:", error);
      throw error;
    }
  }

  /**
   * 验证输出结构是否符合预期
   */
  private validateOutput(output: ScriptOutput): void {
    if (!output.title || typeof output.title !== "string") {
      throw new Error("Invalid output: missing or invalid title");
    }
    if (!output.scientific_field || typeof output.scientific_field !== "string") {
      throw new Error("Invalid output: missing or invalid scientific_field");
    }
    if (!Array.isArray(output.scenes) || output.scenes.length === 0) {
      throw new Error("Invalid output: missing or empty scenes array");
    }

    for (const scene of output.scenes) {
      if (typeof scene.id !== "number") {
        throw new Error(`Invalid scene: missing or invalid id`);
      }
      if (!scene.voiceover || !scene.visual_description) {
        throw new Error(`Invalid scene ${scene.id}: missing required fields`);
      }
      if (!["Low", "Medium", "High"].includes(scene.motion_intensity)) {
        throw new Error(`Invalid scene ${scene.id}: invalid motion_intensity`);
      }
    }

    console.log(`✅ Output validation passed: ${output.scenes.length} scenes generated`);
  }
}
