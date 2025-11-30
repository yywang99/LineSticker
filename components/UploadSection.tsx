import React, { useCallback, useState } from 'react';
import { Upload, X } from 'lucide-react';

interface UploadSectionProps {
  onImageSelected: (file: File) => void;
  selectedImage: string | null;
  onClear: () => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onImageSelected, selectedImage, onClear }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelected(e.target.files[0]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageSelected(e.dataTransfer.files[0]);
    }
  }, [onImageSelected]);

  if (selectedImage) {
    return (
      <div className="relative w-full max-w-xs mx-auto mb-8 group">
        <div className="w-full aspect-square rounded-full overflow-hidden border-4 border-white shadow-lg ring-4 ring-primary/20">
          <img src={selectedImage} alt="Reference" className="w-full h-full object-cover" />
        </div>
        <button 
          onClick={onClear}
          className="absolute top-0 right-0 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
        >
          <X size={20} />
        </button>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-3 py-1 rounded-full shadow-sm">
          參考照片
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`border-3 border-dashed rounded-3xl p-8 text-center transition-colors duration-200 cursor-pointer mb-8
        ${isDragging ? 'border-primary bg-green-50' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById('fileInput')?.click()}
    >
      <input 
        type="file" 
        id="fileInput" 
        accept="image/*" 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <div className="w-16 h-16 bg-green-100 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
        <Upload size={32} />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">上傳您的照片</h3>
      <p className="text-gray-500 text-sm">點擊或拖曳照片至此 (JPG, PNG)</p>
    </div>
  );
};

export default UploadSection;