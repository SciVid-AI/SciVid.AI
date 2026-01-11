# 📂 Agent 开发文档: ScholarLens - 模块 2 (视觉锚点生成)

## 1. 角色与目标 (Role & Objective)

**角色：** 资深 TypeScript 后端工程师，精通 Google Vertex AI / Imagen 3 API 集成。
**目标：** 实现 `ImageGenerationService` 服务。该服务接收 Step 1 生成的剧本 JSON，为关键场景生成高清静态图作为视频生成的"视觉锚点"。

## 2. 技术栈与依赖 (Tech Stack)

* **运行时:** Node.js (v20+)
* **语言:** TypeScript (Strict Mode)
* **SDK:** `@google-cloud/vertexai` 或 REST API
* **工具库:** `dotenv`, `fs`, `path`

## 3. 核心需求 (Core Requirements)

### A. 输入 (Input)

接收 Step 1 的输出，包含：
```typescript
interface ScriptOutput {
  title: string;
  scientific_field: string;
  scenes: Scene[];
}

interface Scene {
  id: number;
  timestamp: string;
  voiceover: string;
  visual_description: string;
  key_scientific_concepts: string[];
  motion_intensity: "Low" | "Medium" | "High";
}
```

同时需要传入 `VideoStyle` 参数（与 Step 1 使用相同的风格）：
```typescript
type VideoStyle = "cinematic" | "academic" | "anime" | "minimalist";
```

### B. 处理逻辑 (Process Logic)

遍历 `scenes` 数组，执行以下策略：

| 条件 | 动作 |
|------|------|
| **第一个场景 (id === 1)** | ✅ 必须生成图片（建立视觉基调） |
| **motion_intensity === "Low"** | ✅ 生成图片（静态场景需要清晰锚点） |
| **motion_intensity === "Medium" / "High"** | ⏭️ 跳过生成，设为 `null`（动态场景让 Veo 自由发挥） |

### C. Prompt 组装规则

```typescript
const stylePromptMap: Record<VideoStyle, string> = {
  cinematic: "cinematic film style, dramatic lighting, high contrast, movie-like composition",
  academic: "scientific illustration, technical diagram style, clean and precise, Nature/Science journal quality",
  anime: "Pixar/Disney animation style, stylized 3D render, vibrant colors, expressive lighting",
  minimalist: "3Blue1Brown style, dark background, clean geometric shapes, mathematical visualization"
};

// 最终 Prompt 公式
const prompt = `${stylePromptMap[style]}, ${scene.visual_description}, 4k resolution, highly detailed, scientific accuracy`;
```

### D. API 配置

* **模型:** `imagen-3.0-generate-001`
* **图片尺寸:** 16:9 (1792x1024 或 1280x720)
* **数量:** 每次生成 1 张
* **随机种子:** 使用固定 `seed` 保持风格一致性

## 4. 必须遵守的约束 (Constraints)

### A. 一致性 (Consistency)
```typescript
const FIXED_SEED = 42; // 所有请求使用同一个 seed
```

### B. 负向提示词 (Negative Prompt)
```typescript
const NEGATIVE_PROMPT = "text, watermark, logo, cartoon, distorted anatomy, blurry, low quality, ugly, deformed";
```

### C. Mock 模式
```typescript
const MOCK_MODE = process.env.MOCK_MODE === "true";
// 开启时返回本地测试图，节省 API 费用
```

## 5. 输出 (Output)

返回扩展后的 JSON 对象，在每个 Scene 里增加：

```typescript
interface SceneWithImage extends Scene {
  // 原有字段...
  
  // 新增字段
  image_path: string | null;    // 例如: "./output/images/scene_1.png"
  image_base64: string | null;  // Base64 编码的图片数据
}

interface ScriptWithImages {
  title: string;
  scientific_field: string;
  style: VideoStyle;  // 记录使用的风格
  scenes: SceneWithImage[];
}
```

## 6. 文件结构建议

```
src/
├── services/
│   ├── ScriptGenerationService.ts  (已完成)
│   └── ImageGenerationService.ts   (本模块)
├── types/
│   └── script.ts  (需扩展)
└── index.ts
```

## 7. 样例输出参考

```json
{
  "title": "How Omicron Changed the Game",
  "scientific_field": "Virology & Immunology",
  "style": "cinematic",
  "scenes": [
    {
      "id": 1,
      "timestamp": "00-05s",
      "voiceover": "Ever wonder why Omicron felt so different?",
      "visual_description": "Cinematic macro shot of the Omicron SARS-CoV-2 viral particle...",
      "key_scientific_concepts": ["SARS-CoV-2 Omicron", "Spike Protein"],
      "motion_intensity": "Medium",
      "image_path": "./output/images/scene_1.png",
      "image_base64": "data:image/png;base64,iVBORw0KGgo..."
    },
    {
      "id": 2,
      "timestamp": "05-12s",
      "voiceover": "...",
      "visual_description": "...",
      "key_scientific_concepts": [...],
      "motion_intensity": "High",
      "image_path": null,
      "image_base64": null
    }
  ]
}
```