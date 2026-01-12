import { SchemaType, Schema } from "@google/generative-ai";

/**
 * Gemini API 的 JSON Schema 定义
 * 用于 responseSchema 配置
 */
export const ScriptOutputSchema: Schema = {
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
            format: "enum",
            enum: ["Low", "Medium", "High"],
            description: "The intensity of motion in this scene"
          }
        },
        required: [
          "id",
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
