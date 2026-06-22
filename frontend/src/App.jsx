import { useState } from 'react';
import './App.css'; 

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setDownloadUrl(null); 
    } else {
      alert('Please select a valid PDF file.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setDownloadUrl(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
      
      const response = await fetch(`${apiUrl}/api/v1/process-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Server failed to process the file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);

    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to process the PDF. Ensure your Python server is running!');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '50px auto', textAlign: 'center' }}>
      <h1>PrepPrint</h1>
      <p>Upload a PDF to invert its colors for ink-saving printing.</p>

      <div style={{ border: '2px dashed #ccc', padding: '40px', margin: '20px 0', borderRadius: '8px' }}>
        <input 
          type="file" 
          accept="application/pdf" 
          onChange={handleFileChange}
          style={{ marginBottom: '20px' }}
        />
        
        <br />

        <button 
          onClick={handleUpload} 
          disabled={!selectedFile || isProcessing}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: selectedFile ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: selectedFile ? 'pointer' : 'not-allowed'
          }}
        >
          {isProcessing ? 'Processing...' : 'Invert PDF'}
        </button>
      </div>

      {downloadUrl && (
        <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#d4edda', borderRadius: '8px' }}>
          <h3>Success!</h3>
          <a 
            href={downloadUrl} 
            download={`inverted_${selectedFile.name}`}
            style={{ fontSize: '18px', color: '#155724', fontWeight: 'bold' }}
          >
            ⬇️ Download Inverted PDF
          </a>
        </div>
      )}
    </div>
  );
}

export default App;