import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext.tsx';
import { UndoIcon, RedoIcon, DownloadIcon, GalleryIcon, EditIcon, ImageIcon } from '../../components/Icons.tsx';
import { GeneratedContent } from '../../types.ts';


// ====================================================================================
// Data Structures & Types
// ====================================================================================
interface Point { x: number; y: number; }
interface Path {
  points: Point[];
  color: string;
  strokeWidth: number;
}
interface WhiteboardImage {
  id: string;
  element: HTMLImageElement;
  x: number; y: number;
  width: number; height: number;
  rotation: number;
}
interface TextObject {
  id:string;
  x: number; y: number;
  text: string;
  color: string;
  fontSize: number;
  fontFamily: string;
  width: number;
  rotation: number;
}
interface ViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
}
type Tool = 'pen' | 'eraser' | 'pan' | 'select' | 'text';
interface HistoryState {
  paths: Path[];
  images: WhiteboardImage[];
  textObjects: TextObject[];
}
type SelectedObject = { id: string; type: 'image' | 'text' } | null;
type InteractionHandle = 'br' | 'bl' | 'tr' | 'tl' | 'rotate';
type Interaction = { type: 'moving'; } | { type: 'resizing'; handle: InteractionHandle } | { type: 'rotating'; } | null;

// New types for multi-tab functionality
interface WhiteboardTab {
  id: string;
  name: string;
  history: HistoryState[];
  historyIndex: number;
  viewState: ViewState;
  backgroundColor: string;
}

// Serializable versions for localStorage
interface SerializableWhiteboardImage {
    id: string; src: string; x: number; y: number; width: number; height: number; rotation: number;
}
interface SerializableHistoryState {
    paths: Path[];
    images: SerializableWhiteboardImage[];
    textObjects: TextObject[];
}
interface SerializableWhiteboardTab {
    id: string;
    name: string;
    history: SerializableHistoryState[];
    historyIndex: number;
    viewState: ViewState;
    backgroundColor: string;
}

