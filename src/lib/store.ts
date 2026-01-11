'use client';

import { create } from 'zustand';
import type { AppStore, GenerationStep } from './types';

const initialGenerationSteps: GenerationStep[] = [
  { id: 'parse', label: 'Parsing paper structure', status: 'pending' },
  { id: 'extract', label: 'Extracting key insights', status: 'pending' },
  { id: 'script', label: 'Generating video script', status: 'pending' },
  { id: 'storyboard', label: 'Creating storyboards', status: 'pending' },
  { id: 'render', label: 'Rendering video segments', status: 'pending' },
  { id: 'audio', label: 'Synthesizing audio track', status: 'pending' },
  { id: 'compose', label: 'Final composition & export', status: 'pending' },
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
  
  // Actions
  setAppState: (state) => set({ currentState: state }),
  
  setPaper: (paper) => set((store) => ({ 
    paper: { ...store.paper, ...paper } 
  })),
  
  setStyle: (style) => set({ selectedStyle: style }),
  
  setCustomPrompt: (prompt) => set({ customPrompt: prompt }),
  
  startGeneration: () => set({ 
    currentState: 'generating',
    generationSteps: initialGenerationSteps.map(step => ({ ...step, status: 'pending' as const })),
    currentStepIndex: 0,
  }),
  
  updateGenerationStep: (stepId, status, detail) => set((store) => ({
    generationSteps: store.generationSteps.map(step => 
      step.id === stepId ? { ...step, status, detail } : step
    ),
    currentStepIndex: status === 'completed' 
      ? store.generationSteps.findIndex(s => s.id === stepId) + 1 
      : store.currentStepIndex,
  })),
  
  setResult: (result) => set({ 
    result,
    currentState: 'result',
  }),
  
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
  }),
}));
