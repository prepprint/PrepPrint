import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  UploadCloud, Crop, Image as ImageIcon, FileText, Check, 
  Trash2, Zap, SlidersHorizontal, RotateCw, Contrast, Type, 
  ZoomIn, ZoomOut, Maximize, MousePointer2, LayoutDashboard 
} from 'lucide-react';

export default function DocumentScanner() {
  const [assets, setAssets] = useState([]);
  const [activeAssetId, setActiveAssetId] = useState(null);
  
  // App States
  const [isUploading, setIsUploading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [activeTab, setActiveTab] = useState('crop'); // 'crop' or 'filters'
  
  const containerRef = useRef(null);

  // Initialize PDF.js worker
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

  // The Unified Upload Engine
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
    onDrop, noClick: assets.length > 0, // Disable clicking the whole screen once files are loaded
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'], 'application/pdf': ['.pdf'] }
  });

  const activeAsset = assets.find(a => a.id === activeAssetId);

  // ==========================================
  // 🟢 EMPTY STATE (NO FILES UPLOADED)
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
          <div className="mt-8 flex gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <span>JPG</span> • <span>PNG</span> • <span>PDF (Multi-page)</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 🟢 PREMIUM 3-PANEL EDITOR LAYOUT
  // ==========================================
  return (
    <div {...getRootProps()} className="w-full h-[calc(100vh-64px)] flex overflow-hidden bg-gray-100 dark:bg-slate-950">
      <input {...getInputProps()} />

      {/* 🟢 LEFT PANEL: Asset Manager */}
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
        
        <div className="p-4 border-t border-gray-200 dark:border-slate-800">
          <button className="w-full py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-bold rounded-xl flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
            <UploadCloud className="w-4 h-4 mr-2" /> Add More Pages
          </button>
        </div>
      </div>

      {/* 🟢 CENTER PANEL: The Canvas Workspace */}
      <div className="flex-1 relative flex flex-col bg-[#e5e7eb] dark:bg-[#0f172a] overflow-hidden" ref={containerRef}>
        
        {/* Canvas Toolbar (Top) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-gray-200/50 dark:border-slate-700/50 z-20">
          <button onClick={() => setZoom(z => Math.max(10, z - 10))} className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"><ZoomOut className="w-5 h-5" /></button>
          <span className="text-xs font-black text-gray-700 dark:text-gray-200 w-12 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(300, z + 10))} className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"><ZoomIn className="w-5 h-5" /></button>
          <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-2" />
          <button onClick={() => setZoom(100)} className="p-2 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"><Maximize className="w-5 h-5" /></button>
        </div>

        {/* Live Canvas Area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8">
          {activeAsset && (
            <div 
              className="relative shadow-2xl transition-transform duration-200 ease-out"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
            >
              <img src={activeAsset.previewUrl} className="max-w-none block pointer-events-none" style={{ maxHeight: '80vh' }} alt="Active Document" />
              {/* NOTE: OpenCV Cropping Grid will go here in Phase 2 */}
            </div>
          )}
        </div>
      </div>

      {/* 🟢 RIGHT PANEL: Tool Inspector */}
      <div className="w-80 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 flex flex-col z-10 shadow-sm flex-shrink-0">
        
        {/* Tab Navigation */}
        <div className="flex p-2 bg-gray-100 dark:bg-slate-950/50 m-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-inner">
          <button onClick={() => setActiveTab('crop')} className={`flex-1 py-2 text-xs font-black rounded-lg flex items-center justify-center transition-all ${activeTab === 'crop' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Crop className="w-4 h-4 mr-2" /> Adjust & Crop
          </button>
          <button onClick={() => setActiveTab('filters')} className={`flex-1 py-2 text-xs font-black rounded-lg flex items-center justify-center transition-all ${activeTab === 'filters' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <SlidersHorizontal className="w-4 h-4 mr-2" /> Enhance
          </button>
        </div>

        {/* Dynamic Tool Content */}
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
              
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Smart Layouts</h4>
                <div className="space-y-2">
                  <button className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm font-bold border border-gray-200 dark:border-slate-700 hover:border-blue-400 transition-colors">Freeform Document</button>
                  <button className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm font-bold border border-gray-200 dark:border-slate-700 hover:border-blue-400 transition-colors">Standard ID Card</button>
                  <button className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-sm font-bold border border-gray-200 dark:border-slate-700 hover:border-blue-400 transition-colors">Passport Size</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'filters' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pro Enhancements</h4>
              {/* Placeholders for Phase 2 Filters */}
              {['Text Clear (OCR)', 'Magic Color', 'High Contrast', 'B&W Scan', 'Original'].map(filter => (
                <button key={filter} className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-blue-500 hover:ring-1 hover:ring-blue-500 transition-all text-sm font-bold text-gray-700 dark:text-gray-200">
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Action Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
          <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center transition-transform hover:-translate-y-0.5">
            <Check className="w-5 h-5 mr-2" /> Finish & Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}