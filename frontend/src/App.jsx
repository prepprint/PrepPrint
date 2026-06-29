import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeToggle } from './components/ThemeToggle';
import { FileUpload } from './components/FileUpload';
import Compressor from './components/Compressor';
import DocumentScanner from './components/DocumentScanner';
import IdScanner from './components/IdScanner';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';

function Home() {
  return (
    <div className="w-full flex flex-col items-center mt-12">
      {/* Text stays contained and readable */}
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-5xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-white">
          PrepPrint
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 mx-auto">
          The fastest way to invert and watermark your study materials.
        </p>
      </div>
      
      {/* The Real Engine gets full width */}
      <div className="w-full">
        <FileUpload />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200">
        
        {/* 🟢 NEW SCALABLE TOP NAVIGATION BAR 🟢 */}
        <header className="w-full py-4 px-6 border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between shadow-sm">
          {/* Logo / Brand Name */}
          <Link to="/" className="text-2xl font-black tracking-tighter text-blue-600 dark:text-blue-500 hover:opacity-80 transition-opacity">
            PrepPrint
          </Link>
          
         {/* Feature Links (Add new tools here in the future!) */}
          <nav className="hidden sm:flex items-center space-x-6 font-bold text-sm">
            <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              PDF Engine
            </Link>
            <Link to="/compress" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Size Reducer / Compressor
            </Link>
            <Link to="/scan" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
           Scanner & Enhancer
         </Link>
         {/* 🟢 NEW ID BUILDER LINK 🟢 */}
         <Link to="/id-builder" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
           ID Card Builder
         </Link>
          </nav>

          {/* Right Side Controls */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-grow flex flex-col items-center p-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/compress" element={<Compressor />} />
            {/* 🟢 NEW SCANNER ROUTE 🟢 */}
            <Route path="/scan" element={<DocumentScanner />} />
         {/* 🟢 NEW ID BUILDER ROUTE 🟢 */}
         <Route path="/id-builder" element={<IdScanner />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
          </Routes>
        </div>

        {/* GLOBAL FOOTER */}
        <footer className="w-full py-6 border-t border-gray-200 dark:border-slate-800 mt-auto bg-slate-50 dark:bg-slate-950/50">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
            <p>© 2026 PrepPrint.in. All rights reserved.</p>
            <div className="flex space-x-4 font-medium">
              <Link to="/privacy" className="hover:text-blue-500 transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-blue-500 transition-colors">Terms of Service</Link>
              <a href="mailto:support@prepprint.in" className="hover:text-blue-500 transition-colors">Contact</a>
            </div>
          </div>
        </footer>

      </div>
    </Router>
  );
}