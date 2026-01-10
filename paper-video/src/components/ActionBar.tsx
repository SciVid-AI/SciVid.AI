'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Loader2, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function ActionBar() {
  const { 
    currentState, 
    paper, 
    selectedStyle,
    startGeneration,
    generationSteps,
    updateGenerationStep,
    setResult,
  } = useAppStore();
  
  const isReady = paper.file && !paper.isProcessing;
  const isGenerating = currentState === 'generating';
  
  // Simulate generation process
  useEffect(() => {
    if (!isGenerating) return;
    
    let currentIndex = 0;
    
    const simulateStep = async () => {
      if (currentIndex >= generationSteps.length) {
        // Generation complete - set mock result
        setResult({
          videoUrl: '/mock-video.mp4',
          thumbnailUrl: '/mock-thumbnail.jpg',
          duration: '1:24',
          storyboards: [
            { id: '1', imageUrl: '/storyboard-1.jpg', caption: 'Introduction: Problem Background', timestamp: '0:00', correspondingText: 'The dominant sequence transduction models...' },
            { id: '2', imageUrl: '/storyboard-2.jpg', caption: 'Methodology Overview', timestamp: '0:20', correspondingText: 'We propose a new simple network architecture...' },
            { id: '3', imageUrl: '/storyboard-3.jpg', caption: 'Core Architecture', timestamp: '0:45', correspondingText: 'The Transformer follows this overall architecture...' },
            { id: '4', imageUrl: '/storyboard-4.jpg', caption: 'Experimental Results', timestamp: '1:05', correspondingText: 'On the WMT 2014 English-to-German translation task...' },
          ],
        });
        return;
      }
      
      const step = generationSteps[currentIndex];
      updateGenerationStep(step.id, 'active', getStepDetail(step.id));
      
      // Simulate processing time
      const delay = 1500 + Math.random() * 2000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      updateGenerationStep(step.id, 'completed');
      currentIndex++;
      simulateStep();
    };
    
    simulateStep();
  }, [isGenerating]);
  
  const getStepDetail = (stepId: string): string => {
    const details: Record<string, string> = {
      parse: 'Detected 8 sections, 47 paragraphs...',
      extract: 'Extracting key concepts: Attention Mechanism, Self-Attention...',
      script: 'Generating 4 narrative segments, estimated duration 90s...',
      storyboard: 'Using ImageFX to generate storyboard frames...',
      render: 'Calling Veo 3.1 to render video segments...',
      audio: 'Synthesizing voiceover audio track...',
      compose: 'Mixing audio tracks, adding subtitles...',
    };
    return details[stepId] || '';
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="w-full space-y-6"
    >
      {/* Generate Button */}
      <AnimatePresence mode="wait">
        {!isGenerating && (
          <motion.div
            key="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex justify-center"
          >
            <Button
              size="lg"
              disabled={!isReady}
              onClick={startGeneration}
              className={cn(
                'relative px-12 py-6 text-lg font-semibold rounded-2xl',
                'bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%]',
                'hover:bg-[position:100%_0] transition-all duration-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isReady && 'animate-pulse-glow',
              )}
            >
              <Play className="w-5 h-5 mr-2" />
              Generate Video Abstract
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Generation Progress Console */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="glass glass-border rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent"
              />
              <div>
                <h3 className="font-semibold text-sm">Gemini Chain of Thought</h3>
                <p className="text-xs text-muted-foreground">
                  Processing: {selectedStyle === 'custom' ? 'Custom Style' : styleOptions[selectedStyle]}
                </p>
              </div>
            </div>
            
            {/* Steps Console */}
            <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto console-scroll">
              {generationSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl transition-colors',
                    step.status === 'active' && 'bg-primary/5',
                  )}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {step.status === 'completed' ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', bounce: 0.5 }}
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </motion.div>
                    ) : step.status === 'active' ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/30" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'text-sm font-medium transition-colors',
                      step.status === 'active' ? 'text-primary' : 
                      step.status === 'completed' ? 'text-foreground' : 
                      'text-muted-foreground',
                    )}>
                      {step.label}
                    </div>
                    
                    <AnimatePresence>
                      {step.status === 'active' && step.detail && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs text-muted-foreground mt-1 font-mono"
                        >
                          <span className="text-primary">{'>'}</span> {step.detail}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Progress Bar */}
            <div className="h-1 bg-muted">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-accent to-primary"
                initial={{ width: '0%' }}
                animate={{
                  width: `${(generationSteps.filter(s => s.status === 'completed').length / generationSteps.length) * 100}%`,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const styleOptions: Record<string, string> = {
  'nature-cinematic': 'Nature Cinematic',
  'blueprint': 'Blueprint Industrial',
  'trendy-motion': 'Trendy Motion',
  'custom': 'Custom Style',
};
