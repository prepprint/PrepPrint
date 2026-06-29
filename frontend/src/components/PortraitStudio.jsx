import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Scissors, UserSquare2, UploadCloud, Loader2, Download, Printer } from 'lucide-react';

export default function PortraitStudio() {
  const [mode, setMode] = useState('cutout'); // 'cutout' or 'passport'
  const [originalUrl, setOriginalUrl] = useState(null);
  const [processedUrl, setProcessedUrl] = useState(null);
  const [bgColor, setBgColor] = useState('transparent');
  const [isProcessing, setIsProcessing] = useState(false);

  const colors = [
    { name: 'Transparent', value: 'transparent', class: 'bg-gray-200 bg-[url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAACVJREFUKFNjZCASMDKgAoho4M+fP/9x6sQqwCXHqGKUg8jQAAA1qAo0c42n+QAAAABJRU5ErkJggg==")]' },
    { name: 'White', value: '#ffffff', class: 'bg-white border-2 border-gray-200' },
    { name: 'Passport Blue', value: '#3b82f6', class: 'bg-blue-500' },
    { name: 'Visa Red', value: '#ef4444', class: 'bg-red-500' },
    { name: 'Studio Grey', value: '#e2e8f0', class: 'bg-slate-200' }
  ];

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    setOriginalUrl(URL.createObjectURL(file));
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/studio/remove-bg`, {
        method: 'POST', body: formData
      });
      if (!res.ok) throw new Error("AI Removal Failed");
      
      const blob = await res.blob();
      setProcessedUrl(URL.createObjectURL(blob));
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg'] }, maxFiles: 1
  });

  const generateCombinedImage = async () => {
    // Draws the background color and the transparent PNG together
    return new Promise((resolve) => {
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
      img.src = processedUrl;
    });
  };

  const handleDownloadImage = async () => {
    const blob = await generateCombinedImage();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PrepPrint_Cutout.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDownloadSheet = async () => {
    setIsProcessing(true);
    const blob = await generateCombinedImage();
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
      link.download = `PrepPrint_4x6_PrintSheet.pdf`;
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
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 pb-24">
      
      <div className="flex flex-col items-center mb-8 text-center">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center justify-center mb-4">
           Pro Cutout & ID Studio
        </h2>
        
        {/* THE DUAL MODE TOGGLE */}
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

      {!processedUrl && !isProcessing ? (
        <div {...getRootProps()} className="max-w-2xl mx-auto h-64 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-blue-50/50 hover:bg-blue-50 transition-colors">
          <input {...getInputProps()} />
          <UploadCloud className="w-12 h-12 text-blue-500 mb-4" />
          <p className="font-bold text-gray-700 dark:text-gray-300">Drop an image here</p>
          <p className="text-sm text-gray-500 mt-2">AI will automatically remove the background</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800">
          
          {/* Main Canvas Area */}
          <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-xl overflow-hidden relative min-h-[400px]">
            {isProcessing && (
              <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <span className="font-bold text-blue-600 animate-pulse">AI Extracting Subject...</span>
              </div>
            )}
            
            {processedUrl && (
               // Dynamic Background Color Viewport
              <div 
                className="relative flex items-center justify-center w-full h-full transition-colors duration-300"
                style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }}
              >
                {bgColor === 'transparent' && (
                  <div className="absolute inset-0 opacity-20 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAACVJREFUKFNjZCASMDKgAoho4M+fP/9x6sQqwCXHqGKUg8jQAAA1qAo0c42n+QAAAABJRU5ErkJggg==')]"></div>
                )}
                <img src={processedUrl} className="max-h-[500px] object-contain relative z-10 drop-shadow-xl" alt="Cutout" />
                
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
          <div className="w-full lg:w-72 flex flex-col gap-6">
             
            <div>
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

            <div className="pt-4 border-t border-gray-200 dark:border-slate-700 flex flex-col gap-3">
               <button 
                 onClick={handleDownloadImage}
                 className="w-full py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90"
               >
                 <Download className="w-5 h-5" /> Download Digital Photo
               </button>
               
               {mode === 'passport' && (
                 <button 
                   onClick={handleDownloadSheet}
                   className="w-full py-3 bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 shadow-md"
                 >
                   <Printer className="w-5 h-5" /> Generate 4x6 Print Sheet
                 </button>
               )}
               
               <button 
                 onClick={() => { setProcessedUrl(null); setOriginalUrl(null); }}
                 className="w-full py-2 text-red-500 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg mt-4"
               >
                 Discard & Upload New
               </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}