import React, { useEffect, useState, useRef } from 'react';
import { Wand2, Loader2, Download, RefreshCw, Box, Rotate3d, ArrowRight, ZoomIn, ZoomOut, Home, Undo2 } from './Icons';
import { generateVirtualTryOn, generateTurnaround } from '../services/geminiService';
import { urlToBase64 } from '../utils/imageHelper';
import { SubjectCategory, ItemType } from '../types';

interface StepResultProps {
  faceUrl: string;
  clothUrl: string;
  resultUrl: string | null;
  category: SubjectCategory;
  itemType?: ItemType;
  onResultGenerated: (url: string) => void;
  onReset: () => void;
  onBack: () => void;
}

type ViewMode = '2d' | '3d-card' | '360-turnaround';

const StepResult: React.FC<StepResultProps> = ({ faceUrl, clothUrl, resultUrl, category, itemType, onResultGenerated, onReset, onBack }) => {
  // Main Generation State
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);
  
  // View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('2d');

  // Zoom & Pan State (Global)
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Magnifier State (Local)
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const imgContainerRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // 360 Turnaround State
  const [turnaroundUrl, setTurnaroundUrl] = useState<string | null>(null);
  const [isGeneratingTurnaround, setIsGeneratingTurnaround] = useState(false);
  const [turnaroundFrame, setTurnaroundFrame] = useState(0); // 0: Front, 1: Side, 2: Back
  const scrubberRef = useRef<HTMLDivElement>(null);

  // Initial Generation
  const handleGenerate = async () => {
    setIsProcessing(true);
    setError(null);
    setHasAttempted(true);
    try {
      const faceB64 = await urlToBase64(faceUrl);
      const clothB64 = await urlToBase64(clothUrl);
      // Pass itemType (defaults to 'clothing' if undefined)
      const generatedImage = await generateVirtualTryOn(faceB64, clothB64, category, itemType || 'clothing');
      onResultGenerated(generatedImage);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "生成失败，请重试。如果使用预设图片，可能存在跨域问题，请尝试上传本地图片。");
    } finally {
      setIsProcessing(false);
    }
  };

  // 360 Turnaround Generation
  const handleGenerateTurnaround = async () => {
      if (turnaroundUrl) return; // Already generated
      
      setIsGeneratingTurnaround(true);
      setError(null);
      try {
          const faceB64 = await urlToBase64(faceUrl);
          const clothB64 = await urlToBase64(clothUrl);
          const generatedSprite = await generateTurnaround(faceB64, clothB64, category);
          setTurnaroundUrl(generatedSprite);
      } catch (err: any) {
          console.error(err);
          // Don't replace the main result error, just show an alert or small error
          alert("无法生成 360 视图: " + (err.message || "请稍后重试"));
          setViewMode('2d'); // Fallback
      } finally {
          setIsGeneratingTurnaround(false);
      }
  };

  useEffect(() => {
    if (!resultUrl && !hasAttempted && !isProcessing) {
        handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
      if (viewMode === '360-turnaround' && !turnaroundUrl && !isGeneratingTurnaround) {
          handleGenerateTurnaround();
      }
      
      if (viewMode !== '3d-card') {
          setRotation({ x: 0, y: 0 });
      }
      
      // Reset zoom and pan on mode change
      setZoomLevel(1);
      setPan({ x: 0, y: 0 });
      setIsDragging(false);
  }, [viewMode]);

  // --- Zoom Handlers ---
  const handleZoomIn = () => {
      setZoomLevel(prev => Math.min(prev + 0.5, 4));
  };
  
  const handleZoomOut = () => {
      setZoomLevel(prev => {
          const newZoom = Math.max(prev - 0.5, 1);
          if (newZoom === 1) setPan({ x: 0, y: 0 }); // Reset pan if zoomed out completely
          return newZoom;
      });
  };

  // --- Magnifier Handlers ---
  const handleMouseEnter = () => {
      // Only show magnifier if NOT zoomed in
      if (zoomLevel === 1) setShowMagnifier(true);
  };
  
  const handleMouseLeave = () => setShowMagnifier(false);
  
  const handleMouseMoveMagnifier = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!imgContainerRef.current || zoomLevel > 1) {
          setShowMagnifier(false);
          return;
      }
      
      const { left, top, width, height } = imgContainerRef.current.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;
      
      setCursorPos({ x, y });
      
      const xPerc = (x / width) * 100;
      const yPerc = (y / height) * 100;

      setMagnifierPos({ x: xPerc, y: yPerc });
  };


  // --- Unified Drag Handlers (3D, 360, 2D Pan) ---
  const handleStart = (clientX: number, clientY: number) => {
    if (viewMode === '3d-card') {
        setIsDragging(true);
        lastPos.current = { x: clientX, y: clientY };
    } else if (viewMode === '360-turnaround' && turnaroundUrl) {
        setIsDragging(true);
        updateTurnaroundFrame(clientX);
    } else if (viewMode === '2d' && zoomLevel > 1) {
        // Pan Mode
        setIsDragging(true);
        lastPos.current = { x: clientX, y: clientY };
    }
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    if (viewMode === '3d-card') {
        const deltaX = clientX - lastPos.current.x;
        const deltaY = clientY - lastPos.current.y;
        const sensitivity = 0.5;

        setRotation(prev => ({
            x: Math.max(-60, Math.min(60, prev.x - deltaY * sensitivity)),
            y: Math.max(-60, Math.min(60, prev.y + deltaX * sensitivity))
        }));
        lastPos.current = { x: clientX, y: clientY };
    } 
    else if (viewMode === '360-turnaround' && turnaroundUrl) {
        updateTurnaroundFrame(clientX);
    }
    else if (viewMode === '2d' && zoomLevel > 1) {
        // Handle Panning
        const deltaX = clientX - lastPos.current.x;
        const deltaY = clientY - lastPos.current.y;
        
        setPan(prev => ({
            x: prev.x + deltaX,
            y: prev.y + deltaY
        }));
        lastPos.current = { x: clientX, y: clientY };
    }
  };

  const updateTurnaroundFrame = (clientX: number) => {
      if (!scrubberRef.current) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const percent = Math.max(0, Math.min(1, relativeX / rect.width));
      
      let frame = 0;
      if (percent > 0.66) frame = 2; // Back
      else if (percent > 0.33) frame = 1; // Side
      else frame = 0; // Front

      setTurnaroundFrame(frame);
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Mouse Events
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault(); // Prevent default drag behavior
      handleStart(e.clientX, e.clientY);
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      handleMove(e.clientX, e.clientY);
      // Pass through to magnifier if applicable
      if (viewMode === '2d') handleMouseMoveMagnifier(e);
  };
  const onMouseUp = () => handleEnd();
  const onMouseLeaveEvent = () => {
      handleEnd();
      handleMouseLeave();
  };

  // Touch Events
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchEnd = () => handleEnd();

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Wand2 className="w-8 h-8 text-brand-600 animate-pulse" />
          </div>
        </div>
        <h3 className="mt-6 text-xl font-bold text-stone-800">正在施展魔法...</h3>
        <p className="text-stone-500 mt-2 text-center max-w-md">
          Gemini Nano Banana 正在进行{category === SubjectCategory.PERSON ? '虚拟试穿' : '创意合成'}...
          <br/>
          <span className="text-xs text-brand-500">正在为您尝试不同的拍摄角度和姿势</span>
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-bold text-stone-800 mb-2">哎呀，出错了</h3>
        <p className="text-red-500 text-center max-w-md mb-6">{error}</p>
        <div className="flex gap-4">
            <button 
                onClick={onBack}
                className="px-6 py-2 border border-stone-300 rounded-lg text-stone-600 hover:bg-stone-50"
            >
                返回选择
            </button>
            <button 
                onClick={handleGenerate}
                className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center gap-2"
            >
                <RefreshCw className="w-4 h-4" /> 重试
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full select-none">
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-brand-600" />
          {category === SubjectCategory.PERSON ? '试穿结果' : '合成结果'}
        </h2>
         <div className="flex gap-2 items-center flex-wrap">
            {/* Navigation Buttons */}
            <button
                onClick={onReset}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 flex items-center gap-1"
                title="回到首页 (Home)"
            >
                <Home className="w-3.5 h-3.5" />
            </button>
            <button
                onClick={onBack}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 flex items-center gap-1"
                title="重选服饰 (Reselect)"
            >
                <Undo2 className="w-3.5 h-3.5" />
            </button>
            <div className="h-4 w-px bg-stone-300 mx-1"></div>

            {/* View Mode Toggles */}
            <div className="flex bg-stone-100 rounded-lg p-1">
                <button
                    onClick={() => setViewMode('2d')}
                    className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${viewMode === '2d' ? 'bg-white shadow text-brand-600' : 'text-stone-500'}`}
                >
                    2D
                </button>
                <button
                    onClick={() => setViewMode('3d-card')}
                    className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${viewMode === '3d-card' ? 'bg-white shadow text-brand-600' : 'text-stone-500'}`}
                >
                    <Box className="w-3 h-3" /> 3D
                </button>
                <button
                    onClick={() => setViewMode('360-turnaround')}
                    className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${viewMode === '360-turnaround' ? 'bg-white shadow text-brand-600' : 'text-stone-500'}`}
                >
                    <Rotate3d className="w-3 h-3" /> 360°
                </button>
            </div>

            <button 
                onClick={handleGenerate}
                className="text-xs font-medium px-3 py-1.5 bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 flex items-center gap-1"
                title="生成不同的姿势或角度"
            >
                <RefreshCw className="w-3 h-3" /> 换个姿势
            </button>

             <a 
                href={resultUrl || '#'}
                download="ai-result.png"
                className={`text-xs font-medium px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center gap-1 ${!resultUrl ? 'opacity-50 pointer-events-none' : ''}`}
            >
                <Download className="w-3 h-3" /> 保存
            </a>
         </div>
      </div>

      <div 
        ref={scrubberRef}
        className={`
            flex-1 flex items-center justify-center bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 relative group
            ${viewMode === '2d' && zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}
            ${viewMode === '2d' && zoomLevel === 1 ? 'cursor-crosshair' : ''}
        `}
        style={{ perspective: '1200px' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeaveEvent}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* --- Global Zoom Controls (Only 2D) --- */}
        {viewMode === '2d' && (
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
                <button onClick={handleZoomIn} className="p-2 bg-white/90 backdrop-blur rounded-full shadow-md hover:bg-white text-stone-600">
                    <ZoomIn className="w-5 h-5" />
                </button>
                <button onClick={handleZoomOut} className="p-2 bg-white/90 backdrop-blur rounded-full shadow-md hover:bg-white text-stone-600">
                    <ZoomOut className="w-5 h-5" />
                </button>
                 <div className="bg-black/50 backdrop-blur text-white text-xs px-2 py-1 rounded-full text-center">
                    {Math.round(zoomLevel * 100)}%
                </div>
            </div>
        )}


        {/* --- 360 Turnaround Mode --- */}
        {viewMode === '360-turnaround' && (
            <div className="w-full h-full flex items-center justify-center bg-stone-50">
                {isGeneratingTurnaround ? (
                    <div className="flex flex-col items-center animate-pulse">
                        <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-2" />
                        <span className="text-sm font-medium text-stone-500">正在生成多角度视图...</span>
                        <span className="text-xs text-stone-400 mt-1">AI 正在绘制 正面、侧面、背面</span>
                    </div>
                ) : turnaroundUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-ew-resize">
                        <div className="relative w-full max-w-sm aspect-[9/16] overflow-hidden rounded-xl shadow-lg bg-white border-4 border-white">
                            <img 
                                src={turnaroundUrl} 
                                alt="360 Sprite Sheet" 
                                className="absolute max-w-none h-full object-cover"
                                style={{ 
                                    width: '300%', 
                                    left: `-${turnaroundFrame * 100}%`, 
                                    transition: 'left 0.2s cubic-bezier(0.2, 0, 0.2, 1)' 
                                }}
                                draggable={false}
                            />
                            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                                {turnaroundFrame === 0 ? '正面 (Front)' : turnaroundFrame === 1 ? '侧面 (Side)' : '背面 (Back)'}
                            </div>
                        </div>
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 shadow-sm backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none">
                            <ArrowRight className="w-3 h-3 rotate-180 text-stone-400" />
                            <span className="text-xs font-medium text-stone-600">左右拖动查看</span>
                            <ArrowRight className="w-3 h-3 text-stone-400" />
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-6">
                        <p className="text-stone-500 mb-4">生成失败或已取消</p>
                        <button onClick={handleGenerateTurnaround} className="text-brand-600 underline">重试</button>
                    </div>
                )}
            </div>
        )}

        {/* --- 3D Card Mode --- */}
        {viewMode === '3d-card' && resultUrl && (
             <div 
                className={`
                    relative w-full h-full flex items-center justify-center transition-transform duration-75 ease-linear transform-style-3d
                    ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                `}
                style={{
                    transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                    transformStyle: 'preserve-3d',
                    touchAction: 'none'
                }}
             >
                <div 
                    className="relative rounded-xl overflow-hidden bg-white shadow-2xl"
                    style={{
                        transform: 'translateZ(10px)',
                        boxShadow: `${-rotation.y}px ${10 + rotation.x}px 30px rgba(0,0,0,0.3)`
                    }}
                >
                    <img 
                        src={resultUrl} 
                        alt="Final Result" 
                        className="max-h-[60vh] max-w-full object-contain block"
                        draggable={false}
                    />
                    <div 
                        className="absolute inset-0 pointer-events-none z-10 rounded-xl"
                        style={{
                            background: `linear-gradient(
                                ${135 + rotation.y}deg, 
                                rgba(255,255,255,${Math.max(0, 0.4 - Math.abs(rotation.y)/100)}) 0%, 
                                rgba(255,255,255,0) 50%,
                                rgba(0,0,0,${Math.max(0, Math.abs(rotation.y)/200)}) 100%
                            )`
                        }}
                    />
                </div>
             </div>
        )}

        {/* --- 2D Mode with Zoom & Pan --- */}
        {viewMode === '2d' && resultUrl && (
             <div 
                className="relative w-full h-full flex items-center justify-center overflow-hidden"
                onMouseEnter={handleMouseEnter}
             >
                 {/* Main Image Container with Transform */}
                 <div 
                    ref={imgContainerRef}
                    className="relative transition-transform duration-100 ease-out origin-center"
                    style={{ 
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})` 
                    }}
                 >
                    <img 
                        src={resultUrl} 
                        alt="Final Result" 
                        className="max-h-[60vh] max-w-full object-contain block shadow-lg rounded-xl bg-white"
                        draggable={false}
                    />
                 </div>

                 {/* Magnifying Lens (Only when zoom is 1 and NOT dragging) */}
                 {showMagnifier && zoomLevel === 1 && !isDragging && (
                    <div 
                        className="absolute w-32 h-32 rounded-full border-4 border-white shadow-xl pointer-events-none overflow-hidden z-30"
                        style={{
                            left: cursorPos.x - 64, // Center on cursor
                            top: cursorPos.y - 64,
                            backgroundImage: `url(${resultUrl})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: `${(imgContainerRef.current?.offsetWidth || 0) * 2.5}px ${(imgContainerRef.current?.offsetHeight || 0) * 2.5}px`,
                            backgroundPosition: `${magnifierPos.x}% ${magnifierPos.y}%`
                        }}
                    >
                        <div className="absolute inset-0 bg-black/10 ring-1 ring-inset ring-black/10 rounded-full"></div>
                    </div>
                 )}
             </div>
        )}
      </div>
      
      <div className="mt-4 text-center text-xs text-stone-400 flex flex-col gap-1">
        <span>由 Google Gemini Nano Banana 模型生成</span>
        {viewMode === '3d-card' && <span className="text-indigo-500">拖拽可旋转卡片</span>}
        {viewMode === '2d' && zoomLevel === 1 && <span className="text-brand-500">鼠标悬停可查看细节，右上角调节缩放</span>}
        {viewMode === '2d' && zoomLevel > 1 && <span className="text-brand-500 font-bold">按住鼠标拖拽图片以移动视野</span>}
      </div>
    </div>
  );
};

export default StepResult;