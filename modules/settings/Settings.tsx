import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';

// Helper to format a keyboard event into a consistent, readable string
const formatShortcut = (e: KeyboardEvent): string => {
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    
    let key = e.key.toLowerCase();
    if (key === ' ') {
        key = 'Space';
    }

    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
        parts.push(key.charAt(0).toUpperCase() + key.slice(1));
    }
    
    if (parts.length > 0 && parts.length === (e.ctrlKey ? 1 : 0) + (e.altKey ? 1 : 0) + (e.shiftKey ? 1 : 0)) {
        return '';
    }

    return parts.join(' + ');
};

// User-friendly labels for each shortcut action
const SHORTCUT_LABELS: Record<string, string> = {
  newWhiteboard: 'New Whiteboard',
  openGallery: 'Open Gallery',
  whiteboardUndo: 'Whiteboard: Undo',
  whiteboardRedo: 'Whiteboard: Redo',
  toggleDictation: 'Notes: Toggle Dictation',
};

const Settings: React.FC = () => {
    const { settings, setSettings, shortcuts, setShortcuts, resetShortcuts } = useAppContext();
    const [editingAction, setEditingAction] = useState<string | null>(null);

    const handleTextSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSettings({ ...settings, textSize: e.target.value as 'sm' | 'base' | 'lg' });
    };

    const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSettings({ ...settings, font: e.target.value });
    };
    
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (!editingAction) return;
      e.preventDefault();
      e.stopPropagation();

      const newShortcut = formatShortcut(e);
      if (newShortcut) {
          setShortcuts(prev => ({
              ...prev,
              [editingAction]: newShortcut
          }));
      }
      setEditingAction(null);
    }, [editingAction, setShortcuts]);

    useEffect(() => {
        if (editingAction) {
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [editingAction, handleKeyDown]);

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h2 className="text-3xl font-bold mb-6">Settings</h2>
            <div className="space-y-6 bg-neutral-950 p-6 rounded-lg border border-neutral-800">
                <div className="flex items-center justify-between">
                    <label htmlFor="font-select" className="text-lg">Font Family</label>
                    <select
                        id="font-select"
                        value={settings.font}
                        onChange={handleFontChange}
                        className="bg-neutral-800 text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-neutral-700"
                    >
                        <option value="font-sans">Sans-Serif (Default)</option>
                        <option value="font-serif">Serif</option>
                        <option value="font-mono">Monospace</option>
                        <option value="font-handwriting">Handwriting (Caveat)</option>
                        <option value="font-cursive">Cursive (Dancing Script)</option>
                    </select>
                </div>
                <div className="flex items-center justify-between">
                    <label htmlFor="text-size-select" className="text-lg">Base Text Size</label>
                     <select
                        id="text-size-select"
                        value={settings.textSize}
                        onChange={handleTextSizeChange}
                        className="bg-neutral-800 text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-neutral-700"
                    >
                        <option value="sm">Small</option>
                        <option value="base">Medium (Default)</option>
                        <option value="lg">Large</option>
                    </select>
                </div>
            </div>
            
            <div className="mt-10 pt-8 border-t border-neutral-800">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold">Keyboard Shortcuts</h3>
                    <button
                        onClick={resetShortcuts}
                        className="px-4 py-2 bg-neutral-700 text-white font-semibold rounded-lg hover:bg-neutral-600 transition-colors text-sm"
                    >
                        Reset to Defaults
                    </button>
                </div>
                <div className="space-y-3 bg-neutral-950 p-6 rounded-lg border border-neutral-800">
                  {Object.entries(SHORTCUT_LABELS).map(([action]) => (
                    <div key={action} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                        <span className="text-lg">{SHORTCUT_LABELS[action]}</span>
                        <div className="flex items-center gap-4">
                            <span className="px-3 py-1 bg-neutral-700 rounded-md text-neutral-300 font-mono min-w-[120px] text-center">
                                {shortcuts[action]}
                            </span>
                            <button 
                                onClick={() => setEditingAction(action)}
                                className="w-28 text-center px-4 py-1 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                {editingAction === action ? 'Listening...' : 'Change'}
                            </button>
                        </div>
                    </div>
                  ))}
                </div>
            </div>
        </div>
    );
};

export default Settings;