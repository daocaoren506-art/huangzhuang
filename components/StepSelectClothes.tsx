import React, { useRef, useState, useEffect } from 'react';
import { PRESET_CLOTHES, PRESET_ACCESSORIES } from '../constants';
import { Upload, Shirt, Wand2, Loader2, Glasses, Gem, Trash2, Edit, Check, CheckSquare, Square, X } from './Icons';
import { generateClothingFromText } from '../services/geminiService';
import { ItemType } from '../types';

interface StepSelectClothesProps {
  onSelect: (url: string, type: ItemType) => void;
  currentSelection: string | null;
  customClothes: string[]; 
  onAddCustomCloth: (url: string) => void;
  onDeleteCustomCloth: (url: string) => void;
  onBatchDeleteCustomCloth: (urls: string[]) => void;
  customAccessories: string[];
  onAddCustomAccessory: (url: string) => void;
  onDeleteCustomAccessory: (url: string) => void;
  onBatchDeleteCustomAccessory: (urls: string[]) => void;
}

const StepSelectClothes: React.FC<StepSelectClothesProps> = ({ 
  onSelect, 
  currentSelection, 
  customClothes, 
  onAddCustomCloth,
  onDeleteCustomCloth,
  onBatchDeleteCustomCloth,
  customAccessories,
  onAddCustomAccessory,
  onDeleteCustomAccessory,
  onBatchDeleteCustomAccessory
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'clothes' | 'accessories'>('clothes');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Management State
  const [isManaging, setIsManaging] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<Set<string>>(new Set());
  
  // Track failed images to hide them
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Reset management state when tab changes
  useEffect(() => {
    setIsManaging(false);
    setSelectedDeleteIds(new Set());
    setError(null);
  }, [activeTab]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          const newUrl = event.target.result;
          const type = activeTab === 'clothes' ? 'clothing' : 'accessory';
          if (activeTab === 'clothes') {
              onAddCustomCloth(newUrl);
          } else {
              onAddCustomAccessory(newUrl);
          }
          if (!isManaging) {
              onSelect(newUrl, type);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const imageUrl = await generateClothingFromText(prompt);
      const type = activeTab === 'clothes' ? 'clothing' : 'accessory';
      if (activeTab === 'clothes') {
          onAddCustomCloth(imageUrl);
      } else {
          onAddCustomAccessory(imageUrl);
      }
      if (!isManaging) {
          onSelect(imageUrl, type);
      }
      setPrompt('');
    } catch (err) {
      setError("生成失败，请检查网络或 API Key");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

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
      if (window.confirm(`确定要删除选中的 ${selectedDeleteIds.size} 个项目吗？`)) {
          const urls = Array.from(selectedDeleteIds);
          if (activeTab === 'clothes') {
              onBatchDeleteCustomCloth(urls);
          } else {
              onBatchDeleteCustomAccessory(urls);
          }
          setSelectedDeleteIds(new Set());
          setIsManaging(false);
      }
  };

  const displayItems = activeTab === 'clothes' 
      ? [...customClothes, ...PRESET_CLOTHES] 
      : [...customAccessories, ...PRESET_ACCESSORIES];

  const customCount = activeTab === 'clothes' ? customClothes.length : customAccessories.length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
          {activeTab === 'clothes' ? <Shirt className="w-5 h-5 text-brand-600" /> : <Glasses className="w-5 h-5 text-brand-600" />}
          选择或生成{activeTab === 'clothes' ? '服装' : '配饰'}
        </h2>
        
        <div className="flex items-center gap-2">
            {/* Management Controls */}
            {customCount > 0 && (
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
            <span className="text-xs font-medium px-2 py-1 bg-brand-100 text-brand-700 rounded-full ml-2">步骤 2/3</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-stone-100 p-1 rounded-xl mb-6 self-start">
        <button
            onClick={() => setActiveTab('clothes')}
            className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2
                ${activeTab === 'clothes' 
                    ? 'bg-white text-brand-600 shadow-sm' 
                    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'
                }
            `}
        >
            <Shirt className="w-4 h-4" />
            服装
        </button>
        <button
            onClick={() => setActiveTab('accessories')}
            className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2
                ${activeTab === 'accessories' 
                    ? 'bg-white text-brand-600 shadow-sm' 
                    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'
                }
            `}
        >
            <Gem className="w-4 h-4" />
            配饰
        </button>
      </div>

      {/* AI Generation Bar */}
      <div className="mb-6">
        <div className={`p-1 rounded-2xl bg-gradient-to-br ${activeTab === 'clothes' ? 'from-brand-100 to-indigo-50' : 'from-pink-100 to-rose-50'}`}>
           <div className="bg-white rounded-xl p-4 shadow-sm">
             <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${activeTab === 'clothes' ? 'bg-brand-100' : 'bg-pink-100'}`}>
                    <Wand2 className={`w-4 h-4 ${activeTab === 'clothes' ? 'text-brand-600' : 'text-pink-600'}`} />
                </div>
                <span className="text-sm font-semibold text-stone-800">
                    AI {activeTab === 'clothes' ? '服装' : '配饰'}设计室
                </span>
             </div>
             <div className="flex flex-col sm:flex-row gap-2">
                 <div className="relative flex-1">
                    <input 
                        type="text" 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={activeTab === 'clothes' 
                            ? "描述你想设计的服装，例如：一件赛博朋克风格的发光夹克..."
                            : "描述你想设计的配饰，例如：一顶红色的贝雷帽，或者一副复古墨镜..."
                        }
                        className="w-full pl-4 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    />
                 </div>
                 <button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className={`
                        px-5 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95 whitespace-nowrap text-white
                        ${activeTab === 'clothes' 
                            ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20' 
                            : 'bg-pink-600 hover:bg-pink-700 shadow-pink-500/20'
                        }
                    `}
                 >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    生成{activeTab === 'clothes' ? '服装' : '配饰'}
                 </button>
             </div>
           </div>
        </div>
      </div>

      {error && <p className="text-red-500 text-xs mb-2 text-center bg-red-50 py-1 rounded-lg border border-red-100">{error}</p>}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 overflow-y-auto pr-2 pb-20">
        {/* Upload Button */}
        <div 
          onClick={() => !isManaging && fileInputRef.current?.click()}
          className={`
            aspect-[3/4] rounded-xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center transition-colors group
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
          <div className="w-10 h-10 rounded-full bg-stone-100 group-hover:bg-brand-200 flex items-center justify-center mb-2 transition-colors">
            <Upload className="w-5 h-5 text-stone-500 group-hover:text-brand-700" />
          </div>
          <span className="text-xs text-stone-500 font-medium">上传{activeTab === 'clothes' ? '服装' : '配饰'}</span>
        </div>

        {/* Items */}
        {displayItems.map((url, index) => {
            const isCustom = index < customCount;
            const isSelectedForDelete = selectedDeleteIds.has(url);
            
            if (failedImages.has(url)) return null;

            return (
              <div 
                key={`${index}-${url}`}
                onClick={() => {
                    if (isManaging && isCustom) {
                        toggleDeleteSelection(url);
                    } else if (!isManaging) {
                        onSelect(url, activeTab === 'clothes' ? 'clothing' : 'accessory');
                    }
                }}
                className={`
                  relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer group transition-all duration-200 bg-stone-100
                  ${currentSelection === url && !isManaging ? 'ring-4 ring-brand-500 ring-offset-2 shadow-lg' : ''}
                  ${isManaging && isCustom ? 'hover:ring-2 hover:ring-red-300' : (!isManaging && 'hover:ring-2 hover:ring-brand-300 shadow-sm')}
                  ${isManaging && !isCustom ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <img 
                    src={url} 
                    alt={`Item ${index}`} 
                    className="w-full h-full object-cover bg-stone-100 transition-transform group-hover:scale-105"
                    onError={() => setFailedImages(prev => new Set(prev).add(url))}
                />
                
                {/* Selection Dot (Normal Mode) */}
                {currentSelection === url && !isManaging && (
                  <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
                     <div className="bg-white rounded-full p-1 shadow-sm">
                        <div className="w-2 h-2 bg-brand-600 rounded-full" />
                    </div>
                  </div>
                )}
                
                {/* Single Delete Button (Normal Mode) - Only if not managing */}
                {isCustom && !isManaging && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (activeTab === 'clothes') {
                                onDeleteCustomCloth(url);
                            } else {
                                onDeleteCustomAccessory(url);
                            }
                        }}
                        className="absolute top-1 right-1 p-1 bg-white/80 rounded-full text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                        title="删除"
                    >
                        <Trash2 className="w-3 h-3" />
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
    </div>
  );
};

export default StepSelectClothes;