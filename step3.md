# 📂 Agent 开发文档: ScholarLens - 模块 3 (视频生成)

## 1. 角色与目标 (Role & Objective)

**角色：** 资深 TypeScript 后端工程师，精通 Google Veo API 和视频处理。
**目标：** 实现 `VideoGenerationService` 服务。该服务接收 Step 2 的输出（带图片的剧本 JSON），利用 **Veo 3** 模型生成连续的视频片段，并支持视频扩展 (Extend Video)。

## 2. 技术栈与依赖 (Tech Stack)

* **运行时:** Node.js (v20+)
* **语言:** TypeScript (Strict Mode)
* **SDK:** `@google/genai` (与 Step 2 相同)
* **视频处理:** `fluent-ffmpeg` (提取视频最后一帧)
* **系统依赖:** `ffmpeg` (需要预装: `brew install ffmpeg`)

## 3. 核心需求 (Core Requirements)

### A. 输入 (Input)

接收 Step 2 的输出 `ScriptWithImages`：
```typescript
interface SceneWithImage {
  id: number;
  timestamp: string;
  voiceover: string;
  visual_description: string;
  key_scientific_concepts: string[];
  motion_intensity: "Low" | "Medium" | "High";
  image_path: string | null;      // 锚点图路径
  image_base64: string | null;    // 锚点图 Base64
}
```

### B. Step 2 → Step 3 协同逻辑 (基于 motion_intensity)

Step 2 (ImageGenerationService) 已根据 `motion_intensity` 决定是否生成锚点图：

```typescript
// Step 2 的判断逻辑
shouldGenerateImage(scene, isFirstScene) {
  if (isFirstScene) return true;           // 第一个场景必须有锚点
  if (scene.motion_intensity === "Low") return true;  // 低运动 → 生成锚点
  return false;                            // Medium/High → 跳过
}
```

**设计理念：**

| motion_intensity | Step 2 行为 | Step 3 行为 | 原因 |
|------------------|-------------|-------------|------|
| **Low** | ✅ 生成锚点图 | `FRAMES_TO_VIDEO` | 画面静止/特写，需要精确控制 |
| **Medium** | ⏭️ 跳过 | `EXTEND_VIDEO` | 动作在进行中，延续更自然 |
| **High** | ⏭️ 跳过 | `EXTEND_VIDEO` | 快速动作，保持连贯性 |

### C. 生成模式 (Generation Modes)

Veo API 支持的两种模式：

| 模式 | 说明 | 触发条件 |
|------|------|---------|
| **FRAMES_TO_VIDEO** | 从图片生成视频 | `image_base64 !== null` |
| **EXTEND_VIDEO** | 扩展已有视频 | `image_base64 === null` |

### D. 核心逻辑：视觉接力 (Visual Relay)

**必须串行执行**（一个个生成），因为下一个镜头的输入依赖上一个镜头。

| 条件 | 生成模式 | 输入 | 说明 |
|------|---------|------|------|
| `image_base64 !== null` | FRAMES_TO_VIDEO | 锚点图 | 有定妆照，用它"重置"画面 |
| `image_base64 === null` | EXTEND_VIDEO | 上一段视频对象 | 动作延续，扩展上一段视频 |
| 第一个场景且无锚点图 | 报错 | - | 第一个场景必须有锚点图 |

### E. Veo API 调用方式

使用 `@google/genai` SDK（与 Step 2 相同的 API Key）：

```typescript
import { GoogleGenAI, Video } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

/**
 * 模式 1: FRAMES_TO_VIDEO (从图片生成视频)
 */
async function generateFromImage(
  prompt: string,
  imageBase64: string,
  mimeType: string = "image/png"
) {
  let operation = await ai.models.generateVideos({
    model: "veo-3.1-generate-preview",
    prompt: prompt,
    image: {
      imageBytes: imageBase64,
      mimeType: mimeType,
    },
    config: {
      numberOfVideos: 1,
      aspectRatio: "16:9",
    },
  });

  // 轮询等待完成
  while (!operation.done) {
    console.log("Waiting for video generation...");
    await new Promise((resolve) => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  return operation.response.generatedVideos[0].video;
}

/**
 * 模式 2: EXTEND_VIDEO (扩展已有视频)
 */
async function extendVideo(
  prompt: string,
  inputVideoObject: Video
) {
  let operation = await ai.models.generateVideos({
    model: "veo-3.1-generate-preview",
    prompt: prompt,
    video: inputVideoObject,  // 传入上一段视频对象
    config: {
      numberOfVideos: 1,
      // 注意: EXTEND_VIDEO 模式不需要 aspectRatio
    },
  });

  // 轮询等待完成
  while (!operation.done) {
    console.log("Waiting for video extension...");
    await new Promise((resolve) => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  return operation.response.generatedVideos[0].video;
}

/**
 * 下载视频文件
 */
async function downloadVideo(videoUri: string, outputPath: string) {
  const url = decodeURIComponent(videoUri);
  const res = await fetch(`${url}&key=${process.env.GOOGLE_API_KEY}`);
  
  if (!res.ok) {
    throw new Error(`Failed to fetch video: ${res.status}`);
  }
  
  const videoBlob = await res.blob();
  const buffer = Buffer.from(await videoBlob.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}
```

