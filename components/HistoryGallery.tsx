import React, { useState } from 'react';
import { HistoryItem } from '../types';
import { History, CheckSquare, Square, Edit, Trash2, X, Check, Loader2 } from './Icons';

interface HistoryGalleryProps {
  history: HistoryItem[];
  onSelectHistory: (item: HistoryItem) => void;
  onDeleteHistoryItems: (ids: string[]) => void;
}

const HistoryGallery: React.FC<HistoryGalleryProps> = ({ history, onSelectHistory, onDeleteHistoryItems }) => {
  const [isManaging, setIsManaging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  if (history.length === 0) return null;

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleItemClick = (item: HistoryItem) => {
      if (isManaging) {
          toggleSelection(item.id);
      } else {
          onSelectHistory(item);
      }
  };

  const handleDeleteSelected = () => {
      if (selectedIds.size === 0) return;
      if (window.confirm(`确定要删除选中的 ${selectedIds.size} 条记录吗？`)) {
          onDeleteHistoryItems(Array.from(selectedIds));
          setSelectedIds(new Set());
          setIsManaging(false);
      }
  };

  const cancelManagement = () => {
      setIsManaging(false);
      setSelectedIds(new Set());
  };

  return (
    <div className="mt-8 border-t border-stone-200 pt-6">
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-stone-400" />
            <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider">历史记录</h3>
        </div>
        
        {/* Management Controls */}
        <div className="flex items-center gap-2">
            {isManaging ? (
                <>
                    <button 
                        onClick={handleDeleteSelected}
                        disabled={selectedIds.size === 0}
                        className={`
                            text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors
                            ${selectedIds.size > 0 
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                    : 'bg-stone-100 text-stone-400 cursor-not-allowed'}
                        `}
                    >
                        <Trash2 className="w-3 h-3" />
                        删除 ({selectedIds.size})
                    </button>
                    <button 
                        onClick={cancelManagement}
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
            )}
        </div>
      </div>
      
      <div className="flex overflow-x-auto gap-4 px-4 pb-4 scrollbar-hide">
        {history.map((item) => {
          const isSelected = selectedIds.has(item.id);
          
          if (failedImages.has(item.id)) return null;

          return (
            <div 
                key={item.id} 
                onClick={() => handleItemClick(item)}
                className={`
                    flex-shrink-0 w-24 cursor-pointer group relative transition-all duration-200
                    ${isManaging && isSelected ? 'opacity-100' : ''}
                    ${isManaging && !isSelected ? 'opacity-80' : ''}
                `}
            >
                <div 
                    className={`
                        aspect-[3/4] rounded-lg overflow-hidden border relative transition-all bg-stone-100
                        ${isSelected ? 'border-brand-500 ring-2 ring-brand-500 ring-offset-1' : 'border-stone-200 group-hover:border-brand-300'}
                    `}
                >
                <img 
                    src={item.resultUrl} 
                    alt="History" 
                    className="w-full h-full object-cover" 
                    onError={() => setFailedImages(prev => new Set(prev).add(item.id))}
                />
                
                {/* Overlay when managing */}
                {isManaging && (
                    <div className={`absolute inset-0 bg-black/10 flex items-start justify-end p-1 transition-colors ${isSelected ? 'bg-brand-500/10' : ''}`}>
                        {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-brand-600 bg-white rounded-sm" />
                        ) : (
                            <Square className="w-5 h-5 text-white drop-shadow-md" />
                        )}
                    </div>
                )}

                {/* Hover overlay when NOT managing */}
                {!isManaging && (
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                )}
                </div>
                <div className="text-[10px] text-stone-400 mt-1 truncate">
                    {new Date(item.timestamp).toLocaleTimeString()}
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryGallery;