// Re-export API types
export type {
  VideoStyle,
  Scene,
  ScriptOutput,
  SceneWithImage,
  ScriptWithImages,
  SceneWithVideo,
  FinalOutput,
  VideoGroupInfo,
  PipelineProgress,
} from './api/types';

// Application State Types
export type AppState = 'landing' | 'configuration' | 'generating' | 'result';

export interface VideoStyleOption {
  id: VideoStyle;
  name: string;
  description: string;
  preview: string;
  tags: string[];
}

// Paper Data
export interface PaperData {
  file: File | null;
  title: string;
  abstract: string;
  isProcessing: boolean;
}

// Generation Progress - 四步流程
export type GenerationStepId = 'script' | 'images' | 'videos' | 'concat';

export interface GenerationStep {
  id: GenerationStepId;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  detail?: string;
  progress?: number; // 0-100
}

// Storyboard Frame (for preview)
export interface StoryboardFrame {
  id: number;
  imageUrl: string | null;
  caption: string;
  voiceover: string;
}

// Video Result
export interface VideoResult {
  title: string;
  scientificField: string;
  style: VideoStyle;
  scenes: Array<{
    id: number;
    videoUrl: string;
    imageUrl: string | null;
    voiceover: string;
    visualDescription: string;
  }>;
  storyboards: StoryboardFrame[];
  // 视频相关
  videoGroups?: VideoGroupInfo[];
  videoPaths?: string[];
  finalVideoPath?: string;
}

// Main App Store State
export interface AppStore {
  // Current State
  currentState: AppState;
  
  // Paper
  paper: PaperData;
  
  // Style
  selectedStyle: VideoStyle;
  customPrompt: string;
  
  // API Key
  apiKey: string;
  
  // Generation
  generationSteps: GenerationStep[];
  currentStepIndex: number;
  
  // Result
  result: VideoResult | null;
  
  // Error
  error: string | null;
  
  // Actions
  setAppState: (state: AppState) => void;
  setPaper: (paper: Partial<PaperData>) => void;
  setStyle: (style: VideoStyle) => void;
  setCustomPrompt: (prompt: string) => void;
  setApiKey: (apiKey: string) => void;
  startGeneration: () => void;
  updateGenerationStep: (stepId: GenerationStepId, status: GenerationStep['status'], detail?: string, progress?: number) => void;
  setResult: (result: VideoResult) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// Import types for use in this file
import type { VideoStyle, VideoGroupInfo } from './api/types';
