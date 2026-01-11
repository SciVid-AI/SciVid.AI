'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Download, 
  RotateCcw, 
  Maximize2,
  Volume2,
  Twitter,
  Linkedin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

export function ResultPreview() {
  const { result, reset, paper } = useAppStore();
  const [isPlaying, setIsPlaying] = useState(false);
  
  if (!result) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="w-full space-y-8"
    >
      {/* Success Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-2"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-500 text-sm font-medium"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: 3 }}
            className="w-2 h-2 rounded-full bg-green-500"
          />
          Video Generation Complete
        </motion.div>
        <h2 className="text-2xl font-bold">
          {paper.title}
        </h2>
        <p className="text-muted-foreground text-sm">
          Duration {result.duration} · Ready to Download
        </p>
      </motion.div>
      
      {/* Video Player - Centered and Larger */}
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          whileHover={{ scale: 1.005 }}
          className="relative aspect-video rounded-2xl overflow-hidden glass glass-border group"
        >
          {/* Video Placeholder */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-background"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-24 h-24 rounded-full bg-primary/90 flex items-center justify-center cursor-pointer backdrop-blur-sm"
              >
                <AnimatePresence mode="wait">
                  {isPlaying ? (
                    <motion.div
                      key="pause"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Pause className="w-10 h-10 text-primary-foreground" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="play"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Play className="w-10 h-10 text-primary-foreground ml-1" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
            
            {/* Video Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="text-white hover:text-primary transition-colors"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
                
                {/* Progress Bar */}
                <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: isPlaying ? '100%' : '0%' }}
                    transition={{ duration: 84, ease: 'linear' }}
                  />
                </div>
                
                <span className="text-white text-sm font-mono">
                  {isPlaying ? '0:00' : result.duration} / {result.duration}
                </span>
                
                <button className="text-white hover:text-primary transition-colors">
                  <Volume2 className="w-6 h-6" />
                </button>
                
                <button className="text-white hover:text-primary transition-colors">
                  <Maximize2 className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Action Buttons - Centered */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" className="gap-2 rounded-xl">
            <Download className="w-5 h-5" />
            Download MP4
          </Button>
          <Button variant="secondary" size="lg" className="gap-2 rounded-xl">
            <Twitter className="w-5 h-5" />
            Share on X
          </Button>
          <Button variant="secondary" size="lg" className="gap-2 rounded-xl">
            <Linkedin className="w-5 h-5" />
            Share on LinkedIn
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={reset}
            className="gap-2 rounded-xl"
          >
            <RotateCcw className="w-5 h-5" />
            Regenerate
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
