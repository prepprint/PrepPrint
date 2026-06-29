import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, LayoutTemplate, Copy, FileText, Loader2, Trash2, Printer, Plus, X } from 'lucide-react';

export default function IdScanner() {
  const [assets, setAssets] = useState([]);
  const [gridFormat, setGridFormat] = useState('1x2'); 
  const [selectedAssets, setSelectedAssets] = useState([]); 
  const [isGenerating, setIsGenerating] = useState(false);

  // Calculate current grid capacity
  const [cols, rows] = gridFormat.split('x').map(Number);
  const totalSlots = cols * rows;

  // 1. Initialize PDF.js Engine for visual thumbnails
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

  // 2. Handle Bulk Uploads (Images + PDFs)
  const onDrop = useCallback(async (acceptedFiles) => {
    for (const file of acceptedFiles) {
      const isPdf = file.type === 'application/pdf';
      const id = Math.random().toString(36).substring(7);
      
      let previewUrl = null;

      // Extract real visual thumbnail if it's a PDF
      if (isPdf && window.pdfjsLib) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          previewUrl = canvas.toDataURL('image/jpeg');
        } catch (err) {
          console.error("PDF preview generation failed:", err);
        }
      } else if (!isPdf) {
        previewUrl = URL.createObjectURL(file);
      }

      setAssets(prev => [...prev, { id, file, isPdf, previewUrl, name: file.name }]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    }
  });

  // 3. Grid Management Actions
  const handleGridFormatChange = (e) => {
    setGridFormat(e.target.value);
    setSelectedAssets([]); // Clear the page when changing layouts to prevent overflow
  };

  const removeAssetFromPool = (id) => {
    setAssets(prev => prev.filter(a => a.id !== id));
    setSelectedAssets(prev => prev.filter(assetId => assetId !== id)); // Remove from page too
  };

  const addToPage = (assetId) => {
    if (selectedAssets.length < totalSlots) {
      setSelectedAssets(prev => [...prev, assetId]);
    }
  };

  const fillEntirePage = (assetId) => {
    setSelectedAssets(Array(totalSlots).fill(assetId));
  };

  const removeFromPage = (index) => {
    setSelectedAssets(prev => {
      const newArr = [...prev];
      newArr.splice(index, 1);
      return newArr;
    });
  };

  // 4. Send to Python A4 Engine
  const handleGeneratePDF = async () => {
    if (selectedAssets.length === 0) return;
    setIsGenerating(true);
    
    const formData = new FormData();
    formData.append('grid_format', gridFormat);

    // Append files in the exact order they appear on the A4 page
    selectedAssets.forEach((assetId, index) => {
      const asset = assets.find(a => a.id === assetId);
      if (asset) {
        formData.append(`file_${index}`, asset.file);
      }
    });

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/scan/generate-id-layout`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Layout generation failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Premium_Layout_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Failed to generate PDF. Make sure your backend is running.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    // 🟢 FIXED: Removed h-[85vh] and added pb-24 so the page scrolls naturally
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 flex flex-col pb-24">
      
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center">
          <LayoutTemplate className="w-6 h-6 text-blue-500 mr-2" />
          Smart ID Card & Grid Builder
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Bulk upload PDFs and Images, build your custom A4 layout, and generate a print-ready document.</p>
      </div>

      {/* 🟢 FIXED: Removed overflow-hidden from this grid wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Asset Pool */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 flex flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm max-h-[700px]">
          <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300">1. Upload Files</h3>
            <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded">{assets.length} Assets</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Dropzone */}
            <div {...getRootProps()} className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-slate-700 hover:border-blue-400 hover:bg-gray-50'}`}>
              <input {...getInputProps()} />
              <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300 text-center">Drop Images or PDFs here</p>
              <p className="text-xs text-gray-400 mt-1">Automatic PDF preview generation</p>
            </div>

            {/* Asset Gallery */}
            <div className="grid grid-cols-2 gap-3">
              {assets.map((asset) => (
                <div key={asset.id} className="relative group border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-slate-800">
                  <div className="aspect-[4/3] flex items-center justify-center p-2 bg-white dark:bg-slate-950">
                    {asset.previewUrl ? (
                      <img src={asset.previewUrl} alt="Thumbnail" className="max-h-full max-w-full object-contain shadow-sm" />
                    ) : (
                      <FileText className="w-12 h-12 text-blue-400" />
                    )}
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex flex-col gap-2">
                    <p className="text-[10px] font-medium text-gray-500 truncate">{asset.name}</p>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => addToPage(asset.id)} 
                        disabled={selectedAssets.length >= totalSlots}
                        className="flex-1 flex items-center justify-center text-[10px] font-bold py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 disabled:opacity-50 rounded transition-colors"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </button>
                      <button 
                        onClick={() => fillEntirePage(asset.id)} 
                        className="flex-1 flex items-center justify-center text-[10px] font-bold py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 rounded transition-colors"
                      >
                        <Copy className="w-3 h-3 mr-1" /> Fill
                      </button>
                    </div>
                  </div>
                  <button onClick={() => removeAssetFromPool(asset.id)} className="absolute top-1 right-1 p-1 bg-white/90 dark:bg-slate-900/90 rounded text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live A4 Builder */}
        <div className="lg:col-span-7 flex flex-col bg-slate-100 dark:bg-slate-950/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 p-4 lg:p-6">
          
          {/* Top Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Layout:</span>
              <select 
                value={gridFormat} 
                onChange={handleGridFormatChange}
                className="flex-1 sm:flex-none px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1x1">1x1 (Single Card)</option>
                <option value="1x2">1x2 (Front & Back - Portrait)</option>
                <option value="2x1">2x1 (Front & Back - Landscape)</option>
                <option value="2x2">2x2 (4 Copies)</option>
                <option value="1x3">1x3 (3 Copies Vertical)</option>
                <option value="3x2">3x2 (6 Copies)</option>
                <option value="2x3">2x3 (6 Copies)</option>
                <option value="3x3">3x3 (9 Copies / Passports)</option>
              </select>
            </div>

            <button 
              onClick={handleGeneratePDF}
              disabled={isGenerating || selectedAssets.length === 0}
              className="w-full sm:w-auto px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-black rounded-lg shadow-md transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Printer className="w-4 h-4 mr-2" />}
              Generate Print PDF
            </button>
          </div>

          {/* Live A4 Visualizer Canvas */}
          <div className="flex-1 flex items-center justify-center">
            {/* The A4 Aspect Ratio Box (1 : 1.414) */}
            <div className="w-full max-w-sm aspect-[1/1.414] bg-white border border-gray-300 shadow-2xl relative p-6 flex flex-col">
              
              <div 
                className="w-full h-full grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
                }}
              >
                {[...Array(totalSlots)].map((_, i) => {
                  const assetId = selectedAssets[i];
                  const asset = assetId ? assets.find(a => a.id === assetId) : null;
                  
                  return (
                    <div 
                      key={i} 
                      className={`relative rounded flex items-center justify-center overflow-hidden border-2 ${asset ? 'border-transparent shadow-sm' : 'border-dashed border-gray-300 bg-gray-50'}`}
                    >
                      {asset ? (
                        <>
                          {asset.previewUrl ? (
                            <img src={asset.previewUrl} className="w-full h-full object-cover" alt="Slot" />
                          ) : (
                            <FileText className="w-8 h-8 text-blue-500" />
                          )}
                          <button 
                            onClick={() => removeFromPage(i)}
                            className="absolute top-1 right-1 bg-white/90 rounded-full p-1 shadow text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400">SLOT {i + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}