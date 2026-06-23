import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, X, Loader2, CheckCircle, AlertCircle, Layers, ChevronUp, ChevronDown, Eye, Trash2 } from 'lucide-react';

export function FileUpload() {
  const [files, setFiles] = useState([]);
  const [isGlobalProcessing, setIsGlobalProcessing] = useState(false);
  const [watermark, setWatermark] = useState('Optimized by PrepPrint.in');
  const [isMerging, setIsMerging] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // States for the Visual Page Manager
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);
  const [pageMaps, setPageMaps] = useState({}); // Stores configuration arrays per file ID
  const [activeModalFile, setActiveModalFile] = useState(null); // Tracks file currently open in visual grid

  // 1. Inject PDF.js CDN safely on mount
  useEffect(() => {
    if (window.pdfjsLib) {
      setPdfJsLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      setPdfJsLoaded(true);
    };
    document.body.appendChild(script);

    // Sync Dark Mode state from global HTML element
    if (document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true);
    }
  }, []);

  // 2. Client-Side Thumbnail Generator Engine
  const generateThumbnails = async (fileObj, id) => {
    if (!window.pdfjsLib) return;
    try {
      const fileReader = new FileReader();
      fileReader.onload = async function () {
        const typedarray = new Uint8Array(this.result);
        const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
        const totalPages = pdf.numPages;
        const pagesArray = [];

        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 }); // Small crisp thumbnail scale
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport: viewport }).promise;
          pagesArray.push({
            index: i - 1, // 0-indexed for backend engines
            displayNum: i,
            thumbnail: canvas.toDataURL(),
            keep: true // Default state: keep page
          });
        }
        setPageMaps(prev => ({ ...prev, [id]: pagesArray }));
      };
      fileReader.readAsArrayBuffer(fileObj);
    } catch (err) {
      console.error("Error drawing client thumbnails:", err);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => {
      const id = Math.random().toString(36).substring(7);
      // Run asynchronous extraction inside browser background
      generateThumbnails(file, id);
      return {
        id, file, status: 'idle', progress: 0, statusText: 'Waiting in queue...'
      };
    });
    setFiles(prev => [...prev, ...newFiles].slice(0, 5));
  }, [pdfJsLoaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 5, disabled: isGlobalProcessing || !pdfJsLoaded
  });

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setPageMaps(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const moveFile = (index, direction) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (direction === 'up' && index > 0) {
        [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
      } else if (direction === 'down' && index < newFiles.length - 1) {
        [newFiles[index + 1], newFiles[index]] = [newFiles[index], newFiles[index + 1]];
      }
      return newFiles;
    });
  };

  const togglePageSelection = (fileId, pageIndex) => {
    setPageMaps(prev => {
      const currentPages = prev[fileId] ? [...prev[fileId]] : [];
      currentPages[pageIndex] = {
        ...currentPages[pageIndex],
        keep: !currentPages[pageIndex].keep
      };
      return { ...prev, [fileId]: currentPages };
    });
  };

  // 3. Sequential Processing Payload Compilation
  const processSingleFile = async (fileId, currentFile) => {
    const updateFile = (updates) => setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updates } : f));
    updateFile({ status: 'processing', progress: 15, statusText: 'Uploading...' });
    
    // Compile active page mapping array
    const explicitPages = pageMaps[fileId] 
      ? pageMaps[fileId].filter(p => p.keep).map(p => p.index).join(',')
      : '';

    const formData = new FormData();
    formData.append('file', currentFile);
    formData.append('watermark', watermark);
    formData.append('pages_to_keep', explicitPages);

    const progressInterval = setInterval(() => {
      setFiles(prev => prev.map(f => (f.id === fileId && f.status === 'processing' && f.progress < 85) 
        ? { ...f, progress: f.progress + 1 } : f));
    }, 600);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/process-pdf`, { method: 'POST', body: formData });
      clearInterval(progressInterval);
      if (!response.ok) throw new Error('Server rejected');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl; link.download = `inverted_${currentFile.name}`;
      document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(downloadUrl);

      updateFile({ status: 'success', progress: 100, statusText: 'Complete!' });
    } catch (err) {
      clearInterval(progressInterval);
      updateFile({ status: 'error', statusText: 'Failed.' });
    }
  };

  const processMergedFiles = async () => {
    setFiles(prev => prev.map(f => ({ ...f, status: 'processing', progress: 15, statusText: 'Bundling...' })));
    
    const formData = new FormData();
    files.forEach(f => formData.append('files', f.file)); 
    formData.append('watermark', watermark);

    // Build matching ordered array parameters for the backend loop
    files.forEach(f => {
      const explicitPages = pageMaps[f.id]
        ? pageMaps[f.id].filter(p => p.keep).map(p => p.index).join(',')
        : '';
      formData.append('page_maps', explicitPages);
    });

    const progressInterval = setInterval(() => {
      setFiles(prev => prev.map(f => (f.status === 'processing' && f.progress < 85) 
        ? { ...f, progress: f.progress + 1, statusText: 'Processing combined map...' } : f));
    }, 800);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/merge-pdfs`, { method: 'POST', body: formData });
      clearInterval(progressInterval);
      if (!response.ok) throw new Error('Merge failed');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl; link.download = `PrepPrint_Merged.pdf`;
      document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(downloadUrl);

      setFiles(prev => prev.map(f => ({ ...f, status: 'success', progress: 100, statusText: 'Merged!' })));
    } catch (err) {
      clearInterval(progressInterval);
      setFiles(prev => prev.map(f => ({ ...f, status: 'error', statusText: 'Failed.' })));
    }
  };

  const handleProcessAll = async () => {
    setIsGlobalProcessing(true);
    if (isMerging && files.length > 1) {
      await processMergedFiles();
    } else {
      for (let i = 0; i < files.length; i++) {
        if (files[i].status === 'idle' || files[i].status === 'error') {
          await processSingleFile(files[i].id, files[i].file);
        }
      }
    }
    setIsGlobalProcessing(false);
  };

  const hasFiles = files.length > 0;
  const allCompleted = hasFiles && files.every(f => f.status === 'success');

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 px-4">
      
      {/* 4. Global Configuration Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Watermark Text</label>
        <input 
          type="text" value={watermark} onChange={(e) => setWatermark(e.target.value)} disabled={isGlobalProcessing}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* Dropzone Section */}
      {!pdfJsLoaded ? (
        <div className="h-40 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-800/10">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
          <span className="text-sm font-medium text-gray-500">Initializing document workspace...</span>
        </div>
      ) : files.length < 5 && (
        <div {...getRootProps()} className={`h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer mb-6 transition-all ${isGlobalProcessing ? "opacity-50 pointer-events-none" : "border-gray-300 dark:border-gray-700 hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}>
          <input {...getInputProps()} />
          <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
          <p className="font-medium text-gray-700 dark:text-gray-200 text-center">Drag up to 5 PDFs here</p>
        </div>
      )}

      {/* Main File Queue List */}
      {hasFiles && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm transition-colors">
          
          {files.length > 1 && (
            <div className="flex items-center mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50">
              <input 
                type="checkbox" id="mergeToggle" checked={isMerging} onChange={(e) => setIsMerging(e.target.checked)} disabled={isGlobalProcessing || allCompleted}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
              <label htmlFor="mergeToggle" className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex items-center">
                <Layers className="w-4 h-4 mr-2" />
                Merge all into a single PDF (Files will merge in the order below)
              </label>
            </div>
          )}
          
          <div className="space-y-3 mb-6">
            {files.map((f, index) => {
              const pagesData = pageMaps[f.id] || [];
              const excludedCount = pagesData.filter(p => !p.keep).length;
              
              return (
                <div key={f.id} className="p-3 border rounded-lg border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-3 overflow-hidden pr-4">
                      <FileText className={`w-5 h-5 flex-shrink-0 ${f.status === 'success' ? 'text-green-500' : 'text-blue-500'}`} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          <span className="font-bold mr-2 text-gray-400">{index + 1}.</span>
                          {f.file.name}
                        </span>
                        {pagesData.length > 0 && (
                          <span className="text-xs text-gray-400 mt-0.5">
                            Total Pages: {pagesData.length} {excludedCount > 0 && `(${excludedCount} page(s) marked for deletion)`}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {f.status === 'idle' && !isGlobalProcessing && (
                        <>
                          {/* 5. Trigger Interactive Modal Page-Picker Grid */}
                          <button 
                            onClick={() => setActiveModalFile(f)}
                            className="p-1.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            title="Manage and Delete Pages Visually"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => moveFile(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-30 transition-colors">
                            <ChevronUp className="w-5 h-5" />
                          </button>
                          <button onClick={() => moveFile(index, 'down')} disabled={index === files.length - 1} className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-30 transition-colors">
                            <ChevronDown className="w-5 h-5" />
                          </button>
                          <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1"></div>
                          <button onClick={() => removeFile(f.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {f.status === 'processing' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                      {f.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {f.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                    </div>
                  </div>

                  {f.status !== 'idle' && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1 text-gray-500 dark:text-gray-400"><span>{f.statusText}</span><span>{f.progress}%</span></div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5"><div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${f.progress}%` }}></div></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button 
            onClick={allCompleted ? () => setFiles([]) : handleProcessAll} disabled={isGlobalProcessing || files.length === 0}
            className={`w-full py-3 font-bold rounded-lg transition-all ${allCompleted ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "bg-blue-600 hover:bg-blue-700 text-white shadow-md"}`}
          >
            {allCompleted ? 'Clear Queue' : isMerging && files.length > 1 ? `Merge & Invert ${files.length} PDFs` : 'Invert PDFs separately'}
          </button>
        </div>
      )}

      {/* 6. FULL-SCREEN INTERACTIVE VISUAL MODAL WORKSPACE */}
      {activeModalFile && pageMaps[activeModalFile.id] && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl h-[85vh] bg-white dark:bg-gray-950 rounded-2xl flex flex-col shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in duration-150">
            
            {/* Modal Header Controls */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <div className="min-w-0 pr-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{activeModalFile.file.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Keeping <span className="font-semibold text-blue-600">{pageMaps[activeModalFile.id].filter(p => p.keep).length}</span> pages · 
                  Deleting <span className="font-semibold text-red-500">{pageMaps[activeModalFile.id].filter(p => !p.keep).length}</span> pages
                </p>
              </div>
              <button 
                onClick={() => setActiveModalFile(null)}
                className="px-4 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-bold rounded-lg text-sm transition-all hover:opacity-90 shadow"
              >
                Apply Layout & Close
              </button>
            </div>

            {/* Scrollable Document Canvas Grid View */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50 dark:bg-gray-900/20">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {pageMaps[activeModalFile.id].map((page, pIdx) => (
                  <div 
                    key={pIdx}
                    onClick={() => togglePageSelection(activeModalFile.id, pIdx)}
                    className={`group relative border rounded-xl overflow-hidden cursor-pointer bg-white dark:bg-gray-900 select-none shadow-sm transition-all duration-200 hover:scale-102 hover:shadow-md
                      ${page.keep 
                        ? 'border-gray-200 dark:border-gray-800 ring-2 ring-transparent hover:ring-blue-500' 
                        : 'border-red-300 dark:border-red-900 ring-2 ring-red-500 opacity-60'
                      }`}
                  >
                    {/* Rendered Canvas Thumbnail Image */}
                    <div className="aspect-[3/4] flex items-center justify-center p-2 bg-gray-50 dark:bg-gray-950">
                      <img src={page.thumbnail} alt={`Page ${page.displayNum}`} className="max-h-full max-w-full object-contain pointer-events-none" />
                    </div>

                    {/* Meta Layout Overlay & Selection Indicators */}
                    <div className="p-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Page {page.displayNum}</span>
                      {page.keep ? (
                        <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center group-hover:border-blue-500">
                          <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-blue-500"></div>
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                          <X className="w-2.5 h-2.5 text-white stroke-[4]" />
                        </div>
                      )}
                    </div>

                    {/* Absolute Overlays for Flagged Deletions */}
                    {!page.keep && (
                      <div className="absolute inset-0 bg-red-500/10 backdrop-blur-[0.5px] flex flex-col items-center justify-center pointer-events-none">
                        <div className="bg-red-600 text-white font-black text-xs px-2 py-1 rounded shadow flex items-center space-x-1">
                          <Trash2 className="w-3 h-3" />
                          <span>DELETING</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}