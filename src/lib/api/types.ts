/**
 * Video Style Types - 视频风格类型
 */
export type VideoStyle = 
  | "cinematic"      // 电影风格：史诗感、电影运镜、戏剧性光影
  | "academic"       // 硬核科研风格：学术派、数据可视化、专业严谨
  | "anime"          // 美式动漫风格：Pixar/Spider-Verse/Arcane 风格
  | "minimalist";    // 极简风格：3Blue1Brown 式数学可视化

/**
 * 风格配置
 */
export interface StyleConfig {
  style: VideoStyle;
}

/**
 * 单个场景定义
 */
export interface Scene {
  id: number;
  voiceover: string;
  visual_description: string;
  key_scientific_concepts: string[];
  motion_intensity: "Low" | "Medium" | "High";
}

/**
 * Step 1 输出：剧本
 */
export interface ScriptOutput {
  title: string;
  scientific_field: string;
  style: VideoStyle;
  scenes: Scene[];
}

/**
 * Step 2 输出：带图片的场景
 */
export interface SceneWithImage extends Scene {
  image_path: string | null;
  image_base64: string | null;
}

export interface ScriptWithImages {
  title: string;
  scientific_field: string;
  style: VideoStyle;
  scenes: SceneWithImage[];
}

/**
 * Step 3 输出：带视频的场景
 */
export interface SceneWithVideo extends SceneWithImage {
  video_path: string;
  video_uri: string;
}

/**
 * 视频分组信息
 */
export interface VideoGroupInfo {
  videoIndex: number;
  startSceneId: number;
  endSceneId: number;    // 用于视频命名 (video_{endSceneId}.mp4)
  sceneIds: number[];
  videoPath?: string;
}

export interface FinalOutput {
  title: string;
  scientific_field: string;
  style: VideoStyle;
  scenes: SceneWithVideo[];
  /** 视频分组信息 */
  videoGroups?: VideoGroupInfo[];
  /** 所有视频文件路径（按顺序） */
  videoPaths?: string[];
}

/**
 * Pipeline 进度回调
 */
export interface PipelineProgress {
  step: 'script' | 'images' | 'videos' | 'concat';
  message: string;
  progress: number; // 0-100
  detail?: string;
}

export type ProgressCallback = (progress: PipelineProgress) => void;

/**
 * Pipeline 配置
 */
export interface PipelineConfig {
  apiKey: string;
  style: VideoStyle;
  onProgress?: ProgressCallback;
}

/**
 * Pipeline 结果
 */
export interface PipelineResult {
  success: boolean;
  script?: ScriptOutput;
  scriptWithImages?: ScriptWithImages;
  finalOutput?: FinalOutput;
  error?: string;
}
