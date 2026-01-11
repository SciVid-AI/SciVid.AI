'use client';

import { create } from 'zustand';
import type { AppStore, GenerationStep } from './types';

// 四步生成流程
const initialGenerationSteps: GenerationStep[] = [
  { id: 'script', label: 'Step 1: Analyzing PDF & Generating Script', status: 'pending', progress: 0 },
  { id: 'images', label: 'Step 2: Generating Visual Anchors', status: 'pending', progress: 0 },
  { id: 'videos', label: 'Step 3: Rendering Video Segments (Veo 3.1)', status: 'pending', progress: 0 },
  { id: 'concat', label: 'Step 4: Concatenating Final Video', status: 'pending', progress: 0 },
];

export const useAppStore = create<AppStore>((set) => ({
  // Initial State
  currentState: 'landing',
  
  paper: {
    file: null,
    title: '',
    abstract: '',
    isProcessing: false,
  },
  
  selectedStyle: 'cinematic',
  customPrompt: '',
  
  generationSteps: initialGenerationSteps,
  currentStepIndex: -1,
  
  result: null,
  error: null,
  
  // Actions
  setAppState: (state) => set({ currentState: state }),
  
  setPaper: (paper) => set((store) => ({ 
    paper: { ...store.paper, ...paper } 
  })),
  
  setStyle: (style) => set({ selectedStyle: style }),
  
  setCustomPrompt: (prompt) => set({ customPrompt: prompt }),
  
  startGeneration: () => set({ 
    currentState: 'generating',
    generationSteps: initialGenerationSteps.map(step => ({ ...step, status: 'pending' as const, progress: 0 })),
    currentStepIndex: 0,
    error: null,
  }),
  
  updateGenerationStep: (stepId, status, detail, progress) => set((store) => ({
    generationSteps: store.generationSteps.map(step => 
      step.id === stepId 
        ? { ...step, status, detail, progress: progress ?? step.progress } 
        : step
    ),
    currentStepIndex: status === 'completed' 
      ? store.generationSteps.findIndex(s => s.id === stepId) + 1 
      : store.currentStepIndex,
  })),
  
  setResult: (result) => set({ 
    result,
    currentState: 'result',
  }),
  
  setError: (error) => set({ error }),
  
  reset: () => set({
    currentState: 'landing',
    paper: {
      file: null,
      title: '',
      abstract: '',
      isProcessing: false,
    },
    selectedStyle: 'cinematic',
    customPrompt: '',
    generationSteps: initialGenerationSteps,
    currentStepIndex: -1,
    result: null,
    error: null,
  }),
}));
