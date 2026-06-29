import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from './components/ThemeToggle';
import { FileUpload } from './components/FileUpload';
import Compressor from './components/Compressor';
import DocumentScanner from './components/DocumentScanner';
import IdScanner from './components/IdScanner';
import PortraitStudio from './components/PortraitStudio';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import { Home, Minimize2, Crop, LayoutTemplate, Scissors } from 'lucide-react';

function LandingPage() {
  return (
    <div className="w-full flex flex-col items-center mt-12">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-5xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-white">
          PrepPrint
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 mx-auto">
          The fastest way to enhance, compress, and format your study materials.
        </p>
      </div>
      <div className="w-full">
        <FileUpload />
      </div>
    </div>
  );
}

// Custom NavLink component to handle active states automatically
function NavLink({ to, icon: Icon, label }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
        isActive 
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' 
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200">
        
        {/* 🟢 UPGRADED TOP NAVIGATION BAR 🟢 */}
        <header className="w-full border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            
            {/* Logo area */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xl leading-none">P</span>
              </div>
              <span className="font-black text-xl hidden md:block tracking-tight">PrepPrint</span>
            </Link>

            {/* Navigation Links */}
            <nav className="flex items-center gap-1 sm:gap-2">
              <NavLink to="/" icon={Home} label="Smart Note Printer" />
              <NavLink to="/scan" icon={Crop} label="Scanner" />
              <NavLink to="/portrait-studio" icon={Scissors} label="ID Studio" />
              <NavLink to="/id-builder" icon={LayoutTemplate} label="Grid Maker" />
              <NavLink to="/compress" icon={Minimize2} label="Compress" />
            </nav>

            {/* Theme Toggle */}
            <div className="ml-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-grow flex flex-col items-center p-4">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/compress" element={<Compressor />} />
            <Route path="/scan" element={<DocumentScanner />} />
            <Route path="/id-builder" element={<IdScanner />} />
            <Route path="/portrait-studio" element={<PortraitStudio />} />
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