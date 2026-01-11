'use client';

import { motion } from 'framer-motion';
import { Sparkles, Clapperboard, GraduationCap, Tv, MinusSquare } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { VideoStyle, VideoStyleOption } from '@/lib/types';

const styleOptions: VideoStyleOption[] = [
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Epic, movie-like visuals with dramatic camera movements and Hollywood-style color grading',
    preview: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    tags: ['Epic', 'Dramatic', 'Hollywood'],
  },
  {
    id: 'academic',
    name: 'Academic Research',
    description: 'Professional scientific visualization with rigorous accuracy, journal-quality figures',
    preview: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)',
    tags: ['Scientific', 'Technical', 'Journal'],
  },
  {
    id: 'anime',
    name: 'Animation',
    description: 'Western cartoon aesthetic inspired by Pixar, Disney, Arcane, and Spider-Verse',
    preview: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)',
    tags: ['Pixar', 'Stylized', 'Dynamic'],
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: '3Blue1Brown-inspired clean math visuals with elegant animations and dark backgrounds',
    preview: 'linear-gradient(135deg, #1a1a2e 0%, #3b82f6 50%, #fbbf24 100%)',
    tags: ['3B1B', 'Math', 'Clean'],
  },
];

const iconMap: Record<VideoStyle, React.ReactNode> = {
  'cinematic': <Clapperboard className="w-6 h-6" />,
  'academic': <GraduationCap className="w-6 h-6" />,
  'anime': <Tv className="w-6 h-6" />,
  'minimalist': <MinusSquare className="w-6 h-6" />,
};

export function StyleSelector() {
  const { selectedStyle, setStyle } = useAppStore();
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full p-4 space-y-6"
    >
      <div className="text-center space-y-2">
        <motion.div 
          variants={cardVariants}
          className="flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Choose Visual Style</h2>
        </motion.div>
        <motion.p variants={cardVariants} className="text-sm text-muted-foreground">
          Different styles suit different disciplines. Pick the one that best represents your paper.
        </motion.p>
      </div>
      
      <motion.div 
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {styleOptions.map((option) => (
          <motion.button
            key={option.id}
            variants={cardVariants}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setStyle(option.id)}
            className={cn(
              'relative group p-4 rounded-2xl text-left transition-all duration-300',
              'glass glass-border overflow-hidden',
              selectedStyle === option.id
                ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                : 'hover:border-primary/30',
            )}
          >
            {/* Preview Background */}
            <div 
              className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
              style={{ background: option.preview }}
            />
            
            {/* Content */}
            <div className="relative z-10 space-y-3">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                selectedStyle === option.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary',
              )}>
                {iconMap[option.id]}
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {option.name}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {option.description}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                {option.tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-medium',
                      selectedStyle === option.id
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Selection Indicator */}
            {selectedStyle === option.id && (
              <motion.div
                layoutId="style-indicator"
                className="absolute top-3 right-3 w-3 h-3 rounded-full bg-primary"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </motion.button>
        ))}
      </motion.div>
      
    </motion.div>
  );
}
