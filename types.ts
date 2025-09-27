

export interface ImagePrompt {
  id: string;
  prompt: string;
}

export interface Settings {
  font: string;
  textSize: 'sm' | 'base' | 'lg';
}

export type GeneratedContentType = 'image' | 'video';

export interface GeneratedContent {
  id: string;
  type: GeneratedContentType;
  prompt: string;
  url: string; 
  createdAt: Date;
  isShared?: boolean;
}

export type Module = 'whiteboard' | 'prompts' | 'image' | 'video' | 'gallery' | 'publicGallery' | 'editor' | 'settings' | 'notes' | 'geminiChat' | 'photobooth';

export interface Shortcuts {
  [action: string]: string;
}