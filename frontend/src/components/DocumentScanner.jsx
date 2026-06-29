import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Crop, Image as ImageIcon, FileText, Printer, Check, Loader2, Trash2, Zap, SlidersHorizontal, Undo, Redo, RotateCw, Contrast, Type } from 'lucide-react';

export default function DocumentScanner() {
  const [assets, setAssets] = useState([]);
  const [activeAssetId, setActiveAssetId] = useState(null);
  
  // UI States
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [includeWatermark, setIncludeWatermark] = useState(true); // 🟢 NEW TOGGLE STATE
  
  // Studio States
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [corners, setCorners] = useState([{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }]);
  const [draggingPoint, setDraggingPoint] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState('crop'); 
  const [sliderPos, setSliderPos] = useState(50);
  const [selectedFilter, setSelectedFilter] = useState('color_enhanced');

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
        const id = Math.random().toString(36).substring(7);
        let previewUrl = null;
        let uploadBlob = file;

        if (isPdf && window.pdfjsLib) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            previewUrl = canvas.toDataURL('image/jpeg', 0.95);
            const res = await fetch(previewUrl);
            uploadBlob = await res.blob();
          } catch (err) { continue; }
        } else if (!isPdf) {
          previewUrl = URL.createObjectURL(file);
        }

        let detectedCorners = [{ x: 10, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 90 }, { x: 10, y: 90 }];
        try {
          const fd = new FormData();
          fd.append('file', uploadBlob);
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/scan/detect-corners`, { method: 'POST', body: fd });
          if (res.ok) {
            const data = await res.json();
            if (data.corners) detectedCorners = data.corners;
          }
        } catch (err) {}

        setAssets(prev => {
          const newAssets = [...prev, { 
            id, file: uploadBlob, previewUrl, name: file.name, 
            corners: detectedCorners, history: [], historyIndex: -1 
          }];
          if (!activeAssetId) setActiveAssetId(id);
          return newAssets;
        });
      }
    } finally { setIsUploading(false); }
  }, [activeAssetId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg'], 'application/pdf': ['.pdf'] }
  });

  const activeAsset = assets.find(a => a.id === activeAssetId);
  const currentProcessedImg = activeAsset?.historyIndex >= 0 ? activeAsset.history[activeAsset.historyIndex].url : null;
  const currentFilter = activeAsset?.historyIndex >= 0 ? activeAsset.history[activeAsset.historyIndex].filter : selectedFilter;

  const handlePointerDown = (index) => (e) => { e.preventDefault(); setDraggingPoint(index); };
  const handlePointerMove = (e) => {
    if (draggingPoint === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    let y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const newCorners = [...corners];
    newCorners[draggingPoint] = { x, y };
    setCorners(newCorners);
  };
  const handlePointerUp = () => {
    if (draggingPoint !== null) {
      setAssets(prev => prev.map(a => a.id === activeAssetId ? { ...a, corners } : a));
      setDraggingPoint(null);
    }
  };

  const handleRotate = () => {
    if (!activeAsset) return;
    setIsProcessing(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
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

  const performScan = async (asset, cropCorners, filterMode) => {
    const formData = new FormData();
    formData.append('file', asset.file, asset.name.replace('.pdf', '.jpg'));
    formData.append('corners', JSON.stringify(cropCorners));
    formData.append('filter_mode', filterMode);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/scan/process`, { method: 'POST', body: formData });
      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = 'Unknown server error';
        try { errorMsg = JSON.parse(errorText).error; } catch(e) { errorMsg = errorText; }
        throw new Error(errorMsg);
      }
      const blob = await response.blob();
      const resultUrl = URL.createObjectURL(blob);
      
      setAssets(prev => prev.map(a => {
        if (a.id !== asset.id) return a;
        const newHistory = a.history.slice(0, a.historyIndex + 1);
        newHistory.push({ url: resultUrl, filter: filterMode });
        return { ...a, history: newHistory, historyIndex: newHistory.length - 1 };
      }));
      setMode('preview');
      setSliderPos(50);
    } catch (err) { alert(`Scan failed: ${err.message}`); }
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
    // 🟢 Send the toggle state to the backend
    formData.append('include_watermark', includeWatermark);
    
    for (let i = 0; i < processedAssets.length; i++) {
      const asset = processedAssets[i];
      const response = await fetch(asset.history[asset.historyIndex].url);
      const blob = await response.blob();
      formData.append('files', blob, `scanned_page_${i+1}.jpg`);
    }
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/scan/export-pdf`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const pdfBlob = await res.blob();
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      // 🟢 Force explicit branded filename download
      link.download = `PrepPrint_Enhanced_Scans_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) { alert("PDF Export failed."); } finally { setIsDownloadingPdf(false); }
  };

  const undo = () => setAssets(prev => prev.map(a => a.id === activeAssetId ? { ...a, historyIndex: Math.max(-1, a.historyIndex - 1) } : a));
  const redo = () => setAssets(prev => prev.map(a => a.id === activeAssetId ? { ...a, historyIndex: Math.min(a.history.length - 1, a.historyIndex + 1) } : a));

  const FilterButton = ({ id, icon: Icon, label }) => {
    const isActive = mode === 'preview' ? currentFilter === id : selectedFilter === id;
    
    return (
      <button
        onClick={() => {
          if (mode === 'preview') {
            handleProcessScan(id);
          } else {
            setSelectedFilter(id);
          }
        }}
        className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all flex-1 border ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-md transform -translate-y-1' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-transparent hover:border-gray-300 dark:hover:border-slate-600'}`}
      >
        <Icon className={`w-5 h-5 mb-1 ${isActive && mode === 'preview' ? 'animate-pulse' : ''}`} />
        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center">{label}</span>
      </button>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col p-4 md:p-6 pb-24" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
      
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
            <Zap className="w-4 h-4" /> Enhance All Files
          </button>
          
          {assets.some(a => a.historyIndex >= 0) && (
            <div className="mx-4 mt-4 flex flex-col gap-2">
              {/* 🟢 NEW: Watermark Toggle Checkbox */}
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={includeWatermark} 
                  onChange={(e) => setIncludeWatermark(e.target.checked)} 
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Include PrepPrint watermark
              </label>
              
              <button 
                onClick={handleExportPDF} 
                disabled={isDownloadingPdf || isProcessing} 
                className="w-full py-2 bg-green-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-md disabled:opacity-50"
              >
                {isDownloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Download PDF
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2 mt-2 space-y-2">
            {assets.map(asset => (
              <div 
                key={asset.id} 
                onClick={() => setActiveAssetId(asset.id)}
                className={`relative flex items-center p-2 rounded-lg cursor-pointer transition-all ${activeAssetId === asset.id ? 'bg-blue-100 dark:bg-slate-800 ring-2 ring-blue-500' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
              >
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
        <div className="lg:col-span-9 flex flex-col gap-6">
          {!activeAsset ? (
            <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 text-gray-400 font-bold">
              Select or drop a document to begin scanning.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2">
                  <button onClick={undo} disabled={activeAsset.historyIndex < 0} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded disabled:opacity-30"><Undo className="w-5 h-5" /></button>
                  <button onClick={redo} disabled={activeAsset.historyIndex >= activeAsset.history.length - 1} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded disabled:opacity-30"><Redo className="w-5 h-5" /></button>
                  <div className="w-px h-6 bg-gray-300 dark:bg-slate-700 mx-2" />
                  <button onClick={handleRotate} className="flex items-center text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-500"><RotateCw className="w-4 h-4 mr-1" /> Rotate</button>
                </div>
                {mode === 'preview' && (
                  <button onClick={() => setMode('crop')} className="px-4 py-1.5 bg-gray-200 dark:bg-slate-800 text-sm font-bold rounded hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors">
                    Adjust Crop
                  </button>
                )}
              </div>

              <div className="w-full flex items-center justify-center bg-slate-800 rounded-2xl shadow-inner p-4 min-h-[500px] overflow-hidden relative">
                
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
                          <circle cx={`${corner.x}%`} cy={`${corner.y}%`} r="24" fill="transparent" />
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