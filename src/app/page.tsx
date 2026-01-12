'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Github, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { StyleSelector } from '@/components/StyleSelector';
import { ApiKeyInput } from '@/components/ApiKeyInput';
import { ActionBar } from '@/components/ActionBar';
import { ResultPreview } from '@/components/ResultPreview';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function Home() {
  const { currentState } = useAppStore();
  const [mounted, setMounted] = useState(false);
  
  // Initial mount animation
  useState(() => {
    setTimeout(() => setMounted(true), 100);
  });
  
  const showStyleSelector = currentState === 'configuration' || currentState === 'generating';
  const showActionBar = currentState === 'configuration' || currentState === 'generating';
  const showResult = currentState === 'result';
  
  return (
    <div className="min-h-screen aurora-bg overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-gemini-blue/20 blur-[100px]"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-gemini-purple/20 blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, 100, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gemini-cyan/10 blur-[80px]"
        />
      </div>
      
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex items-center justify-between p-6"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"
          >
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">SciVid AI</h1>
            <p className="text-xs text-muted-foreground">Powered by Gemini & Veo</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <motion.a
            href="https://github.com/Monomanae/Paper-Video/tree/main"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2.5 rounded-xl glass glass-border hover:bg-muted/50 transition-colors"
          >
            <Github className="w-5 h-5" />
          </motion.a>
        </div>
      </motion.header>
      
      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <AnimatePresence mode="wait">
          {/* Landing Title */}
          {currentState === 'landing' && (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12 mt-16"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
                  <span className="bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
                    Transform Academic Papers
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-accent via-primary to-foreground bg-clip-text text-transparent">
                    Into Engaging Videos
                  </span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  Upload your PDF paper and let AI understand the content to generate 
                  professional video abstracts that make complex research accessible.
                </p>
              </motion.div>
              
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Dropzone Section */}
        <motion.section
          layout
          className={cn(
            'transition-all duration-500',
            currentState !== 'landing' && 'mb-8',
          )}
        >
          <FileDropzone />
        </motion.section>
        
        {/* Style Selector Section */}
        <AnimatePresence>
          {showStyleSelector && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mb-8 overflow-hidden px-1"
            >
              <StyleSelector />
            </motion.section>
          )}
        </AnimatePresence>
        
        {/* API Key Input Section */}
        <AnimatePresence>
          {showStyleSelector && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mb-8 overflow-hidden"
            >
              <ApiKeyInput />
            </motion.section>
          )}
        </AnimatePresence>
        
        {/* Action Bar Section */}
        <AnimatePresence>
          {showActionBar && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <ActionBar />
            </motion.section>
          )}
        </AnimatePresence>
        
        {/* Result Section */}
        <AnimatePresence>
          {showResult && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <ResultPreview />
            </motion.section>
          )}
        </AnimatePresence>
      </main>
      
      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="relative z-10 text-center py-8 text-sm text-muted-foreground"
      >
        <p> 
          <span> SB Hacks 2026 </span> · 
          <span className="text-primary"> Gemini</span> · 
          <span className="text-accent"> Veo</span> · 
          <span className="text-gemini-cyan"> ImageFX</span>
        </p>
      </motion.footer>
    </div>
  );
}