// ====================================================================================
// Constants
// ====================================================================================
const FULL_COLOR_PALETTE = {
    'Gray': ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'],
    'Red': ['#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'],
    'Orange': ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
    'Amber': ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
    'Yellow': ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12'],
    'Lime': ['#f7fee7', '#ecfccb', '#d9f99d', '#bef264', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212', '#365314'],
    'Green': ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
    'Emerald': ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
    'Teal': ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a'],
    'Cyan': ['#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#164e63', '#155e75'],
    'Sky': ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'],
    'Blue': ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
    'Indigo': ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'],
    'Violet': ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'],
    'Purple': ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87'],
    'Fuchsia': ['#fdf4ff', '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75'],
    'Pink': ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'],
    'Rose': ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337'],
};
const STROKE_SIZES = [2, 5, 10, 20, 40];
const HANDLE_SIZE = 10;
const ROTATE_HANDLE_OFFSET = 30;
const MAX_TABS = 10;

// ====================================================================================
// Helper Functions
// ====================================================================================
let tabCounter = 1;
const createNewTab = (name?: string): WhiteboardTab => ({
  id: new Date().toISOString() + Math.random(),
  name: name || `Board ${tabCounter++}`,
  history: [{ paths: [], images: [], textObjects: [] }],
  historyIndex: 0,
  viewState: { scale: 1, offsetX: 0, offsetY: 0 },
  backgroundColor: '#18181b', // zinc-900
});

// ====================================================================================
// Main Whiteboard Component
// ====================================================================================
const Whiteboard: React.FC = () => {
  const { imageForWhiteboard, setImageForWhiteboard, setImageForEditor, setActiveModule, settings, addContentToGallery } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const tabNameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [tabs, setTabs] = useState<WhiteboardTab[]>([createNewTab('Board 1')]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  
  const activeTab = tabs[activeTabIndex];
  const currentState = activeTab?.history[activeTab.historyIndex];
  const viewState = activeTab?.viewState;
  const backgroundColor = activeTab?.backgroundColor || '#18181b';

  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState<string>('#FFFFFF');
  const [strokeWidth, setStrokeWidth] = useState<number>(STROKE_SIZES[1]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedObject, setSelectedObject] = useState<SelectedObject>(null);
  const [isEditingText, setIsEditingText] = useState<TextObject | null>(null);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Refs for interactions to prevent re-renders on every mouse move
  const interactionRef = useRef<Interaction>(null);
  const startPointRef = useRef<Point | null>(null);
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<Path | null>(null);

  const canUndo = activeTab?.historyIndex > 0;
  const canRedo = activeTab && activeTab.historyIndex < activeTab.history.length - 1;
  
  // ====================================================================================
  // Auto-Save & Load Logic
  // ====================================================================================
  useEffect(() => {
    const autoSave = setInterval(() => {
      if (!isLoaded || tabs.length === 0) return;
      
      const serializableTabs = tabs.map(tab => ({
          ...tab,
          history: tab.history.map(state => ({
              paths: state.paths,
              textObjects: state.textObjects,
              images: state.images.map(img => ({
                  id: img.id, src: img.element.src, x: img.x, y: img.y,
                  width: img.width, height: img.height, rotation: img.rotation
              }))
          }))
      }));
      localStorage.setItem('whiteboardTabsState', JSON.stringify({ tabs: serializableTabs, activeTabIndex }));
    }, 30000);
    return () => clearInterval(autoSave);
  }, [tabs, activeTabIndex, isLoaded]);

  useEffect(() => {
    const loadState = async () => {
      const savedStateJSON = localStorage.getItem('whiteboardTabsState');
      if (savedStateJSON) {
        try {
          const savedState = JSON.parse(savedStateJSON);
          const newTabs: WhiteboardTab[] = await Promise.all(
            savedState.tabs.map(async (tabData: SerializableWhiteboardTab) => {
              const loadedHistory = await Promise.all(
                  tabData.history.map(async (state: SerializableHistoryState) => ({
                      paths: state.paths,
                      textObjects: state.textObjects || [],
                      images: await Promise.all(
                          state.images.map(imgData => new Promise<WhiteboardImage>((resolve, reject) => {
                              const img = new Image();
                              img.src = imgData.src;
                              img.onload = () => resolve({ ...imgData, element: img });
                              img.onerror = () => reject(new Error('Failed to load image'));
                          }))
                      )
                  }))
              );
              return { ...tabData, history: loadedHistory, backgroundColor: tabData.backgroundColor || '#18181b' };
            })
          );
          if (newTabs.length > 0) {
              setTabs(newTabs);
              setActiveTabIndex(savedState.activeTabIndex < newTabs.length ? savedState.activeTabIndex : 0);
          }
        } catch (error) {
          console.error("Failed to load whiteboard state:", error);
          localStorage.removeItem('whiteboardTabsState');
        }
      }
      setIsLoaded(true);
    };
    loadState();
  }, []);

  // ====================================================================================
  // Tab Management
  // ====================================================================================
   const handleAddTab = () => {
    if (tabs.length < MAX_TABS) {
      const newTab = createNewTab();
      setTabs([...tabs, newTab]);
      setActiveTabIndex(tabs.length);
    }
  };
  
  const handleCloseTab = (e: React.MouseEvent, indexToClose: number) => {
      e.stopPropagation();
      let newTabs = tabs.filter((_, index) => index !== indexToClose);
      if (newTabs.length === 0) {
          newTabs = [createNewTab()];
          setActiveTabIndex(0);
      } else if (activeTabIndex >= indexToClose && activeTabIndex > 0) {
          setActiveTabIndex(activeTabIndex - 1);
      }
      setTabs(newTabs);
  };
  
  const handleStartRename = (tabId: string) => {
    setRenamingTabId(tabId);
  };
  
  useEffect(() => {
    if (renamingTabId && tabNameInputRef.current) {
        tabNameInputRef.current.focus();
    }
  }, [renamingTabId]);

  const handleFinishRename = () => {
    if (!renamingTabId || !tabNameInputRef.current) return;
    const newName = tabNameInputRef.current.value.trim();
    if(newName) {
        setTabs(tabs.map(tab => tab.id === renamingTabId ? { ...tab, name: newName } : tab));
    }
    setRenamingTabId(null);
  };

  const handleBackgroundColorChange = (newColor: string) => {
    updateTabs(prev => {
        const newTabs = [...prev];
        const tab = {...newTabs[activeTabIndex]};
        tab.backgroundColor = newColor;
        newTabs[activeTabIndex] = tab;
        return newTabs;
    });
  };

  // ====================================================================================
  // Core State & History Management
  // ====================================================================================
  const updateTabs = (updater: (prevTabs: WhiteboardTab[]) => WhiteboardTab[]) => {
    setTabs(updater);
  };
  
  const recordNewState = useCallback((newState: HistoryState) => {
    updateTabs(prevTabs => {
        const newTabs = [...prevTabs];
        const tabToUpdate = { ...newTabs[activeTabIndex] };
        const newHistory = tabToUpdate.history.slice(0, tabToUpdate.historyIndex + 1);
        newHistory.push(newState);
        tabToUpdate.history = newHistory;
        tabToUpdate.historyIndex = newHistory.length - 1;
        newTabs[activeTabIndex] = tabToUpdate;
        return newTabs;
    });
  }, [activeTabIndex]);

  const updateCurrentState = useCallback((updater: (prevState: HistoryState) => HistoryState) => {
    updateTabs(prevTabs => {
        const newTabs = [...prevTabs];
        const tabToUpdate = { ...newTabs[activeTabIndex] };
        const currentHistory = tabToUpdate.history[tabToUpdate.historyIndex];
        tabToUpdate.history = [...tabToUpdate.history];
        tabToUpdate.history[tabToUpdate.historyIndex] = updater(currentHistory);
        newTabs[activeTabIndex] = tabToUpdate;
        return newTabs;
    });
  }, [activeTabIndex]);

  const handleUndo = useCallback(() => {
    updateTabs(prevTabs => {
      const newTabs = [...prevTabs];
      const tabToUpdate = { ...newTabs[activeTabIndex] };
      tabToUpdate.historyIndex = Math.max(0, tabToUpdate.historyIndex - 1);
      newTabs[activeTabIndex] = tabToUpdate;
      return newTabs;
    });
  }, [activeTabIndex]);

  const handleRedo = useCallback(() => {
     updateTabs(prevTabs => {
      const newTabs = [...prevTabs];
      const tabToUpdate = { ...newTabs[activeTabIndex] };
      tabToUpdate.historyIndex = Math.min(tabToUpdate.history.length - 1, tabToUpdate.historyIndex + 1);
      newTabs[activeTabIndex] = tabToUpdate;
      return newTabs;
    });
  }, [activeTabIndex]);

  useEffect(() => {
    setSelectedObject(null);
  }, [activeTabIndex]);

  // ====================================================================================
  // Canvas Drawing & Geometry Helpers
  // ====================================================================================
  const getCanvasPoint = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas || !viewState) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { 
        x: (clientX - rect.left - viewState.offsetX) / viewState.scale, 
        y: (clientY - rect.top - viewState.offsetY) / viewState.scale 
    };
  }, [viewState]);

  const getObjectBounds = (obj: WhiteboardImage | TextObject) => {
    const w = obj.width;
    const h = 'height' in obj ? obj.height : obj.fontSize * 1.5;
    const { x, y, rotation } = obj;
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const corners = [
      { x: x, y: y }, { x: x + w, y: y }, { x: x + w, y: y + h }, { x: x, y: y + h }
    ].map(p => rotatePoint(p, { x: centerX, y: centerY }, rotation));
    
    return {
        corners,
        handlePoints: {
            br: corners[2], bl: corners[3], tr: corners[1], tl: corners[0],
            rotate: rotatePoint({x: centerX, y: y - ROTATE_HANDLE_OFFSET}, {x: centerX, y: centerY}, rotation)
        }
    }
  };
  
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !currentState || !viewState) return;

    // Set background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { paths, images, textObjects } = currentState;
    ctx.save();
    ctx.translate(viewState.offsetX, viewState.offsetY);
    ctx.scale(viewState.scale, viewState.scale);

    images.forEach(img => {
      ctx.save();
      ctx.translate(img.x + img.width / 2, img.y + img.height / 2);
      ctx.rotate(img.rotation);
      ctx.drawImage(img.element, -img.width / 2, -img.height / 2, img.width, img.height);
      ctx.restore();
    });
    
    textObjects.forEach(txt => {
      if (isEditingText?.id === txt.id) return;
      ctx.save();
      ctx.translate(txt.x + txt.width / 2, txt.y + (txt.fontSize * 1.2) / 2);
      ctx.rotate(txt.rotation);
      ctx.fillStyle = txt.color;
      ctx.font = `${txt.fontSize}px ${txt.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt.text, 0, 0);
      ctx.restore();
    });

    const allPaths = isDrawingRef.current && currentPathRef.current ? [...paths, currentPathRef.current] : paths;
    allPaths.forEach(path => {
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) ctx.lineTo(path.points[i].x, path.points[i].y);
      ctx.stroke();
    });

    if (selectedObject && tool === 'select') {
      const obj = [...images, ...textObjects].find(o => o.id === selectedObject.id);
      if (obj) {
        const { corners, handlePoints } = getObjectBounds(obj);
        ctx.strokeStyle = '#a855f7'; // purple-500
        ctx.lineWidth = 2 / viewState.scale;
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        corners.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(corners[0].x + (corners[1].x - corners[0].x) / 2, corners[0].y + (corners[1].y - corners[0].y) / 2);
        ctx.lineTo(handlePoints.rotate.x, handlePoints.rotate.y);
        ctx.stroke();

        Object.values(handlePoints).forEach(p => {
          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.arc(p.x, p.y, HANDLE_SIZE / 2 / viewState.scale, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }
    ctx.restore();
  }, [currentState, viewState, selectedObject, tool, isEditingText, backgroundColor]);
  
  useEffect(redrawCanvas, [redrawCanvas]);
  
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const resizeObserver = new ResizeObserver(() => {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      redrawCanvas();
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [redrawCanvas]);

  // ====================================================================================
  // Math & Hit Detection Helpers
  // ====================================================================================
  const rotatePoint = (p: Point, center: Point, angle: number): Point => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const px = p.x - center.x;
    const py = p.y - center.y;
    return {
      x: px * cos - py * sin + center.x,
      y: px * sin + py * cos + center.y
    };
  };

  const getObjectAtPoint = (p: Point): { obj: WhiteboardImage | TextObject; handle: InteractionHandle | 'body' } | null => {
    if (!currentState) return null;
    const allObjects = [...currentState.images, ...currentState.textObjects];
    for (let i = allObjects.length - 1; i >= 0; i--) {
      const obj = allObjects[i];
      const h = 'height' in obj ? obj.height : obj.fontSize * 1.5;
      const center = { x: obj.x + obj.width / 2, y: obj.y + h / 2 };
      const localPoint = rotatePoint(p, center, -obj.rotation);
      
      if (selectedObject && selectedObject.id === obj.id) {
        const { handlePoints } = getObjectBounds(obj);
        for (const [key, hp] of Object.entries(handlePoints)) {
            const dist = Math.hypot(p.x - hp.x, p.y - hp.y);
            if (dist < (HANDLE_SIZE / viewState.scale)) {
                return { obj, handle: key as InteractionHandle };
            }
        }
      }

      if (localPoint.x >= obj.x && localPoint.x <= obj.x + obj.width && localPoint.y >= obj.y && localPoint.y <= obj.y + h) {
        return { obj, handle: 'body' };
      }
    }
    return null;
  };
  
  // ====================================================================================
  // Pointer/Input Event Handlers
  // ====================================================================================
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getCanvasPoint(e.clientX, e.clientY);
    startPointRef.current = point;
    setSelectedObject(null);

    if(isEditingText) {
        if(textInputRef.current && !textInputRef.current.contains(e.target as Node)) {
             handleFinishTextEdit();
        }
    }
    
    switch (tool) {
      case 'select':
        const hit = getObjectAtPoint(point);
        if (hit) {
          const { obj, handle } = hit;
          setSelectedObject({ id: obj.id, type: 'height' in obj ? 'image' : 'text' });
          if (handle === 'body') interactionRef.current = { type: 'moving' };
          else if (handle === 'rotate') interactionRef.current = { type: 'rotating' };
          else interactionRef.current = { type: 'resizing', handle };
          if (e.detail === 2 && 'text' in obj) setIsEditingText(obj);
        } else {
            setSelectedObject(null);
        }
        break;

      case 'text':
        const newText: TextObject = {
            id: new Date().toISOString(), text: 'New Text',
            x: point.x, y: point.y,
            color: color, fontSize: 32,
            fontFamily: settings.font, rotation: 0, width: 200
        };
        setIsEditingText(newText);
        break;
      
      case 'pan':
        interactionRef.current = {type: 'moving'};
        e.currentTarget.style.cursor = 'grabbing';
        break;

      case 'pen':
      case 'eraser':
        isDrawingRef.current = true;
        currentPathRef.current = {
          points: [point],
          color: tool === 'eraser' ? backgroundColor : color,
          strokeWidth,
        };
        break;
    }
  };
  
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!startPointRef.current || !activeTab) return;
    const point = getCanvasPoint(e.clientX, e.clientY);
    const dx = point.x - startPointRef.current.x;
    const dy = point.y - startPointRef.current.y;

    if (tool === 'pan') {
      if (interactionRef.current) {
        updateTabs(prev => {
          const newTabs = [...prev];
          const tab = {...newTabs[activeTabIndex]};
          tab.viewState = {...tab.viewState, offsetX: tab.viewState.offsetX + e.movementX, offsetY: tab.viewState.offsetY + e.movementY};
          newTabs[activeTabIndex] = tab;
          return newTabs;
        });
      }
      return;
    }
    
    if (isDrawingRef.current && currentPathRef.current) {
        currentPathRef.current.points.push(point);
        redrawCanvas();
        return;
    }

    if (!selectedObject || !interactionRef.current) return;
    const { type } = interactionRef.current;

    updateCurrentState(prev => {
        let newImages = [...prev.images];
        let newTextObjects = [...prev.textObjects];
        
        if (selectedObject.type === 'image') {
            const objIndex = newImages.findIndex(o => o.id === selectedObject.id);
            if (objIndex === -1) return prev;
            
            const obj = { ...newImages[objIndex] };
            const center = { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
            
            if(type === 'moving') { obj.x += dx; obj.y += dy; }
            else if(type === 'rotating') {
                const startAngle = Math.atan2(startPointRef.current!.y - center.y, startPointRef.current!.x - center.x);
                const currentAngle = Math.atan2(point.y - center.y, point.x - center.x);
                obj.rotation += currentAngle - startAngle;
            }
            newImages[objIndex] = obj;
        } else {
            const objIndex = newTextObjects.findIndex(o => o.id === selectedObject.id);
            if (objIndex === -1) return prev;

            const obj = { ...newTextObjects[objIndex] };
            const h = obj.fontSize * 1.5;
            const center = { x: obj.x + obj.width / 2, y: obj.y + h / 2 };
            
            if(type === 'moving') { obj.x += dx; obj.y += dy; }
            else if(type === 'rotating') {
                const startAngle = Math.atan2(startPointRef.current!.y - center.y, startPointRef.current!.x - center.x);
                const currentAngle = Math.atan2(point.y - center.y, point.x - center.x);
                obj.rotation += currentAngle - startAngle;
            }
            newTextObjects[objIndex] = obj;
        }
        
        return { ...prev, images: newImages, textObjects: newTextObjects };
    });
    startPointRef.current = point;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    if (tool === 'pan') e.currentTarget.style.cursor = 'grab';

    if (interactionRef.current) recordNewState(currentState);
    
    interactionRef.current = null;
    startPointRef.current = null;

    if (isDrawingRef.current) {
        isDrawingRef.current = false;
        if (currentPathRef.current && currentPathRef.current.points.length > 1) {
            recordNewState({ ...currentState, paths: [...currentState.paths, currentPathRef.current] });
        }
        currentPathRef.current = null;
    }
  };

  // ====================================================================================
  // Text Editing Logic
  // ====================================================================================
  useEffect(() => {
    if (isEditingText && textInputRef.current) {
      textInputRef.current.focus();
      textInputRef.current.value = isEditingText.text;
    }
  }, [isEditingText]);

  const handleFinishTextEdit = () => {
    if (!isEditingText) return;
    const newText = textInputRef.current?.value.trim() || '';
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    let finalWidth = isEditingText.width;
    if(ctx && newText) {
        ctx.font = `${isEditingText.fontSize}px ${isEditingText.fontFamily}`;
        finalWidth = ctx.measureText(newText).width;
    }
    
    const existingIndex = currentState.textObjects.findIndex(t => t.id === isEditingText.id);
    let newTextObjects = [...currentState.textObjects];

    if(newText) {
        const finalTextObject = { ...isEditingText, text: newText, width: finalWidth };
        if (existingIndex > -1) newTextObjects[existingIndex] = finalTextObject;
        else newTextObjects.push(finalTextObject);
    } else if (existingIndex > -1) {
        newTextObjects.splice(existingIndex, 1);
    }
    
    recordNewState({ ...currentState, textObjects: newTextObjects });
    setIsEditingText(null);
  };
  
  // ====================================================================================
  // Component Lifecycle & Side Effects
  // ====================================================================================
  useEffect(() => {
    if (imageForWhiteboard) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageForWhiteboard;
      img.onload = () => {
        const newImage: WhiteboardImage = {
          id: new Date().toISOString(), element: img, rotation: 0,
          x: (canvasRef.current!.width / 2 - 150 - viewState.offsetX) / viewState.scale,
          y: (canvasRef.current!.height / 2 - 150 - viewState.offsetY) / viewState.scale,
          width: 300, height: (300 * img.height) / img.width,
        };
        recordNewState({...currentState, images: [...currentState.images, newImage]});
      };
      setImageForWhiteboard(null);
    }
  }, [imageForWhiteboard, setImageForWhiteboard, viewState, recordNewState, currentState]);
  
  useEffect(() => {
    const handleShortcut = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail === 'whiteboard-undo') handleUndo();
        if (detail === 'whiteboard-redo') handleRedo();
    };
    document.addEventListener('app-shortcut', handleShortcut);
    return () => document.removeEventListener('app-shortcut', handleShortcut);
  }, [handleUndo, handleRedo]);
  
  const handleClear = () => {
    updateTabs(prev => {
        const newTabs = [...prev];
        const oldTabName = activeTab.name;
        newTabs[activeTabIndex] = createNewTab(oldTabName);
        // Keep old background color
        newTabs[activeTabIndex].backgroundColor = activeTab.backgroundColor;
        return newTabs;
    });
  };

  // ====================================================================================
  // Layering Logic
  // ====================================================================================
  const handleArrange = (direction: 'forward' | 'backward') => {
    if (!selectedObject || !currentState) return;

    const { images, textObjects } = currentState;
    let newImages = [...images];
    let newTextObjects = [...textObjects];
    let changed = false;

    if (selectedObject.type === 'image') {
        const index = newImages.findIndex(img => img.id === selectedObject.id);
        if (index > -1) {
            if (direction === 'forward' && index < newImages.length - 1) {
                [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]]; // Swap
                changed = true;
            } else if (direction === 'backward' && index > 0) {
                [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]]; // Swap
                changed = true;
            }
        }
    } else { // type === 'text'
        const index = newTextObjects.findIndex(txt => txt.id === selectedObject.id);
        if (index > -1) {
            if (direction === 'forward' && index < newTextObjects.length - 1) {
                [newTextObjects[index], newTextObjects[index + 1]] = [newTextObjects[index + 1], newTextObjects[index]];
                changed = true;
            } else if (direction === 'backward' && index > 0) {
                 [newTextObjects[index], newTextObjects[index - 1]] = [newTextObjects[index - 1], newTextObjects[index]];
                changed = true;
            }
        }
    }

    if (changed) {
        recordNewState({ ...currentState, images: newImages, textObjects: newTextObjects });
    }
  };

  // ====================================================================================
  // Export & Action Handlers
  // ====================================================================================
  const exportCanvasAsImage = async (): Promise<string> => {
    const { paths, images, textObjects } = currentState;
    if (!paths.length && !images.length && !textObjects.length) return '';

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    paths.forEach(path => path.points.forEach(p => {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }));
    
    [...images, ...textObjects].forEach(obj => {
        getObjectBounds(obj).corners.forEach(p => {
            minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        });
    });

    const PADDING = 20;
    const width = maxX - minX + PADDING * 2;
    const height = maxY - minY + PADDING * 2;
    
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) return '';
    
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    ctx.translate(-minX + PADDING, -minY + PADDING);
    
    images.forEach(img => {
      ctx.save();
      ctx.translate(img.x + img.width / 2, img.y + img.height / 2);
      ctx.rotate(img.rotation);
      ctx.drawImage(img.element, -img.width / 2, -img.height / 2, img.width, img.height);
      ctx.restore();
    });
    textObjects.forEach(txt => {
      ctx.save();
      ctx.translate(txt.x + txt.width / 2, txt.y + (txt.fontSize * 1.2) / 2);
      ctx.rotate(txt.rotation);
      ctx.fillStyle = txt.color;
      ctx.font = `${txt.fontSize}px ${txt.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt.text, 0, 0);
      ctx.restore();
    });
    paths.forEach(path => {
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (path.points.length > 0) ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) ctx.lineTo(path.points[i].x, path.points[i].y);
      ctx.stroke();
    });

    return offscreenCanvas.toDataURL('image/png');
  };

  const handleSaveAsImage = async () => {
      setIsExporting(true);
      const dataUrl = await exportCanvasAsImage();
      if (dataUrl) {
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `whiteboard-${activeTab.name.replace(/\s/g, '_')}-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
      setIsExporting(false);
  };
  
  const handleSendToGallery = async () => {
      setIsExporting(true);
      const dataUrl = await exportCanvasAsImage();
      if (dataUrl) {
          addContentToGallery({
              id: new Date().toISOString(), type: 'image',
              prompt: `Whiteboard Capture: ${activeTab.name}`,
              url: dataUrl, createdAt: new Date(),
          });
      }
      setIsExporting(false);
  };
  
  const handleSendToEditor = async () => {
      setIsExporting(true);
      const dataUrl = await exportCanvasAsImage();
      if (dataUrl) {
          setImageForEditor(dataUrl);
          setActiveModule('editor');
      }
      setIsExporting(false);
  };

  const addImageFromFile = (src: string) => {
    const canvas = canvasRef.current;
    if (!canvas || !viewState) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        const canvasAspect = canvasWidth / canvasHeight;
        const imageAspect = img.width / img.height;

        let newWidth, newHeight;

        // "cover" logic: fill the viewport, letting the image overflow
        if (imageAspect > canvasAspect) { // Image is wider than canvas viewport
            newHeight = canvasHeight / viewState.scale;
            newWidth = newHeight * imageAspect;
        } else { // Image is taller or same aspect
            newWidth = canvasWidth / viewState.scale;
            newHeight = newWidth / imageAspect;
        }

        const viewportX = -viewState.offsetX / viewState.scale;
        const viewportY = -viewState.offsetY / viewState.scale;
        const viewportWidth = canvasWidth / viewState.scale;
        const viewportHeight = canvasHeight / viewState.scale;
        
        const newX = viewportX + (viewportWidth - newWidth) / 2;
        const newY = viewportY + (viewportHeight - newHeight) / 2;

        const newImage: WhiteboardImage = {
            id: new Date().toISOString(),
            element: img,
            rotation: 0,
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
        };
        recordNewState({ ...currentState, images: [...currentState.images, newImage] });
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
                addImageFromFile(dataUrl);
            }
        };
        reader.readAsDataURL(file);
    }
    // Reset input value to allow selecting the same file again
    if(e.target) e.target.value = '';
  };

  // ====================================================================================
  // Render Method
  // ====================================================================================
  if (!activeTab) { // Should not happen if logic is correct, but a good safeguard
    return <div className="flex items-center justify-center h-full w-full">Loading...</div>;
  }
  return (
    <div className="flex flex-row h-full w-full gap-4 p-4">
      <div className="flex-1 h-full flex flex-col">
        {/* Tab Bar UI */}
        <div className="flex-shrink-0 flex items-center border-b border-neutral-800 bg-neutral-900">
          <div className="flex-1 flex items-center overflow-x-auto">
            {tabs.map((tab, index) => (
              <div
                key={tab.id}
                onClick={() => setActiveTabIndex(index)}
                onDoubleClick={() => handleStartRename(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 border-r border-neutral-800 cursor-pointer whitespace-nowrap transition-colors duration-200 ${
                  activeTabIndex === index ? 'bg-neutral-800 text-white' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                {renamingTabId === tab.id ? (
                   <input
                        ref={tabNameInputRef}
                        type="text"
                        defaultValue={tab.name}
                        onBlur={handleFinishRename}
                        onKeyDown={e => e.key === 'Enter' && handleFinishRename()}
                        className="bg-neutral-700 text-white p-0.5 rounded-sm outline-none w-24"
                    />
                ) : (
                    <span className="max-w-xs truncate">{tab.name}</span>
                )}
                <button
                    onClick={(e) => handleCloseTab(e, index)}
                    className="w-5 h-5 flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-700 hover:text-white"
                >
                    &#x2715;
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleAddTab}
            disabled={tabs.length >= MAX_TABS}
            className="px-4 py-2 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add new board"
          >
            +
          </button>
        </div>
        
        {/* Whiteboard Canvas */}
        <div ref={containerRef} className="flex-1 h-full bg-neutral-900 rounded-b-lg overflow-hidden relative" style={{ backgroundColor }}>
          <canvas
            ref={canvasRef}
            className={`w-full h-full ${tool === 'pan' ? 'cursor-grab' : tool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          {isEditingText && (
            <textarea
              ref={textInputRef}
              onBlur={handleFinishTextEdit}
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) handleFinishTextEdit(); }}
              className="absolute bg-transparent outline-none resize-none p-0 border-dashed border border-purple-500"
              style={{
                  left: isEditingText.x * viewState.scale + viewState.offsetX,
                  top: isEditingText.y * viewState.scale + viewState.offsetY,
                  font: `${isEditingText.fontSize * viewState.scale}px ${isEditingText.fontFamily}`,
                  color: isEditingText.color,
                  width: (isEditingText.width + 20) * viewState.scale,
                  height: (isEditingText.fontSize * 1.5) * viewState.scale,
                  transform: `rotate(${isEditingText.rotation}rad)`,
                  transformOrigin: 'top left',
              }}
            />
          )}
        </div>
      </div>

       <div className="w-64 bg-neutral-950 p-4 flex flex-col gap-y-6 overflow-y-auto border border-neutral-800 rounded-lg">
          <div>
              <h4 className="font-semibold mb-3 text-neutral-400 uppercase tracking-wider text-sm">Tools</h4>
              <div className="grid grid-cols-2 gap-2 mt-2">
                  <button onClick={() => setTool('select')} className={`px-3 py-2 rounded-md transition-colors ${tool === 'select' ? 'bg-purple-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'}`}>Select</button>
                  <button onClick={() => setTool('text')} className={`px-3 py-2 rounded-md transition-colors ${tool === 'text' ? 'bg-purple-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'}`}>Text</button>
                  <button onClick={() => setTool('pen')} className={`px-3 py-2 rounded-md transition-colors ${tool === 'pen' ? 'bg-purple-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'}`}>Pen</button>
                  <button onClick={() => setTool('eraser')} className={`px-3 py-2 rounded-md transition-colors ${tool === 'eraser' ? 'bg-purple-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'}`}>Eraser</button>
                  <button onClick={() => setTool('pan')} className={`w-full col-span-2 px-3 py-2 rounded-md transition-colors ${tool === 'pan' ? 'bg-purple-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'}`}>Pan</button>
              </div>
          </div>
          <div>
              <h4 className="font-semibold mb-3 text-neutral-400 uppercase tracking-wider text-sm">Arrange</h4>
              <div className="grid grid-cols-2 gap-2 mt-2">
                  <button onClick={() => handleArrange('forward')} disabled={!selectedObject} className="px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed">Bring Forward</button>
                  <button onClick={() => handleArrange('backward')} disabled={!selectedObject} className="px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed">Send Backward</button>
              </div>
          </div>
          <div>
              <h4 className="font-semibold mb-3 text-neutral-400 uppercase tracking-wider text-sm">Brush</h4>
              <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                  {Object.values(FULL_COLOR_PALETTE).flat().map(c => (
                      <button key={c} onClick={() => setColor(c)} style={{ backgroundColor: c }} className={`w-6 h-6 rounded-full transition-transform transform hover:scale-110 ${color === c && (tool === 'pen' || tool === 'text') ? 'ring-2 ring-offset-2 ring-offset-neutral-950 ring-white' : ''}`} aria-label={`Color ${c}`} />
                  ))}
              </div>
               <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="#FFFFFF" className="w-full mt-2 bg-neutral-800 p-1 rounded text-center text-sm" />

              <div className="flex justify-between items-center bg-neutral-800 p-1 rounded-md mt-4">
                  {STROKE_SIZES.map(size => (
                      <button key={size} onClick={() => setStrokeWidth(size)} className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${strokeWidth === size ? 'bg-purple-600' : 'hover:bg-neutral-700'}`} aria-label={`Brush size ${size}`}>
                          <div style={{ width: `${size / 1.5}px`, height: `${size / 1.5}px` }} className="bg-white rounded-full"/>
                      </button>
                  ))}
              </div>
          </div>
          <div>
              <h4 className="font-semibold mb-3 text-neutral-400 uppercase tracking-wider text-sm">Background</h4>
              <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                  {Object.values(FULL_COLOR_PALETTE).flat().map(c => (
                      <button key={`bg-${c}`} onClick={() => handleBackgroundColorChange(c)} style={{ backgroundColor: c }} className={`w-6 h-6 rounded-full transition-transform transform hover:scale-110 ${backgroundColor === c ? 'ring-2 ring-offset-2 ring-offset-neutral-950 ring-white' : ''}`} aria-label={`Background Color ${c}`} />
                  ))}
              </div>
              <input type="text" value={backgroundColor} onChange={(e) => handleBackgroundColorChange(e.target.value)} placeholder="#0f172a" className="w-full mt-2 bg-neutral-800 p-1 rounded text-center text-sm" />
          </div>
          <div>
              <h4 className="font-semibold mb-3 text-neutral-400 uppercase tracking-wider text-sm">History</h4>
              <div className="flex gap-2 mt-2">
                  <button onClick={handleUndo} disabled={!canUndo} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed">
                      <UndoIcon /> Undo
                  </button>
                  <button onClick={handleRedo} disabled={!canRedo} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed">
                      Redo <RedoIcon />
                  </button>
              </div>
          </div>
          <div className="mt-auto pt-6 border-t border-neutral-800">
               <h4 className="font-semibold mb-3 text-neutral-400 uppercase tracking-wider text-sm">Actions</h4>
              <div className="flex flex-col gap-2 mt-2">
                   <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                   <button onClick={() => fileInputRef.current?.click()} disabled={isExporting} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed">
                       <ImageIcon/> Add Image
                   </button>
                   <button onClick={handleSaveAsImage} disabled={isExporting} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed">
                       <DownloadIcon/> {isExporting ? 'Saving...' : 'Save as Image'}
                   </button>
                   <button onClick={handleSendToGallery} disabled={isExporting} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed">
                       <GalleryIcon/> {isExporting ? 'Sending...' : 'To Gallery'}
                   </button>
                   <button onClick={handleSendToEditor} disabled={isExporting} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed">
                       <EditIcon/> {isExporting ? 'Sending...' : 'To Editor'}
                   </button>
                   <button onClick={handleClear} className="w-full mt-4 px-3 py-2 bg-red-800 text-white rounded-md hover:bg-red-700 font-semibold">
                        Clear This Board
                   </button>
              </div>
          </div>
      </div>
    </div>
  );
};
export default Whiteboard;