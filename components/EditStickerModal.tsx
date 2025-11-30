import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import Button from './Button';

interface EditStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (text: string, prompt: string) => void;
  initialText: string;
  initialPrompt: string;
}

const EditStickerModal: React.FC<EditStickerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialText,
  initialPrompt
}) => {
  const [text, setText] = useState(initialText);
  const [prompt, setPrompt] = useState(initialPrompt);

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setPrompt(initialPrompt);
    }
  }, [isOpen, initialText, initialPrompt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl transform transition-all animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="text-primary" size={24} />
              編輯貼圖內容
            </h3>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                貼圖文字 (Meme Text)
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="輸入貼圖上的文字..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                AI 繪圖指令 (Visual Description)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                placeholder="描述貼圖的動作、表情或場景..."
              />
              <p className="text-xs text-gray-500 mt-2">
                提示：這裡描述的是畫面的視覺內容，例如動作、表情、背景特效等。
              </p>
            </div>
          </div>

          <div className="mt-8 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full font-bold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
            <Button
              onClick={() => onConfirm(text, prompt)}
              variant="primary"
            >
              重新生成
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditStickerModal;