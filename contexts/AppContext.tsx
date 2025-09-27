import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { GeneratedContent, Module, ImagePrompt, Settings, Shortcuts } from '../types.ts';

const DEFAULT_SHORTCUTS: Shortcuts = {
  newWhiteboard: 'Ctrl + N',
  openGallery: 'Ctrl + G',
  whiteboardUndo: 'Ctrl + Z',
  whiteboardRedo: 'Ctrl + Y',
  toggleDictation: 'Ctrl + Space',
};

// The default order of modules in the navigation bar.
const DEFAULT_MODULE_ORDER: Module[] = [
  'gallery',
  'publicGallery',
  'whiteboard',
  'image',
  'video',
  'editor',
  'photobooth',
  'geminiChat',
  'notes',
  'prompts',
  'settings',
];

interface AppContextType {
  galleryContent: GeneratedContent[];
  addContentToGallery: (content: GeneratedContent) => void;
  publicGalleryContent: GeneratedContent[];
  shareToPublicGallery: (contentId: string) => void;
  removeFromPublicGallery: (contentId: string) => void;
  imageForWhiteboard: string | null;
  setImageForWhiteboard: (url: string | null) => void;
  imageForEditor: string | null;
  setImageForEditor: (url: string | null) => void;
  promptForGenerator: string | null;
  setPromptForGenerator: (prompt: string | null) => void;
  activeModule: Module;
  setActiveModule: (module: Module) => void;
  settings: Settings;
  setSettings: (settings: Settings) => void;
  shortcuts: Shortcuts;
  setShortcuts: React.Dispatch<React.SetStateAction<Shortcuts>>;
  resetShortcuts: () => void;
  moduleOrder: Module[];
  setModuleOrder: (order: Module[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [galleryContent, setGalleryContent] = useState<GeneratedContent[]>([]);
  const [publicGalleryContent, setPublicGalleryContent] = useState<GeneratedContent[]>([]);
  const [imageForWhiteboard, setImageForWhiteboard] = useState<string | null>(null);
  const [imageForEditor, setImageForEditor] = useState<string | null>(null);
  const [promptForGenerator, setPromptForGenerator] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<Module>('gallery');
  const [settings, setSettings] = useState<Settings>({ font: 'font-sans', textSize: 'base' });
  
  const [shortcuts, setShortcuts] = useState<Shortcuts>(() => {
    try {
        const saved = localStorage.getItem('shortcuts');
        return saved ? JSON.parse(saved) : DEFAULT_SHORTCUTS;
    } catch {
        return DEFAULT_SHORTCUTS;
    }
  });

  const [moduleOrder, setModuleOrder] = useState<Module[]>(() => {
    try {
        const savedOrder = localStorage.getItem('moduleOrder');
        const parsedOrder = savedOrder ? JSON.parse(savedOrder) : DEFAULT_MODULE_ORDER;
        
        const defaultSet = new Set(DEFAULT_MODULE_ORDER);
        const parsedSet = new Set(parsedOrder);
        if (defaultSet.size !== parsedSet.size || ![...defaultSet].every(item => parsedSet.has(item))) {
            return DEFAULT_MODULE_ORDER;
        }

        return parsedOrder;
    } catch {
        return DEFAULT_MODULE_ORDER;
    }
  });
  
  // Load gallery content from localStorage on mount
  useEffect(() => {
    try {
        const savedPrivateContent = localStorage.getItem('galleryContent');
        if (savedPrivateContent) {
            const parsedContent = JSON.parse(savedPrivateContent).map((item: any) => ({
                ...item,
                createdAt: new Date(item.createdAt),
            }));
            setGalleryContent(parsedContent);
        }
        const savedPublicContent = localStorage.getItem('publicGalleryContent');
        if (savedPublicContent) {
            const parsedContent = JSON.parse(savedPublicContent).map((item: any) => ({
                ...item,
                createdAt: new Date(item.createdAt),
            }));
            setPublicGalleryContent(parsedContent);
        }
    } catch {
        // Handle potential parsing errors
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);

  useEffect(() => {
    localStorage.setItem('moduleOrder', JSON.stringify(moduleOrder));
  }, [moduleOrder]);

  useEffect(() => {
    localStorage.setItem('galleryContent', JSON.stringify(galleryContent));
  }, [galleryContent]);

  useEffect(() => {
    localStorage.setItem('publicGalleryContent', JSON.stringify(publicGalleryContent));
  }, [publicGalleryContent]);

  const resetShortcuts = () => {
    setShortcuts(DEFAULT_SHORTCUTS);
  };

  const addContentToGallery = (content: GeneratedContent) => {
    setGalleryContent((prevContent) => [content, ...prevContent]);
  };
  
  const shareToPublicGallery = (contentId: string) => {
      const itemToShare = galleryContent.find(item => item.id === contentId);
      if (itemToShare && !publicGalleryContent.some(item => item.id === contentId)) {
          setPublicGalleryContent(prev => [{ ...itemToShare, isShared: true }, ...prev]);
          setGalleryContent(prev => prev.map(item => 
              item.id === contentId ? { ...item, isShared: true } : item
          ));
      }
  };

  const removeFromPublicGallery = (contentId: string) => {
      setPublicGalleryContent(prev => prev.filter(item => item.id !== contentId));
      setGalleryContent(prev => prev.map(item => 
          item.id === contentId ? { ...item, isShared: false } : item
      ));
  };

  return (
    <AppContext.Provider
      value={{
        galleryContent,
        addContentToGallery,
        publicGalleryContent,
        shareToPublicGallery,
        removeFromPublicGallery,
        imageForWhiteboard,
        setImageForWhiteboard,
        imageForEditor,
        setImageForEditor,
        promptForGenerator,
        setPromptForGenerator,
        activeModule,
        setActiveModule,
        settings,
        setSettings,
        shortcuts,
        setShortcuts,
        resetShortcuts,
        moduleOrder,
        setModuleOrder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
