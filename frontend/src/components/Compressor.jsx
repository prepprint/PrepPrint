import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Image as ImageIcon, FileText, Download, Loader2, Zap, Settings2 } from 'lucide-react';
import AdBanner from './AdBanner';

export default function Compressor() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [targetKb, setTargetKb] = useState(150);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const selected = acceptedFiles[0];
      setFile(selected);
      
      // Only create image previews for actual images, not PDFs
      if (selected.type.includes('image')) {
        setPreview(URL.createObjectURL(selected));
      } else {
        setPreview(null);
      }
      
      setResultBlob(null);
      setResultUrl(null);
      setError('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'image/jpeg': ['.jpg', '.jpeg'], 
      'image/png': ['.png'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  const handleCompress = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_kb', targetKb);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/reduce-size`, {
        method: 'POST',
        body: formData
      });

      // 🟢 THE FIX: Safely check if the server sent HTML instead of JSON 🟢
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          // The server sent a proper JSON error
          const errorData = await response.json();
          throw new Error(errorData.error || 'Server error during size reduction');
        } else {
          // The server sent an HTML page (like a 404 or 413 error)
          throw new Error('Server is currently updating or the file is too large. Please wait a moment and try again.');
        }
      }

      const blob = await response.blob();
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Server error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 px-4">
      

      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
          <Zap className="text-blue-500 w-8 h-8" />
          File Size Reducer <span className="text-gray-400 text-2xl font-medium">(Compressor)</span>
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Instantly shrink PDFs, JPGs, JPEGs, and PNGs for application forms, emails, and strict storage limits.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="md:col-span-2 space-y-4">
          <div 
            {...getRootProps()} 
            className={`h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer transition-all ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/10 hover:border-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800/40'}`}
          >
            <input {...getInputProps()} />
            <UploadCloud className={`w-12 h-12 mb-3 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className="font-bold text-gray-700 dark:text-gray-200">Drag & Drop your File</p>
            <p className="text-xs text-gray-500 mt-1">Supports PDF, JPG, JPEG, and PNG</p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Settings2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Target KB Size (For Images)</h4>
                <p className="text-xs text-gray-500">Maximum allowed file size</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={targetKb} 
                onChange={(e) => setTargetKb(e.target.value)}
                className="w-24 px-3 py-2 text-center text-lg font-black border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-bold text-gray-500">KB</span>
            </div>
          </div>

          <button 
            onClick={handleCompress} 
            disabled={!file || isProcessing}
            className="w-full py-3.5 font-bold rounded-xl transition-all bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:dark:bg-gray-800 text-white shadow-md flex justify-center items-center gap-2"
          >
            {isProcessing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Reducing File Size...</>
            ) : (
              <><Zap className="w-5 h-5" /> Reduce Size Now</>
            )}
          </button>
          
          {error && <p className="text-red-500 text-sm font-bold text-center mt-2">{error}</p>}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm flex flex-col">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Workspace</h3>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            {file ? (
              <div className="w-full flex flex-col items-center space-y-4">
                <div className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 flex items-center justify-center min-h-[150px] w-full p-2">
                  {file.type === 'application/pdf' ? (
                     <FileText className="w-20 h-20 text-blue-500 mx-auto" />
                  ) : (
                     <img src={resultUrl || preview} alt="Preview" className="max-h-48 object-contain" />
                  )}
                </div>
                
                <div className="w-full flex justify-between items-center text-xs font-bold px-1">
                  <span className="text-gray-500">Original: {(file.size / 1024).toFixed(1)} KB</span>
                  {resultBlob && (
                    <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                      Final: {(resultBlob.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>

                {resultUrl && (
                  <a 
                    href={resultUrl} 
                    download={`reduced_${file.name}`}
                    className="w-full mt-2 py-2.5 font-bold rounded-lg transition-all bg-green-600 hover:bg-green-700 text-white shadow-md flex justify-center items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download Ready
                  </a>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 dark:text-gray-600 space-y-2">
                <ImageIcon className="w-12 h-12 mx-auto opacity-50" />
                <p className="text-sm font-medium">Awaiting file...</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}