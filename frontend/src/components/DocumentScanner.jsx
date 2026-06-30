import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from 'react-konva';
import useImage from 'use-image';
import { 
  UploadCloud, Crop, Image as ImageIcon, FileText, Check, 
  Trash2, Zap, SlidersHorizontal, RotateCw, Contrast, Type, 
  ZoomIn, ZoomOut, Maximize, MousePointer2, LayoutDashboard, Loader2,
  Printer, CopyPlus, LayoutTemplate, Undo2
} from 'lucide-react';

// --- Helper Component for Draggable Konva Images ---
const DraggableAsset = ({ shapeProps, isSelected, onSelect, onChange }) => {
  const shapeRef = useRef();
  const trRef = useRef();
  const [image] = useImage(shapeProps.url);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <KonvaImage
        onClick={onSelect} onTap={onSelect}
        ref={shapeRef} {...shapeProps} image={image} draggable
        onDragEnd={(e) => { onChange({ ...shapeProps, x: e.target.x(), y: e.target.y() }); }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX(); const scaleY = node.scaleY();
          node.scaleX(1); node.scaleY(1);
          onChange({
            ...shapeProps,
            x: node.x(), y: node.y(),
            width: Math.max(5, node.width() * scaleX), height: Math.max(5, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && <Transformer ref={trRef} boundBoxFunc={(oldBox, newBox) => (newBox.width < 20 || newBox.height < 20 ? oldBox : newBox)} />}
    </React.Fragment>
  );
};

export default function DocumentScanner() {
  const [assets, setAssets] = useState([]);
  const [activeAssetId, setActiveAssetId] = useState(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoom, setZoom] = useState(100);
  
  const [globalMode, setGlobalMode] = useState('scanner'); 
  const [activeTab, setActiveTab] = useState('crop');
  
  const containerRef = useRef(null);
  const [corners, setCorners] = useState([{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }]);
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [magnifier, setMagnifier] = useState({ show: false, x: 0, y: 0, bgX: 0, bgY: 0 });

  // 🟢 NEW: Enhancement Engine States
  const defaultAdjustments = { brightness: 100, contrast: 100, saturation: 100, grayscale: 0 };
  const [splitPos, setSplitPos] = useState(50); // Before/After slider position

  // A4 Builder States
  const [canvasObjects, setCanvasObjects] = useState([]);
  const [selectedObjectId, setSelectedObjectId] = useState(null);

  useEffect(() => {
    if (!window.pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; };
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (activeAssetId) {
      const asset = assets.find(a => a.id === activeAssetId);
      if (asset && asset.corners) setCorners(asset.corners);
    }
  }, [activeAssetId, assets]);

  const onDrop = useCallback(async (acceptedFiles) => {
    setIsUploading(true);
    try {
      for (const file of acceptedFiles) {
        const isPdf = file.type === 'application/pdf';
        if (isPdf && window.pdfjsLib) {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const id = Math.random().toString(36).substring(7);
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width; canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            const previewUrl = canvas.toDataURL('image/jpeg', 0.95);
            
            // 🟢 NEW: Initialize asset with adjustment state
            setAssets(prev => {
              const newAssets = [...prev, { id, file, previewUrl, processedUrl: previewUrl, croppedUrl: null, adjustments: { ...defaultAdjustments }, name: `Page ${pageNum}` }];
              if (prev.length === 0 && pageNum === 1) setTimeout(() => setActiveAssetId(id), 0);
              return newAssets;
            });
          }
        } else {
          const id = Math.random().toString(36).substring(7);
          const previewUrl = URL.createObjectURL(file);
          setAssets(prev => {
            const newAssets = [...prev, { id, file, previewUrl, processedUrl: previewUrl, croppedUrl: null, adjustments: { ...defaultAdjustments }, name: file.name }];
            if (prev.length === 0) setTimeout(() => setActiveAssetId(id), 0);
            return newAssets;
          });
        }
      }
    } finally { setIsUploading(false); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, noClick: assets.length > 0, 
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'], 'application/pdf': ['.pdf'] }
  });

  const activeAsset = assets.find(a => a.id === activeAssetId);

  // 🟢 UPDATED: Crop Math -> Now saves to croppedUrl to allow non-destructive filtering
  const handleApplyCrop = () => {
    if (!activeAsset) return;
    setIsProcessing(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const xs = corners.map(c => c.x); const ys = corners.map(c => c.y);
      const minX = (Math.min(...xs) / 100) * img.width; const maxX = (Math.max(...xs) / 100) * img.width;
      const minY = (Math.min(...ys) / 100) * img.height; const maxY = (Math.max(...ys) / 100) * img.height;
      const cropWidth = maxX - minX; const cropHeight = maxY - minY;
      
      canvas.width = cropWidth; canvas.height = cropHeight;
      ctx.drawImage(img, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      
      const croppedResult = canvas.toDataURL('image/jpeg', 1.0);
      
      setAssets(prev => prev.map(a => a.id === activeAssetId ? { ...a, croppedUrl: croppedResult, processedUrl: croppedResult } : a));
      setIsProcessing(false);
      setActiveTab('filters');
    };
    img.src = activeAsset.previewUrl;
  };

  // 🟢 NEW: Real-Time Pixel Processor
  const applyRealTimeFilters = (newAdjustments) => {
    if (!activeAsset || !activeAsset.croppedUrl) return;
    
    // Save state instantly
    setAssets(prev => prev.map(a => a.id === activeAssetId ? { ...a, adjustments: newAdjustments } : a));

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width; canvas.height = img.height;
      
      // Apply exact CSS matrix math to the canvas
      ctx.filter = `brightness(${newAdjustments.brightness}%) contrast(${newAdjustments.contrast}%) saturate(${newAdjustments.saturation}%) grayscale(${newAdjustments.grayscale}%)`;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      
      const filteredResult = canvas.toDataURL('image/jpeg', 0.95);
      setAssets(prev => prev.map(a => a.id === activeAssetId ? { ...a, processedUrl: filteredResult } : a));
    };
    img.src = activeAsset.croppedUrl; // Always filter from the clean cropped version
  };

  const resetEnhancements = () => {
    if (!activeAsset || !activeAsset.croppedUrl) return;
    setAssets(prev => prev.map(a => a.id === activeAssetId ? { ...a, adjustments: { ...defaultAdjustments }, processedUrl: a.croppedUrl } : a));
  };

  // Pointer Events
  const handlePointerDown = (index) => (e) => { e.preventDefault(); setDraggingPoint(index); };
  const handlePointerMove = (e) => {
    if (draggingPoint === null || !containerRef.current || !activeAsset) return;
    const rect = containerRef.current.getBoundingClientRect();
    let x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    let y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const newCorners = [...corners]; newCorners[draggingPoint] = { x, y };
    setCorners(newCorners);
    setMagnifier({ show: true, x: e.clientX, y: e.clientY - 80, bgX: x, bgY: y });
  };
  const handlePointerUp = () => {
    if (draggingPoint !== null) {
      setAssets(prev => prev.map(a => a.id === activeAssetId ? { ...a, corners } : a));
      setDraggingPoint(null); setMagnifier(prev => ({ ...prev, show: false }));
    }
  };

  const handleAddToCanvas = (asset) => {
    const targetUrl = asset.processedUrl || asset.previewUrl;
    const newObj = { id: Math.random().toString(36).substring(7), url: targetUrl, x: 50, y: 50, width: 300, height: 200, rotation: 0 };
    setCanvasObjects([...canvasObjects, newObj]);
    setGlobalMode('a4_builder');
  };

  // Empty State
  if (assets.length === 0) {
    return (
      <div {...getRootProps()} className="w-full h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 p-6">
        <input {...getInputProps()} />
        <div className={`max-w-2xl w-full p-12 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl transition-all ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400 cursor-pointer'}`}>
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6"><UploadCloud className="w-10 h-10" /></div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Drop Documents Here</h2>
          <p className="text-gray-500 text-center max-w-sm">Drag and drop PDFs or images to start the Pro Scanner workflow.</p>
        </div>
      </div>
    );
  }

  return (
    <div {...getRootProps()} className="w-full h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-gray-100 dark:bg-slate-950 relative" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
      <input {...getInputProps()} />

      {/* TOP NAV: MODE SWITCHER */}
      <div className="h-14 bg-white dark:bg-slate-900 border-b border-gray-200 flex items-center justify-center px-4 z-30 shadow-sm flex-shrink-0 gap-2">
        <button onClick={() => setGlobalMode('scanner')} className={`px-6 py-2 rounded-full font-bold text-sm flex items-center transition-all ${globalMode === 'scanner' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}>
          <Crop className="w-4 h-4 mr-2" /> Scanner & Filters
        </button>
        <button onClick={() => setGlobalMode('a4_builder')} className={`px-6 py-2 rounded-full font-bold text-sm flex items-center transition-all ${globalMode === 'a4_builder' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}>
          <LayoutTemplate className="w-4 h-4 mr-2" /> A4 Print Layout
        </button>
      </div>

      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <h3 className="text-lg font-black text-blue-600 tracking-widest uppercase">Processing...</h3>
        </div>
      )}

      {magnifier.show && activeAsset && activeTab === 'crop' && !activeAsset.croppedUrl && globalMode === 'scanner' && (
        <div className="fixed z-50 w-32 h-32 rounded-full border-4 border-blue-500 shadow-[0_0_20px_rgba(0,0,0,0.5)] pointer-events-none bg-white overflow-hidden flex items-center justify-center" style={{ left: magnifier.x - 64, top: magnifier.y - 64, backgroundImage: `url(${activeAsset.previewUrl})`, backgroundSize: `${10000 / zoom}%`, backgroundPosition: `${magnifier.bgX}% ${magnifier.bgY}%` }}>
          <div className="absolute w-full h-px bg-blue-500/80 shadow-sm"></div><div className="absolute h-full w-px bg-blue-500/80 shadow-sm"></div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col z-10 shadow-sm flex-shrink-0">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-black text-sm text-gray-900 flex items-center"><LayoutDashboard className="w-4 h-4 mr-2" /> Pages</h3>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{assets.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {assets.map((asset, index) => (
              <div key={asset.id} className={`group relative flex flex-col rounded-xl overflow-hidden transition-all ${activeAssetId === asset.id ? 'ring-2 ring-blue-500 shadow-md' : 'hover:bg-gray-50 border border-transparent'}`}>
                <div onClick={() => { setActiveAssetId(asset.id); setGlobalMode('scanner'); }} className="h-32 bg-gray-100 flex items-center justify-center p-2 relative cursor-pointer overflow-hidden">
                  <img src={asset.processedUrl || asset.previewUrl} className="max-h-full object-contain drop-shadow-md" alt={`Page ${index + 1}`} />
                  <div className="absolute top-2 left-2 w-6 h-6 bg-black/50 text-white text-xs font-bold flex items-center justify-center rounded-md">{index + 1}</div>
                </div>
                <div className="bg-white p-2 flex border-t border-gray-200">
                   <button onClick={() => handleAddToCanvas(asset)} className="flex-1 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded flex items-center justify-center hover:bg-blue-100 transition-colors uppercase"><CopyPlus className="w-3 h-3 mr-1" /> Add to A4</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER PANEL */}
        <div className="flex-1 relative flex flex-col bg-[#e5e7eb] overflow-hidden">
          
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-gray-200/50 z-20">
            <button onClick={() => setZoom(z => Math.max(10, z - 10))} className="p-2 text-gray-600 hover:text-blue-600 rounded-lg"><ZoomOut className="w-5 h-5" /></button>
            <span className="text-xs font-black text-gray-700 w-12 text-center">{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(300, z + 10))} className="p-2 text-gray-600 hover:text-blue-600 rounded-lg"><ZoomIn className="w-5 h-5" /></button>
            <div className="w-px h-5 bg-gray-300 mx-2" />
            <button onClick={() => setZoom(100)} className="p-2 text-gray-600 hover:text-blue-600 rounded-lg"><Maximize className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-8">
            
            {globalMode === 'scanner' && activeAsset && (
              <div className="relative shadow-2xl transition-transform duration-200 ease-out flex-shrink-0" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}>
                
                {/* 🟢 NEW: BEFORE/AFTER SPLIT VIEW FOR FILTERS */}
                {activeAsset.croppedUrl && activeTab === 'filters' ? (
                  <div className="relative bg-white cursor-ew-resize group" onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setSplitPos(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
                  }}>
                     <img src={activeAsset.croppedUrl} className="max-h-[80vh] max-w-full object-contain block pointer-events-none" alt="Original" />
                     <img src={activeAsset.processedUrl} className="absolute inset-0 h-full w-full object-contain pointer-events-none" style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }} alt="Processed" />
                     
                     {/* The Splitter Bar */}
                     <div className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none" style={{ left: `${splitPos}%` }}>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 rounded-full shadow-lg flex items-center justify-center border-2 border-white">
                           <SlidersHorizontal className="w-4 h-4 text-white" />
                        </div>
                     </div>
                     <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 text-xs font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity">Before</div>
                     <div className="absolute top-4 right-4 bg-blue-600/80 text-white px-2 py-1 text-xs font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity">After</div>
                  </div>
                ) : (
                  <div ref={containerRef} className="relative inline-block touch-none select-none bg-white">
                    <img src={activeAsset.previewUrl} draggable="false" className="max-h-[80vh] max-w-full object-contain block pointer-events-none" />
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full"><polygon points={corners.map(c => `${c.x},${c.y}`).join(' ')} fill="rgba(59, 130, 246, 0.15)" /></svg>
                      <line x1={`${corners[0].x}%`} y1={`${corners[0].y}%`} x2={`${corners[1].x}%`} y2={`${corners[1].y}%`} stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" />
                      <line x1={`${corners[1].x}%`} y1={`${corners[1].y}%`} x2={`${corners[2].x}%`} y2={`${corners[2].y}%`} stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" />
                      <line x1={`${corners[2].x}%`} y1={`${corners[2].y}%`} x2={`${corners[3].x}%`} y2={`${corners[3].y}%`} stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" />
                      <line x1={`${corners[3].x}%`} y1={`${corners[3].y}%`} x2={`${corners[0].x}%`} y2={`${corners[0].y}%`} stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" />
                      {corners.map((corner, i) => (
                        <g key={i} onPointerDown={handlePointerDown(i)} className="cursor-move pointer-events-auto group">
                          <circle cx={`${corner.x}%`} cy={`${corner.y}%`} r="30" fill="transparent" />
                          <circle cx={`${corner.x}%`} cy={`${corner.y}%`} r="8" fill="white" stroke="#3b82f6" strokeWidth="3" className="group-hover:scale-150 transition-transform origin-center" style={{ transformOrigin: `${corner.x}% ${corner.y}%` }} />
                        </g>
                      ))}
                    </svg>
                  </div>
                )}
              </div>
            )}

            {/* A4 Canvas */}
            {globalMode === 'a4_builder' && (
              <div className="bg-white shadow-[0_0_40px_rgba(0,0,0,0.1)] transition-transform duration-200 ease-out flex-shrink-0 border border-gray-200" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', width: '595px', height: '842px' }}>
                <Stage width={595} height={842} onMouseDown={(e) => { if (e.target === e.target.getStage()) setSelectedObjectId(null); }} onTouchStart={(e) => { if (e.target === e.target.getStage()) setSelectedObjectId(null); }}>
                  <Layer>
                    <Rect x={0} y={0} width={595} height={842} fill="white" />
                    <Rect x={20} y={20} width={555} height={802} stroke="rgba(0,0,0,0.05)" strokeWidth={1} dash={[5, 5]} listening={false} />
                    {canvasObjects.map((obj, i) => (
                      <DraggableAsset
                        key={obj.id} shapeProps={obj} isSelected={obj.id === selectedObjectId} onSelect={() => setSelectedObjectId(obj.id)}
                        onChange={(newAttrs) => { const rects = canvasObjects.slice(); rects[i] = newAttrs; setCanvasObjects(rects); }}
                      />
                    ))}
                  </Layer>
                </Stage>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Dynamic Tools */}
        {globalMode === 'scanner' ? (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col z-10 shadow-sm flex-shrink-0">
            <div className="flex p-2 bg-gray-100 m-4 rounded-xl border border-gray-200 shadow-inner">
              <button onClick={() => setActiveTab('crop')} className={`flex-1 py-2 text-xs font-black rounded-lg flex items-center justify-center transition-all ${activeTab === 'crop' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Crop className="w-4 h-4 mr-2" /> Adjust & Crop</button>
              <button onClick={() => { if (!activeAsset?.croppedUrl) { alert("Please Apply Crop first!"); return; } setActiveTab('filters'); }} className={`flex-1 py-2 text-xs font-black rounded-lg flex items-center justify-center transition-all ${activeTab === 'filters' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><SlidersHorizontal className="w-4 h-4 mr-2" /> Enhance</button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {activeTab === 'crop' && (
                <div className="space-y-4">
                  <button onClick={handleApplyCrop} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl flex items-center justify-center hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-transform hover:-translate-y-0.5">
                    <Check className="w-5 h-5 mr-2" /> Slice & Apply Crop
                  </button>
                  <p className="text-xs text-gray-500 text-center font-bold">Apply crop to unlock Enhancement Tools.</p>
                </div>
              )}

              {/* 🟢 NEW: REAL-TIME ADJUSTMENT SLIDERS */}
              {activeTab === 'filters' && activeAsset && activeAsset.adjustments && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Pro Adjustments</h4>
                    <button onClick={resetEnhancements} className="text-[10px] font-bold text-gray-500 hover:text-red-500 flex items-center"><Undo2 className="w-3 h-3 mr-1" /> Reset All</button>
                  </div>
                  
                  {[
                    { label: 'Brightness', key: 'brightness', min: 50, max: 200 },
                    { label: 'Contrast', key: 'contrast', min: 50, max: 250 },
                    { label: 'Saturation', key: 'saturation', min: 0, max: 200 },
                    { label: 'B&W / Grayscale', key: 'grayscale', min: 0, max: 100 }
                  ].map((slider) => (
                    <div key={slider.key} className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-gray-700">
                        <span>{slider.label}</span>
                        <span>{activeAsset.adjustments[slider.key]}%</span>
                      </div>
                      <input 
                        type="range" min={slider.min} max={slider.max} value={activeAsset.adjustments[slider.key]}
                        onChange={(e) => applyRealTimeFilters({ ...activeAsset.adjustments, [slider.key]: Number(e.target.value) })}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  ))}
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl mt-4">
                     <p className="text-xs text-blue-700 font-bold">💡 Drag your mouse horizontally across the image to see the Before/After comparison.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col z-10 shadow-sm flex-shrink-0">
             <div className="p-6 border-b border-gray-200">
               <h3 className="font-black text-gray-900 mb-2">A4 Canvas Tools</h3>
               <p className="text-xs text-gray-500">Drag items from the left sidebar onto this page. Click an item to resize or rotate it.</p>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedObjectId && (
                  <button onClick={() => setCanvasObjects(prev => prev.filter(obj => obj.id !== selectedObjectId))} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Selected Item
                  </button>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}