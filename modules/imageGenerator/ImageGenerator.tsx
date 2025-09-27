import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { generateImage } from '../../services/geminiService.ts';
import { GeneratedContent } from '../../types.ts';
import { SparklesIcon, UploadIcon } from '../../components/Icons.tsx';
import { Modal } from '../../components/Modal.tsx';
import { PromptEnhancer } from '../../components/PromptEnhancer.tsx';
import { ImageGenerationQueue } from '../../components/ImageGenerationQueue.tsx';

// Define the queue item structure
type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
type QueueStatus = 'queued' | 'generating' | 'done' | 'error' | 'cancelled';

interface QueueItem {
  id: string;
  prompt: string;
  aspectRatio: AspectRatio;
  status: QueueStatus;
  imageUrl?: string;
}

const MAX_QUEUE_SIZE = 20;

const ImageGenerator: React.FC = () => {
  const { 
      addContentToGallery, 
      setImageForWhiteboard, 
      setActiveModule,
      setImageForEditor,
      promptForGenerator,
      setPromptForGenerator
  } = useAppContext();
  
  const [prompt, setPrompt] = useState('A futuristic cityscape at sunset...');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isLoading, setIsLoading] = useState(false); // Represents the queue processor state
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isEnhancerOpen, setIsEnhancerOpen] = useState(false);
  const [promptQueue, setPromptQueue] = useState<QueueItem[]>([]);
  const currentlyGeneratingIdRef = useRef<string | null>(null);


  useEffect(() => {
    if (promptForGenerator) {
        setPrompt(promptForGenerator);
        setPromptForGenerator(null); // Clear after use
    }
  }, [promptForGenerator, setPromptForGenerator]);

  // Queue Processor Effect
  useEffect(() => {
    const processNextInQueue = async () => {
      if (isLoading) return; // Processor is busy

      const nextItem = promptQueue.find(item => item.status === 'queued');
      if (!nextItem) return; // No items to process

      setIsLoading(true);
      setError(null);
      currentlyGeneratingIdRef.current = nextItem.id;

      setPromptQueue(currentQueue => 
        currentQueue.map(item => 
            item.id === nextItem.id ? { ...item, status: 'generating' } : item
        )
      );

      try {
        const images = await generateImage(nextItem.prompt, nextItem.aspectRatio);

        setPromptQueue(currentQueue => {
            const itemToUpdate = currentQueue.find(item => item.id === nextItem.id);

            // Only update if the item is still in 'generating' state (i.e., not cancelled)
            if (itemToUpdate && itemToUpdate.status === 'generating') {
                if (images && images.length > 0) {
                    const imageUrl = images[0];
                    setGeneratedImage(imageUrl); // Display the latest generated image

                    const newContent: GeneratedContent = {
                        id: new Date().toISOString(),
                        type: 'image',
                        prompt: nextItem.prompt,
                        url: imageUrl,
                        createdAt: new Date(),
                    };
                    addContentToGallery(newContent);
                    
                    return currentQueue.map(item => 
                        item.id === nextItem.id ? { ...item, status: 'done', imageUrl } : item
                    );
                } else {
                     return currentQueue.map(item => 
                        item.id === nextItem.id ? { ...item, status: 'error' } : item
                    );
                }
            }
            return currentQueue; // If cancelled, return the queue as is
        });

      } catch (err) {
        setPromptQueue(currentQueue => {
             const itemToUpdate = currentQueue.find(item => item.id === nextItem.id);
             if (itemToUpdate && itemToUpdate.status === 'generating') {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                setError(errorMessage);
                return currentQueue.map(item => 
                    item.id === nextItem.id ? { ...item, status: 'error' } : item
                );
             }
             return currentQueue;
        });
      } finally {
        // Only unlock the processor if this was the active job and it wasn't cancelled
        if (currentlyGeneratingIdRef.current === nextItem.id) {
          setIsLoading(false); 
          currentlyGeneratingIdRef.current = null;
        }
      }
    };

    processNextInQueue();
  }, [promptQueue, isLoading, addContentToGallery]);

  const handleAddToQueue = () => {
    if (!prompt.trim() || promptQueue.length >= MAX_QUEUE_SIZE) {
      return;
    }
    const newItem: QueueItem = {
      id: new Date().toISOString() + Math.random(),
      prompt,
      aspectRatio,
      status: 'queued',
    };
    setPromptQueue(prev => [...prev, newItem]);
    // Don't clear prompt, user might want to make small adjustments
  };
  
  const handleCancelGeneration = (id: string) => {
    setPromptQueue(currentQueue =>
      currentQueue.map(item =>
        item.id === id && item.status === 'generating' ? { ...item, status: 'cancelled' } : item
      )
    );

    // If we are cancelling the currently active job, unlock the processor
    if (currentlyGeneratingIdRef.current === id) {
      setIsLoading(false);
      currentlyGeneratingIdRef.current = null;
    }
  };

  const handleRemoveFromQueue = (id: string) => {
    setPromptQueue(prev => prev.filter(item => item.id !== id && item.status !== 'generating'));
  };

  const handleClearQueue = () => {
    setPromptQueue(prev => prev.filter(item => item.status === 'generating'));
  };

  const isQueueFull = promptQueue.length >= MAX_QUEUE_SIZE;

  // If there's an image or queue, show the editor/result view. Otherwise, show the initial welcome screen.
  if (promptQueue.length === 0 && !generatedImage) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h2 className="text-4xl font-bold mb-2 text-white">Work_Flow</h2>
        <p className="text-neutral-400 mb-8">Start by generating an image with AI or uploading your own.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* Upload Box */}
          <div 
            onClick={() => {
              setImageForEditor(null); // Ensure editor starts fresh
              setActiveModule('editor');
            }} 
            className="bg-neutral-800/50 hover:bg-neutral-800 border-2 border-dashed border-neutral-700 hover:border-neutral-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
          >
            <UploadIcon className="w-12 h-12 text-neutral-500 mb-4" />
            <h3 className="text-xl font-semibold mb-1 text-white">Upload Image</h3>
            <p className="text-neutral-400">Click to browse or drag & drop</p>
          </div>
          {/* Generate Box */}
          <div className="bg-neutral-800/50 rounded-xl p-8 flex flex-col items-center justify-center gap-4">
            <h3 className="text-xl font-semibold text-white">Generate with AI</h3>
            <div className="relative w-full">
               <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A futuristic cityscape at sunset..."
                  className="w-full bg-neutral-700/50 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-neutral-700"
              />
              <button onClick={handleAddToQueue} className="absolute right-1 top-1 bottom-1 px-3 bg-neutral-600 hover:bg-neutral-500 rounded-md">
                <SparklesIcon className="w-5 h-5 text-purple-400" />
              </button>
            </div>
            <p className="text-xs text-neutral-500">Enter a prompt and hit the sparkle to start.</p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col md:flex-row gap-8 h-full p-6">
      <div className="w-full md:w-96 flex-shrink-0 flex flex-col gap-4 bg-neutral-950 p-4 border border-neutral-800 rounded-lg">
        <h3 className="text-xl font-bold">Image Generation</h3>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="prompt" className="block text-sm font-medium text-neutral-300">
              Prompt
            </label>
            <button 
              onClick={() => setIsEnhancerOpen(true)} 
              className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              title="Enhance prompt with AI"
            >
              <SparklesIcon /> Enhance
            </button>
          </div>
          <textarea
            id="prompt"
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-neutral-800 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-neutral-700"
            placeholder="Describe the image you want to create..."
          />
        </div>
        <div>
          <label htmlFor="aspectRatio" className="block text-sm font-medium text-neutral-300 mb-2">
            Aspect Ratio
          </label>
          <select
            id="aspectRatio"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className="w-full bg-neutral-800 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-neutral-700"
          >
            <option value="1:1">1:1 (Square)</option>
            <option value="16:9">16:9 (Widescreen)</option>
            <option value="9:16">9:16 (Portrait)</option>
            <option value="4:3">4:3 (Landscape)</option>
            <option value="3:4">3:4 (Tall)</option>
          </select>
        </div>
        <button
          onClick={handleAddToQueue}
          disabled={isLoading || isQueueFull || !prompt.trim()}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-purple-800/50 disabled:cursor-not-allowed text-lg transition-transform active:scale-95"
        >
          {isLoading ? "Processing..." : `Add to Queue (${promptQueue.length}/${MAX_QUEUE_SIZE})`}
        </button>

        <ImageGenerationQueue queue={promptQueue} onRemove={handleRemoveFromQueue} onClear={handleClearQueue} onCancel={handleCancelGeneration} />
        
        {error && <p className="text-red-400 mt-2">{error}</p>}
      </div>
      <div className="flex-1 bg-black rounded-lg flex items-center justify-center p-4">
        {isLoading && !generatedImage && (
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
            <p className="text-lg text-neutral-300">Starting the generation queue...</p>
          </div>
        )}
        {generatedImage && (
          <div className="flex flex-col items-center justify-center gap-2 h-full w-full">
            <img src={generatedImage} alt={prompt} className="max-h-[85%] max-w-full object-contain rounded-md" />
            <div className="flex gap-4 mt-2">
                <button
                    onClick={() => {setImageForWhiteboard(generatedImage); setActiveModule('whiteboard');}}
                    className="bg-neutral-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-neutral-600 transition-colors"
                >
                    To Whiteboard
                </button>
                <button
                    onClick={() => {setImageForEditor(generatedImage); setActiveModule('editor');}}
                    className="bg-neutral-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-neutral-600 transition-colors"
                >
                    To Editor
                </button>
            </div>
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

export default ImageGenerator;