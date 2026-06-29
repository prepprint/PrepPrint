import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Crop, Image as ImageIcon, FileText, Check, Loader2, Trash2, Zap, SlidersHorizontal, Undo, Redo, RotateCw, Contrast, Type, Search, Maximize, Scan } from 'lucide-react';

export default function DocumentScanner() {
  const [assets, setAssets] = useState([]);
  const [activeAssetId, setActiveAssetId] = useState(null);
  
  // UI States
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [includeWatermark, setIncludeWatermark] = useState(true);
  
  // Studio States
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [corners, setCorners] = useState([{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }]);
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState('crop'); 
  const [sliderPos, setSliderPos] = useState(50);
  
  // 🟢 UPGRADE 1: Default to 'ocr' (Text Clear)
  const [selectedFilter, setSelectedFilter] = useState('ocr');

  // 🟢 UPGRADE 2: Magnifier Lens State
  const [magnifier, setMagnifier] = useState({ show: false, x: 0, y: 0, bgX: 0, bgY: 0 });

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
      if (asset) {
        setCorners(asset.corners);
        setMode(asset.historyIndex >= 0 ? 'preview' : 'crop');
      }
    }
  }, [activeAssetId, assets]);

  const onDrop = useCallback(async (acceptedFiles) => {
    setIsUploading(true);
    try {
      for (const file of acceptedFiles) {
        const isPdf = file.type === 'application/pdf';

        if (isPdf && window.pdfjsLib) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
              const id = Math.random().toString(36).substring(7);
              const page = await pdf.getPage(pageNum);
              const viewport = page.getViewport({ scale: 2.0 });
              const canvas = document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
              
              const previewUrl = canvas.toDataURL('image/jpeg', 0.95);
              const res = await fetch(previewUrl);
              const uploadBlob = await res.blob();

              let detectedCorners = [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }];
              try {
                const fd = new FormData(); fd.append('file', uploadBlob);
                const cornerRes = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/scan/detect-corners`, { method: 'POST', body: fd });
                if (cornerRes.ok) { const data = await cornerRes.json(); if (data.corners) detectedCorners = data.corners; }
              } catch (err) {}

              setAssets(prev => {
                const newAssets = [...prev, { id, file: uploadBlob, previewUrl, name: `${file.name.replace('.pdf', '')}_Page_${pageNum}`, corners: detectedCorners, history: [], historyIndex: -1 }];
                if (prev.length === 0 && pageNum === 1) setTimeout(() => setActiveAssetId(id), 0);
                return newAssets;
              });
            }
          } catch (err) { console.error(err); }
        } else if (!isPdf) {
          const id = Math.random().toString(36).substring(7);
          const previewUrl = URL.createObjectURL(file);
          let detectedCorners = [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }];
          
          try {
            const fd = new FormData(); fd.append('file', file);
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/scan/detect-corners`, { method: 'POST', body: fd });
            if (res.ok) { const data = await res.json(); if (data.corners) detectedCorners = data.corners; }
          } catch (err) {}

          setAssets(prev => {
            const newAssets = [...prev, { id, file, previewUrl, name: file.name, corners: detectedCorners, history: [], historyIndex: -1 }];
            if (prev.length === 0) setTimeout(() => setActiveAssetId(id), 0);
            return newAssets;
          });
        }
      }
    } finally { setIsUploading(false); }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg'], 'application/pdf': ['.pdf'] }
  });

  const activeAsset = assets.find(a => a.id === activeAssetId);
  const currentProcessedImg = activeAsset?.historyIndex >= 0 ? activeAsset.history[activeAsset.historyIndex].url : null;
  const currentFilter = activeAsset?.historyIndex >= 0 ? activeAsset.history[activeAsset.historyIndex].filter : selectedFilter;

  // 🟢 UPGRADE 3: Magnifier Math on Drag
  const handlePointerDown = (index) => (e) => { e.preventDefault(); setDraggingPoint(index); };
  
  const handlePointerMove = (e) => {
    if (draggingPoint === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    let y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    const newCorners = [...corners];
    newCorners[draggingPoint] = { x, y };
    setCorners(newCorners);

    // Update Magnifier Position (Offset above the cursor)
    setMagnifier({
      show: true,
      x: e.clientX,
      y: e.clientY - 80, 
      bgX: x,
      bgY: y
    });
  };
  
  const handlePointerUp = () => {
    if (draggingPoint !== null) {
      setAssets(prev => prev.map(a => a.id === activeAssetId ? { ...a, corners } : a));
      setDraggingPoint(null);
      setMagnifier(prev => ({ ...prev, show: false }));
    }
  };

  const handleRotate = () => {
    if (!activeAsset) return;
    setIsProcessing(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height; canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(90 * Math.PI / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      const newUrl = canvas.toDataURL('image/jpeg', 0.95);

      fetch(newUrl).then(res => res.blob()).then(blob => {
        const defaultCorners = [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }];
        setAssets(prev => prev.map(a => a.id === activeAsset.id ? { ...a, file: blob, previewUrl: newUrl, corners: defaultCorners, history: [], historyIndex: -1 } : a));
        setIsProcessing(false);
      });
    };
    img.src = activeAsset.previewUrl;
  };

  // 🟢 UPGRADE 4: Smart Re-Detect
  const handleReDetect = async () => {
    if (!activeAsset) return;
    setIsProcessing(true);
    try {
      const fd = new FormData(); fd.append('file', activeAsset.file);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/scan/detect-corners`, { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        if (data.corners) {
          setCorners(data.corners);
          setAssets(prev => prev.map(a => a.id === activeAssetId ? { ...a, corners: data.corners } : a));
        }
      }
    } catch (err) { alert("Detection failed."); } finally { setIsProcessing(false); }
  };

  // 🟢 UPGRADE 5: Crop Presets
  const applyPreset = (type) => {
    let newCorners = [];
    // Creating standard centered boxes based on ID ratios
    if (type === 'id') newCorners = [{x: 20, y: 30}, {x: 80, y: 30}, {x: 80, y: 70}, {x: 20, y: 70}]; // Standard Card (Landscape)
    if (type === 'passport') newCorners = [{x: 30, y: 20}, {x: 70, y: 20}, {x: 70, y: 80}, {x: 30, y: 80}]; // Passport (Portrait)
    if (type === 'full') newCorners = [{x: 0, y: 0}, {x: 100, y: 0}, {x: 100, y: 100}, {x: 0, y: 100}]; // Full Free Crop
    
    setCorners(newCorners);
    setAssets(prev => prev.map(a => a.id === activeAssetId ? { ...a, corners: newCorners } : a));
  };

  const performScan = async (asset, cropCorners, filterMode) => {
    const formData = new FormData();
    formData.append('file', asset.file, asset.name.replace('.pdf', '.jpg'));
    formData.append('corners', JSON.stringify(cropCorners));
    formData.append('filter_mode', filterMode);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/scan/process`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error("Scan failed");
      const blob = await response.blob();
      const resultUrl = URL.createObjectURL(blob);
      
      setAssets(prev => prev.map(a => {
        if (a.id !== asset.id) return a;
        const newHistory = a.history.slice(0, a.historyIndex + 1);
        newHistory.push({ url: resultUrl, filter: filterMode });
        return { ...a, history: newHistory, historyIndex: newHistory.length - 1 };
      }));
      setMode('preview'); setSliderPos(50);
    } catch (err) { console.error(err); }
  };

  const handleProcessScan = async (filterMode) => {
    if (!activeAsset) return;
    setIsProcessing(true);
    await performScan(activeAsset, corners, filterMode);
    setIsProcessing(false);
  };

  const handleProcessAll = async () => {
    setIsProcessing(true);
    for (const asset of assets) {
      if (asset.historyIndex < 0) { 
        setActiveAssetId(asset.id);
        await performScan(asset, asset.corners, selectedFilter); 
      }
    }
    setIsProcessing(false);
  };

  const handleExportPDF = async () => {
    const processedAssets = assets.filter(a => a.historyIndex >= 0);
    if (processedAssets.length === 0) return;
    setIsDownloadingPdf(true);
    const formData = new FormData();
    formData.append('include_watermark', includeWatermark);
    
    for (let i = 0; i < processedAssets.length; i++) {
      const asset = processedAssets[i];
      const response = await fetch(asset.history[asset.historyIndex].url);
      formData.append('files', await response.blob(), `scanned_page_${i+1}.jpg`);
    }
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/scan/export-pdf`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement('a'); link.href = url; link.download = `PrepPrint_Scans_${Date.now()}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
    } catch (err) { alert("PDF Export failed."); } finally { setIsDownloadingPdf(false); }
  };

  const FilterButton = ({ id, icon: Icon, label }) => {
    const isActive = mode === 'preview' ? currentFilter === id : selectedFilter === id;
    return (
      <button
        onClick={() => { mode === 'preview' ? handleProcessScan(id) : setSelectedFilter(id); }}
        className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all flex-1 border ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-md transform -translate-y-1' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-transparent hover:border-gray-300 dark:hover:border-slate-600'}`}
      >
        <Icon className={`w-5 h-5 mb-1 ${isActive && mode === 'preview' ? 'animate-pulse' : ''}`} />
        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center">{label}</span>
      </button>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col p-4 md:p-6 pb-24" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
      
      {/* MAGNIFIER LENS OVERLAY */}
      {magnifier.show && (
        <div 
          className="fixed z-50 w-32 h-32 rounded-full border-4 border-blue-500 shadow-[0_0_20px_rgba(0,0,0,0.5)] pointer-events-none bg-white overflow-hidden flex items-center justify-center"
          style={{ 
            left: magnifier.x - 64, 
            top: magnifier.y - 64,
            backgroundImage: `url(${activeAsset.previewUrl})`,
            backgroundSize: '400%',
            backgroundPosition: `${magnifier.bgX}% ${magnifier.bgY}%`
          }}
        >
          {/* Crosshair */}
          <div className="absolute w-full h-px bg-blue-500/50"></div>
          <div className="absolute h-full w-px bg-blue-500/50"></div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center"><Crop className="w-6 h-6 text-blue-500 mr-2" /> PrepPrint Pro Scanner Studio</h2>
          <p className="text-sm text-gray-500">AI edge detection, advanced illumination normalization, and batch processing.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT: Asset Sidebar */}
        <div className="lg:col-span-3 lg:sticky lg:top-24 flex flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm max-h-[600px]">
          
          <div {...getRootProps()} className={`p-4 border-b border-dashed border-gray-300 dark:border-slate-700 transition-colors text-center ${isUploading ? 'bg-blue-100 cursor-wait' : 'bg-blue-50/50 cursor-pointer hover:bg-blue-50'}`}>
            <input {...getInputProps()} />
            {isUploading ? (
              <div className="flex flex-col items-center justify-center py-1">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
                <span className="text-xs font-bold text-blue-600 animate-pulse">Extracting & Analyzing...</span>
              </div>
            ) : (
              <>
                <UploadCloud className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                <span className="text-xs font-bold text-blue-600">Upload Documents</span>
              </>
            )}
          </div>

          <button onClick={handleProcessAll} disabled={isProcessing || assets.length === 0} className="mx-4 mt-4 py-2 bg-blue-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50">
            <Zap className="w-4 h-4" /> Enhance All ({selectedFilter.replace('_', ' ')})
          </button>
          
          {assets.some(a => a.historyIndex >= 0) && (
            <div className="mx-4 mt-4 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={includeWatermark} onChange={(e) => setIncludeWatermark(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Include PrepPrint watermark
              </label>
              
              <button onClick={handleExportPDF} disabled={isDownloadingPdf || isProcessing} className="w-full py-2 bg-green-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-md disabled:opacity-50">
                {isDownloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Download PDF
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2 mt-2 space-y-2">
            {assets.map(asset => (
              <div key={asset.id} onClick={() => setActiveAssetId(asset.id)} className={`relative flex items-center p-2 rounded-lg cursor-pointer transition-all ${activeAssetId === asset.id ? 'bg-blue-100 dark:bg-slate-800 ring-2 ring-blue-500' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>
                <img src={asset.historyIndex >= 0 ? asset.history[asset.historyIndex].url : asset.previewUrl} className="w-12 h-12 object-cover rounded shadow-sm mr-3" alt="thumb" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{asset.name}</p>
                  <p className="text-[10px] text-gray-500">{asset.historyIndex >= 0 ? 'Enhanced' : 'Original'}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setAssets(prev => prev.filter(a => a.id !== asset.id)); }} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Studio Canvas & Toolbar */}
        <div className="lg:col-span-9 flex flex-col gap-4">
          {!activeAsset ? (
            <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 text-gray-400 font-bold">
              Select or drop a document to begin scanning.
            </div>
          ) : (
            <>
              {/* 🟢 UPGRADE: Smart Presets Toolbar */}
              <div className="flex flex-wrap items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={handleRotate} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"><RotateCw className="w-5 h-5" /></button>
                  <div className="w-px h-6 bg-gray-300 dark:bg-slate-700 mx-1" />
                  
                  {mode === 'crop' && (
                    <>
                      <button onClick={handleReDetect} className="flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                        <Scan className="w-4 h-4 mr-1" /> AI Re-Detect
                      </button>
                      <button onClick={() => applyPreset('id')} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-xs font-bold rounded hover:bg-gray-200 dark:hover:bg-slate-700">ID / PAN Card</button>
                      <button onClick={() => applyPreset('passport')} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-xs font-bold rounded hover:bg-gray-200 dark:hover:bg-slate-700">Passport</button>
                      <button onClick={() => applyPreset('full')} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-xs font-bold rounded hover:bg-gray-200 dark:hover:bg-slate-700">Full Image</button>
                    </>
                  )}
                </div>
                {mode === 'preview' && (
                  <button onClick={() => setMode('crop')} className="px-4 py-1.5 bg-gray-200 dark:bg-slate-800 text-sm font-bold rounded hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors">
                    Adjust Crop
                  </button>
                )}
              </div>

              {/* Main Canvas */}
              <div className="w-full flex items-center justify-center bg-slate-800 rounded-2xl shadow-inner p-4 min-h-[500px] overflow-hidden relative cursor-crosshair">
                
                {mode === 'preview' && currentProcessedImg ? (
                  <div className="relative inline-block shadow-2xl bg-black">
                     <img src={activeAsset.previewUrl} className="max-h-[60vh] w-auto block pointer-events-none opacity-50 blur-[2px]" alt="Background Original" />
                     <img src={currentProcessedImg} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }} alt="Enhanced" />
                     
                     <input type="range" min="0" max="100" value={sliderPos} onChange={e => setSliderPos(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-50" />
                     
                     <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none z-40" style={{ left: `${sliderPos}%` }}>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 rounded-full shadow-lg flex items-center justify-center border-2 border-white">
                           <SlidersHorizontal className="w-4 h-4 text-white" />
                        </div>
                     </div>
                  </div>
                ) : (
                  <div ref={containerRef} className="relative inline-block touch-none select-none shadow-2xl bg-white">
                    <img ref={imgRef} src={activeAsset.previewUrl} draggable="false" className="max-h-[60vh] max-w-full object-contain block pointer-events-none" alt="Original" />
                    
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                        <polygon points={corners.map(c => `${c.x},${c.y}`).join(' ')} fill="rgba(59, 130, 246, 0.15)" />
                      </svg>

                      <line x1={`${corners[0].x}%`} y1={`${corners[0].y}%`} x2={`${corners[1].x}%`} y2={`${corners[1].y}%`} stroke="#3b82f6" strokeWidth="3" />
                      <line x1={`${corners[1].x}%`} y1={`${corners[1].y}%`} x2={`${corners[2].x}%`} y2={`${corners[2].y}%`} stroke="#3b82f6" strokeWidth="3" />
                      <line x1={`${corners[2].x}%`} y1={`${corners[2].y}%`} x2={`${corners[3].x}%`} y2={`${corners[3].y}%`} stroke="#3b82f6" strokeWidth="3" />
                      <line x1={`${corners[3].x}%`} y1={`${corners[3].y}%`} x2={`${corners[0].x}%`} y2={`${corners[0].y}%`} stroke="#3b82f6" strokeWidth="3" />
                      
                      {corners.map((corner, i) => (
                        <g key={i} onPointerDown={handlePointerDown(i)} className="cursor-move pointer-events-auto group">
                          <circle cx={`${corner.x}%`} cy={`${corner.y}%`} r="28" fill="transparent" />
                          <circle cx={`${corner.x}%`} cy={`${corner.y}%`} r="8" fill="white" stroke="#3b82f6" strokeWidth="3" className="group-hover:scale-150 transition-transform origin-center" style={{ transformOrigin: `${corner.x}% ${corner.y}%` }} />
                        </g>
                      ))}
                    </svg>
                  </div>
                )}

                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                    <span className="text-white font-bold tracking-widest text-sm">AI ENHANCING...</span>
                  </div>
                )}
              </div>

              {/* Filters */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <FilterButton id="original" icon={ImageIcon} label="Original" />
                  <FilterButton id="color_enhanced" icon={Zap} label="Magic Color" />
                  <FilterButton id="bw" icon={FileText} label="B&W Scan" />
                  <FilterButton id="high_contrast" icon={Contrast} label="Contrast+" />
                  <FilterButton id="vibrant" icon={Check} label="Vibrant" />
                  <FilterButton id="ocr" icon={Type} label="Text Clear" />
                </div>
                
                {mode === 'preview' && currentProcessedImg ? (
                  <a href={currentProcessedImg} download={`PrepPrint_${activeAsset.name}_enhanced.jpg`} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl flex items-center justify-center shadow-md transition-all">
                    Download Enhanced Image
                  </a>
                ) : (
                  <button onClick={() => handleProcessScan(selectedFilter)} disabled={isProcessing} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition-all disabled:opacity-50">
                    Apply Crop & Scan
                  </button>
                )}
              </div>

            </>
          )}
        </div>

      </div>
    </div>
  );
}