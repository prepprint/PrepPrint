import { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, X, Loader2, CheckCircle, AlertCircle, Layers, ChevronUp, ChevronDown, Eye, Trash2, Scissors, Zap } from 'lucide-react';
import AdBanner from './AdBanner';

export function FileUpload() {
  const [files, setFiles] = useState([]);
  const [isGlobalProcessing, setIsGlobalProcessing] = useState(false);
  const [watermark, setWatermark] = useState('Optimized by PrepPrint.in');
  const [isMerging, setIsMerging] = useState(false);
  const [invertColors, setInvertColors] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [preserveImages, setPreserveImages] = useState(false); // 🟢 The New State

  // Platform Layout Settings
  const [nUp, setNUp] = useState(1);
  const [orientation, setOrientation] = useState('portrait');
  const [gutterMargin, setGutterMargin] = useState('none');

  // Visual Workspace States
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);
  const [pageMaps, setPageMaps] = useState({}); 
  const [activeModalFile, setActiveModalFile] = useState(null); 

  // Module Chapter Splitter Local Inputs
  const [splitStart, setSplitStart] = useState('');
  const [splitEnd, setSplitEnd] = useState('');

  // Exam Rage Arcade Game References
  const canvasRef = useRef(null);
  const [gameScore, setGameScore] = useState(0);

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

    if (document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true);
    }
  }, []);

  // --- LOW-OVERHEAD ULTRA PERFORMANCE GAME ENGINE ---
  useEffect(() => {
    if (!isGlobalProcessing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    canvas.width = 500;
    canvas.height = 300;

    let items = [];
    let particles = [];
    let splats = [];       
    let combos = [];       
    let slashTrail = [];   
    const targetEmojis = ['⏰', '🧮', '📚', '📝', '✏️'];
    let scoreCounter = 0;
    let sliceTimestamps = [];

    class TargetItem {
      constructor() {
        this.x = Math.random() * (canvas.width * 0.6) + canvas.width * 0.2;
        this.y = canvas.height + 20;
        this.vx = (Math.random() - 0.5) * 3; 
        this.vy = -(Math.random() * 3 + 7); 
        this.gravity = 0.16;
        this.rotation = Math.random() * Math.PI;
        this.vRot = (Math.random() - 0.5) * 0.08;
        this.emoji = targetEmojis[Math.floor(Math.random() * targetEmojis.length)];
        this.radius = 20;
        this.isSliced = false;
        this.color = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 5)];
      }
      update() {
        this.vy += this.gravity; 
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.vRot;
      }
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (this.isSliced) {
          ctx.globalAlpha = 0.4;
          ctx.fillText(this.emoji, -12, -4);
          ctx.fillText(this.emoji, 12, 4);
        } else {
          ctx.fillText(this.emoji, 0, 0);
        }
        ctx.restore();
      }
    }

    class NeonSplat {
      constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = Math.random() * 12 + 10;
        this.alpha = 0.5;
      }
      update() { this.alpha -= 0.006; }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    class FloatingCombo {
      constructor(x, y, count) {
        this.x = x;
        this.y = y - 15;
        this.count = count;
        this.alpha = 1.0;
      }
      update() { this.y -= 1; this.alpha -= 0.03; }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.count}x COMBO!`, this.x, this.y);
        ctx.restore();
      }
    }

    class BurstParticle {
      constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.alpha = 1;
        this.decay = Math.random() * 0.05 + 0.03;
        this.size = Math.random() * 3 + 2;
        this.color = color;
      }
      update() { this.x += this.vx; this.y += this.vy; this.alpha -= this.decay; }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
      }
    }

    const checkSliceInteraction = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = ((clientX - rect.left) / rect.width) * canvas.width;
      const mouseY = ((clientY - rect.top) / rect.height) * canvas.height;

      slashTrail.push({ x: mouseX, y: mouseY, alpha: 1.0 });

      const now = Date.now();
      let slicedThisFrame = 0;
      let lastX = mouseX, lastY = mouseY;

      items.forEach(item => {
        if (!item.isSliced) {
          if (Math.abs(item.x - mouseX) < item.radius + 8 && Math.abs(item.y - mouseY) < item.radius + 8) {
            item.isSliced = true;
            slicedThisFrame++;
            lastX = item.x; lastY = item.y;
            sliceTimestamps.push(now);
            splats.push(new NeonSplat(item.x, item.y, item.color));

            for (let i = 0; i < 8; i++) {
              particles.push(new BurstParticle(item.x, item.y, item.color));
            }
          }
        }
      });

      if (slicedThisFrame > 0) {
        sliceTimestamps = sliceTimestamps.filter(t => now - t < 600);
        if (sliceTimestamps.length >= 3) {
          combos.push(new FloatingCombo(lastX, lastY, sliceTimestamps.length));
          scoreCounter += 25;
        } else {
          scoreCounter += 10;
        }
        setGameScore(scoreCounter);
      }
    };

    const handleMouseMove = (e) => {
      const point = e.touches ? e.touches[0] : e;
      if (e.buttons === 1 || e.type === 'touchmove') {
        checkSliceInteraction(point.clientX, point.clientY);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseMove);
    canvas.addEventListener('touchmove', handleMouseMove, { passive: true });

    const gameLoop = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      splats.forEach((s, idx) => { s.update(); s.draw(); if (s.alpha <= 0) splats.splice(idx, 1); });

      if (Math.random() < 0.025 && items.length < 4) items.push(new TargetItem());

      items.forEach((item, index) => {
        item.update(); item.draw();
        if (item.y > canvas.height + 30) items.splice(index, 1);
      });

      particles.forEach((p, idx) => { p.update(); p.draw(); if (p.alpha <= 0) particles.splice(idx, 1); });
      combos.forEach((c, idx) => { c.update(); c.draw(); if (c.alpha <= 0) combos.splice(idx, 1); });

      if (slashTrail.length > 1) {
        ctx.save();
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#3b82f6';
        ctx.beginPath();
        ctx.moveTo(slashTrail[0].x, slashTrail[0].y);
        for (let k = 1; k < slashTrail.length; k++) {
          ctx.lineTo(slashTrail[k].x, slashTrail[k].y);
        }
        ctx.stroke();
        ctx.restore();
      }

      slashTrail.forEach((node, idx) => { node.alpha -= 0.12; if (node.alpha <= 0) slashTrail.splice(idx, 1); });
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseMove);
      canvas.removeEventListener('touchmove', handleMouseMove);
    };
  }, [isGlobalProcessing]);

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
          const viewport = page.getViewport({ scale: 0.3 }); 
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport: viewport }).promise;
          pagesArray.push({ index: i - 1, displayNum: i, thumbnail: canvas.toDataURL(), keep: true });
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
      generateThumbnails(file, id);
      return { id, file, status: 'idle', progress: 0, statusText: 'Waiting in queue...' };
    });
    setFiles(prev => [...prev, ...newFiles].slice(0, 25));
  }, [pdfJsLoaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 25, disabled: isGlobalProcessing || !pdfJsLoaded
  });

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setPageMaps(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
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
      currentPages[pageIndex] = { ...currentPages[pageIndex], keep: !currentPages[pageIndex].keep };
      return { ...prev, [fileId]: currentPages };
    });
  };

  const applyRangeSplit = () => {
    if (!activeModalFile || !splitStart || !splitEnd) return;
    const start = parseInt(splitStart);
    const end = parseInt(splitEnd);
    if (isNaN(start) || isNaN(end) || start > end) return;

    setPageMaps(prev => {
      const currentPages = prev[activeModalFile.id] ? [...prev[activeModalFile.id]] : [];
      const updatedPages = currentPages.map(page => ({
        ...page,
        keep: page.displayNum >= start && page.displayNum <= end
      }));
      return { ...prev, [activeModalFile.id]: updatedPages };
    });
    setSplitStart('');
    setSplitEnd('');
  };

  const processSingleFile = async (fileId, currentFile) => {
    const updateFile = (updates) => setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updates } : f));
    updateFile({ status: 'processing', progress: 15, statusText: 'Uploading...' });
    
    const explicitPages = pageMaps[fileId] ? pageMaps[fileId].filter(p => p.keep).map(p => p.index).join(',') : '';

    const formData = new FormData();
    formData.append('file', currentFile);
    formData.append('watermark', watermark);
    formData.append('pages_to_keep', explicitPages);
    formData.append('n_up', nUp);
    formData.append('orientation', orientation);
    formData.append('gutter_margin', gutterMargin);
    formData.append('invert_colors', invertColors);
    formData.append('preserve_images', preserveImages);

    const progressInterval = setInterval(() => {
      setFiles(prev => prev.map(f => (f.id === fileId && f.status === 'processing' && f.progress < 85) ? { ...f, progress: f.progress + 1 } : f));
    }, 600);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/process-pdf`, { method: 'POST', body: formData });
      clearInterval(progressInterval);
      if (!response.ok) throw new Error('Server rejected');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl; link.download = invertColors ? `inverted_${currentFile.name}` : `processed_${currentFile.name}`;
      document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(downloadUrl);

      updateFile({ status: 'success', progress: 100, statusText: 'Complete!' });
    } catch (err) {
      clearInterval(progressInterval);
      updateFile({ status: 'error', progress: 0, statusText: 'Failed.' });
    }
  };

  const processMergedFiles = async () => {
    setFiles(prev => prev.map(f => ({ ...f, status: 'processing', progress: 15, statusText: 'Processing...' })));
    
    const formData = new FormData();
    files.forEach(f => formData.append('files', f.file)); 
    formData.append('watermark', watermark);
    formData.append('n_up', nUp);
    formData.append('orientation', orientation);
    formData.append('gutter_margin', gutterMargin);
    formData.append('invert_colors', invertColors);
    formData.append('preserve_images', preserveImages);

    files.forEach(f => {
      const explicitPages = pageMaps[f.id] ? pageMaps[f.id].filter(p => p.keep).map(p => p.index).join(',') : '';
      formData.append('page_maps', explicitPages);
    });

    const progressInterval = setInterval(() => {
      setFiles(prev => prev.map(f => (f.status === 'processing' && f.progress < 85) ? { ...f, progress: f.progress + 1, statusText: 'Compiling layout...' } : f));
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
      setFiles(prev => prev.map(f => ({ ...f, status: 'error', progress: 0, statusText: 'Failed.' })));
    }
  };

  const handleProcessAll = async () => {
    setGameScore(0); 
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
    <div className="w-full max-w-5xl mx-auto mt-8 px-4">
      
      {/* 🟢 TOP AD BANNER PLACEMENT 🟢 */}

{/* Configuration Controls Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Watermark Text</label>
          <input 
            type="text" value={watermark} onChange={(e) => setWatermark(e.target.value)} disabled={isGlobalProcessing}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Layout Optimization</label>
          <select 
            value={nUp} onChange={(e) => setNUp(parseInt(e.target.value))} disabled={isGlobalProcessing}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
          >
            <option value="1">1 Slide per page (Standard)</option>
            <option value="2">2 Slides per A4 Page</option>
            <option value="3">3 Slides per A4 Page (Notes Setup)</option>
            <option value="4">4 Slides per A4 Page</option>
            <option value="6">6 Slides per A4 Page</option>
            <option value="8">8 Slides per A4 Page</option>
            <option value="9">9 Slides per A4 Page</option>
            <option value="12">12 Slides per A4 Page</option>
            <option value="16">16 Slides per A4 Page</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Page Orientation</label>
          <select 
            value={orientation} onChange={(e) => setOrientation(e.target.value)} disabled={isGlobalProcessing || nUp === 1}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all disabled:opacity-50"
          >
            <option value="portrait">Portrait View (Vertical)</option>
            <option value="landscape">Landscape View (Wide)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Spiral Gutter Margin</label>
          <select 
            value={gutterMargin} onChange={(e) => setGutterMargin(e.target.value)} disabled={isGlobalProcessing}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
          >
            <option value="none">No Margin Offset (Standard)</option>
            <option value="left">Left Edge Margin (Single-Sided Print)</option>
            <option value="alternating">Alternating Margins (Double-Sided Print)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color Processing</label>
          <div 
            onClick={() => setInvertColors(!invertColors)}
            className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg cursor-pointer transition-all ${invertColors ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900'}`}
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white select-none">
              {invertColors ? "Dark ➔ Light" : "Original Colors"}
            </span>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${invertColors ? 'border-blue-600' : 'border-gray-400'}`}>
              {invertColors && <div className="w-2 h-2 rounded-full bg-blue-600" />}
            </div>
          </div>
        </div>

        {/* 🟢 NEW DIAGRAM PRESERVATION TOGGLE 🟢 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Diagram Settings</label>
          <div 
            onClick={() => invertColors && setPreserveImages(!preserveImages)}
            className={`w-full flex items-center justify-between px-4 py-2 border rounded-lg transition-all ${!invertColors ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700' : preserveImages ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-pointer' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 cursor-pointer'}`}
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white select-none truncate pr-2">
              Smart Invert (Preserve Images)
            </span>
            <div className={`w-4 h-4 flex-shrink-0 rounded-sm border-2 flex items-center justify-center ${preserveImages ? 'border-blue-600 bg-blue-600' : 'border-gray-400'}`}>
              {preserveImages && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
          </div>
        </div>
      </div>
      
{/* REAL-TIME MINI PREVIEW SECTION */}
<div className="col-span-1 sm:col-span-2 lg:col-span-4 mt-2 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-gray-200 dark:border-slate-800">
  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
    <div className="min-w-0">
      <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-blue-500" />
        Live Print Sheet Preview
      </h4>
      <p className="text-[11px] text-gray-400 mt-0.5">
        Showing arrangement for A4 Page (Current Selection: <span className="font-bold text-blue-500">{nUp}-Up</span>)
      </p>
    </div>

    {/* Dynamic A4 Canvas Wrapper */}
    <div className="flex-shrink-0 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 shadow-md rounded transition-all duration-200 p-2 flex items-center justify-center relative overflow-hidden"
      style={{
        width: orientation === 'landscape' ? '110px' : '78px',
        height: orientation === 'landscape' ? '78px' : '110px',
        // Responsive edge padding rule modifications based on Gutter choices
        paddingLeft: gutterMargin === 'left' || gutterMargin === 'alternating' ? '12px' : '6px'
      }}
    >
      {/* Visual Spiral Binding Holes Gutter Line indicator */}
      {(gutterMargin === 'left' || gutterMargin === 'alternating') && (
        <div className="absolute left-1 top-0 bottom-0 w-1.5 border-r border-dashed border-gray-300 dark:border-slate-800 flex flex-col justify-around py-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-700 mx-auto" />
          ))}
        </div>
      )}

      {/* Grid Layout Solver */}
      <div className="w-full h-full grid gap-1 transition-all duration-200"
        style={{
          gridTemplateColumns: `repeat(${
            nUp === 1 ? 1 : nUp === 2 ? (orientation === 'landscape' ? 2 : 1) : nUp === 3 ? 1 : nUp === 4 ? 2 : nUp === 6 ? (orientation === 'landscape' ? 3 : 2) : nUp === 8 ? (orientation === 'landscape' ? 4 : 2) : nUp === 9 ? 3 : nUp === 12 ? (orientation === 'landscape' ? 4 : 3) : 4
          }, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${
            nUp === 1 ? 1 : nUp === 2 ? (orientation === 'landscape' ? 1 : 2) : nUp === 3 ? 3 : nUp === 4 ? 2 : nUp === 6 ? (orientation === 'landscape' ? 2 : 3) : nUp === 8 ? (orientation === 'landscape' ? 2 : 4) : nUp === 9 ? 3 : nUp === 12 ? (orientation === 'landscape' ? 3 : 4) : 4
          }, minmax(0, 1fr))`
        }}
      >
        {[...Array(nUp)].map((_, idx) => (
          <div key={idx} className="bg-blue-500/20 dark:bg-blue-500/10 border border-blue-500/40 rounded flex items-center justify-center relative">
            <span className="text-[8px] font-black text-blue-500/60">{idx + 1}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
</div>
      {/* Dropzone Boundary Section */}
      {!pdfJsLoaded ? (
        <div className="h-40 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-800/10">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
          <span className="text-sm font-medium text-gray-500">Initializing document workspace...</span>
        </div>
      ) : files.length < 25 && (
        <div {...getRootProps()} className={`h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer mb-6 transition-all ${isGlobalProcessing ? "opacity-50 pointer-events-none" : "border-gray-300 dark:border-gray-700 hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}>
          <input {...getInputProps()} />
          <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
          <p className="font-medium text-gray-700 dark:text-gray-200 text-center">Drag up to 25 PDFs here</p>
        </div>
      )}

      {/* Queue Processing Blocks Container */}
      {hasFiles && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm transition-colors">
          {files.length > 1 && (
            <div className="flex items-center mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50">
              <input 
                type="checkbox" id="mergeToggle" checked={isMerging} onChange={(e) => setIsMerging(e.target.checked)} disabled={isGlobalProcessing || allCompleted}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
              <label htmlFor="mergeToggle" className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex items-center">
                <Layers className="w-4 h-4 mr-2" />Merge all into a single PDF
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
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate"><span className="font-bold mr-2 text-gray-400">{index + 1}.</span>{f.file.name}</span>
                        {pagesData.length > 0 && <span className="text-xs text-gray-400 mt-0.5">Total Pages: {pagesData.length} {excludedCount > 0 && `(${excludedCount} page(s) sliced out)`}</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {f.status === 'idle' && !isGlobalProcessing && (
                        <>
                          <button onClick={() => setActiveModalFile(f)} className="p-1.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => moveFile(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-30"><ChevronUp className="w-5 h-5" /></button>
                          <button onClick={() => moveFile(index, 'down')} disabled={index === files.length - 1} className="p-1 text-gray-400 hover:text-blue-500 disabled:opacity-30"><ChevronDown className="w-5 h-5" /></button>
                          <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1"></div>
                          <button onClick={() => removeFile(f.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
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
          <button onClick={allCompleted ? () => setFiles([]) : handleProcessAll} disabled={isGlobalProcessing || files.length === 0} className="w-full py-3 font-bold rounded-lg transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-md">
            {allCompleted ? 'Clear Queue' : 'Invert & Build Documents'}
          </button>
        </div>
      )}

      {/* GAME OVERLAY CONTAINER */}
      {isGlobalProcessing && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none">
          <div className="w-full max-w-xl bg-slate-900/40 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col items-center backdrop-blur-sm">
            
            <div className="w-full flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-blue-500 animate-bounce" />
                <h3 className="font-extrabold text-slate-200 text-sm tracking-wide uppercase">Exam Rage: Performance Core</h3>
              </div>
              <div className="bg-blue-500/10 text-blue-400 text-xs font-black px-3 py-1 rounded-lg tracking-wider">
                SCORE: {gameScore}
              </div>
            </div>

            <div className="relative border border-slate-800/80 bg-slate-950 rounded-xl overflow-hidden cursor-crosshair shadow-inner w-full">
              <canvas ref={canvasRef} className="block w-full" />
            </div>

            <div className="w-full mt-5 space-y-2">
              <div className="flex justify-between text-[11px] text-slate-400 font-bold px-1 tracking-wide">
                <span>Inverting Document Color Space...</span>
              </div>
              <div className="w-full bg-slate-950 border border-slate-800 rounded-full h-2 p-0.5 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1 rounded-full animate-pulse" style={{ width: '75%' }}></div>
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* FULL-SCREEN WORKSPACE MODAL */}
      {activeModalFile && pageMaps[activeModalFile.id] && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl h-[85vh] bg-white dark:bg-gray-950 rounded-2xl flex flex-col shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in duration-150">
            
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gray-50 dark:bg-gray-900/50">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{activeModalFile.file.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Keeping <span className="font-semibold text-blue-600">{pageMaps[activeModalFile.id].filter(p => p.keep).length}</span> pages · Deleting <span className="font-semibold text-red-500">{pageMaps[activeModalFile.id].filter(p => !p.keep).length}</span> pages
                </p>
              </div>

              <div className="flex items-center space-x-2 bg-white dark:bg-gray-900 p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 self-start md:self-auto">
                <div className="flex items-center space-x-1 text-xs text-gray-500 font-medium pl-1">
                  <Scissors className="w-3.5 h-3.5 text-blue-500" />
                  <span>Slice Chapter:</span>
                </div>
                <input 
                  type="number" placeholder="From" value={splitStart} onChange={(e) => setSplitStart(e.target.value)}
                  className="w-14 px-2 py-1 text-xs text-center border border-gray-300 dark:border-gray-700 bg-transparent rounded text-gray-900 dark:text-white outline-none focus:border-blue-500"
                />
                <input 
                  type="number" placeholder="To" value={splitEnd} onChange={(e) => setSplitEnd(e.target.value)}
                  className="w-14 px-2 py-1 text-xs text-center border border-gray-300 dark:border-gray-700 bg-transparent rounded text-gray-900 dark:text-white outline-none focus:border-blue-500"
                />
                <button onClick={applyRangeSplit} className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors">Keep Range Only</button>
              </div>

              <button onClick={() => setActiveModalFile(null)} className="px-4 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-bold rounded-lg text-sm shadow self-end md:self-auto">Apply Layout & Close</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50 dark:bg-gray-900/20">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {pageMaps[activeModalFile.id].map((page, pIdx) => (
                  <div 
                    key={pIdx} onClick={() => togglePageSelection(activeModalFile.id, pIdx)}
                    className={`group relative border rounded-xl overflow-hidden cursor-pointer bg-white dark:bg-gray-900 select-none shadow-sm transition-all duration-200 hover:scale-102 hover:shadow-md ${page.keep ? 'border-gray-200 dark:border-gray-800 ring-2 ring-transparent hover:ring-blue-500' : 'border-red-300 dark:border-red-900 ring-2 ring-red-500 opacity-60'}`}
                  >
                    <div className="aspect-[3/4] flex items-center justify-center p-2 bg-gray-50 dark:bg-gray-900/50">
                      <img src={page.thumbnail} alt={`Page ${page.displayNum}`} className="max-h-full max-w-full object-contain pointer-events-none" />
                    </div>
                    <div className="p-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Page {page.displayNum}</span>
                      {page.keep ? (
                        <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center group-hover:border-blue-500"><div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-blue-500"></div></div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center"><X className="w-2.5 h-2.5 text-white stroke-[4]" /></div>
                      )}
                    </div>
                    {!page.keep && (
                      <div className="absolute inset-0 bg-red-500/10 backdrop-blur-[0.5px] flex flex-col items-center justify-center pointer-events-none">
                        <div className="bg-red-600 text-white font-black text-xs px-2 py-1 rounded shadow flex items-center space-x-1"><Trash2 className="w-3 h-3" /><span>DELETING</span></div>
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