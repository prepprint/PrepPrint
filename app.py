import os
import fitz  # PyMuPDF
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import io
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv()

app = Flask(__name__)
CORS(app) # Unlocks the browser connection

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
PORT = int(os.getenv("PORT", 5000))

@app.route('/api/v1/process-pdf', methods=['POST'])
def process_pdf_endpoint():
    if 'file' not in request.files:
        return jsonify({"error": "No file part provided in the request"}), 400
    
    file = request.files['file']
    
    # Catch the custom watermark from React, or default to PrepPrint
    custom_watermark = request.form.get('watermark', 'Optimized by PrepPrint.in')
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        pdf_bytes = file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        out_doc = fitz.open() # Create a brand new, empty PDF
        
        print(f"Processing document: {file.filename}...")
        
        for page in doc:
            # 1. Take a high-quality "snapshot" of the page
            zoom_matrix = fitz.Matrix(2, 2) # 2x zoom for crisp text
            pix = page.get_pixmap(matrix=zoom_matrix)
            
            # 2. INVERT THE COLORS
            pix.invert_irect(pix.irect)
            
            # 3. Create a blank page in our new PDF
            new_page = out_doc.new_page(width=page.rect.width, height=page.rect.height)
            
            # 4. Paste the inverted snapshot onto the new page
            new_page.insert_image(page.rect, stream=pix.tobytes())
            
            # 5. Add a highly visible Custom Watermark
            watermark_rect = fitz.Rect(new_page.rect.width - 200, new_page.rect.height - 30, new_page.rect.width - 10, new_page.rect.height - 10)
            new_page.insert_textbox(
                watermark_rect, 
                custom_watermark, 
                fontsize=12, 
                color=(1, 0, 0), # Red color so it's obvious during testing
                align=fitz.TEXT_ALIGN_RIGHT
            )
            
        output_stream = io.BytesIO()
        out_doc.save(output_stream)
        out_doc.close()
        doc.close()
        output_stream.seek(0)
        
        print("Processing complete. Sending file back to client.")
        
        return send_file(
            output_stream,
            as_attachment=True,
            download_name=f"PrepPrint_{file.filename}",
            mimetype='application/pdf'
        )

    except Exception as e:
        print(f"Server Error during PDF processing: {str(e)}")
        return jsonify({"error": "Internal Server Error during processing"}), 500

if __name__ == '__main__':
    print(f"Starting server in {ENVIRONMENT} mode...")
    app.run(host='0.0.0.0', port=PORT, debug=(ENVIRONMENT == "development"))