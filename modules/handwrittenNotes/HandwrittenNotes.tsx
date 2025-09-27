import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TrashIcon, PlusCircleIcon, SaveIcon, CheckCircleIcon, ClockIcon } from '../../components/Icons.tsx';

// ====================================================================================
// Types & Interfaces
// ====================================================================================
interface SpeechRecognition extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string;
  start: () => void; stop: () => void; abort: () => void;
  onstart: () => void; onresult: (event: any) => void; onerror: (event: any) => void; onend: () => void;
}
declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition };
    webkitSpeechRecognition: { new (): SpeechRecognition };
  }
}

interface Note {
  id: string;
  title: string;
  content: string; // Stored as HTML string
  createdAt: number;
  updatedAt: number;
}
type SaveStatus = 'saved' | 'unsaved' | 'saving';

// ====================================================================================
// Main Component
// ====================================================================================
const HandwrittenNotes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  // Styling state
  const [handwritingStyle, setHandwritingStyle] = useState<'font-handwriting' | 'font-cursive' | 'font-indie'>('font-handwriting');
  const [fontSize, setFontSize] = useState<number>(36);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const userStoppedRef = useRef<boolean>(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId), [notes, activeNoteId]);

  // Load notes from localStorage on initial render
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('workflow-notes');
      const loadedNotes: Note[] = savedNotes ? JSON.parse(savedNotes) : [];
      if (loadedNotes.length > 0) {
        setNotes(loadedNotes);
        setActiveNoteId(loadedNotes[0].id);
      } else {
        handleNewNote(); // Create a default note if none exist
      }
    } catch {
      handleNewNote();
    }
  }, []);
  
  // Auto-save notes with debounce
  useEffect(() => {
    if (saveStatus === 'unsaved') {
      setSaveStatus('saving');
      const handler = setTimeout(() => {
        localStorage.setItem('workflow-notes', JSON.stringify(notes));
        setSaveStatus('saved');
      }, 1500);
      return () => clearTimeout(handler);
    }
  }, [notes, saveStatus]);

  const updateNote = (id: string, updatedData: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
    setNotes(currentNotes =>
      currentNotes.map(note =>
        note.id === id ? { ...note, ...updatedData, updatedAt: Date.now() } : note
      )
    );
    setSaveStatus('unsaved');
  };

  const handleNewNote = () => {
    const newNote: Note = {
      id: new Date().toISOString() + Math.random(),
      title: 'New Note',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setSaveStatus('unsaved');
  };

  const handleDeleteNote = (idToDelete: string) => {
    const newNotes = notes.filter(n => n.id !== idToDelete);
    setNotes(newNotes);
    if (activeNoteId === idToDelete) {
      setActiveNoteId(newNotes.length > 0 ? newNotes[0].id : null);
    }
    setSaveStatus('unsaved');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.indexOf('image') !== -1) {
              const blob = item.getAsFile();
              if (!blob) continue;
              const reader = new FileReader();
              reader.onload = (event) => {
                  const src = event.target?.result as string;
                  const imgHtml = `<img src="${src}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 0.5rem 0;" />`;
                  document.execCommand('insertHTML', false, imgHtml);
              };
              reader.readAsDataURL(blob);
              return; 
          }
      }
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
  };

  // --- Speech Recognition Logic ---
  const startRecognition = useCallback(() => {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        setError("Speech recognition is not supported."); return;
      }
      if (recognitionRef.current) {
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
      }
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US';
      recognitionRef.current = recognition;

      recognition.onstart = () => { setIsListening(true); setError(null); };
      recognition.onresult = (event) => {
        let finalTranscriptChunk = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscriptChunk += event.results[i][0].transcript;
          }
        }
        if (finalTranscriptChunk && editorRef.current) {
           editorRef.current.focus();
           document.execCommand('insertText', false, finalTranscriptChunk + ' ');
        }
      };
      recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(`Speech error: ${event.error}`);
        }
      };
      recognition.onend = () => {
          if (!userStoppedRef.current) {
              setTimeout(() => { if (!userStoppedRef.current) startRecognition(); }, 500);
          } else {
              setIsListening(false);
          }
      };
      try { userStoppedRef.current = false; recognition.start(); } 
      catch (e) { setError("Could not start dictation."); setIsListening(false); }
  }, []);

  const stopRecognition = useCallback(() => {
      userStoppedRef.current = true;
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
  }, []);

  const handleToggleListening = useCallback(() => {
    isListening ? stopRecognition() : startRecognition();
  }, [isListening, startRecognition, stopRecognition]);

  useEffect(() => {
    const handleShortcut = (e: Event) => {
        if ((e as CustomEvent).detail === 'notes-toggle-dictation') handleToggleListening();
    };
    document.addEventListener('app-shortcut', handleShortcut);
    return () => document.removeEventListener('app-shortcut', handleShortcut);
  }, [handleToggleListening]);
  
  useEffect(() => { // Cleanup on unmount
    return () => { if (recognitionRef.current) recognitionRef.current.abort(); };
  }, []);

  const SaveStatusIndicator: React.FC = () => {
    switch(saveStatus) {
      case 'saved': return <div className="flex items-center gap-1 text-green-400"><CheckCircleIcon className="w-4 h-4" /> Saved</div>;
      case 'saving': return <div className="flex items-center gap-1 text-neutral-400 animate-pulse"><SaveIcon className="w-4 h-4" /> Saving...</div>;
      case 'unsaved': return <div className="flex items-center gap-1 text-neutral-400"><ClockIcon className="w-4 h-4" /> Unsaved</div>;
      default: return null;
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <aside className="w-72 bg-neutral-950 flex flex-col border-r border-neutral-800">
        <div className="p-4 border-b border-neutral-800">
            <button
                onClick={handleNewNote}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
                <PlusCircleIcon className="w-5 h-5"/> New Note
            </button>
        </div>
        <div className="flex-1 overflow-y-auto">
            {notes.map(note => (
                <div
                    key={note.id}
                    onClick={() => setActiveNoteId(note.id)}
                    className={`px-4 py-3 cursor-pointer border-l-4 ${activeNoteId === note.id ? 'border-purple-500 bg-neutral-800' : 'border-transparent hover:bg-neutral-800/50'}`}
                >
                    <h3 className="font-semibold text-white truncate">{note.title || 'Untitled Note'}</h3>
                    <p className="text-sm text-neutral-400 truncate">{new Date(note.updatedAt).toLocaleString()}</p>
                </div>
            ))}
        </div>
         <div className="p-4 border-t border-neutral-800 text-sm text-center text-neutral-500">
            <SaveStatusIndicator />
        </div>
      </aside>

      {/* Main Editor */}
      <main className="flex-1 flex flex-col">
        {activeNote ? (
          <div className="flex-1 flex flex-col p-6 items-center">
            <div className="w-full max-w-4xl flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <input
                    type="text"
                    value={activeNote.title}
                    onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                    placeholder="Note Title"
                    className="text-4xl font-bold bg-transparent focus:outline-none w-full border-b-2 border-transparent focus:border-neutral-700 pb-2"
                  />
                  <button
                    onClick={() => handleDeleteNote(activeNote.id)}
                    className="p-2 text-neutral-500 hover:text-red-500 hover:bg-neutral-800 rounded-full"
                  >
                    <TrashIcon className="w-6 h-6" />
                  </button>
                </div>
              
              <div 
                className="flex-1 p-8 bg-white rounded-lg shadow-2xl relative overflow-auto"
                style={{
                  backgroundImage: `linear-gradient(to bottom, transparent 49px, #d4e3ff 50px)`,
                  backgroundSize: '100% 50px',
                }}
              >
                <div className="absolute top-0 left-8 h-full w-px bg-pink-400" />
                <div
                  ref={editorRef}
                  key={activeNote.id}
                  contentEditable
                  suppressContentEditableWarning
                  onPaste={handlePaste}
                  onInput={(e) => updateNote(activeNote.id, { content: e.currentTarget.innerHTML })}
                  dangerouslySetInnerHTML={{ __html: activeNote.content }}
                  data-placeholder="Start typing, pasting, or dictating here..."
                  className={`relative outline-none flex-1 text-neutral-800 ${handwritingStyle} leading-relaxed tracking-wide pt-12 pl-12`}
                  style={{ fontSize: `${fontSize}px` }}
                />
              </div>

              {/* Controls */}
              <div className="mt-6">
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button onClick={handleToggleListening}
                    className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-300 flex items-center gap-2 active:scale-95 ${isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                    {isListening ? (
                      <><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span></span>Stop Dictation</>
                    ) : 'Start Dictation'}
                  </button>
                </div>
                <div className="mt-4 p-4 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <label htmlFor="handwriting-style" className="font-medium text-neutral-300">Style</label>
                    <select id="handwriting-style" value={handwritingStyle} onChange={(e) => setHandwritingStyle(e.target.value as any)}
                      className="bg-neutral-800 text-white py-1 px-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 border border-neutral-700">
                      <option value="font-handwriting">Casual (Caveat)</option>
                      <option value="font-cursive">Cursive (Dancing Script)</option>
                      <option value="font-indie">Playful (Indie Flower)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <label htmlFor="font-size-slider" className="font-medium text-neutral-300">Size</label>
                    <input type="range" id="font-size-slider" min="20" max="60" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value, 10))} className="w-40" />
                    <span className="w-8 text-center text-neutral-300 font-mono">{fontSize}px</span>
                  </div>
                </div>
                {error && <p className="mt-4 text-red-400 text-center">{error}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-500">
            <p>No note selected. Create one to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default HandwrittenNotes;