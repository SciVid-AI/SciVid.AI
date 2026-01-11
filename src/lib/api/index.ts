/**
 * SciVid.AI API Module
 * 
 * 四步 Chain of Thought 流程:
 * 1. ScriptService: PDF → Script (Gemini)
 * 2. ImageService: Script → Images (Gemini Image)
 * 3. VideoService: Script + Images → Videos (Veo)
 * 4. ConcatService: Videos → Final Video (FFmpeg)
 */

// Services
export { ScriptService } from './ScriptService';
export { ImageService } from './ImageService';
export type { ImageServiceOptions } from './ImageService';
export { VideoService } from './VideoService';
export type { VideoServiceOptions, VideoGroup } from './VideoService';
export { ConcatService } from './ConcatService';
export type { ConcatOptions, ConcatResult } from './ConcatService';

// Pipeline
export { SciVidPipeline, runPipeline, runFullPipeline } from './pipeline';
export type { PipelineOptions, FullPipelineResult } from './pipeline';

// Types
export type {
  VideoStyle,
  StyleConfig,
  Scene,
  ScriptOutput,
  SceneWithImage,
  ScriptWithImages,
  SceneWithVideo,
  FinalOutput,
  VideoGroupInfo,
  PipelineProgress,
  ProgressCallback,
  PipelineConfig,
  PipelineResult,
} from './types';

// Constants
export {
  STYLE_PROMPT_MAP,
  STYLE_DESCRIPTIONS,
  NEGATIVE_PROMPT,
  AVAILABLE_STYLES,
  STYLE_DISPLAY_NAMES,
} from './constants';
