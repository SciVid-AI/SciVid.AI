// Application State Types
export type AppState = 'landing' | 'configuration' | 'generating' | 'result';

// Video Style Options
export type VideoStyle = 
  | 'nature-cinematic' 
  | 'blueprint' 
  | 'trendy-motion' 
  | 'custom';

export interface VideoStyleOption {
  id: VideoStyle;
  name: string;
  description: string;
  preview: string; // Gradient or image preview
  tags: string[];
}

// Paper Data
export interface PaperData {
  file: File | null;
  title: string;
  abstract: string;
  isProcessing: boolean;
}

// Storyboard Frame
export interface StoryboardFrame {
  id: string;
  imageUrl: string;
  caption: string;
  timestamp: string;
  correspondingText?: string;
}

// Generation Progress
export interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  detail?: string;
}

// Video Result
export interface VideoResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  storyboards: StoryboardFrame[];
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
  
  // Generation
  generationSteps: GenerationStep[];
  currentStepIndex: number;
  
  // Result
  result: VideoResult | null;
  
  // Actions
  setAppState: (state: AppState) => void;
  setPaper: (paper: Partial<PaperData>) => void;
  setStyle: (style: VideoStyle) => void;
  setCustomPrompt: (prompt: string) => void;
  startGeneration: () => void;
  updateGenerationStep: (stepId: string, status: GenerationStep['status'], detail?: string) => void;
  setResult: (result: VideoResult) => void;
  reset: () => void;
}
