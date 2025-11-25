import React, { useState, useEffect } from 'react';
import TopShowcase from './components/TopShowcase';
import StepSelectFace from './components/StepSelectFace';
import StepSelectClothes from './components/StepSelectClothes';
import StepResult from './components/StepResult';
import HistoryGallery from './components/HistoryGallery';
import { AppStep, HistoryItem, SubjectCategory, ItemType } from './types';
import { ArrowRight, ChevronRight } from './components/Icons';

const App: React.FC = () => {
  // State
  const [step, setStep] = useState<AppStep>(AppStep.SELECT_FACE);
  const [selectedFace, setSelectedFace] = useState<string | null>(null);
  const [selectedCloth, setSelectedCloth] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<ItemType>('clothing'); // Track if cloth is clothing or accessory
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  
  // New: Category State
  const [category, setCategory] = useState<SubjectCategory>(SubjectCategory.PERSON);
  const [customUploads, setCustomUploads] = useState<Record<SubjectCategory, string[]>>({
      [SubjectCategory.PERSON]: [],
      [SubjectCategory.ANIMAL]: [],
      [SubjectCategory.OBJECT]: []
  });

  const [customClothes, setCustomClothes] = useState<string[]>([]);
  const [customAccessories, setCustomAccessories] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Helper to validate arrays of strings
  const cleanStringArray = (arr: any): string[] => {
      if (!Array.isArray(arr)) return [];
      return arr.filter(item => typeof item === 'string' && item.length > 5); // Basic check for valid data url or http link
  };

  // Persistence: Load from local storage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('ai-style-studio-history');
    const savedClothes = localStorage.getItem('ai-style-studio-custom-clothes');
    const savedAccessories = localStorage.getItem('ai-style-studio-custom-accessories');
    const savedUploads = localStorage.getItem('ai-style-studio-custom-uploads');
    
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) setHistory(parsed);
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
    
    if (savedClothes) {
      try {
        const parsed = JSON.parse(savedClothes);
        setCustomClothes(cleanStringArray(parsed));
      } catch (e) {
        console.error("Failed to parse custom clothes", e);
      }
    }

    if (savedAccessories) {
      try {
        const parsed = JSON.parse(savedAccessories);
        setCustomAccessories(cleanStringArray(parsed));
      } catch (e) {
        console.error("Failed to parse custom accessories", e);
      }
    }

    if (savedUploads) {
        try {
            const parsed = JSON.parse(savedUploads);
            const cleanedUploads = {
                [SubjectCategory.PERSON]: cleanStringArray(parsed[SubjectCategory.PERSON]),
                [SubjectCategory.ANIMAL]: cleanStringArray(parsed[SubjectCategory.ANIMAL]),
                [SubjectCategory.OBJECT]: cleanStringArray(parsed[SubjectCategory.OBJECT])
            };
            setCustomUploads(cleanedUploads);
        } catch(e) {
            console.error("Failed to parse custom uploads", e);
        }
    }
  }, []);

  // Helper to safely save data with quota handling
  const saveToStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e: any) {
      if (
        e.name === 'QuotaExceededError' || 
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
        e.code === 22
      ) {
        console.warn(`Storage quota exceeded for ${key}. Attempting to trim old data.`);
        // Note: For objects/maps this simple trim might not work perfectly without more logic, 
        // but for arrays it is safer.
        if (Array.isArray(data) && data.length > 0) {
           const keepCount = Math.max(1, Math.floor(data.length / 2));
           const trimmedData = data.slice(0, keepCount);
           try {
             localStorage.setItem(key, JSON.stringify(trimmedData));
           } catch (retryError) {}
        }
      } else {
        console.error("LocalStorage error:", e);
      }
    }
  };

  // Persistence
  useEffect(() => {
    saveToStorage('ai-style-studio-history', history);
  }, [history]);

  useEffect(() => {
    saveToStorage('ai-style-studio-custom-clothes', customClothes);
  }, [customClothes]);

  useEffect(() => {
    saveToStorage('ai-style-studio-custom-accessories', customAccessories);
  }, [customAccessories]);

  useEffect(() => {
    saveToStorage('ai-style-studio-custom-uploads', customUploads);
  }, [customUploads]);

  // Handlers
  const handleFaceSelect = (url: string) => {
    setSelectedFace(url);
  };

  const handleClothSelect = (url: string, type: ItemType) => {
    setSelectedCloth(url);
    setSelectedItemType(type);
  };

  const handleAddCustomUpload = (cat: SubjectCategory, url: string) => {
      setCustomUploads(prev => ({
          ...prev,
          [cat]: [url, ...prev[cat]]
      }));
  };

  // --- Deletion Handlers ---
  const handleDeleteCustomUpload = (cat: SubjectCategory, urlToDelete: string) => {
      setCustomUploads(prev => ({
          ...prev,
          [cat]: prev[cat].filter(url => url !== urlToDelete)
      }));
      // If the deleted item was selected, deselect it
      if (selectedFace === urlToDelete) setSelectedFace(null);
  };
  
  const handleBatchDeleteCustomUpload = (cat: SubjectCategory, urlsToDelete: string[]) => {
      setCustomUploads(prev => ({
          ...prev,
          [cat]: prev[cat].filter(url => !urlsToDelete.includes(url))
      }));
      if (selectedFace && urlsToDelete.includes(selectedFace)) setSelectedFace(null);
  };

  const handleDeleteCustomCloth = (urlToDelete: string) => {
      setCustomClothes(prev => prev.filter(url => url !== urlToDelete));
      if (selectedCloth === urlToDelete) setSelectedCloth(null);
  };

  const handleBatchDeleteCustomCloth = (urlsToDelete: string[]) => {
      setCustomClothes(prev => prev.filter(url => !urlsToDelete.includes(url)));
      if (selectedCloth && urlsToDelete.includes(selectedCloth)) setSelectedCloth(null);
  };

  const handleDeleteCustomAccessory = (urlToDelete: string) => {
      setCustomAccessories(prev => prev.filter(url => url !== urlToDelete));
      if (selectedCloth === urlToDelete) setSelectedCloth(null);
  };

  const handleBatchDeleteCustomAccessory = (urlsToDelete: string[]) => {
      setCustomAccessories(prev => prev.filter(url => !urlsToDelete.includes(url)));
      if (selectedCloth && urlsToDelete.includes(selectedCloth)) setSelectedCloth(null);
  };

  const handleDeleteHistoryItems = (ids: string[]) => {
      setHistory(prev => prev.filter(item => !ids.includes(item.id)));
  };


  const handleResultGenerated = (url: string) => {
    setGeneratedResult(url);
    
    if (selectedFace && selectedCloth) {
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        faceUrl: selectedFace,
        clothUrl: selectedCloth,
        resultUrl: url,
        timestamp: Date.now(),
        category: category,
        itemType: selectedItemType
      };
      setHistory(prev => [newItem, ...prev]);
    }
  };

  const nextStep = () => {
    if (step === AppStep.SELECT_FACE && selectedFace) {
      setStep(AppStep.SELECT_CLOTHES);
    } else if (step === AppStep.SELECT_CLOTHES && selectedCloth) {
      setStep(AppStep.GENERATE_RESULT);
    }
  };

  const prevStep = () => {
    if (step === AppStep.SELECT_CLOTHES) setStep(AppStep.SELECT_FACE);
    if (step === AppStep.GENERATE_RESULT) setStep(AppStep.SELECT_CLOTHES);
  };
  
  const handleBackToClothes = () => {
      setStep(AppStep.SELECT_CLOTHES);
      // We don't necessarily need to clear the generated result here, 
      // but let's keep it clean.
      setGeneratedResult(null); 
  };

  const reset = () => {
    setGeneratedResult(null);
    setStep(AppStep.SELECT_FACE);
    setSelectedFace(null);
    setSelectedCloth(null);
  };

  const loadHistoryItem = (item: HistoryItem) => {
      setSelectedFace(item.faceUrl);
      setSelectedCloth(item.clothUrl);
      setGeneratedResult(item.resultUrl);
      if (item.category) setCategory(item.category);
      if (item.itemType) setSelectedItemType(item.itemType);
      setStep(AppStep.GENERATE_RESULT);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 font-sans text-stone-900">
      
      {/* Header / Top Showcase */}
      <TopShowcase 
        step={step}
        faceUrl={selectedFace}
        clothUrl={selectedCloth}
        resultUrl={generatedResult}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 -mt-10 relative z-20 pb-10">
        
        <div className="bg-white rounded-3xl shadow-xl border border-stone-100 overflow-hidden min-h-[500px] flex flex-col">
          
          <div className="flex-1 p-6 sm:p-8">
            
            {step === AppStep.SELECT_FACE && (
              <StepSelectFace 
                onSelect={handleFaceSelect} 
                currentSelection={selectedFace}
                category={category}
                onCategoryChange={setCategory}
                customUploads={customUploads}
                onAddCustomUpload={handleAddCustomUpload}
                onDeleteCustomUpload={handleDeleteCustomUpload}
                onBatchDeleteCustomUpload={handleBatchDeleteCustomUpload}
              />
            )}

            {step === AppStep.SELECT_CLOTHES && (
              <StepSelectClothes 
                onSelect={handleClothSelect}
                currentSelection={selectedCloth}
                customClothes={customClothes}
                onAddCustomCloth={(url) => setCustomClothes(prev => [url, ...prev])}
                onDeleteCustomCloth={handleDeleteCustomCloth}
                onBatchDeleteCustomCloth={handleBatchDeleteCustomCloth}
                customAccessories={customAccessories}
                onAddCustomAccessory={(url) => setCustomAccessories(prev => [url, ...prev])}
                onDeleteCustomAccessory={handleDeleteCustomAccessory}
                onBatchDeleteCustomAccessory={handleBatchDeleteCustomAccessory}
              />
            )}

            {step === AppStep.GENERATE_RESULT && selectedFace && selectedCloth && (
              <StepResult 
                faceUrl={selectedFace}
                clothUrl={selectedCloth}
                resultUrl={generatedResult}
                category={category}
                itemType={selectedItemType}
                onResultGenerated={handleResultGenerated}
                onReset={reset}
                onBack={handleBackToClothes}
              />
            )}

          </div>

          {step !== AppStep.GENERATE_RESULT && (
            <div className="p-6 border-t border-stone-100 flex justify-between items-center bg-stone-50/50">
              {step === AppStep.SELECT_CLOTHES ? (
                  <button 
                    onClick={prevStep}
                    className="px-4 py-2 rounded-lg text-stone-500 hover:bg-stone-100 font-medium transition-colors"
                  >
                    返回上一步
                  </button>
              ) : (
                <div></div> 
              )}

              <button
                onClick={nextStep}
                disabled={(step === AppStep.SELECT_FACE && !selectedFace) || (step === AppStep.SELECT_CLOTHES && !selectedCloth)}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg shadow-brand-500/30 transition-all
                  ${
                    ((step === AppStep.SELECT_FACE && selectedFace) || (step === AppStep.SELECT_CLOTHES && selectedCloth))
                      ? 'bg-brand-600 hover:bg-brand-700 hover:scale-105' 
                      : 'bg-stone-300 cursor-not-allowed'
                  }
                `}
              >
                {step === AppStep.SELECT_CLOTHES ? '开始生成' : '下一步'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <HistoryGallery 
            history={history} 
            onSelectHistory={loadHistoryItem} 
            onDeleteHistoryItems={handleDeleteHistoryItems}
        />

      </main>

      <footer className="text-center py-6 text-stone-400 text-sm">
        AI Style Studio &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;