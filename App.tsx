
import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { DEFAULT_STICKER_PACK } from './constants';
import { StickerPrompt, GeneratedSticker, GenerationConfig, StickerPack } from './types';
import { generateSticker, generateIdeas, checkApiKey } from './services/geminiService';
import { fileToBase64, removeGreenBackground } from './services/imageUtils';
import Button from './components/Button';
import UploadSection from './components/UploadSection';
import StickerCard from './components/StickerCard';
import EditStickerModal from './components/EditStickerModal';
import { Sparkles, Wand2, Settings2, Image as ImageIcon, Check, CheckCircle2, Play, Eraser, Save, FolderOpen, Trash2, X, AlertTriangle, Download, Aperture, Sliders, Palette } from 'lucide-react';

const App: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [stickers, setStickers] = useState<GeneratedSticker[]>([]);
  const [config, setConfig] = useState<GenerationConfig>({ 
    addText: true, 
    isAnimeStyle: true,
    enableDepthOfField: false,
    greenScreenSensitivity: 50,
    maskColor: 'green'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [customIdea, setCustomIdea] = useState('');
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  
  // Pack Management State
  const [activePrompts, setActivePrompts] = useState<StickerPrompt[]>(DEFAULT_STICKER_PACK.prompts);
  const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(new Set(DEFAULT_STICKER_PACK.prompts.map(p => p.id)));
  const [savedPacks, setSavedPacks] = useState<StickerPack[]>([]);
  const [currentPackName, setCurrentPackName] = useState<string>("");

  // UI State for Custom Modals (Replacing window.prompt/confirm)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [packNameInput, setPackNameInput] = useState("");

  // Edit Modal State
  const [editingSticker, setEditingSticker] = useState<GeneratedSticker | null>(null);

  // Initial API Key Check for Veo/Pro models
  const ensureApiKey = async () => {
    try {
      const hasKey = await checkApiKey();
      if (!hasKey) {
        alert("必須選擇 API Key 才能使用 Gemini 3 Pro 模型。");
      }
    } catch (e) {
      console.error("API Key check failed", e);
    }
  };

  useEffect(() => {
    ensureApiKey();
    
    // Load saved packs
    const saved = localStorage.getItem('sticker_packs');
    if (saved) {
      try {
        setSavedPacks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved packs", e);
      }
    }
  }, []);

  const togglePrompt = (id: string) => {
    const newSet = new Set(selectedPromptIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedPromptIds(newSet);
  };

  const selectAllPrompts = () => {
    if (selectedPromptIds.size === activePrompts.length) {
      setSelectedPromptIds(new Set());
    } else {
      setSelectedPromptIds(new Set(activePrompts.map(p => p.id)));
    }
  };

  const handleImageSelect = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      setSelectedImage(base64);
    } catch (error) {
      console.error("Failed to process image", error);
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setStickers([]);
  };

  const handleGenerateSingleSticker = async (prompt: StickerPrompt) => {
    if (!selectedImage) {
        alert("請先上傳照片！");
        return;
    }
    await ensureApiKey();

    const tempSticker: GeneratedSticker = {
        id: prompt.memeText || prompt.id,
        promptId: prompt.id,
        imageUrl: '',
        rawImageUrl: '',
        originalPrompt: prompt.base,
        status: 'loading',
        basePrompt: prompt.base,
        memeText: prompt.memeText,
        isBackgroundRemoved: false,
        maskColor: config.maskColor // Store current setting
    };

    // Prepend to list so user sees it immediately
    setStickers(prev => [tempSticker, ...prev]);

    try {
        const rawImageUrl = await generateSticker(selectedImage, prompt, config);
        if (rawImageUrl) {
            setStickers(prev => prev.map(s => 
                s === tempSticker ? { 
                    ...s, 
                    imageUrl: rawImageUrl, 
                    rawImageUrl: rawImageUrl,
                    status: 'success' 
                } : s
            ));
        } else {
             throw new Error("No image data");
        }
    } catch (error) {
        console.error(`Failed to generate ${prompt.id}`, error);
        setStickers(prev => prev.map(s => 
            s === tempSticker ? { ...s, status: 'error' } : s
        ));
    }
  };

  const handleGenerateStickers = async () => {
    if (!selectedImage) return;
    
    const promptsToGenerate = activePrompts.filter(p => selectedPromptIds.has(p.id));
    if (promptsToGenerate.length === 0) {
        alert("請至少選擇一個創意進行製作！");
        return;
    }

    // Ensure key is present before generating
    await ensureApiKey();

    setIsGenerating(true);
    const newStickers: GeneratedSticker[] = promptsToGenerate.map(p => ({
      id: p.memeText || p.id,
      promptId: p.id,
      imageUrl: '',
      rawImageUrl: '',
      originalPrompt: p.base,
      status: 'loading',
      basePrompt: p.base,
      memeText: p.memeText,
      isBackgroundRemoved: false,
      maskColor: config.maskColor
    }));
    
    setStickers(newStickers);

    // Sequential processing to avoid 503 Overloaded errors
    for (const prompt of promptsToGenerate) {
      try {
        const rawImageUrl = await generateSticker(selectedImage, prompt, config);
        if (rawImageUrl) {
          setStickers(prev => {
            const next = [...prev];
            const idx = next.findIndex(s => s.promptId === prompt.id);
            if (idx !== -1) {
               next[idx] = { 
                ...next[idx], 
                imageUrl: rawImageUrl, 
                rawImageUrl: rawImageUrl,
                status: 'success' 
               };
            }
            return next;
          });
        } else {
            throw new Error("No image data");
        }
      } catch (error) {
        console.error(`Failed to generate ${prompt.id}`, error);
        setStickers(prev => {
            const next = [...prev];
            const idx = next.findIndex(s => s.promptId === prompt.id);
            if (idx !== -1) {
                next[idx] = { ...next[idx], status: 'error' };
            }
            return next;
        });
      }
    }

    setIsGenerating(false);
  };

  const handleToggleBackground = async (stickerId: string) => {
    // Find the sticker first to check logic
    const sticker = stickers.find(s => s.id === stickerId);
    if (!sticker || !sticker.rawImageUrl) return;

    // Set processing state
    setStickers(prev => prev.map(s => 
        s.id === stickerId ? { ...s, isProcessing: true } : s
    ));

    try {
        let newImageUrl = sticker.imageUrl;
        let isRemoved = sticker.isBackgroundRemoved;

        if (sticker.isBackgroundRemoved) {
            // Restore original
            newImageUrl = sticker.rawImageUrl;
            isRemoved = false;
        } else {
            // Remove background with sensitivity and specific color
            newImageUrl = await removeGreenBackground(
                sticker.rawImageUrl, 
                config.greenScreenSensitivity ?? 50,
                sticker.maskColor || 'green' // Default to green if prop missing
            );
            isRemoved = true;
        }

        setStickers(prev => prev.map(s => 
            s.id === stickerId ? { 
                ...s, 
                imageUrl: newImageUrl, 
                isBackgroundRemoved: isRemoved,
                isProcessing: false 
            } : s
        ));
    } catch (error) {
        console.error("Failed to toggle background", error);
        setStickers(prev => prev.map(s => 
            s.id === stickerId ? { ...s, isProcessing: false } : s
        ));
    }
  };

  const handleGenerateIdeas = async () => {
    if (!customIdea.trim()) return;
    setIsGeneratingIdeas(true);
    await ensureApiKey(); // Check key for text model too just in case

    const ideas = await generateIdeas(customIdea);
    if (ideas.length > 0) {
        setActivePrompts(ideas);
        setSelectedPromptIds(new Set(ideas.map(p => p.id))); // Auto-select new ideas
        setCurrentPackName(""); // Clear pack name as it's a new set
    }
    setIsGeneratingIdeas(false);
  };

  const handleResetPrompts = () => {
      setActivePrompts(DEFAULT_STICKER_PACK.prompts);
      setSelectedPromptIds(new Set(DEFAULT_STICKER_PACK.prompts.map(p => p.id)));
      setCustomIdea('');
      setCurrentPackName("");
  };

  // Open the save modal
  const handleSavePackClick = () => {
    setPackNameInput(currentPackName || `我的貼圖包 ${savedPacks.length + 1}`);
    setIsSaveModalOpen(true);
  };

  // Execute save logic
  const executeSavePack = () => {
    const name = packNameInput.trim();
    if (!name) return;

    const existingIndex = savedPacks.findIndex(p => p.name === name);
    const newPack: StickerPack = {
        name,
        prompts: activePrompts
    };

    let newPacks;
    if (existingIndex >= 0) {
        // We use window.confirm here for overwrite warning. 
        if (!confirm(`貼圖包 "${name}" 已存在，是否覆蓋？`)) return;
        newPacks = [...savedPacks];
        newPacks[existingIndex] = newPack;
    } else {
        newPacks = [...savedPacks, newPack];
    }

    setSavedPacks(newPacks);
    localStorage.setItem('sticker_packs', JSON.stringify(newPacks));
    setCurrentPackName(name);
    setIsSaveModalOpen(false); // Close modal
  };

  const handleLoadPack = (packIndex: number) => {
      if (packIndex === -1) {
          // Default pack
          setActivePrompts(DEFAULT_STICKER_PACK.prompts);
          setSelectedPromptIds(new Set(DEFAULT_STICKER_PACK.prompts.map(p => p.id)));
          setCurrentPackName("");
      } else {
          const pack = savedPacks[packIndex];
          setActivePrompts(pack.prompts);
          setSelectedPromptIds(new Set(pack.prompts.map(p => p.id))); // Auto-select loaded pack prompts
          setCurrentPackName(pack.name);
      }
  };

  const handleDeletePackClick = () => {
      if (!currentPackName) return;
      setIsDeleteModalOpen(true);
  };

  const executeDeletePack = () => {
      if (!currentPackName) return;
      
      const newPacks = savedPacks.filter(p => p.name !== currentPackName);
      setSavedPacks(newPacks);
      localStorage.setItem('sticker_packs', JSON.stringify(newPacks));
      
      // Reset to default
      setCurrentPackName("");
      setActivePrompts(DEFAULT_STICKER_PACK.prompts);
      setSelectedPromptIds(new Set(DEFAULT_STICKER_PACK.prompts.map(p => p.id)));
      
      setIsDeleteModalOpen(false);
  };

  const handleEditConfirm = async (newText: string, newBase: string) => {
    if (!editingSticker || !selectedImage) return;

    // Create a temporary prompt object
    const updatedPrompt: StickerPrompt = {
        id: editingSticker.promptId,
        base: newBase,
        memeText: newText
    };

    // IMPORTANT: Sync edits back to the active prompts list so they can be saved
    // We don't need to update selectedPromptIds because the ID hasn't changed
    setActivePrompts(prev => prev.map(p => 
        p.id === editingSticker.promptId 
            ? { ...p, memeText: newText, base: newBase }
            : p
    ));

    // Close modal
    setEditingSticker(null);

    // Update sticker state to loading
    setStickers(prev => prev.map(s => 
        s.promptId === editingSticker.promptId 
            ? { 
                ...s, 
                status: 'loading', 
                basePrompt: newBase, 
                memeText: newText, 
                id: newText || s.promptId, // Update display ID to new text
                isBackgroundRemoved: false, // Reset bg state on regen
                rawImageUrl: '',
                maskColor: config.maskColor // Use current config for new gen
              } 
            : s
    ));

    try {
        await ensureApiKey();
        const rawImageUrl = await generateSticker(selectedImage, updatedPrompt, config);
        
        if (rawImageUrl) {
            setStickers(prev => prev.map(s => 
                s.promptId === editingSticker.promptId 
                    ? { 
                        ...s, 
                        imageUrl: rawImageUrl,
                        rawImageUrl: rawImageUrl,
                        status: 'success' 
                      } 
                    : s
            ));
        } else {
             throw new Error("No image returned");
        }
    } catch (error) {
        console.error("Regeneration failed", error);
        setStickers(prev => prev.map(s => 
            s.promptId === editingSticker.promptId 
                ? { ...s, status: 'error' } 
                : s
        ));
    }
  };

  const handleDownloadAll = async () => {
    const successStickers = stickers.filter(s => s.status === 'success' && s.imageUrl);
    if (successStickers.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder("stickers");
    
    successStickers.forEach((s) => {
      // s.imageUrl is "data:image/png;base64,..."
      const base64Data = s.imageUrl.split(',')[1];
      // Use clean filename
      const filename = `${s.id.replace(/[\\/:*?"<>|]/g, '_')}.png`;
      folder?.file(filename, base64Data, { base64: true });
    });

    try {
        const content = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sticker_pack_${new Date().toISOString().slice(0,10)}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Failed to zip files", err);
        alert("打包下載失敗");
    }
  };

  const hasSuccessStickers = stickers.some(s => s.status === 'success');

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-green-400 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Sparkles size={24} />
            </div>
            <h1 className="text-xl font-black text-gray-800 tracking-tight">One Click Sticker <span className="text-primary">R1</span></h1>
          </div>
          <a href="https://ai.google.dev/" target="_blank" rel="noreferrer" className="text-xs font-bold text-gray-400 hover:text-primary transition-colors">
            Powered by Gemini
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        
        {/* Intro */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-gray-900 mb-2">打造您的專屬 LINE 貼圖</h2>
          <p className="text-gray-600">上傳照片，AI 自動保留神韻並生成繁體中文對白貼圖！</p>
        </div>

        {/* Upload */}
        <UploadSection 
          onImageSelected={handleImageSelect} 
          selectedImage={selectedImage}
          onClear={handleClearImage}
        />

        {/* Controls (Only show if image selected) */}
        {selectedImage && (
          <div className="animate-fade-in-up space-y-8">
            
            {/* Style Configuration */}
            <div className="bg-white rounded-3xl p-6 shadow-md">
              <div className="flex items-center gap-2 mb-4 text-gray-800 font-bold text-lg">
                <Settings2 className="text-primary" />
                <span>風格設定</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-green-50 transition-colors border-2 border-transparent has-[:checked]:border-primary has-[:checked]:bg-green-50">
                  <span className="font-medium text-gray-700">Q版動漫風格</span>
                  <input 
                    type="radio" 
                    name="style" 
                    checked={config.isAnimeStyle} 
                    onChange={() => setConfig({...config, isAnimeStyle: true})}
                    className="w-5 h-5 text-primary focus:ring-primary border-gray-300"
                  />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-green-50 transition-colors border-2 border-transparent has-[:checked]:border-primary has-[:checked]:bg-green-50">
                  <span className="font-medium text-gray-700">寫實立體風格</span>
                  <input 
                    type="radio" 
                    name="style" 
                    checked={!config.isAnimeStyle} 
                    onChange={() => setConfig({...config, isAnimeStyle: false})}
                    className="w-5 h-5 text-primary focus:ring-primary border-gray-300"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-4 pt-4 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                    <div className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-lg">
                        <input 
                        type="checkbox" 
                        id="addText"
                        checked={config.addText}
                        onChange={(e) => setConfig({...config, addText: e.target.checked})}
                        className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
                        />
                        <label htmlFor="addText" className="text-gray-700 font-medium select-none cursor-pointer">
                        自動加入貼圖文字
                        </label>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-lg">
                        <input 
                        type="checkbox" 
                        id="enableDepthOfField"
                        checked={!!config.enableDepthOfField}
                        onChange={(e) => setConfig({...config, enableDepthOfField: e.target.checked})}
                        className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
                        />
                        <label htmlFor="enableDepthOfField" className="text-gray-700 font-medium select-none cursor-pointer flex items-center gap-1">
                        <Aperture size={16} className="text-gray-500" />
                        景深效果 (凸顯主體)
                        </label>
                    </div>
                </div>

                {/* Background Mask Color Selection */}
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <label className="flex items-center gap-2 text-gray-700 font-bold text-sm mb-3">
                        <Palette size={16} className="text-blue-500" />
                        背景去背模式 (若衣服為綠色，請改用藍幕)
                    </label>
                    <div className="flex gap-4">
                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer border-2 transition-all ${config.maskColor === 'green' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                            <div className="w-4 h-4 rounded-full bg-green-500 border border-green-600"></div>
                            <span className="font-bold text-sm">綠幕 (預設)</span>
                            <input 
                                type="radio" 
                                name="maskColor" 
                                className="hidden"
                                checked={config.maskColor === 'green'}
                                onChange={() => setConfig({...config, maskColor: 'green'})}
                            />
                        </label>
                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer border-2 transition-all ${config.maskColor === 'blue' ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                            <div className="w-4 h-4 rounded-full bg-blue-600 border border-blue-700"></div>
                            <span className="font-bold text-sm">藍幕 (推薦)</span>
                            <input 
                                type="radio" 
                                name="maskColor" 
                                className="hidden"
                                checked={config.maskColor === 'blue'}
                                onChange={() => setConfig({...config, maskColor: 'blue'})}
                            />
                        </label>
                    </div>
                </div>

                {/* Green Screen Sensitivity Slider */}
                <div className="bg-gray-50 p-4 rounded-xl">
                   <label className="flex items-center justify-between text-gray-700 font-bold text-sm mb-2">
                      <span className="flex items-center gap-2">
                         <Sliders size={16} className="text-primary" />
                         去背靈敏度
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded text-xs border border-gray-200">
                        {config.greenScreenSensitivity ?? 50}%
                      </span>
                   </label>
                   <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={config.greenScreenSensitivity ?? 50} 
                      onChange={(e) => setConfig({...config, greenScreenSensitivity: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-green-600 transition-all"
                   />
                </div>
              </div>
            </div>

            {/* Idea Generator & Selection */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-6 shadow-md border border-blue-100">
               <div className="flex items-center gap-2 mb-4 text-gray-800 font-bold text-lg">
                <Wand2 className="text-blue-500" />
                <span>AI 創意與貼圖包管理</span>
              </div>
              
              {/* Generator Input */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input 
                  type="text"
                  value={customIdea}
                  onChange={(e) => setCustomIdea(e.target.value)}
                  placeholder="例如：工程師的日常、貓奴崩潰瞬間..."
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-700 text-white placeholder-gray-400 border-none focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                />
                <div className="flex gap-2">
                    <Button 
                        variant="secondary" 
                        onClick={handleGenerateIdeas}
                        isLoading={isGeneratingIdeas}
                        disabled={!customIdea || isGenerating || isGeneratingIdeas}
                    >
                        生成創意
                    </Button>
                    <button 
                        onClick={handleResetPrompts}
                        className="px-4 py-2 text-gray-400 hover:text-gray-600 font-medium text-sm whitespace-nowrap"
                    >
                        重置
                    </button>
                </div>
              </div>

              {/* Pack Management Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between mb-5 bg-white/60 p-3 rounded-xl border border-blue-100 gap-3 sm:gap-0">
                 {/* Left: Load */}
                 <div className="flex items-center gap-2 w-full sm:w-auto">
                    <FolderOpen size={18} className="text-blue-500 shrink-0"/>
                    <select 
                        className="bg-transparent font-medium text-gray-700 outline-none cursor-pointer w-full sm:w-auto"
                        onChange={(e) => handleLoadPack(parseInt(e.target.value))}
                        value={currentPackName ? savedPacks.findIndex(p => p.name === currentPackName) : -1}
                    >
                        <option value={-1}>預設貼圖包</option>
                        {savedPacks.map((pack, idx) => (
                            <option key={idx} value={idx}>{pack.name}</option>
                        ))}
                    </select>
                 </div>

                 {/* Right: Save */}
                 <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <button 
                        onClick={handleSavePackClick} 
                        className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        title="儲存目前的創意組合"
                    >
                        <Save size={16}/>
                        儲存組合
                    </button>
                     {currentPackName && (
                        <button 
                            onClick={handleDeletePackClick} 
                            className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                            title="刪除此貼圖包"
                        >
                            <Trash2 size={16}/>
                        </button>
                     )}
                 </div>
              </div>

              {/* Idea Selection Grid */}
              <div className="bg-white/50 rounded-2xl p-4 border border-blue-100">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-blue-500" />
                    請選擇要製作的創意 ({selectedPromptIds.size}/{activePrompts.length})
                  </span>
                  <button 
                    onClick={selectAllPrompts}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                  >
                    {selectedPromptIds.size === activePrompts.length ? '取消全選' : '全選'}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {activePrompts.map((prompt) => {
                    const isSelected = selectedPromptIds.has(prompt.id);
                    return (
                      <div 
                        key={prompt.id}
                        onClick={() => togglePrompt(prompt.id)}
                        className={`
                          relative group cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 select-none
                          ${isSelected 
                            ? 'border-blue-400 bg-white shadow-sm ring-1 ring-blue-400/20' 
                            : 'border-transparent bg-white/40 hover:bg-white/80 text-gray-400'}
                        `}
                      >
                        <div className="flex flex-col h-full justify-between gap-1">
                          <span className={`font-bold text-sm leading-tight ${isSelected ? 'text-gray-800' : 'text-gray-500'}`}>
                            {prompt.memeText || prompt.id}
                          </span>
                          <span className="text-[10px] opacity-60 truncate">
                            {prompt.id}
                          </span>
                        </div>
                        
                        {isSelected && (
                          <div className="absolute top-2 right-2 text-blue-500">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateSingleSticker(prompt);
                          }}
                          className="absolute bottom-2 right-2 p-1.5 bg-green-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-600 shadow-sm z-10 hover:scale-110"
                          title="立即製作此貼圖"
                        >
                          <Play size={10} fill="currentColor" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center pt-4">
              <Button 
                onClick={handleGenerateStickers} 
                isLoading={isGenerating}
                disabled={selectedPromptIds.size === 0}
                className="w-full md:w-auto text-lg py-4 px-12 shadow-xl shadow-green-200"
              >
                <ImageIcon size={24} />
                開始製作貼圖 ({selectedPromptIds.size}張)
              </Button>
            </div>

            {/* Results Grid */}
            {stickers.length > 0 && (
              <div className="pt-8 border-t border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">製作成果</h3>
                    {hasSuccessStickers && (
                        <button 
                            onClick={handleDownloadAll}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md"
                        >
                            <Download size={18} />
                            打包下載 (.zip)
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {stickers.map((sticker, idx) => (
                    <StickerCard 
                        key={`${sticker.promptId}-${idx}`} 
                        sticker={sticker} 
                        onEdit={setEditingSticker}
                        onToggleBackground={() => handleToggleBackground(sticker.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Edit Modal */}
            <EditStickerModal 
              isOpen={!!editingSticker}
              onClose={() => setEditingSticker(null)}
              onConfirm={handleEditConfirm}
              initialText={editingSticker?.memeText || ''}
              initialPrompt={editingSticker?.basePrompt || editingSticker?.originalPrompt || ''}
            />

            {/* Save Pack Modal (Replaces window.prompt) */}
            {isSaveModalOpen && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 transform transition-all animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                           <Save className="text-primary" size={20} />
                           儲存貼圖包
                        </h3>
                         <button 
                            onClick={() => setIsSaveModalOpen(false)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            貼圖包名稱
                        </label>
                        <input 
                            type="text" 
                            value={packNameInput}
                            onChange={(e) => setPackNameInput(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
                            placeholder="輸入名稱..."
                            autoFocus
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setIsSaveModalOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                        >
                            取消
                        </button>
                        <Button onClick={executeSavePack}>
                            確認儲存
                        </Button>
                    </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal (Replaces window.confirm) */}
            {isDeleteModalOpen && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 transform transition-all animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-center mb-4 text-red-500">
                        <div className="bg-red-100 p-4 rounded-full">
                            <AlertTriangle size={32} />
                        </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
                       確認刪除？
                    </h3>
                    <p className="text-gray-600 text-center mb-6">
                        您確定要刪除貼圖包 <strong>"{currentPackName}"</strong> 嗎？<br/>此動作無法復原。
                    </p>
                    
                    <div className="flex justify-center gap-3">
                        <button 
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-colors"
                        >
                            取消
                        </button>
                        <button 
                            onClick={executeDeletePack}
                            className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-md shadow-red-200 transition-colors"
                        >
                            確認刪除
                        </button>
                    </div>
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
};

export default App;
