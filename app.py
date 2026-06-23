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

# --- ENDPOINT 1: Single File Processing with Page Slicing ---
@app.route('/api/v1/process-pdf', methods=['POST'])
def process_pdf_endpoint():
    if 'file' not in request.files:
        return jsonify({"error": "No file part provided"}), 400
    
    file = request.files['file']
    custom_watermark = request.form.get('watermark', 'Optimized by PrepPrint.in')
    # Catch comma-separated string of 0-indexed page numbers to keep (e.g., "0,1,2,4")
    pages_to_keep_str = request.form.get('pages_to_keep', '')
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        pdf_bytes = file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        out_doc = fitz.open()
        
        # Determine which page indices to process
        if pages_to_keep_str.strip():
            page_indices = [int(p) for p in pages_to_keep_str.split(',') if p.strip().isdigit()]
        else:
            page_indices = list(range(len(doc)))
            
        for page_num in page_indices:
            if page_num >= len(doc):
                continue
            page = doc[page_num]
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


# --- ENDPOINT 2: Multi-File Merging with Page Slicing ---
@app.route('/api/v1/merge-pdfs', methods=['POST'])
def merge_pdfs_endpoint():
    if 'files' not in request.files:
        return jsonify({"error": "No files provided"}), 400
    
    files = request.files.getlist('files')
    custom_watermark = request.form.get('watermark', 'Optimized by PrepPrint.in')
    # Catch an ordered list of page maps matching each file position
    page_maps = request.form.getlist('page_maps')
    
    if not files or files[0].filename == '':
        return jsonify({"error": "No selected files"}), 400

    try:
        out_doc = fitz.open()
        
        for index, file in enumerate(files):
            pdf_bytes = file.read()
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            # Parse specific pages to keep for this specific file index if provided
            if index < len(page_maps) and page_maps[index].strip():
                page_indices = [int(p) for p in page_maps[index].split(',') if p.strip().isdigit()]
            else:
                page_indices = list(range(len(doc)))
            
            for page_num in page_indices:
                if page_num >= len(doc):
                    continue
                page = doc[page_num]
                zoom_matrix = fitz.Matrix(2, 2)
                pix = page.get_pixmap(matrix=zoom_matrix)
                pix.invert_irect(pix.irect)
                
                new_page = out_doc.new_page(width=page.rect.width, height=page.rect.height)
                new_page.insert_image(page.rect, stream=pix.tobytes())
                new_page.insert_text((20, 40), custom_watermark, fontsize=18, color=(1, 0, 0))
                
            doc.close()
            
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