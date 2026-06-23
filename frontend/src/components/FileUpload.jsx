import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export function FileUpload() {
  const [files, setFiles] = useState([]);
  const [isGlobalProcessing, setIsGlobalProcessing] = useState(false);
  
  // The new state for the custom watermark
  const [watermark, setWatermark] = useState('Optimized by PrepPrint.in');

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'idle',
      progress: 0,
      statusText: 'Waiting in queue...'
    }));

    setFiles(prev => {
      const combined = [...prev, ...newFiles];
      return combined.slice(0, 5);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 5,
    disabled: isGlobalProcessing
  });

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const processSingleFile = async (fileId, currentFile) => {
    const updateFile = (updates) => {
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updates } : f));
    };

    updateFile({ status: 'processing', progress: 15, statusText: 'Uploading secure document...' });
    
    const formData = new FormData();
    formData.append('file', currentFile);
    // WE APPEND THE CUSTOM WATERMARK HERE
    formData.append('watermark', watermark); 

    const progressInterval = setInterval(() => {
      setFiles(prev => prev.map(f => {
        if (f.id === fileId && f.status === 'processing' && f.progress < 85) {
          let newText = f.statusText;
          if (f.progress === 25) newText = 'Waking up engine & allocating memory...';
          if (f.progress === 55) newText = 'Inverting colors and rendering PDF...';
          return { ...f, progress: f.progress + 1, statusText: newText };
        }
        return f;
      }));
    }, 600);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/process-pdf`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) throw new Error('Server rejected file.');

      updateFile({ progress: 95, statusText: 'Applying custom watermark...' });

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `inverted_${currentFile.name}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      updateFile({ status: 'success', progress: 100, statusText: 'Download complete!' });
    } catch (err) {
      console.error(err);
      clearInterval(progressInterval);
      updateFile({ status: 'error', statusText: 'Connection failed. Server error.' });
    }
  };

  const handleProcessAll = async () => {
    setIsGlobalProcessing(true);
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'idle' || files[i].status === 'error') {
        await processSingleFile(files[i].id, files[i].file);
      }
    }
    setIsGlobalProcessing(false);
  };

  const hasFiles = files.length > 0;
  const allCompleted = hasFiles && files.every(f => f.status === 'success');

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      
      {/* THE NEW CUSTOM WATERMARK INPUT UI */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Custom Watermark Text
        </label>
        <input 
          type="text" 
          value={watermark}
          onChange={(e) => setWatermark(e.target.value)}
          disabled={isGlobalProcessing}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
          placeholder="Enter your watermark..."
        />
      </div>

      {files.length < 5 && (
        <div
          {...getRootProps()}
          className={`h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer transition-all duration-200 ease-in-out mb-6
            ${isGlobalProcessing ? "opacity-50 cursor-not-allowed" : ""}
            ${isDragActive 
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
              : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className={`w-10 h-10 mb-3 ${isDragActive ? "text-blue-500" : "text-gray-400"}`} />
          <p className="text-base font-medium text-gray-700 dark:text-gray-200 text-center">
            {isDragActive ? "Drop PDFs here!" : "Drag up to 5 PDFs here"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {5 - files.length} slot(s) remaining
          </p>
        </div>
      )}

      {hasFiles && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 px-2">
            Processing Queue ({files.length}/5)
          </h3>
          
          <div className="space-y-3 mb-6">
            {files.map((f) => (
              <div key={f.id} className="p-3 border rounded-lg border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-3 overflow-hidden pr-4">
                    <FileText className={`w-5 h-5 flex-shrink-0 ${f.status === 'success' ? 'text-green-500' : 'text-blue-500'}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {f.file.name}
                    </span>
                  </div>
                  
                  {f.status === 'idle' && !isGlobalProcessing && (
                    <button onClick={() => removeFile(f.id)} className="text-gray-400 hover:text-red-500">
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  {f.status === 'processing' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                  {f.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {f.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                </div>

                {f.status !== 'idle' && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1 text-gray-500 dark:text-gray-400">
                      <span>{f.statusText}</span>
                      <span className="font-medium">{f.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ease-out
                          ${f.status === 'error' ? 'bg-red-500' : f.status === 'success' ? 'bg-green-500' : 'bg-blue-600'}`}
                        style={{ width: `${f.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button 
            onClick={allCompleted ? () => setFiles([]) : handleProcessAll}
            disabled={isGlobalProcessing || files.length === 0}
            className={`w-full py-3 px-4 font-bold rounded-lg transition-all shadow-md flex items-center justify-center space-x-2
              ${isGlobalProcessing ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 cursor-not-allowed" : ""}
              ${allCompleted ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "bg-blue-600 hover:bg-blue-700 text-white"}
            `}
          >
            {isGlobalProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
            <span>
              {allCompleted ? 'Clear Queue' : 
               isGlobalProcessing ? 'Processing Queue...' : 
               `Invert ${files.length} PDF${files.length > 1 ? 's' : ''}`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}