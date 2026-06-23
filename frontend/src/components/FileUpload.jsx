import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, X, Loader2, CheckCircle, AlertCircle, Layers, ChevronUp, ChevronDown } from 'lucide-react';

export function FileUpload() {
  const [files, setFiles] = useState([]);
  const [isGlobalProcessing, setIsGlobalProcessing] = useState(false);
  const [watermark, setWatermark] = useState('Optimized by PrepPrint.in');
  const [isMerging, setIsMerging] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDarkMode(true);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file, status: 'idle', progress: 0, statusText: 'Waiting in queue...'
    }));
    setFiles(prev => [...prev, ...newFiles].slice(0, 5));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 5, disabled: isGlobalProcessing
  });

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

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

  const processSingleFile = async (fileId, currentFile) => {
    const updateFile = (updates) => setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updates } : f));
    updateFile({ status: 'processing', progress: 15, statusText: 'Uploading...' });
    
    const formData = new FormData();
    formData.append('file', currentFile);
    formData.append('watermark', watermark);

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

    const progressInterval = setInterval(() => {
      setFiles(prev => prev.map(f => (f.status === 'processing' && f.progress < 85) 
        ? { ...f, progress: f.progress + 1, statusText: 'Inverting & Merging...' } : f));
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
    <div className="w-full max-w-2xl mx-auto mt-8">
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Watermark Text</label>
        <input 
          type="text" value={watermark} onChange={(e) => setWatermark(e.target.value)} disabled={isGlobalProcessing}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none"
        />
      </div>

      {files.length < 5 && (
        <div {...getRootProps()} className={`h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer mb-6 ${isGlobalProcessing ? "opacity-50 pointer-events-none" : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"}`}>
          <input {...getInputProps()} />
          <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
          <p className="font-medium text-gray-700 dark:text-gray-200">Drag up to 5 PDFs here</p>
        </div>
      )}

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
            {files.map((f, index) => (
              <div key={f.id} className="p-3 border rounded-lg border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-3 overflow-hidden pr-4">
                    <FileText className={`w-5 h-5 flex-shrink-0 ${f.status === 'success' ? 'text-green-500' : 'text-blue-500'}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      <span className="font-bold mr-2 text-gray-400">{index + 1}.</span>
                      {f.file.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {f.status === 'idle' && !isGlobalProcessing && (
                      <>
                        <button onClick={() => moveFile(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors">
                          <ChevronUp className="w-5 h-5" />
                        </button>
                        <button onClick={() => moveFile(index, 'down')} disabled={index === files.length - 1} className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors">
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
            ))}
          </div>

          <button 
            onClick={allCompleted ? () => setFiles([]) : handleProcessAll} disabled={isGlobalProcessing || files.length === 0}
            className={`w-full py-3 font-bold rounded-lg transition-all ${allCompleted ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "bg-blue-600 hover:bg-blue-700 text-white shadow-md"}`}
          >
            {allCompleted ? 'Clear Queue' : isMerging && files.length > 1 ? `Merge & Invert ${files.length} PDFs` : 'Invert PDFs separately'}
          </button>
        </div>
      )}
    </div>
  );
}