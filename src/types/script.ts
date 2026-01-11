/**
 * 视频风格类型
 */
export type VideoStyle = 
  | "cinematic"      // 电影风格：史诗感、电影运镜、戏剧性光影
  | "academic"       // 硬核科研风格：学术派、数据可视化、专业严谨
  | "anime"          // 美式动漫风格：Pixar/Spider-Verse/Arcane 风格
  | "minimalist";    // 极简风格：3Blue1Brown 式数学可视化、几何动画

/**
 * 视频风格配置
 */
export interface StyleConfig {
  style: VideoStyle;
}

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
 * 完整剧本输出结构 (Step 1 输出)
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
 * 带图片的场景 (Step 2 输出)
 */
export interface SceneWithImage extends Scene {
  /** 本地图片路径，null 表示跳过生成 */
  image_path: string | null;
  /** Base64 编码的图片数据，null 表示跳过生成 */
  image_base64: string | null;
}

/**
 * 带图片的完整剧本 (Step 2 输出)
 */
export interface ScriptWithImages {
  /** 吸引人的英语标题 */
  title: string;
  /** 所属科学领域 */
  scientific_field: string;
  /** 使用的视频风格 */
  style: VideoStyle;
  /** 带图片的场景列表 */
  scenes: SceneWithImage[];
}

import { SchemaType } from "@google/generative-ai";

/**
 * Gemini API 的 JSON Schema 定义
 * 用于 responseSchema 配置
 */
export const ScriptOutputSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: "An engaging English title for the video"
    },
    scientific_field: {
      type: SchemaType.STRING,
      description: "The scientific field this paper belongs to"
    },
    scenes: {
      type: SchemaType.ARRAY,
      description: "Array of video scenes/shots",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: {
            type: SchemaType.NUMBER,
            description: "Scene sequence number"
          },
          timestamp: {
            type: SchemaType.STRING,
            description: "Timestamp range, e.g., '00-05s'"
          },
          voiceover: {
            type: SchemaType.STRING,
            description: "English voiceover script, conversational and punchy"
          },
          visual_description: {
            type: SchemaType.STRING,
            description: "Detailed English visual prompt for Veo 3 video generation"
          },
          key_scientific_concepts: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Key scientific entities that must appear in the visual"
          },
          motion_intensity: {
            type: SchemaType.STRING,
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
};
