import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Scissors, UserSquare2, UploadCloud, Loader2, Download, Printer, Trash2 } from 'lucide-react';

export default function PortraitStudio() {
  const [assets, setAssets] = useState([]);
  const [activeAssetId, setActiveAssetId] = useState(null);
  
  const [mode, setMode] = useState('cutout');
  const [bgColor, setBgColor] = useState('transparent');
  const [isProcessing, setIsProcessing] = useState(false);

  const colors = [
    { name: 'Transparent', value: 'transparent', class: 'bg-gray-200 bg-[url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAACVJREFUKFNjZCASMDKgAoho4M+fP/9x6sQqwCXHqGKUg8jQAAA1qAo0c42n+QAAAABJRU5ErkJggg==")]' },
    { name: 'White', value: '#ffffff', class: 'bg-white border-2 border-gray-200' },
    { name: 'Passport Blue', value: '#3b82f6', class: 'bg-blue-500' },
    { name: 'Visa Red', value: '#ef4444', class: 'bg-red-500' },
    { name: 'Studio Grey', value: '#e2e8f0', class: 'bg-slate-200' }
  ];

  // 🟢 NEW: Batch Upload Logic (Accepts ALL standard image formats)
  const onDrop = useCallback((acceptedFiles) => {
    const newAssets = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file: file,
      name: file.name,
      originalUrl: URL.createObjectURL(file),
      processedUrl: null // Will hold the AI result later
    }));

    setAssets(prev => {
      const updated = [...prev, ...newAssets];
      if (!activeAssetId && updated.length > 0) {
        setActiveAssetId(updated[0].id);
      }
      return updated;
    });
  }, [activeAssetId]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop, 
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.heic'] } 
    // 🟢 Removed maxFiles to allow batch uploads
  });

  const activeAsset = assets.find(a => a.id === activeAssetId);

  // 🟢 Process Individual Images on Command
  const processActiveImage = async () => {
    if (!activeAsset || activeAsset.processedUrl) return;
    
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', activeAsset.file);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/studio/remove-bg`, {
        method: 'POST', body: formData
      });
      if (!res.ok) throw new Error("AI Removal Failed. Image might be too complex.");
      
      const blob = await res.blob();
      const resultUrl = URL.createObjectURL(blob);
      
      setAssets(prev => prev.map(a => 
        a.id === activeAssetId ? { ...a, processedUrl: resultUrl } : a
      ));
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateCombinedImage = async () => {
    return new Promise((resolve) => {
      if (!activeAsset?.processedUrl) return resolve(null);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        if (bgColor !== 'transparent') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      };
      img.src = activeAsset.processedUrl;
    });
  };

  const handleDownloadImage = async () => {
    const blob = await generateCombinedImage();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PrepPrint_Cutout_${activeAsset.name}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDownloadSheet = async () => {
    setIsProcessing(true);
    const blob = await generateCombinedImage();
    if (!blob) { setIsProcessing(false); return; }
    
    const formData = new FormData();
    formData.append('file', blob, 'passport.png');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/studio/passport-sheet`, {
        method: 'POST', body: formData
      });
      if (!res.ok) throw new Error("Sheet generation failed");
      
      const pdfBlob = await res.blob();
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PrepPrint_4x6_PrintSheet_${activeAsset.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Error generating sheet.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col p-4 md:p-6 pb-24">
      
      <div className="flex flex-col items-center mb-8 text-center">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center justify-center mb-4">
           Pro Cutout & ID Studio
        </h2>
        
        <div className="flex bg-gray-200 dark:bg-slate-800 p-1 rounded-xl shadow-inner max-w-sm w-full">
          <button 
            onClick={() => { setMode('cutout'); setBgColor('transparent'); }}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-sm font-bold transition-all ${mode === 'cutout' ? 'bg-white dark:bg-slate-700 shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Scissors className="w-4 h-4 mr-2" /> Freeform Cutout
          </button>
          <button 
            onClick={() => { setMode('passport'); setBgColor('#ffffff'); }}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-sm font-bold transition-all ${mode === 'passport' ? 'bg-white dark:bg-slate-700 shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <UserSquare2 className="w-4 h-4 mr-2" /> Passport / ID
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* 🟢 LEFT: BATCH QUEUE SIDEBAR 🟢 */}
        <div className="lg:col-span-3 lg:sticky lg:top-24 flex flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm max-h-[600px]">
          <div {...getRootProps()} className="p-4 border-b border-dashed border-gray-300 dark:border-slate-700 bg-blue-50/50 dark:bg-blue-900/10 cursor-pointer hover:bg-blue-50 transition-colors text-center">
            <input {...getInputProps()} />
            <UploadCloud className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <span className="text-xs font-bold text-blue-600">Upload Photos (Batch)</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {assets.length === 0 && (
              <p className="text-center text-xs text-gray-400 mt-4 font-bold">No photos uploaded yet.</p>
            )}
            {assets.map(asset => (
              <div 
                key={asset.id} 
                onClick={() => setActiveAssetId(asset.id)}
                className={`relative flex items-center p-2 rounded-lg cursor-pointer transition-all ${activeAssetId === asset.id ? 'bg-blue-100 dark:bg-slate-800 ring-2 ring-blue-500' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
              >
                <img src={asset.processedUrl || asset.originalUrl} className="w-12 h-12 object-cover rounded shadow-sm mr-3" alt="thumb" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{asset.name}</p>
                  <p className="text-[10px] text-gray-500">{asset.processedUrl ? 'Cutout Complete' : 'Original'}</p>
                </div>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setAssets(prev => prev.filter(a => a.id !== asset.id)); 
                    if (activeAssetId === asset.id) setActiveAssetId(null);
                  }} 
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: STUDIO CANVAS */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          {!activeAsset ? (
             <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 text-gray-400 font-bold">
               Select or drop a photo to begin.
             </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800">
              
              {/* Main Canvas Area */}
              <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 dark:bg-slate-950 rounded-xl overflow-hidden relative min-h-[400px]">
                
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                    <span className="font-bold text-blue-600 animate-pulse tracking-widest text-sm uppercase">AI Extracting...</span>
                  </div>
                )}
                
                {!activeAsset.processedUrl ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-center p-6">
                     <img src={activeAsset.originalUrl} className="max-h-[500px] object-contain opacity-50 blur-sm mb-6" alt="Original" />
                     <button 
                        onClick={processActiveImage} 
                        disabled={isProcessing}
                        className="absolute z-10 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-full shadow-2xl transition-transform hover:scale-105 flex items-center gap-3"
                      >
                        <Scissors className="w-6 h-6" /> Remove Background
                      </button>
                  </div>
                ) : (
                  <div 
                    className="relative flex items-center justify-center w-full h-full transition-colors duration-300"
                    style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }}
                  >
                    {bgColor === 'transparent' && (
                      <div className="absolute inset-0 opacity-20 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAACVJREFUKFNjZCASMDKgAoho4M+fP/9x6sQqwCXHqGKUg8jQAAA1qAo0c42n+QAAAABJRU5ErkJggg==')]"></div>
                    )}
                    <img src={activeAsset.processedUrl} className="max-h-[500px] object-contain relative z-10 drop-shadow-xl" alt="Cutout" />
                    
                    {/* Passport Crop Guide Overlay */}
                    {mode === 'passport' && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                         <div className="border-2 border-white/50 border-dashed w-[60%] h-[80%] rounded shadow-[0_0_0_9999px_rgba(0,0,0,0.3)] flex flex-col justify-between items-center py-4">
                            <div className="w-1/2 h-1/3 border border-red-400/50 rounded-[100%] opacity-50"></div>
                            <span className="text-white/70 font-bold text-xs">Standard Head Placement</span>
                         </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Controls Sidebar */}
              <div className="w-full lg:w-64 flex flex-col gap-6">
                <div className={!activeAsset.processedUrl ? 'opacity-30 pointer-events-none' : ''}>
                  <h3 className="text-sm font-black text-gray-500 uppercase tracking-wider mb-3">Background Color</h3>
                  <div className="flex flex-wrap gap-3">
                    {colors.map(c => (
                      <button 
                        key={c.name}
                        title={c.name}
                        onClick={() => setBgColor(c.value)}
                        className={`w-10 h-10 rounded-full transition-transform ${c.class} ${bgColor === c.value ? 'ring-4 ring-blue-500 scale-110' : 'hover:scale-110 shadow-sm'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className={`pt-4 border-t border-gray-200 dark:border-slate-700 flex flex-col gap-3 ${!activeAsset.processedUrl ? 'opacity-30 pointer-events-none' : ''}`}>
                   <button 
                     onClick={handleDownloadImage}
                     className="w-full py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90"
                   >
                     <Download className="w-5 h-5" /> Save Digital
                   </button>
                   
                   {mode === 'passport' && (
                     <button 
                       onClick={handleDownloadSheet}
                       className="w-full py-3 bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 shadow-md"
                     >
                       <Printer className="w-5 h-5" /> Export 4x6 Sheet
                     </button>
                   )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}