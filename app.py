import os
import fitz  # PyMuPDF
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import io
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
PORT = int(os.getenv("PORT", 5000))

# --- ENDPOINT 1: Single File Processing (Your existing code) ---
@app.route('/api/v1/process-pdf', methods=['POST'])
def process_pdf_endpoint():
    if 'file' not in request.files:
        return jsonify({"error": "No file part provided"}), 400
    
    file = request.files['file']
    custom_watermark = request.form.get('watermark', 'Optimized by PrepPrint.in')
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        pdf_bytes = file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        out_doc = fitz.open()
        
        for page in doc:
            zoom_matrix = fitz.Matrix(2, 2)
            pix = page.get_pixmap(matrix=zoom_matrix)
            pix.invert_irect(pix.irect)
            
            new_page = out_doc.new_page(width=page.rect.width, height=page.rect.height)
            new_page.insert_image(page.rect, stream=pix.tobytes())
            
            new_page.insert_text((20, 40), custom_watermark, fontsize=18, color=(1, 0, 0))
            
        output_stream = io.BytesIO()
        out_doc.save(output_stream)
        out_doc.close()
        doc.close()
        output_stream.seek(0)
        
        return send_file(output_stream, as_attachment=True, download_name=f"PrepPrint_{file.filename}", mimetype='application/pdf')
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": "Internal Server Error"}), 500


# --- ENDPOINT 2: Multi-File Merging (The New Feature!) ---
@app.route('/api/v1/merge-pdfs', methods=['POST'])
def merge_pdfs_endpoint():
    if 'files' not in request.files:
        return jsonify({"error": "No files provided"}), 400
    
    # Catch a LIST of files instead of just one
    files = request.files.getlist('files')
    custom_watermark = request.form.get('watermark', 'Optimized by PrepPrint.in')
    
    if not files or files[0].filename == '':
        return jsonify({"error": "No selected files"}), 400

    try:
        out_doc = fitz.open() # Create one master document
        
        for file in files:
            pdf_bytes = file.read()
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            for page in doc:
                zoom_matrix = fitz.Matrix(2, 2)
                pix = page.get_pixmap(matrix=zoom_matrix)
                pix.invert_irect(pix.irect)
                
                new_page = out_doc.new_page(width=page.rect.width, height=page.rect.height)
                new_page.insert_image(page.rect, stream=pix.tobytes())
                new_page.insert_text((20, 40), custom_watermark, fontsize=18, color=(1, 0, 0))
                
            doc.close() # Close individual doc, keep master open
            
        output_stream = io.BytesIO()
        out_doc.save(output_stream)
        out_doc.close()
        output_stream.seek(0)
        
        return send_file(output_stream, as_attachment=True, download_name="PrepPrint_Merged.pdf", mimetype='application/pdf')
    except Exception as e:
        print(f"Merge Error: {str(e)}")
        return jsonify({"error": "Internal Server Error during merging"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=(ENVIRONMENT == "development"))