import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import * as fs from "fs";
import * as path from "path";
import { ScriptOutput, ScriptOutputSchema, VideoStyle, StyleConfig } from "../types/script.js";

/**
 * ScriptGenerationService
 * 
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
   * 风格描述映射
   */
  private readonly styleDescriptions: Record<VideoStyle, string> = {
    cinematic: `**Cinematic Style**: Epic, movie-like visuals with dramatic camera movements.
  - Camera: Sweeping dolly shots, dramatic zooms, slow-motion reveals
  - Lighting: High contrast, volumetric rays, dramatic shadows
  - Textures: Hyper-realistic materials, glossy surfaces, metallic reflections
  - Color: Deep blacks, rich highlights, color grading like Hollywood films`,

    academic: `**Academic/Hardcore Research Style**: Professional scientific visualization with rigorous accuracy.
  - Camera: Steady, methodical movements, focus on data and diagrams, smooth transitions between figures
  - Lighting: Clean, clinical, laboratory-style lighting, even illumination for clarity
  - Textures: Technical diagrams, molecular structures rendered accurately, electron microscopy aesthetics
  - Color: Scientific publication color schemes (Nature/Science/Cell style), precise data visualization palettes
  - Elements: Include proper scientific labels, scale bars, statistical annotations, pathway diagrams
  - Typography: Clean sans-serif fonts, proper scientific notation, Greek symbols where appropriate
  - Tone: Authoritative, precise, peer-review quality visuals that could appear in a journal figure`,

    anime: `**American Animation Style**: Western cartoon aesthetic inspired by Pixar, Disney, and modern streaming animations (Arcane, Spider-Verse).
  - Camera: Dynamic 3D camera movements, dramatic depth of field, cinematic angles like Into the Spider-Verse
  - Lighting: Stylized volumetric lighting, expressive shadows, rim lights for character pop
  - Textures: Painterly brushstroke overlays, subtle cel-shading, mixed-media effects
  - Color: Bold saturated palettes, complementary color contrasts, expressive color grading
  - Characters: Expressive faces, exaggerated proportions, fluid squash-and-stretch motion
  - Effects: Particle effects, motion blur, comic-book style impact frames`,

    minimalist: `**Minimalist Style (3Blue1Brown-inspired)**: Clean, math-first visuals that build intuition step-by-step.
  - Camera: Smooth, purposeful movements that guide attention; elegant transitions between concepts
  - Visuals: Simple geometric shapes, vectors, graphs, and diagrams; NO clutter or decoration
  - Animation: Fluid, continuous morphing; objects transform and connect logically; motion reveals relationships
  - Color: Dark background (deep blue/black) with vibrant accent colors (blue, yellow, pink, green) for different elements
  - Typography: Clean mathematical notation, equations that animate and transform
  - Approach: Visual metaphors that make abstract concepts tangible; each frame serves a pedagogical purpose
  - Pacing: Let animations breathe—show one idea at a time, build complexity gradually`
  };

  /**
   * 构建系统提示词
   * @param styleConfig 视频风格配置
   */
  private buildSystemInstruction(styleConfig: StyleConfig): string {
    const styleGuide = this.styleDescriptions[styleConfig.style];

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
- Generate **10-15 scenes** to ensure smooth pacing and transitions
- More scenes = smoother transitions, less content per scene
- Structure guideline:
  - Scene 1-2: Hook (most surprising finding)
  - Scene 3-10: Build understanding step-by-step
  - Scene 11-15: Impact, significance, future implications

### Key Scientific Concepts:
- List the actual scientific entities that should appear in each visual
- These will be used to ensure visual accuracy

Remember: You're not dumbing down science - you're making it ACCESSIBLE and EXCITING in the ${styleConfig.style} style!`;
  }

  /**
   * 主生成函数：将 PDF 论文转化为剧本
   * @param pdfPath PDF 文件路径
   * @param styleConfig 视频风格配置（默认为 cinematic）
   * @returns 结构化的剧本输出
   */
  async generateScript(
    pdfPath: string,
    styleConfig: StyleConfig = { style: "cinematic" }
  ): Promise<ScriptOutput> {
    try {
      console.log("🎬 Starting script generation...");
      console.log(`📄 Processing: ${pdfPath}`);
      console.log(`🎨 Style: ${styleConfig.style}`);

      // Step 1: 上传 PDF 文件
      const fileUri = await this.uploadToGemini(pdfPath, "application/pdf");

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
