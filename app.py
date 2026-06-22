import os
import fitz  # PyMuPDF
from flask import Flask, request, send_file, jsonify
import io
from dotenv import load_dotenv

# Load Environment Variables (Rule: Never hardcode environment links)
load_dotenv()

app = Flask(__name__)

# Environment configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
# In production, this would point to your Render/Vercel URLs. 
# For now, it defaults to port 5000 securely.
PORT = int(os.getenv("PORT", 5000))

# RESTful API Endpoint using POST method (Rule: Client-Server Model & REST APIs)
@app.route('/api/v1/process-pdf', methods=['POST'])
def process_pdf_endpoint():
    # Check if a file was actually sent in the request
    if 'file' not in request.files:
        return jsonify({"error": "No file part provided in the request"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        # Rule: Do NOT store uploaded files in the local filesystem. 
        # We read the file directly into memory.
        pdf_bytes = file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        print(f"Processing document: {file.filename}...")
        
        for page in doc:
            # 1. Standard Dark-to-Light Background Inversion
            page.draw_rect(page.rect, color=(1, 1, 1), fill=(1, 1, 1), overlay=False)
            
            # 2. Add the custom prepprint.in watermark
            rect = fitz.Rect(page.rect.width - 160, page.rect.height - 20, page.rect.width - 10, page.rect.height - 5)
            page.insert_textbox(
                rect, 
                "Optimized by PrepPrint.in", 
                fontsize=8, 
                color=(0.6, 0.6, 0.6),
                align=fitz.TEXT_ALIGN_RIGHT
            )
            
        # Save the polished file back to an in-memory byte stream
        output_stream = io.BytesIO()
        doc.save(output_stream)
        doc.close()
        output_stream.seek(0)
        
        print("Processing complete. Sending file back to client.")
        
        # Send the file back directly without saving it to the hard drive
        return send_file(
            output_stream,
            as_attachment=True,
            download_name=f"PrepPrint_{file.filename}",
            mimetype='application/pdf'
        )

    except Exception as e:
        # Proper error handling and stack trace logging for debugging
        print(f"Server Error during PDF processing: {str(e)}")
        return jsonify({"error": "Internal Server Error during processing"}), 500

if __name__ == '__main__':
    # Starts the server securely using env variables
    print(f"Starting server in {ENVIRONMENT} mode...")
    app.run(host='0.0.0.0', port=PORT, debug=(ENVIRONMENT == "development"))