'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Loader2, CheckCircle2, Circle, ArrowRight, AlertCircle, FileText, Image, Film, Scissors, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { generateScript, generateImages, generateVideos, concatVideos, getResult } from '@/app/actions';
import type { VideoStyle } from '@/lib/api/types';

// Helper: 获取文件名
const basename = (filepath: string) => filepath.split('/').pop() || filepath;

// 详细的子步骤日志
interface LogEntry {
  timestamp: string;
  step: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'progress';
}

export function ActionBar() {
  const { 
    currentState, 
    paper, 
    selectedStyle,
    startGeneration,
    generationSteps,
    updateGenerationStep,
    setResult,
    setError,
    error,
  } = useAppStore();
  
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentSubStep, setCurrentSubStep] = useState<string>('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const isReady = paper.file && !paper.isProcessing;
  const isGenerating = currentState === 'generating';
  
  // 添加日志
  const addLog = useCallback((step: number, message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, { timestamp, step, message, type }]);
  }, []);
  
  // 滚动到最新日志
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);
  
  // 文件转 Base64
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);
  
  // 运行完整 Pipeline
  const runPipeline = useCallback(async () => {
    if (!paper.file || isRunning) return;
    
    setIsRunning(true);
    setError(null);
    setLogs([]);
    
    let sessionId: string | undefined;
    
    try {
      const pdfBase64 = await fileToBase64(paper.file);
      const fileName = paper.file.name;
      const style = selectedStyle as VideoStyle;
      
      // ════════════════════════════════════════════════════════════════
      // STEP 1: PDF → Script → script.json (Gemini 3 Pro)
      // ════════════════════════════════════════════════════════════════
      updateGenerationStep('script', 'active', 'Initializing...', 5);
      addLog(1, `📄 Uploading PDF: ${fileName}`, 'info');
      setCurrentSubStep('Uploading PDF to Gemini File API...');
      
      await sleep(500);
      addLog(1, '🔄 PDF uploaded, waiting for processing...', 'info');
      updateGenerationStep('script', 'active', 'Analyzing PDF content...', 20);
      setCurrentSubStep('Gemini is reading and understanding the paper...');
      
      await sleep(300);
      addLog(1, `🎨 Style selected: ${STYLE_OPTIONS[selectedStyle]}`, 'info');
      addLog(1, '🧠 Gemini 3 Pro is generating script...', 'progress');
      updateGenerationStep('script', 'active', 'Generating viral TikTok-style script...', 40);
      
      const scriptResult = await generateScript(pdfBase64, fileName, style);
      
      if (!scriptResult.success || !scriptResult.sessionId) {
        throw new Error(scriptResult.error || 'Failed to generate script');
      }
      
      sessionId = scriptResult.sessionId;
      
      // 显示脚本详情
      addLog(1, `✨ Script generated and saved to session: ${sessionId}`, 'success');
      addLog(1, `💾 script.json saved`, 'info');
      
      updateGenerationStep('script', 'completed', `Script saved to ${sessionId}`, 100);
      
      // ════════════════════════════════════════════════════════════════
      // STEP 2: script.json → Images → scriptWithImages.json (Gemini Image Preview)
      // ════════════════════════════════════════════════════════════════
      updateGenerationStep('images', 'active', 'Starting image generation...', 5);
      addLog(2, '📖 Reading script.json...', 'info');
      addLog(2, '🎨 Initializing Gemini Image Generator...', 'info');
      setCurrentSubStep('Preparing to generate anchor images...');
      
      addLog(2, '🖼️ Generating images with Gemini 3 Pro Image...', 'progress');
      
      let imageProgress = 10;
      const imageProgressInterval = setInterval(() => {
        if (imageProgress < 90) {
          imageProgress += 5;
          updateGenerationStep('images', 'active', `Generating anchor images... (${imageProgress}%)`, imageProgress);
          setCurrentSubStep(`Rendering visual anchors for low-motion scenes...`);
        }
      }, 3000);
      
      if (!sessionId) {
        throw new Error('Session ID is missing');
      }
      
      const imagesResult = await generateImages(sessionId);
      clearInterval(imageProgressInterval);
      
      if (!imagesResult.success) {
        throw new Error(imagesResult.error || 'Failed to generate images');
      }
      
      addLog(2, `🎉 All anchor images generated!`, 'success');
      addLog(2, `💾 scriptWithImages.json saved`, 'info');
      updateGenerationStep('images', 'completed', `Images saved to session/${sessionId}/images/`, 100);
      
      // ════════════════════════════════════════════════════════════════
      // STEP 3: scriptWithImages.json → Videos → finalOutput.json (Veo 3.1)
      // ════════════════════════════════════════════════════════════════
      updateGenerationStep('videos', 'active', 'Initializing Veo 3.1...', 5);
      addLog(3, '📖 Reading scriptWithImages.json...', 'info');
      addLog(3, '🎬 Initializing Veo 3.1 Video Generator...', 'info');
      setCurrentSubStep('This is the longest step, please be patient...');
      
      addLog(3, '⏳ Starting video generation (this takes 2-5 min per scene)...', 'warning');
      
      let videoProgress = 10;
      const videoProgressInterval = setInterval(() => {
        if (videoProgress < 95) {
          videoProgress += 2;
          setCurrentSubStep(`Rendering videos... (~${Math.round((100 - videoProgress) * 0.5)} min remaining)`);
          updateGenerationStep('videos', 'active', `Generating videos with Veo 3.1... (${videoProgress}%)`, videoProgress);
        }
      }, 5000);
      
      if (!sessionId) {
        throw new Error('Session ID is missing');
      }
      
      const videosResult = await generateVideos(sessionId);
      clearInterval(videoProgressInterval);
      
      if (!videosResult.success) {
        throw new Error(videosResult.error || 'Failed to generate videos');
      }
      
      addLog(3, '🎉 All videos generated!', 'success');
      addLog(3, `💾 finalOutput.json saved`, 'info');
      
      updateGenerationStep('videos', 'completed', `Videos saved to session/${sessionId}/videos/`, 100);
      
      // ════════════════════════════════════════════════════════════════
      // STEP 4: finalOutput.json → final.mp4 (FFmpeg)
      // ════════════════════════════════════════════════════════════════
      updateGenerationStep('concat', 'active', 'Preparing FFmpeg...', 10);
      addLog(4, '📖 Reading finalOutput.json...', 'info');
      addLog(4, '✂️ Initializing FFmpeg concatenation...', 'info');
      setCurrentSubStep('Merging all video segments into final video...');
      
      updateGenerationStep('concat', 'active', 'Running FFmpeg...', 50);
      addLog(4, '🔄 FFmpeg is concatenating videos...', 'progress');
      
      if (!sessionId) {
        throw new Error('Session ID is missing');
      }
      
      const concatResult = await concatVideos(sessionId);
      
      if (concatResult.success && concatResult.data) {
        addLog(4, `✅ Final video created: ${concatResult.data.outputPath}`, 'success');
        addLog(4, `📊 Duration: ${concatResult.data.duration}`, 'info');
        addLog(4, `💾 File size: ${concatResult.data.fileSize}`, 'info');
        updateGenerationStep('concat', 'completed', `${concatResult.data.fileSize} - ${concatResult.data.duration}`, 100);
      } else {
        addLog(4, '⚠️ Concatenation skipped (check FFmpeg installation)', 'warning');
        updateGenerationStep('concat', 'completed', 'Skipped (FFmpeg not available)', 100);
      }
      
      addLog(4, '🎉 Pipeline completed successfully!', 'success');
      
      // ════════════════════════════════════════════════════════════════
      // GET RESULT - 读取最终结果并转换路径为前端可访问的 URL
      // ════════════════════════════════════════════════════════════════
      const resultData = await getResult(sessionId!);
      
      if (!resultData.success || !resultData.data || !resultData.sessionPath) {
        throw new Error('Failed to get result data');
      }
      
      const finalOutput = resultData.data;
      const sessionPath = resultData.sessionPath;
      
      setResult({
        title: finalOutput.title,
        scientificField: finalOutput.scientific_field,
        style: finalOutput.style,
        scenes: finalOutput.scenes.map(scene => ({
          id: scene.id,
          videoUrl: scene.video_path ? `${sessionPath}/videos/${basename(scene.video_path)}` : '',
          imageUrl: scene.image_base64,
          voiceover: scene.voiceover,
          visualDescription: scene.visual_description,
        })),
        storyboards: [], // 删除 storyboard，直接渲染视频
        videoGroups: finalOutput.videoGroups?.map(g => ({
          ...g,
          videoPath: g.videoPath ? `${sessionPath}/videos/${basename(g.videoPath)}` : '',
        })),
        videoPaths: finalOutput.videoPaths?.map(p => `${sessionPath}/videos/${basename(p)}`),
        finalVideoPath: `${sessionPath}/final.mp4`,
      });
      
    } catch (err) {
      console.error('Pipeline error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Pipeline failed';
      setError(errorMsg);
      addLog(0, `❌ Error: ${errorMsg}`, 'warning');
      
      const activeStep = generationSteps.find(s => s.status === 'active');
      if (activeStep) {
        updateGenerationStep(activeStep.id, 'error', errorMsg);
      }
    } finally {
      setIsRunning(false);
    }
  }, [paper.file, selectedStyle, isRunning, fileToBase64, updateGenerationStep, setResult, setError, addLog, generationSteps]);
  
  // Start pipeline when generation begins
  useEffect(() => {
    if (isGenerating && !isRunning && generationSteps[0].status === 'pending') {
      runPipeline();
    }
  }, [isGenerating, isRunning, generationSteps, runPipeline]);
  
  // 获取当前活跃步骤
  const activeStep = generationSteps.find(s => s.status === 'active');
  const completedCount = generationSteps.filter(s => s.status === 'completed').length;
  const overallProgress = (completedCount / generationSteps.length) * 100;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="w-full space-y-6"
    >
      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Generation Error</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
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
            {/* Header with Overall Progress */}
            <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-5 h-5 text-primary" />
                  </motion.div>
                  <div>
                    <h3 className="font-semibold text-sm">SciVid.AI Pipeline</h3>
                    <p className="text-xs text-muted-foreground">
                      {STYLE_OPTIONS[selectedStyle]} • {completedCount}/{generationSteps.length} steps
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{Math.round(overallProgress)}%</p>
                </div>
              </div>
              <Progress value={overallProgress} className="h-2" />
              {currentSubStep && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-muted-foreground mt-2 font-mono"
                >
                  {currentSubStep}
                </motion.p>
              )}
            </div>
            
            {/* Step Cards */}
            <div className="p-4 space-y-3">
              {generationSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'p-3 rounded-xl transition-all duration-300 border',
                    step.status === 'active' && 'bg-primary/10 border-primary/30 shadow-lg shadow-primary/10',
                    step.status === 'completed' && 'bg-green-500/10 border-green-500/30',
                    step.status === 'error' && 'bg-destructive/10 border-destructive/30',
                    step.status === 'pending' && 'bg-muted/30 border-transparent opacity-50',
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Step Icon */}
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      step.status === 'active' && 'bg-primary/20',
                      step.status === 'completed' && 'bg-green-500/20',
                      step.status === 'error' && 'bg-destructive/20',
                      step.status === 'pending' && 'bg-muted/50',
                    )}>
                      {step.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : step.status === 'active' ? (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      ) : step.status === 'error' ? (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      ) : (
                        STEP_ICONS[step.id]
                      )}
                    </div>
                    
                    {/* Step Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-xs font-bold px-2 py-0.5 rounded',
                          step.status === 'active' && 'bg-primary text-primary-foreground',
                          step.status === 'completed' && 'bg-green-500 text-white',
                          step.status === 'error' && 'bg-destructive text-destructive-foreground',
                          step.status === 'pending' && 'bg-muted text-muted-foreground',
                        )}>
                          {index + 1}
                        </span>
                        <span className={cn(
                          'text-sm font-medium',
                          step.status === 'active' && 'text-primary',
                          step.status === 'completed' && 'text-green-600 dark:text-green-400',
                          step.status === 'error' && 'text-destructive',
                          step.status === 'pending' && 'text-muted-foreground',
                        )}>
                          {STEP_TITLES[step.id]}
                        </span>
                      </div>
                      
                      {step.detail && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {step.detail}
                        </p>
                      )}
                      
                      {step.status === 'active' && step.progress !== undefined && (
                        <Progress value={step.progress} className="h-1 mt-2" />
                      )}
                    </div>
                    
                    {/* Progress Percentage */}
                    {step.status === 'active' && step.progress !== undefined && (
                      <span className="text-xs font-mono text-primary">
                        {step.progress}%
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Live Logs Console */}
            <div className="border-t border-border">
              <div className="px-4 py-2 bg-black/50 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-mono text-green-400">Live Console</span>
              </div>
              <div className="h-48 overflow-y-auto bg-black/80 p-3 font-mono text-xs">
                {logs.map((log, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'py-0.5',
                      log.type === 'success' && 'text-green-400',
                      log.type === 'warning' && 'text-yellow-400',
                      log.type === 'progress' && 'text-blue-400',
                      log.type === 'info' && 'text-gray-400',
                    )}
                  >
                    <span className="text-gray-600">[{log.timestamp}]</span>
                    {' '}
                    <span className="text-gray-500">Step {log.step}:</span>
                    {' '}
                    {log.message}
                  </motion.div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const STYLE_OPTIONS: Record<string, string> = {
  'cinematic': 'Cinematic Style',
  'academic': 'Academic Style',
  'anime': 'Anime Style',
  'minimalist': 'Minimalist Style',
};

const STEP_TITLES: Record<string, string> = {
  'script': 'PDF Analysis & Script Generation',
  'images': 'Visual Anchor Generation',
  'videos': 'Video Rendering (Veo 3.1)',
  'concat': 'Video Concatenation (FFmpeg)',
};

const STEP_ICONS: Record<string, React.ReactNode> = {
  'script': <FileText className="w-5 h-5 text-muted-foreground" />,
  'images': <Image className="w-5 h-5 text-muted-foreground" />,
  'videos': <Film className="w-5 h-5 text-muted-foreground" />,
  'concat': <Scissors className="w-5 h-5 text-muted-foreground" />,
};
