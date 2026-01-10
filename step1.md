# 📂 Agent 开发文档: ScholarLens - 模块 1 (剧本生成)

## 1. 角色与目标 (Role & Objective)

**角色：** 资深 TypeScript 后端工程师，精通 Google Vertex AI / Gemini API 集成。
**目标：** 实现 `ScriptGenerationService` 服务。该服务接收科研论文 (PDF) 作为输入，利用 **Gemini 3 Pro** 模型的 **推理能力 (Thinking Mode)**，生成一个结构化的、符合短视频传播逻辑的 JSON 剧本。

## 2. 技术栈与依赖 (Tech Stack)

* **运行时:** Node.js (v20+)
* **语言:** TypeScript (Strict Mode)
* **SDK:** `@google/generative-ai` (最新版)
* **工具库:** `dotenv` (环境变量), `fs` (文件系统)

## 3. 核心需求 (Core Requirements)

### A. 模型配置

* **模型名称:** `gemini-3-pro-preview` (如果不可用，回退至 `gemini-2.0-flash-thinking-exp`)。
* **思考配置 (Thinking Config):** 必须开启 `thinking_level: "high"` (或 SDK 对应的 `includeThoughts: true`)，以确保模型先对论文进行深度逻辑拆解。
* **输出格式:** 使用 `responseSchema` 强制返回严格的 JSON 格式。

### B. 输入/输出规范

* **输入:** 本地 PDF 文件路径 (例如: `./data/paper.pdf`)。
* **输出:** 符合下方定义的 `ScriptOutput` 接口的 JSON 对象。

### C. JSON Schema 定义 (关键)

模型返回的数据必须严格匹配以下 TypeScript 接口：

```typescript
interface Scene {
  id: number;
  timestamp: string; // 例如: "00-05s"
  voiceover: string; // 约束: 英语旁白，风格需口语化、快节奏。
  visual_description: string; // 给 Veo 3 用的详细英文画面提示词 (English Prompts work best for video models).
  key_scientific_concepts: string[]; // 例如: ["Spike Protein", "Membrane Fusion"]
  motion_intensity: "Low" | "Medium" | "High";
}

interface ScriptOutput {
  title: string; // 吸引英语标题
  scientific_field: string; // 所属领域
  scenes: Scene[];
}

```

## 4. 实现步骤 (Instructions for Agent)

### 步骤 1: 文件管理与上传

* 基于 `GoogleAIFileManager` 实现辅助函数 `uploadToGemini(filePath: string, mimeType: string)`。
* **关键逻辑：** 上传后必须轮询文件状态，直到状态变为 `ACTIVE` 才能进行下一步生成。

### 步骤 2: Schema 定义

* 将上述 TypeScript 接口转换为 Gemini API 可识别的 JSON Schema 对象，传递给 `generationConfig.responseSchema`。确保 `Scene` 数组的类型定义严格。

### 步骤 3: System Prompt 构建 (系统提示词)

* 构建一个强壮的 System Instruction，确立“科学传播导演”的人设。
* **核心指令：** “你是硬核科学与 TikTok 流量趋势之间的桥梁。”
* **约束清单：**
1. **旁白 (Voiceover):** 必须是**英语**，通俗易懂，杜绝学术黑话。
2. **视觉 (Visual):** 必须是**英文**描述 (为了适配 Veo 3)，使用电影运镜术语 (Zoom, Pan, Macro)，必须符合科学事实。
3. **思考 (Reasoning):** 生成前必须先进行深度推理，提炼核心逻辑。



### 步骤 4: 生成函数实现

* 创建主函数 `generateScript(pdfPath: string): Promise<ScriptOutput>`。
* 配置参数参考：
```typescript
generationConfig: {
  temperature: 0.7, // 保持适度创意
  responseMimeType: "application/json",
  responseSchema: scriptSchema,
  thinkingConfig: { thinkingLevel: "high" } // 伪代码，请根据实际 SDK 签名调整
}

```


* 包含完整的错误处理 (Try-Catch)。

## 5. 嵌入代码的具体 Prompt 逻辑

请在代码中使用如下逻辑作为 System Instruction：

> "分析上传的科研论文。你的任务是将其转化为一个 30 秒的 TikTok/Reels 风格短视频剧本。
> **思考过程 (Thinking Process):**
> 1. 识别论文的核心发现 (The 'Aha!' moment)。
> 2. 将微观机制可视化 (如：分子如何结合，细胞如何分裂)。
> 3. 将语言简化为大众能听懂的比喻。
> 
> 
> **输出约束 (Output Constraints):**
> * **Voiceover (旁白):** 使用英语。简短有力，不要用复杂的从句。
> * **Visual Description (画面):** 使用英文 (English)。详细描述光影、物理材质和运镜。
> * **Concepts:** 列出画面中必须出现的科学实体。"
> 
> 

## 6. 样例输出参考 (Example Output)

```json
{
  "title": "These Mushrooms Are Eating Your Plastic Bottles!",
  "scientific_field": "Environmental Science",
  "scenes": [
    {
      "id": 1,
      "timestamp": "00-05s",
      "voiceover": "You won't believe this! This mushroom is devouring plastic bottles for dinner!",
      "visual_description": "Cinematic macro shot of white mycelium tendrils rapidly growing over a crushed plastic water bottle. Dark moody lighting with bioluminescent highlights.",
      "key_scientific_concepts": ["Mycelium", "Polymer degradation"],
      "motion_intensity": "High"
    }
  ]
}

```