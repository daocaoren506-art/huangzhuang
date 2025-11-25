import React from 'react';
import { AppStep } from '../types';

interface TopShowcaseProps {
  step: AppStep;
  faceUrl: string | null;
  clothUrl: string | null;
  resultUrl: string | null;
}

const TopShowcase: React.FC<TopShowcaseProps> = ({ step, faceUrl, clothUrl, resultUrl }) => {
  return (
    <div className="relative w-full h-80 bg-gradient-to-b from-brand-50 to-white overflow-hidden flex items-center justify-center perspective-1000">
      {/* Decorative background elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-brand-200 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-indigo-200 rounded-full blur-3xl opacity-50"></div>

      <div className="relative flex items-center justify-center w-full max-w-4xl mx-auto h-full px-4">
        
        {/* Card 1: Face */}
        <div 
          className={`
            absolute transition-all duration-700 ease-in-out transform rounded-2xl shadow-xl bg-white overflow-hidden border-4 border-white
            ${step === AppStep.SELECT_FACE ? 'z-30 scale-110 translate-x-0 rotate-0 opacity-100' : ''}
            ${step === AppStep.SELECT_CLOTHES ? 'z-10 scale-90 -translate-x-48 -rotate-6 opacity-60 blur-[1px]' : ''}
            ${step === AppStep.GENERATE_RESULT ? 'z-0 scale-75 -translate-x-64 -rotate-12 opacity-40 blur-[2px]' : ''}
          `}
          style={{ width: '200px', height: '280px' }}
        >
            {faceUrl ? (
                <img src={faceUrl} alt="Face" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-400">
                    <span className="text-sm font-medium">等待选择人物</span>
                </div>
            )}
            <div className="absolute bottom-0 left-0 w-full bg-black/50 backdrop-blur-sm text-white text-xs py-2 text-center">
                Step 1: 人物
            </div>
        </div>

        {/* Card 2: Clothes */}
        <div 
           className={`
            absolute transition-all duration-700 ease-in-out transform rounded-2xl shadow-xl bg-white overflow-hidden border-4 border-white
            ${step === AppStep.SELECT_FACE ? 'z-10 scale-90 translate-x-48 rotate-6 opacity-60 blur-[1px]' : ''}
            ${step === AppStep.SELECT_CLOTHES ? 'z-30 scale-110 translate-x-0 rotate-0 opacity-100' : ''}
            ${step === AppStep.GENERATE_RESULT ? 'z-10 scale-90 -translate-x-32 -rotate-6 opacity-60 blur-[1px]' : ''}
          `}
          style={{ width: '200px', height: '280px' }}
        >
            {clothUrl ? (
                <img src={clothUrl} alt="Clothes" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-400">
                    <span className="text-sm font-medium">等待选择服装</span>
                </div>
            )}
             <div className="absolute bottom-0 left-0 w-full bg-black/50 backdrop-blur-sm text-white text-xs py-2 text-center">
                Step 2: 服装
            </div>
        </div>

        {/* Card 3: Result */}
        <div 
           className={`
            absolute transition-all duration-700 ease-in-out transform rounded-2xl shadow-xl bg-white overflow-hidden border-4 border-white
            ${step === AppStep.SELECT_FACE ? 'z-0 scale-75 translate-x-64 rotate-12 opacity-40 blur-[2px]' : ''}
            ${step === AppStep.SELECT_CLOTHES ? 'z-0 scale-90 translate-x-48 rotate-6 opacity-60 blur-[1px]' : ''}
            ${step === AppStep.GENERATE_RESULT ? 'z-30 scale-110 translate-x-0 rotate-0 opacity-100 shadow-2xl shadow-brand-500/20' : ''}
          `}
          style={{ width: '200px', height: '280px' }}
        >
            {resultUrl ? (
                <img src={resultUrl} alt="Result" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-500 to-indigo-600 text-white">
                    <div className="animate-pulse">
                        <span className="text-4xl">✨</span>
                    </div>
                    <span className="text-sm font-medium mt-2">AI 生成</span>
                </div>
            )}
             <div className="absolute bottom-0 left-0 w-full bg-black/50 backdrop-blur-sm text-white text-xs py-2 text-center">
                Step 3: 试穿效果
            </div>
        </div>

      </div>
    </div>
  );
};

export default TopShowcase;