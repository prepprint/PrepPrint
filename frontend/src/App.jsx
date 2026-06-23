import { ThemeToggle } from './components/ThemeToggle';
import { FileUpload } from './components/FileUpload';

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      
      {/* Top Navigation Bar area */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Main Content Area */}
      <div className="text-center w-full max-w-2xl">
        <h1 className="text-5xl font-extrabold tracking-tight mb-4">
          PrepPrint
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
          The fastest way to invert and watermark your study materials.
        </p>
        
        {/* The Real Engine */}
        <FileUpload />

      </div>
    </div>
  )
}

export default App;