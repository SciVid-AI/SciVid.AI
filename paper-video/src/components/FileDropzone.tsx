'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function FileDropzone() {
  const { paper, setPaper, setAppState, currentState } = useAppStore();
  const [isDragActive, setIsDragActive] = useState(false);
  
  const isCompact = currentState !== 'landing';
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      processFile(files[0]);
    }
  }, []);
  
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);
  
  const processFile = async (file: File) => {
    setPaper({ file, isProcessing: true });
    
    // Simulate Gemini extracting title/abstract (will be replaced with actual API)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock extracted data - in production, this would come from Gemini API
    setPaper({
      title: 'Attention Is All You Need: Transformer Architecture for Sequence Modeling',
      abstract: 'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely...',
      isProcessing: false,
    });
    
    setAppState('configuration');
  };
  
  const containerVariants = {
    landing: {
      height: 'auto',
      padding: '4rem',
    },
    compact: {
      height: 'auto',
      padding: '1rem',
    },
  };
  
  return (
    <motion.div
      layout
      variants={containerVariants}
      animate={isCompact ? 'compact' : 'landing'}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full mx-auto"
    >
      <motion.div
        layout
        onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all duration-300',
          'glass glass-border overflow-hidden',
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20',
          isCompact ? 'p-4' : 'p-12',
        )}
      >
        {/* Scan Line Animation */}
        <AnimatePresence>
          {(isDragActive || paper.isProcessing) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none overflow-hidden"
            >
              <motion.div
                animate={{
                  y: ['0%', '100%'],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
                style={{
                  boxShadow: '0 0 20px var(--gemini-blue), 0 0 40px var(--gemini-purple)',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence mode="wait">
          {!paper.file ? (
            // Upload State
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                'flex flex-col items-center justify-center text-center',
                isCompact ? 'gap-3' : 'gap-6',
              )}
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className={cn(
                  'rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center',
                  isCompact ? 'w-12 h-12' : 'w-24 h-24',
                )}
              >
                <Upload className={cn(
                  'text-primary',
                  isCompact ? 'w-6 h-6' : 'w-12 h-12',
                )} />
              </motion.div>
              
              <div className={cn(isCompact && 'hidden sm:block')}>
                <h2 className={cn(
                  'font-semibold text-foreground mb-2',
                  isCompact ? 'text-lg' : 'text-2xl',
                )}>
                  Upload Academic Paper
                </h2>
                <p className="text-muted-foreground text-sm">
                  Drag and drop a PDF file here, or click to select
                </p>
              </div>
              
              <label className={cn(
                'cursor-pointer px-6 py-3 rounded-xl bg-primary/10 border border-primary/30',
                'hover:bg-primary/20 transition-all duration-200',
                'text-primary font-medium',
                isCompact && 'text-sm px-4 py-2',
              )}>
                Select PDF File
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </motion.div>
          ) : paper.isProcessing ? (
            // Processing State
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent"
              />
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span className="font-medium">Gemini is analyzing your paper...</span>
              </div>
            </motion.div>
          ) : (
            // Loaded State
            <motion.div
              key="loaded"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'flex items-center gap-4',
                isCompact ? 'flex-row' : 'flex-col text-center',
              )}
            >
              <div className={cn(
                'flex-shrink-0 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center',
                isCompact ? 'w-12 h-12' : 'w-16 h-16',
              )}>
                <CheckCircle2 className={cn(
                  'text-green-500',
                  isCompact ? 'w-6 h-6' : 'w-8 h-8',
                )} />
              </div>
              
              <div className={cn('flex-1 min-w-0', isCompact && 'text-left')}>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">
                    {paper.file?.name}
                  </span>
                </div>
                <h3 className={cn(
                  'font-semibold text-foreground',
                  isCompact ? 'text-sm line-clamp-1' : 'text-lg',
                )}>
                  {paper.title}
                </h3>
                {!isCompact && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {paper.abstract}
                  </p>
                )}
              </div>
              
              {isCompact && (
                <button
                  onClick={() => {
                    setPaper({ file: null, title: '', abstract: '' });
                    setAppState('landing');
                  }}
                  className="flex-shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Change File
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
