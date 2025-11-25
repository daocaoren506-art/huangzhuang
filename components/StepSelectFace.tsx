import React, { useRef, useState, useEffect } from 'react';
import { PRESET_FACES_BY_CATEGORY } from '../constants';
import { Upload, User, Trash2, Edit, Check, CheckSquare, Square, ChevronRight, ChevronLeft, X } from './Icons';
import { SubjectCategory, CATEGORY_LABELS } from '../types';

interface StepSelectFaceProps {
  onSelect: (url: string) => void;
  currentSelection: string | null;
  category: SubjectCategory;
  onCategoryChange: (category: SubjectCategory) => void;
  customUploads: Record<SubjectCategory, string[]>;
  onAddCustomUpload: (category: SubjectCategory, url: string) => void;
  onDeleteCustomUpload: (category: SubjectCategory, url: string) => void;
  onBatchDeleteCustomUpload: (category: SubjectCategory, urls: string[]) => void;
}

const ITEMS_PER_PAGE = 10;

const StepSelectFace: React.FC<StepSelectFaceProps> = ({ 
    onSelect, 
    currentSelection, 
    category, 
    onCategoryChange,
    customUploads,
    onAddCustomUpload,
    onDeleteCustomUpload,
    onBatchDeleteCustomUpload
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isManaging, setIsManaging] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          const newUrl = event.target.result;
          onAddCustomUpload(category, newUrl);
          if (!isManaging) {
            onSelect(newUrl);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const currentPresets = PRESET_FACES_BY_CATEGORY[category] || [];
  const currentCustoms = customUploads[category] || [];
  const allImages = [...currentCustoms, ...currentPresets];
  
  // Pagination Logic
  const validImages = allImages.filter(url => !failedImages.has(url));
  const totalItems = validImages.length;
  const totalPages = Math.ceil((totalItems + 1) / ITEMS_PER_PAGE); 
  
  const startIndex = currentPage * ITEMS_PER_PAGE;
  // We need to slice the *valid* images, but we iterate over displayImages.
  // Actually, keeping track of page with failed images is tricky.
  // Simpler approach: filter invalid ones first, then slice.
  const displayImages = validImages.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(0);
    setIsManaging(false);
    setSelectedDeleteIds(new Set());
  }, [category]);

  const toggleDeleteSelection = (url: string) => {
      const newSet = new Set(selectedDeleteIds);
      if (newSet.has(url)) {
          newSet.delete(url);
      } else {
          newSet.add(url);
      }
      setSelectedDeleteIds(newSet);
  };

  const handleBatchDelete = () => {
      if (selectedDeleteIds.size === 0) return;
      if (window.confirm(`确定要删除选中的 ${selectedDeleteIds.size} 张图片吗？`)) {
          onBatchDeleteCustomUpload(category, Array.from(selectedDeleteIds));
          setSelectedDeleteIds(new Set());
          setIsManaging(false);
      }
  };

  const handleNextPage = () => {
      if (currentPage < totalPages - 1) setCurrentPage(p => p + 1);
  };

  const handlePrevPage = () => {
      if (currentPage > 0) setCurrentPage(p => p - 1);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
          <User className="w-5 h-5 text-brand-600" />
          选择模特 / 主体
        </h2>
        
        <div className="flex items-center gap-2">
            {/* Management Controls */}
            {currentCustoms.length > 0 && (
                isManaging ? (
                    <>
                        <button 
                            onClick={handleBatchDelete}
                            disabled={selectedDeleteIds.size === 0}
                            className={`
                                text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors
                                ${selectedDeleteIds.size > 0 
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                    : 'bg-stone-100 text-stone-400 cursor-not-allowed'}
                            `}
                        >
                            <Trash2 className="w-3 h-3" />
                            删除 ({selectedDeleteIds.size})
                        </button>
                        <button 
                            onClick={() => { setIsManaging(false); setSelectedDeleteIds(new Set()); }}
                            className="text-xs px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center gap-1"
                        >
                            <Check className="w-3 h-3" />
                            完成
                        </button>
                    </>
                ) : (
                    <button 
                        onClick={() => setIsManaging(true)}
                        className="text-xs px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100 flex items-center gap-1 transition-colors"
                    >
                        <Edit className="w-3 h-3" />
                        批量管理
                    </button>
                )
            )}
            <span className="text-xs font-medium px-2 py-1 bg-brand-100 text-brand-700 rounded-full ml-2">步骤 1/3</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex space-x-1 bg-stone-100 p-1 rounded-xl mb-6 self-start">
        {Object.values(SubjectCategory).map((cat) => (
            <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`
                    px-4 py-2 text-sm font-medium rounded-lg transition-all
                    ${category === cat 
                        ? 'bg-white text-brand-600 shadow-sm' 
                        : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'
                    }
                `}
            >
                {CATEGORY_LABELS[cat]}
            </button>
        ))}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 overflow-y-auto pr-2 min-h-[300px] content-start">
        {/* Upload Button */}
        {currentPage === 0 && (
            <div 
            onClick={() => !isManaging && fileInputRef.current?.click()}
            className={`
                aspect-[3/4] rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center transition-colors group relative overflow-hidden
                ${isManaging ? 'opacity-50 cursor-not-allowed' : 'hover:border-brand-500 hover:bg-brand-50 cursor-pointer'}
            `}
            >
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isManaging}
            />
            <div className="w-10 h-10 rounded-full bg-stone-100 group-hover:bg-brand-200 flex items-center justify-center mb-2 transition-colors z-10">
                <Upload className="w-5 h-5 text-stone-500 group-hover:text-brand-700" />
            </div>
            <span className="text-xs text-stone-500 font-medium z-10">上传{CATEGORY_LABELS[category]}</span>
            </div>
        )}

        {/* Images */}
        {displayImages.map((url, index) => {
          const isCustom = currentCustoms.includes(url);
          const isSelectedForDelete = selectedDeleteIds.has(url);
          
          return (
            <div 
              key={`${url}-${index}`}
              onClick={() => {
                  if (isManaging && isCustom) {
                      toggleDeleteSelection(url);
                  } else if (!isManaging) {
                      onSelect(url);
                  }
              }}
              className={`
                relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer group transition-all duration-200 bg-stone-100
                ${currentSelection === url && !isManaging ? 'ring-4 ring-brand-500 ring-offset-2' : ''}
                ${isManaging && isCustom ? 'hover:ring-2 hover:ring-red-300' : (!isManaging && 'hover:ring-2 hover:ring-brand-300')}
                ${isManaging && !isCustom ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <img 
                src={url} 
                alt={`${category} ${index}`} 
                className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                onError={() => setFailedImages(prev => new Set(prev).add(url))}
              />
              
              {/* Selection Dot (Normal Mode) */}
              {currentSelection === url && !isManaging && (
                <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
                  <div className="bg-white rounded-full p-1">
                      <div className="w-2 h-2 bg-brand-600 rounded-full" />
                  </div>
                </div>
              )}

              {/* Single Delete Button (Normal Mode) - Hover only, not managing */}
              {isCustom && !isManaging && (
                  <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("确定删除这张图片吗？")) {
                              onDeleteCustomUpload(category, url);
                          }
                      }}
                      className="absolute top-1 right-1 p-1.5 bg-white/90 rounded-full text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-red-50"
                      title="删除"
                  >
                      <Trash2 className="w-3.5 h-3.5" />
                  </button>
              )}

              {/* Management Overlays */}
              {isManaging && isCustom && (
                  <div className={`absolute inset-0 bg-black/10 flex items-start justify-end p-1 transition-colors ${isSelectedForDelete ? 'bg-red-500/10' : ''}`}>
                      {isSelectedForDelete ? (
                          <CheckSquare className="w-5 h-5 text-red-500 bg-white rounded-sm" />
                      ) : (
                          <Square className="w-5 h-5 text-white drop-shadow-md" />
                      )}
                  </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      <div className="mt-auto pt-4 flex items-center justify-between border-t border-stone-100">
          <span className="text-xs text-stone-400">
              总计: {totalItems} 张
          </span>
          
          <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className="p-1 rounded-md hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                  <ChevronLeft className="w-5 h-5 text-stone-600" />
              </button>
              <span className="text-xs font-medium text-stone-600 min-w-[3rem] text-center">
                  {currentPage + 1} / {totalPages || 1}
              </span>
              <button 
                onClick={handleNextPage}
                disabled={currentPage >= totalPages - 1}
                className="p-1 rounded-md hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                  <ChevronRight className="w-5 h-5 text-stone-600" />
              </button>
          </div>
      </div>
    </div>
  );
};

export default StepSelectFace;