### F. 提取最后一帧 (备用方案)

如果 EXTEND_VIDEO 不可用，可以使用 `fluent-ffmpeg` 提取最后一帧作为下一段的起始帧：

```typescript
import ffmpeg from "fluent-ffmpeg";

async function extractLastFrame(videoPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput("-0.1")  // 跳到最后
      .frames(1)
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .run();
  });
}
```

## 4. 处理流程 (Pipeline)

以一个典型的 5 场景剧本为例：

```
┌─────────────────────────────────────────────────────────────────┐
│  Scene 1: motion=Low, image_base64 ✓                             │
│  └─→ FRAMES_TO_VIDEO(锚点图) → video_1.mp4 → 保存 Video 对象    │
├─────────────────────────────────────────────────────────────────┤
│  Scene 2: motion=High, image_base64 = null                       │
│  └─→ EXTEND_VIDEO(Scene 1 的 Video) → video_2.mp4               │
├─────────────────────────────────────────────────────────────────┤
│  Scene 3: motion=Medium, image_base64 = null                     │
│  └─→ EXTEND_VIDEO(Scene 2 的 Video) → video_3.mp4               │
├─────────────────────────────────────────────────────────────────┤
│  Scene 4: motion=Low, image_base64 ✓                             │
│  └─→ FRAMES_TO_VIDEO(新锚点图) → video_4.mp4 → "视觉重置"       │
├─────────────────────────────────────────────────────────────────┤
│  Scene 5: motion=High, image_base64 = null                       │
│  └─→ EXTEND_VIDEO(Scene 4 的 Video) → video_5.mp4               │
└─────────────────────────────────────────────────────────────────┘
```

**关键点：**

1. **保存视频对象**：每次生成后保存 `Video` 对象，供下一次 `EXTEND_VIDEO` 使用
2. **视觉重置**：当遇到新的锚点图时，开启新的视觉序列
3. **连续扩展**：Medium/High motion 场景会链式扩展，保持动作连贯

## 5. 输出 (Output)

返回扩展后的 JSON 对象，在每个 Scene 里增加：

```typescript
interface SceneWithVideo extends SceneWithImage {
  // 继承所有 Step 2 字段...
  
  // 新增字段
  video_path: string;   // 例如: "./output/videos/scene_1.mp4"
  video_uri: string;    // Veo 返回的视频 URI (用于后续扩展)
}

interface FinalOutput {
  title: string;
  scientific_field: string;
  style: VideoStyle;
  scenes: SceneWithVideo[];
}
```

## 6. 文件结构建议

```
src/
├── services/
│   ├── ScriptGenerationService.ts  (Step 1)
│   ├── ImageGenerationService.ts   (Step 2)
│   └── VideoGenerationService.ts   (Step 3 - 本模块)
├── types/
│   └── script.ts  (需扩展)
└── generateVideos.ts  (Step 3 入口)
```

## 7. 注意事项

1. **串行执行**：视频必须一个一个生成，不能并行
2. **轮询间隔**：Veo 生成视频需要时间，建议 10 秒轮询一次
3. **保存视频对象**：每次生成后保存 `Video` 对象，供 EXTEND_VIDEO 使用
4. **EXTEND_VIDEO 不需要 aspectRatio**：扩展模式会自动继承原视频的宽高比
5. **下载视频需要 API Key**：fetch 视频 URL 时需要带上 `&key=API_KEY`
6. **ffmpeg 作为备用**：如果 EXTEND_VIDEO 不可用，可以提取最后一帧用 FRAMES_TO_VIDEO