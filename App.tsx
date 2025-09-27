import React, { useCallback, useState, useEffect, lazy, Suspense } from 'react';
import { AppProvider, useAppContext } from './contexts/AppContext.tsx';
import { WhiteboardIcon, ImageIcon, GalleryIcon, ListIcon, EditIcon, SettingsIcon, NotesIcon, VideoIcon, ChatIcon, CameraIcon, PublicGalleryIcon } from './components/Icons.tsx';
import { Module } from './types.ts';
import Gateway from './modules/gateway/Gateway.tsx';

const Whiteboard = lazy(() => import('./modules/whiteboard/Whiteboard.tsx'));
const ImagePromptList = lazy(() => import('./modules/taskManager/TaskManager.tsx'));
const ImageGenerator = lazy(() => import('./modules/imageGenerator/ImageGenerator.tsx'));
const VideoGenerator = lazy(() => import('./modules/videoGenerator/VideoGenerator.tsx'));
const Gallery = lazy(() => import('./modules/gallery/Gallery.tsx'));
const PublicGallery = lazy(() => import('./modules/publicGallery/PublicGallery.tsx'));
const HandwrittenNotes = lazy(() => import('./modules/handwrittenNotes/HandwrittenNotes.tsx'));
const GeminiChat = lazy(() => import('./modules/geminiChat/GeminiChat.tsx'));
const ImageEditor = lazy(() => import('./modules/imageEditor/ImageEditor.tsx'));
const Settings = lazy(() => import('./modules/settings/Settings.tsx'));
const PhotoBooth = lazy(() => import('./modules/photobooth/PhotoBooth.tsx'));

const ModuleLoader: React.FC = () => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      <p className="text-lg text-neutral-400">Loading Module...</p>
    </div>
  </div>
);

const MODULES: Record<Module, { component: React.LazyExoticComponent<React.FC<{}>>; name: string; icon: JSX.Element; }> = {
  gallery: { component: Gallery, name: 'Gallery', icon: <GalleryIcon /> },
  publicGallery: { component: PublicGallery, name: 'Public', icon: <PublicGalleryIcon /> },
  whiteboard: { component: Whiteboard, name: 'Whiteboard', icon: <WhiteboardIcon /> },
  image: { component: ImageGenerator, name: 'Generate', icon: <ImageIcon /> },
  video: { component: VideoGenerator, name: 'Video', icon: <VideoIcon /> },
  editor: { component: ImageEditor, name: 'Edit', icon: <EditIcon /> },
  photobooth: { component: PhotoBooth, name: 'Photo Booth', icon: <CameraIcon /> },
  geminiChat: { component: GeminiChat, name: 'AI Assistant', icon: <ChatIcon /> },
  notes: { component: HandwrittenNotes, name: 'Notes', icon: <NotesIcon /> },
  prompts: { component: ImagePromptList, name: 'Tasks', icon: <ListIcon /> },
  settings: { component: Settings, name: 'Settings', icon: <SettingsIcon /> },
};

const AppContent: React.FC = () => {
  const { activeModule, setActiveModule, settings, shortcuts, moduleOrder, setModuleOrder } = useAppContext();
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    const formatEventToString = (e: KeyboardEvent): string => {
        const parts: string[] = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        
        let key = e.key.toLowerCase();
        if (key === ' ') key = 'Space';

        if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
            parts.push(key.charAt(0).toUpperCase() + key.slice(1));
        }

        if (parts.length > 0 && parts.length === (e.ctrlKey ? 1 : 0) + (e.altKey ? 1 : 0) + (e.shiftKey ? 1 : 0)) {
            return '';
        }
        return parts.join(' + ');
    };

    const actionMap = Object.entries(shortcuts).reduce((acc, [action, key]) => {
        if (key) acc[key] = action;
        return acc;
    }, {} as Record<string, string>);
    
    if (shortcuts.whiteboardRedo === 'Ctrl + Y') {
        actionMap['Ctrl + Shift + Z'] = 'whiteboardRedo';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (['INPUT', 'TEXTAREA', 'SELECT', 'DIV'].includes(target.tagName) && target.isContentEditable) return;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;


        const keyString = formatEventToString(e);
        if (!keyString) return;

        const action = actionMap[keyString];
        if (!action) return;
        
        let handled = false;
        switch (action) {
            case 'newWhiteboard': setActiveModule('whiteboard'); handled = true; break;
            case 'openGallery': setActiveModule('gallery'); handled = true; break;
            case 'whiteboardUndo':
                if (activeModule === 'whiteboard') {
                    document.dispatchEvent(new CustomEvent('app-shortcut', { detail: 'whiteboard-undo' }));
                    handled = true;
                }
                break;
            case 'whiteboardRedo':
                 if (activeModule === 'whiteboard') {
                    document.dispatchEvent(new CustomEvent('app-shortcut', { detail: 'whiteboard-redo' }));
                    handled = true;
                }
                break;
            case 'toggleDictation':
                if (activeModule === 'notes') {
                     document.dispatchEvent(new CustomEvent('app-shortcut', { detail: 'notes-toggle-dictation' }));
                     handled = true;
                }
                break;
        }
        if (handled) e.preventDefault();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeModule, setActiveModule, shortcuts]);
  
  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, index: number) => {
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLButtonElement>, index: number) => {
    e.preventDefault();
    if (draggingIndex !== null && draggingIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (draggingIndex === null || dragOverIndex === null || draggingIndex === dragOverIndex) {
      setDraggingIndex(null);
      setDragOverIndex(null);
      return;
    }
    
    const newModuleOrder = [...moduleOrder];
    const [draggedItem] = newModuleOrder.splice(draggingIndex, 1);
    newModuleOrder.splice(dragOverIndex, 0, draggedItem);
    
    setModuleOrder(newModuleOrder);
    setDraggingIndex(null);
    setDragOverIndex(null);
  };
  
  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const ActiveComponent = MODULES[activeModule].component;
  const textSizeClasses = { sm: 'text-sm', base: 'text-base', lg: 'text-lg' };

  return (
    <div className={`flex flex-col h-screen bg-black text-neutral-200 ${settings.font} ${textSizeClasses[settings.textSize]}`}>
      <header className="flex-shrink-0 bg-black border-b border-neutral-800 px-6 h-16 flex items-center gap-8">
        <h1 className="text-2xl font-bold text-white">Work_Flow</h1>
        <nav className="flex items-center h-full gap-6">
          {moduleOrder.map((key, index) => {
            const moduleInfo = MODULES[key];
            const isActive = activeModule === key;
            return (
              <button
                key={key}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onDragLeave={() => setDragOverIndex(null)}
                onClick={() => setActiveModule(key)}
                className={`h-full flex items-center gap-2 text-md font-medium transition-all duration-200 border-b-2 px-2 rounded-t-sm cursor-grab ${
                  isActive
                    ? 'text-white border-purple-500'
                    : 'text-neutral-400 border-transparent hover:text-white'
                } ${
                  draggingIndex === index ? 'opacity-30' : ''
                } ${
                  dragOverIndex === index ? 'bg-neutral-800' : ''
                }`}
              >
                <span className="text-current">{moduleInfo.icon}</span>
                {moduleInfo.name}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto bg-neutral-900 animate-fade-in" key={activeModule}>
        <Suspense fallback={<ModuleLoader />}>
          <ActiveComponent />
        </Suspense>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(sessionStorage.getItem('isAuthenticated') === 'true');

  const handleLoginSuccess = () => {
    sessionStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <Gateway onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;