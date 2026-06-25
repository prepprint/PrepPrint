import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeToggle } from './components/ThemeToggle';
import { FileUpload } from './components/FileUpload';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';

function Home() {
  return (
    <div className="text-center w-full max-w-2xl mt-12">
      <h1 className="text-5xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-white">
        PrepPrint
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
        The fastest way to invert and watermark your study materials.
      </p>
      
      {/* The Real Engine */}
      <FileUpload />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200">
        
        {/* Top Navigation Bar */}
        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>

        {/* Main Content Area (flex-grow pushes the footer to the bottom) */}
        <div className="flex-grow flex flex-col items-center p-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
          </Routes>
        </div>

        {/* 🟢 GLOBAL FOOTER - Shows on every page 🟢 */}
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