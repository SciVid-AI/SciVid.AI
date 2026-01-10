/**
 * 单个场景/分镜的定义
 */
export interface Scene {
  /** 场景序号 */
  id: number;
  /** 时间戳，例如: "00-05s" */
  timestamp: string;
  /** 英语旁白，风格需口语化、快节奏 */
  voiceover: string;
  /** 给 Veo 3 用的详细英文画面提示词 */
  visual_description: string;
  /** 关键科学概念，例如: ["Spike Protein", "Membrane Fusion"] */
  key_scientific_concepts: string[];
  /** 运动强度 */
  motion_intensity: "Low" | "Medium" | "High";
}

/**
 * 完整剧本输出结构
 */
export interface ScriptOutput {
  /** 吸引人的英语标题 */
  title: string;
  /** 所属科学领域 */
  scientific_field: string;
  /** 场景列表 */
  scenes: Scene[];
}

/**
 * Gemini API 的 JSON Schema 定义
 * 用于 responseSchema 配置
 */
export const ScriptOutputSchema = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "An engaging English title for the video"
    },
    scientific_field: {
      type: "string",
      description: "The scientific field this paper belongs to"
    },
    scenes: {
      type: "array",
      description: "Array of video scenes/shots",
      items: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "Scene sequence number"
          },
          timestamp: {
            type: "string",
            description: "Timestamp range, e.g., '00-05s'"
          },
          voiceover: {
            type: "string",
            description: "English voiceover script, conversational and punchy"
          },
          visual_description: {
            type: "string",
            description: "Detailed English visual prompt for Veo 3 video generation"
          },
          key_scientific_concepts: {
            type: "array",
            items: { type: "string" },
            description: "Key scientific entities that must appear in the visual"
          },
          motion_intensity: {
            type: "string",
            enum: ["Low", "Medium", "High"],
            description: "The intensity of motion in this scene"
          }
        },
        required: [
          "id",
          "timestamp",
          "voiceover",
          "visual_description",
          "key_scientific_concepts",
          "motion_intensity"
        ]
      }
    }
  },
  required: ["title", "scientific_field", "scenes"]
} as const;
