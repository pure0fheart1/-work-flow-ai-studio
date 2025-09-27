import React, { useState } from 'react';
import { ImagePrompt } from '../../types.ts';
import { useAppContext } from '../../contexts/AppContext.tsx';

const ImagePromptList: React.FC = () => {
  const { setPromptForGenerator, setActiveModule } = useAppContext();
  const [prompts, setPrompts] = useState<ImagePrompt[]>([
    { id: '1', prompt: 'A hyperrealistic cat wearing a tiny wizard hat' },
    { id: '2', prompt: 'A floating island in the sky with waterfalls, Studio Ghibli style' },
  ]);
  const [newPrompt, setNewPrompt] = useState('');

  const handleAddPrompt = () => {
    if (!newPrompt.trim()) return;
    const newPromptItem: ImagePrompt = {
      id: new Date().toISOString(),
      prompt: newPrompt,
    };
    setPrompts([newPromptItem, ...prompts]);
    setNewPrompt('');
  };

  const handleUsePrompt = (prompt: string) => {
    setPromptForGenerator(prompt);
    setActiveModule('image');
  };
  
  const handleRemovePrompt = (id: string) => {
    setPrompts(prompts.filter(p => p.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6">Tasks</h2>
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
          placeholder="Add a new image idea or task..."
          className="flex-grow bg-neutral-800 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-neutral-700"
          onKeyDown={(e) => e.key === 'Enter' && handleAddPrompt()}
        />
        <button
          onClick={handleAddPrompt}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700"
        >
          Add Task
        </button>
      </div>

      <div className="space-y-3">
        {prompts.map(p => (
          <div
            key={p.id}
            className="bg-neutral-800/50 p-4 rounded-lg flex items-center justify-between border border-neutral-800"
          >
            <p className="text-lg flex-1 mr-4 text-neutral-200">{p.prompt}</p>
            <div className="flex items-center gap-2">
                <button onClick={() => handleUsePrompt(p.prompt)} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded-md">
                    Use
                </button>
                <button onClick={() => handleRemovePrompt(p.id)} className="text-neutral-500 hover:text-red-500 font-bold py-1 px-3">
                    &#x2715;
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImagePromptList;