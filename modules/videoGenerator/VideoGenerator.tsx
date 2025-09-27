import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { startVideoGeneration, checkVideoGenerationStatus } from '../../services/geminiService.ts';
import { GeneratedContent } from '../../types.ts';
import { VideoIcon, SparklesIcon } from '../../components/Icons.tsx';
import { Modal } from '../../components/Modal.tsx';
import { PromptEnhancer } from '../../components/PromptEnhancer.tsx';

const loadingMessages = [
  "Warming up the digital director's chair...",
  "Storyboarding your vision...",
  "Rendering the first few frames...",
  "Applying cinematic color grading...",
  "Adding special effects and soundscapes...",
  "Finalizing the cut, this can take a moment...",
  "Polishing the final product...",
];

const VideoGenerator: React.FC = () => {
  const { addContentToGallery } = useAppContext();
  const [prompt, setPrompt] = useState('A neon hologram of a cat driving a futuristic car at top speed through a cyberpunk city');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState('');
  const [isEnhancerOpen, setIsEnhancerOpen] = useState(false);

  const operationRef = useRef<any>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const messageIntervalRef = useRef<number | null>(null);

  const cleanupIntervals = () => {
    if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
    if (messageIntervalRef.current) window.clearInterval(messageIntervalRef.current);
    pollIntervalRef.current = null;
    messageIntervalRef.current = null;
  };

  useEffect(() => {
    return cleanupIntervals; // Cleanup on component unmount
  }, []);
  
  const pollStatus = async () => {
      if (!operationRef.current) return;
  
      try {
        const updatedOperation = await checkVideoGenerationStatus(operationRef.current);
        operationRef.current = updatedOperation;
  
        if (updatedOperation.done) {
          cleanupIntervals();
          const downloadLink = updatedOperation.response?.generatedVideos?.[0]?.video?.uri;
          
          if (downloadLink) {
              const fetchUrl = `${downloadLink}&key=${process.env.API_KEY}`;
              const response = await fetch(fetchUrl);
              if (!response.ok) {
                  throw new Error(`Failed to download video: ${response.statusText}`);
              }
              const videoBlob = await response.blob();
              const videoObjectURL = URL.createObjectURL(videoBlob);
              
              setGeneratedVideoUrl(videoObjectURL);

              const newContent: GeneratedContent = {
                  id: new Date().toISOString(),
                  type: 'video',
                  prompt,
                  url: videoObjectURL,
                  createdAt: new Date(),
              };
              addContentToGallery(newContent);
          } else {
              setError('Video generation finished, but no video URL was found.');
          }
          setIsLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to poll or download video.');
        setIsLoading(false);
        cleanupIntervals();
      }
  };

  const handleGenerate = async () => {
    if (!prompt) {
      setError('Prompt cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedVideoUrl(null);
    setCurrentLoadingMessage(loadingMessages[0]);
    
    let messageIndex = 1;
    messageIntervalRef.current = window.setInterval(() => {
        setCurrentLoadingMessage(loadingMessages[messageIndex % loadingMessages.length]);
        messageIndex++;
    }, 7000);

    try {
      const initialOperation = await startVideoGeneration(prompt);
      operationRef.current = initialOperation;
      pollIntervalRef.current = window.setInterval(pollStatus, 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setIsLoading(false);
      cleanupIntervals();
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 h-full p-6">
      <div className="w-full md:w-96 flex-shrink-0 flex flex-col gap-4 bg-neutral-950 p-4 border border-neutral-800 rounded-lg">
        <h3 className="text-xl font-bold">Video Generation (VEO)</h3>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="prompt-video" className="block text-sm font-medium text-neutral-300">Prompt</label>
            <button 
              onClick={() => setIsEnhancerOpen(true)} 
              className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              title="Enhance prompt with AI"
            >
              <SparklesIcon /> Enhance Prompt
            </button>
          </div>
          <textarea
            id="prompt-video"
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-neutral-800 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-neutral-700"
            placeholder="Describe the video you want to create..."
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-purple-800/50 disabled:cursor-not-allowed text-lg transition-transform active:scale-95"
        >
          {isLoading ? 'Generating...' : 'Generate Video'}
        </button>
        {error && <p className="text-red-400 mt-2">{error}</p>}
      </div>
      <div className="flex-1 bg-black rounded-lg flex items-center justify-center p-4">
        {isLoading && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
            <p className="text-lg text-neutral-300 mt-4">{currentLoadingMessage}</p>
            <p className="text-sm text-neutral-500">(Video generation can take several minutes)</p>
          </div>
        )}
        {!isLoading && generatedVideoUrl && (
          <video src={generatedVideoUrl} controls autoPlay loop className="max-h-full max-w-full object-contain rounded-md" />
        )}
        {!isLoading && !generatedVideoUrl && (
          <div className="text-center text-neutral-500">
            <VideoIcon />
            <p className="mt-2">Your generated video will appear here.</p>
          </div>
        )}
      </div>
      <Modal isOpen={isEnhancerOpen} onClose={() => setIsEnhancerOpen(false)} title="AI Prompt Enhancer">
        <PromptEnhancer
            initialPrompt={prompt}
            onEnhance={(newPrompt) => {
                setPrompt(newPrompt);
                setIsEnhancerOpen(false);
            }}
        />
      </Modal>
    </div>
  );
};

export default VideoGenerator;