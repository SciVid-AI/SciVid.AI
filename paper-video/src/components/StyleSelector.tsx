'use client';

import { motion } from 'framer-motion';
import { Sparkles, Palette, Zap, Beaker, Cog } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import type { VideoStyle, VideoStyleOption } from '@/lib/types';

const styleOptions: VideoStyleOption[] = [
  {
    id: 'nature-cinematic',
    name: 'Nature Cinematic',
    description: 'Realistic 3D rendering with dark backgrounds, commonly used for medical/biology papers',
    preview: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    tags: ['Cinematic', '3D', 'BioMed'],
  },
  {
    id: 'blueprint',
    name: 'Blueprint Industrial',
    description: 'Technical blueprint style with line art, ideal for engineering/physics/math',
    preview: 'linear-gradient(135deg, #0a1628 0%, #1e3a5f 50%, #0d2137 100%)',
    tags: ['Blueprint', 'Technical', 'Engineering'],
  },
  {
    id: 'trendy-motion',
    name: 'Trendy Motion',
    description: 'Bright colors, high contrast, dynamic design similar to viral science content',
    preview: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #48dbfb 100%)',
    tags: ['Trendy', 'SciComm', 'Dynamic'],
  },
  {
    id: 'custom',
    name: 'Custom Style',
    description: 'Describe your desired visual style using natural language',
    preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    tags: ['Custom', 'AI', 'Creative'],
  },
];

const iconMap: Record<VideoStyle, React.ReactNode> = {
  'nature-cinematic': <Beaker className="w-6 h-6" />,
  'blueprint': <Cog className="w-6 h-6" />,
  'trendy-motion': <Zap className="w-6 h-6" />,
  'custom': <Palette className="w-6 h-6" />,
};

export function StyleSelector() {
  const { selectedStyle, setStyle, customPrompt, setCustomPrompt } = useAppStore();
  
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
      className="w-full px-4 space-y-6"
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
      
      {/* Custom Prompt Input */}
      <motion.div
        variants={cardVariants}
        initial={{ opacity: 0, height: 0 }}
        animate={{ 
          opacity: selectedStyle === 'custom' ? 1 : 0,
          height: selectedStyle === 'custom' ? 'auto' : 0,
        }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="glass glass-border rounded-2xl p-4 space-y-3">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Describe your desired visual style
          </label>
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder='e.g., "Cyberpunk aesthetic with neon colors and dark backgrounds" or "Pixar animation style, warm and bright, cartoon rendering"'
            className="min-h-[100px] bg-background/50 border-muted resize-none"
          />
          <p className="text-xs text-muted-foreground">
            💡 Tip: The more detailed your description, the more accurate the video style. Reference movies, games, or artists for inspiration.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
