import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  UploadCloud, Crop, Image as ImageIcon, FileText, Check, 
  Trash2, Zap, SlidersHorizontal, RotateCw, Contrast, Type, 
  ZoomIn, ZoomOut, Maximize, MousePointer2, LayoutDashboard, Loader2 
} from 'lucide-react';

export default function DocumentScanner() {
  const [assets, setAssets] = useState([]);
  const [activeAssetId, setActiveAssetId] = useState(null);
  
  // App States
  const [isUploading, setIsUploading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [activeTab, setActiveTab] = useState('crop');
  
  // 🟢 PHASE 2: CROP ENGINE STATES
  const containerRef = useRef(null);
  const [corners, setCorners] = useState([{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }]);
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [magnifier, setMagnifier] = useState({ show: false, x: 0, y: 0, bgX: 0, bgY: 0 });

  useEffect(() => {
    if (!window.pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      };
      document.body.appendChild(script);
    }
  }, []);

  // Reset corners when switching assets
  useEffect(() => {
    if (activeAssetId) {
      const asset = assets.find(a => a.id === activeAssetId);
      if (asset && asset.corners) setCorners(asset.corners);
      else setCorners([{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }]);
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
            setAssets(prev => {
              const newAssets = [...prev, { id, file, previewUrl, name: `Page ${pageNum}` }];
              if (prev.length === 0 && pageNum === 1) setTimeout(() => setActiveAssetId(id), 0);
              return newAssets;
            });
          }
        } else {
          const id = Math.random().toString(36).substring(7);
          const previewUrl = URL.createObjectURL(file);
          setAssets(prev => {
            const newAssets = [...prev, { id, file, previewUrl, name: file.name }];
            if (prev.length === 0) setTimeout(() => setActiveAssetId(id), 0);
            return newAssets;
          });
        }
      }
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, noClick: assets.length > 0, 
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'], 'application/pdf': ['.pdf'] }
  });

  const activeAsset = assets.find(a => a.id === activeAssetId);

  // 🟢 PHASE 2: CROP MATH & POINTER EVENTS
  const handlePointerDown = (index) => (e) => { 
    e.preventDefault(); 
    setDraggingPoint(index); 
  };
  
  const handlePointerMove = (e) => {
    if (draggingPoint === null || !containerRef.current || !activeAsset) return;
    
    // Calculate mouse position strictly relative to the image bounds
    const rect = containerRef.current.getBoundingClientRect();
    let x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    let y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    const newCorners = [...corners];
    newCorners[draggingPoint] = { x, y };
    setCorners(newCorners);

    // Update the floating Magnifier Lens position
    setMagnifier({
      show: true,
      x: e.clientX,
      y: e.clientY - 80, // Offset it 80px above the cursor so it isn't blocked by the finger
      bgX: x,
      bgY: y
    });
  };
  
  const handlePointerUp = () => {
    if (draggingPoint !== null) {
      // Save the new corners to the active asset so they persist when switching tabs
      setAssets(prev => prev.map(a => a.id === activeAssetId ? { ...a, corners } : a));
      setDraggingPoint(null);
      setMagnifier(prev => ({ ...prev, show: false }));
    }
  };

  // ==========================================
  // EMPTY STATE
  // ==========================================
  if (assets.length === 0) {
    return (
      <div {...getRootProps()} className="w-full h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 p-6">
        <input {...getInputProps()} />
        <div className={`max-w-2xl w-full p-12 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl transition-all ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-400 hover:shadow-md cursor-pointer'}`}>
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
            {isUploading ? <Loader2 className="w-10 h-10 animate-spin" /> : <UploadCloud className="w-10 h-10" />}
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            {isUploading ? 'Extracting Pages...' : 'Drop Documents Here'}
          </h2>
          <p className="text-gray-500 text-center max-w-sm">
            Drag and drop PDFs or images to start the Pro Scanner workflow.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN WORKSPACE
  // ==========================================
  return (
    <div 
      {...getRootProps()} 
      className="w-full h-[calc(100vh-64px)] flex overflow-hidden bg-gray-100 dark:bg-slate-950 relative"
      onPointerMove={handlePointerMove} 
      onPointerUp={handlePointerUp} 
      onPointerLeave={handlePointerUp}
    >
      <input {...getInputProps()} />

      {/* 🟢 PHASE 2: MAGNIFIER LENS OVERLAY */}
      {magnifier.show && activeAsset && (
        <div 
          className="fixed z-50 w-32 h-32 rounded-full border-4 border-blue-500 shadow-[0_0_20px_rgba(0,0,0,0.5)] pointer-events-none bg-white overflow-hidden flex items-center justify-center"
          style={{ 
            left: magnifier.x - 64, 
            top: magnifier.y - 64,
            backgroundImage: `url(${activeAsset.previewUrl})`,
            backgroundSize: `${10000 / zoom}%`, // Dynamically scale based on zoom level
            backgroundPosition: `${magnifier.bgX}% ${magnifier.bgY}%`
          }}
        >
          {/* Magnifier Crosshair */}
          <div className="absolute w-full h-px bg-blue-500/80 shadow-sm"></div>
          <div className="absolute h-full w-px bg-blue-500/80 shadow-sm"></div>
        </div>
      )}

      {/* LEFT PANEL */}
      <div className="w-72 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col z-10 shadow-sm flex-shrink-0">
        <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-black text-sm text-gray-900 dark:text-white flex items-center"><LayoutDashboard className="w-4 h-4 mr-2" /> Document Pages</h3>
          <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md">{assets.length}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {assets.map((asset, index) => (
            <div 
              key={asset.id} 
              onClick={() => setActiveAssetId(asset.id)}
              className={`group relative flex flex-col rounded-xl cursor-pointer overflow-hidden transition-all ${activeAssetId === asset.id ? 'ring-2 ring-blue-500 shadow-md' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50 border border-transparent'}`}
            >
              <div className="h-32 bg-gray-100 dark:bg-slate-800 flex items-center justify-center p-2 relative">
                <img src={asset.previewUrl} className="max-h-full object-contain drop-shadow-md" alt={`Page ${index + 1}`} />
                <div className="absolute top-2 left-2 w-6 h-6 bg-black/50 backdrop-blur text-white text-xs font-bold flex items-center justify-center rounded-md">
                  {index + 1}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setAssets(prev => prev.filter(a => a.id !== asset.id)); }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER PANEL: Canvas Workspace */}
      <div className="flex-1 relative flex flex-col bg-[#e5e7eb] dark:bg-[#0f172a] overflow-hidden">
        
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-gray-200/50 dark:border-slate-700/50 z-20">
          <button onClick={() => setZoom(z => Math.max(10, z - 10))} className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"><ZoomOut className="w-5 h-5" /></button>
          <span className="text-xs font-black text-gray-700 dark:text-gray-200 w-12 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(300, z + 10))} className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"><ZoomIn className="w-5 h-5" /></button>
          <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-2" />
          <button onClick={() => setZoom(100)} className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"><Maximize className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center p-8">
          {activeAsset && (
            <div 
              className="relative shadow-2xl transition-transform duration-200 ease-out flex-shrink-0"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
            >
              {/* 🟢 PHASE 2: INTERACTIVE IMAGE BOUNDARY */}
              <div ref={containerRef} className="relative inline-block touch-none select-none bg-white">
                <img 
                  src={activeAsset.previewUrl} 
                  draggable="false" 
                  className="max-h-[80vh] max-w-full object-contain block pointer-events-none" 
                  alt="Active Document" 
                />
                
                {/* SVG Crop Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                    <polygon points={corners.map(c => `${c.x},${c.y}`).join(' ')} fill="rgba(59, 130, 246, 0.15)" />
                  </svg>

                  {/* Connecting Lines */}
                  <line x1={`${corners[0].x}%`} y1={`${corners[0].y}%`} x2={`${corners[1].x}%`} y2={`${corners[1].y}%`} stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" />
                  <line x1={`${corners[1].x}%`} y1={`${corners[1].y}%`} x2={`${corners[2].x}%`} y2={`${corners[2].y}%`} stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" />
                  <line x1={`${corners[2].x}%`} y1={`${corners[2].y}%`} x2={`${corners[3].x}%`} y2={`${corners[3].y}%`} stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" />
                  <line x1={`${corners[3].x}%`} y1={`${corners[3].y}%`} x2={`${corners[0].x}%`} y2={`${corners[0].y}%`} stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" />
                  
                  {/* Draggable Corner Nodes */}
                  {corners.map((corner, i) => (
                    <g key={i} onPointerDown={handlePointerDown(i)} className="cursor-move pointer-events-auto group">
                      {/* Invisible larger hit area for touchscreens */}
                      <circle cx={`${corner.x}%`} cy={`${corner.y}%`} r="30" fill="transparent" />
                      {/* Visible circle */}
                      <circle 
                        cx={`${corner.x}%`} 
                        cy={`${corner.y}%`} 
                        r="8" 
                        fill="white" 
                        stroke="#3b82f6" 
                        strokeWidth="3" 
                        className="group-hover:scale-150 transition-transform origin-center drop-shadow-md" 
                        style={{ transformOrigin: `${corner.x}% ${corner.y}%` }} 
                      />
                    </g>
                  ))}
                </svg>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Tool Inspector */}
      <div className="w-80 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 flex flex-col z-10 shadow-sm flex-shrink-0">
        
        <div className="flex p-2 bg-gray-100 dark:bg-slate-950/50 m-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-inner">
          <button onClick={() => setActiveTab('crop')} className={`flex-1 py-2 text-xs font-black rounded-lg flex items-center justify-center transition-all ${activeTab === 'crop' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Crop className="w-4 h-4 mr-2" /> Adjust & Crop
          </button>
          <button onClick={() => setActiveTab('filters')} className={`flex-1 py-2 text-xs font-black rounded-lg flex items-center justify-center transition-all ${activeTab === 'filters' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <SlidersHorizontal className="w-4 h-4 mr-2" /> Enhance
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {activeTab === 'crop' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Perspective Tools</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button className="flex flex-col items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 hover:text-blue-600 transition-colors border border-gray-200 dark:border-slate-700">
                    <MousePointer2 className="w-5 h-5 mb-2" />
                    <span className="text-[10px] font-bold">Auto Detect</span>
                  </button>
                  <button className="flex flex-col items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-xl hover:bg-gray-100 hover:text-blue-600 transition-colors border border-gray-200 dark:border-slate-700">
                    <RotateCw className="w-5 h-5 mb-2" />
                    <span className="text-[10px] font-bold">Rotate 90°</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
          <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center transition-transform hover:-translate-y-0.5">
            <Check className="w-5 h-5 mr-2" /> Finish & Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}