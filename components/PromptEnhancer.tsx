import React, { useState, useEffect } from 'react';
import { enhancePrompt } from '../services/geminiService.ts';
import { SparklesIcon } from './Icons.tsx';

interface PromptEnhancerProps {
    initialPrompt: string;
    onEnhance: (newPrompt: string) => void;
}

export const PromptEnhancer: React.FC<PromptEnhancerProps> = ({ initialPrompt, onEnhance }) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
      setPrompt(initialPrompt);
  }, [initialPrompt]);

  const handleEnhance = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setEnhancedPrompt('');
    try {
      const result = await enhancePrompt(prompt);
      setEnhancedPrompt(result);
    } catch (error) {
      console.error("Failed to enhance prompt:", error);
      setEnhancedPrompt("Sorry, an error occurred while enhancing the prompt.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUsePrompt = () => {
      if(enhancedPrompt) {
          onEnhance(enhancedPrompt);
      }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Initial Prompt Section */}
        <div className="flex flex-col">
          <label htmlFor="initial-prompt-enhancer" className="text-lg font-semibold mb-2">Your Idea</label>
          <textarea
            id="initial-prompt-enhancer"
            rows={8}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a simple idea, e.g., 'a cat in space'"
            className="flex-grow bg-neutral-800 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none border border-neutral-700"
          />
        </div>

        {/* Enhanced Prompt Section */}
        <div className="flex flex-col">
          <label htmlFor="enhanced-prompt-enhancer" className="text-lg font-semibold mb-2">AI Enhanced Prompt</label>
          <div className="relative flex-grow">
            <textarea
              id="enhanced-prompt-enhancer"
              rows={8}
              value={isLoading ? 'Enhancing...' : enhancedPrompt}
              readOnly
              placeholder="Your enhanced prompt will appear here..."
              className="w-full h-full bg-black text-white p-3 rounded-lg focus:outline-none resize-none border border-neutral-800"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-4">
        <button
          onClick={handleEnhance}
          disabled={isLoading || !prompt}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-purple-800/50 disabled:cursor-not-allowed text-lg transition-transform transform hover:scale-105 flex items-center gap-2"
        >
          <SparklesIcon />
          {isLoading ? 'Enhancing...' : 'Enhance'}
        </button>
        <button
          onClick={handleUsePrompt}
          disabled={!enhancedPrompt || isLoading}
          className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-lg"
        >
          Use this Prompt
        </button>
      </div>
    </div>
  );
};