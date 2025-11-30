
import React from 'react';
import { GeneratedSticker } from '../types';
import { Download, Pencil, Eraser, Undo2 } from 'lucide-react';

interface StickerCardProps {
  sticker: GeneratedSticker;
  onEdit?: (sticker: GeneratedSticker) => void;
  onToggleBackground?: () => void;
}

const StickerCard: React.FC<StickerCardProps> = ({ sticker, onEdit, onToggleBackground }) => {
  const handleDownload = () => {
    if (sticker.status === 'success' && sticker.imageUrl) {
      const link = document.createElement('a');
      link.href = sticker.imageUrl;
      link.download = `sticker_${sticker.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-3 flex flex-col items-center hover:shadow-xl transition-shadow relative group">
      <div className="w-full aspect-square bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] rounded-xl overflow-hidden mb-2 relative">
        {sticker.status === 'loading' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/80 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
            <span className="text-xs text-gray-500 font-medium animate-pulse">繪製中...</span>
          </div>
        ) : sticker.status === 'error' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-500 text-xs text-center p-2">
            生成失敗
          </div>
        ) : (
          <img 
            src={sticker.imageUrl} 
            alt="Sticker" 
            className="w-full h-full object-contain hover:scale-105 transition-transform duration-300" 
          />
        )}
      </div>
      
      {/* Actions container */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        {sticker.status === 'success' && onEdit && (
            <button
                onClick={() => onEdit(sticker)}
                className="p-1.5 bg-white rounded-full shadow-md text-gray-600 hover:text-blue-500 hover:scale-110 transition-all"
                title="編輯並重新生成"
            >
                <Pencil size={16} />
            </button>
        )}
        
        {sticker.status === 'success' && onToggleBackground && (
            <button
                onClick={onToggleBackground}
                className={`p-1.5 bg-white rounded-full shadow-md hover:scale-110 transition-all ${
                    sticker.isBackgroundRemoved ? 'text-green-600 hover:text-green-700' : 'text-gray-600 hover:text-green-500'
                }`}
                title={sticker.isBackgroundRemoved ? "還原背景" : "移除綠幕"}
                disabled={sticker.isProcessing}
            >
                {sticker.isProcessing ? (
                     <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-primary rounded-full" />
                ) : sticker.isBackgroundRemoved ? (
                    <Undo2 size={16} />
                ) : (
                    <Eraser size={16} />
                )}
            </button>
        )}

        {sticker.status === 'success' && (
            <button 
            onClick={handleDownload}
            className="p-1.5 bg-white rounded-full shadow-md text-gray-600 hover:text-primary hover:scale-110 transition-all"
            title="下載貼圖"
            >
            <Download size={16} />
            </button>
        )}
      </div>
      
      <p className="text-sm font-bold text-gray-700 truncate w-full text-center">
        {sticker.id}
      </p>
    </div>
  );
};

export default StickerCard;
