import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import * as fs from "fs";
import * as path from "path";
import { ScriptOutput, ScriptOutputSchema } from "../types/script.js";

/**
 * ScriptGenerationService
 * 
 * 将科研论文 PDF 转化为 30 秒 TikTok/Reels 风格短视频剧本
 */
export class ScriptGenerationService {
  private genAI: GoogleGenerativeAI;
  private fileManager: GoogleAIFileManager;
  private modelName: string;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.fileManager = new GoogleAIFileManager(apiKey);
    // 使用最新的 gemini-3-pro，如果不可用则回退至 gemini-2.0-flash-thinking-exp
    this.modelName = "gemini-3-pro-preview";
  }

  /**
   * 上传文件到 Gemini 并等待处理完成
   * @param filePath 本地文件路径
   * @param mimeType 文件 MIME 类型
   * @returns 上传后的文件 URI
   */
  private async uploadToGemini(
    filePath: string,
    mimeType: string
  ): Promise<string> {
    const absolutePath = path.resolve(filePath);
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    console.log(`📤 Uploading file: ${absolutePath}`);

    const uploadResult = await this.fileManager.uploadFile(absolutePath, {
      mimeType,
      displayName: path.basename(absolutePath),
    });

    const fileName = uploadResult.file.name;
    console.log(`📁 File uploaded: ${fileName}`);

    // 轮询等待文件状态变为 ACTIVE
    let file = await this.fileManager.getFile(fileName);
    let attempts = 0;
    const maxAttempts = 30;

    while (file.state === FileState.PROCESSING) {
      if (attempts >= maxAttempts) {
        throw new Error("File processing timeout");
      }
      
      console.log(`⏳ Waiting for file processing... (${attempts + 1}/${maxAttempts})`);
      await this.sleep(2000);
      file = await this.fileManager.getFile(fileName);
      attempts++;
    }

    if (file.state === FileState.FAILED) {
      throw new Error(`File processing failed: ${file.name}`);
    }

    console.log(`✅ File ready: ${file.uri}`);
    return file.uri;
  }

  /**
   * 辅助函数：等待指定毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 构建系统提示词
   */
  private buildSystemInstruction(): string {
    return `You are a world-class science communicator and viral video director. Your mission is to bridge the gap between cutting-edge scientific research and TikTok-style viral content.

## Your Task
Analyze the uploaded scientific paper and transform it into a 30-second TikTok/Reels-style video script.

## Thinking Process (You MUST follow these steps internally)
1. **Identify the Core Discovery**: Find the paper's "Aha!" moment - what makes this research exciting and newsworthy?
2. **Visualize the Mechanism**: How can microscopic processes (molecules binding, cells dividing, reactions occurring) be shown cinematically?
3. **Simplify with Metaphors**: Translate jargon into everyday language that anyone can understand.

## Output Constraints (STRICT)

### Voiceover Rules:
- **Language**: English ONLY
- **Style**: Conversational, punchy, energetic
- **Structure**: Short sentences. No complex clauses. Use rhetorical questions to hook viewers.
- **Length**: Each scene's voiceover should be 5-7 seconds when spoken aloud
- **NO academic jargon** - if a term is necessary, immediately explain it

### Visual Description Rules:
- **Language**: English ONLY (required for Veo 3 video generation)
- **Format**: Cinematic prompt style with specific details about:
  - Camera movements (Zoom, Pan, Dolly, Macro shot, Aerial view)
  - Lighting (Dramatic shadows, Soft diffused light, Bioluminescent glow)
  - Materials and textures (Glossy, Matte, Translucent, Metallic)
  - Color palette (specify dominant colors)
- **Scientific Accuracy**: Visuals MUST be scientifically accurate - no artistic liberties that misrepresent the science

### Scene Structure:
- Generate 5-6 scenes that together form a 30-second video
- Each scene should be 4-6 seconds
- Scene 1: Hook (grab attention immediately)
- Scenes 2-4: Build understanding of the mechanism
- Scene 5-6: Reveal the impact/significance

### Key Scientific Concepts:
- List the actual scientific entities that should appear in each visual
- These will be used to ensure visual accuracy

Remember: You're not dumbing down science - you're making it ACCESSIBLE and EXCITING!`;
  }

  /**
   * 主生成函数：将 PDF 论文转化为剧本
   * @param pdfPath PDF 文件路径
   * @returns 结构化的剧本输出
   */
  async generateScript(pdfPath: string): Promise<ScriptOutput> {
    try {
      console.log("🎬 Starting script generation...");
      console.log(`📄 Processing: ${pdfPath}`);

      // Step 1: 上传 PDF 文件
      const fileUri = await this.uploadToGemini(pdfPath, "application/pdf");

      // Step 2: 配置模型
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: this.buildSystemInstruction(),
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
                text: "Analyze this scientific paper and generate a 30-second viral video script following the exact JSON schema provided. Make it engaging, accurate, and visually stunning.",
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
      const scriptOutput: ScriptOutput = JSON.parse(text);
      
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
      if (!scene.timestamp || !scene.voiceover || !scene.visual_description) {
        throw new Error(`Invalid scene ${scene.id}: missing required fields`);
      }
      if (!["Low", "Medium", "High"].includes(scene.motion_intensity)) {
        throw new Error(`Invalid scene ${scene.id}: invalid motion_intensity`);
      }
    }

    console.log(`✅ Output validation passed: ${output.scenes.length} scenes generated`);
  }
}
