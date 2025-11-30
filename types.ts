
export interface StickerPrompt {
  id: string;
  base: string;
  memeText: string;
}

export interface GeneratedSticker {
  id: string;
  promptId: string;
  imageUrl: string;
  rawImageUrl?: string; // The original image with green screen
  originalPrompt: string;
  status: 'loading' | 'success' | 'error';
  basePrompt?: string;
  memeText?: string;
  isBackgroundRemoved?: boolean;
  isProcessing?: boolean; // For tracking async background removal operations
  maskColor?: 'green' | 'blue'; // Track which background color was used for this sticker
}

export interface StickerPack {
  name: string;
  prompts: StickerPrompt[];
}

export interface GenerationConfig {
  addText: boolean;
  isAnimeStyle: boolean;
  enableDepthOfField?: boolean; // New option for background blur
  greenScreenSensitivity?: number; // 0-100, default 50
  maskColor: 'green' | 'blue'; // New option: Choose background color
}

// Global declaration for AI Studio
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
