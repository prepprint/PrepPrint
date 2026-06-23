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

# Standard A4 Base Dimensions in points
A4_PORTRAIT_W = 595
A4_PORTRAIT_H = 842

# Scalable Row-and-Column configurations for Portrait Mode
PORTRAIT_GRID_MAP = {
    1: (1, 1),
    2: (2, 1),   # 2 rows, 1 col
    3: (3, 1),   # 3 rows, 1 col
    4: (2, 2),   # 2 rows, 2 cols
    6: (3, 2),   # 3 rows, 2 cols
    8: (4, 2),   # 4 rows, 2 cols
    9: (3, 3),   # 3 rows, 3 cols
    12: (4, 3),  # 4 rows, 3 cols
    16: (4, 4)   # 4 rows, 4 cols
}

def get_grid_layout(n_up, orientation, padding=12):
    """Dynamically recalculates page aspect ratios and solves grid canvas coordinates."""
    # Determine canvas bounds based on orientation setting
    if orientation == "landscape":
        page_w = A4_PORTRAIT_H
        page_h = A4_PORTRAIT_W
        base_rows, base_cols = PORTRAIT_GRID_MAP.get(n_up, (1, 1))
        # Flip rows and columns to naturally fit a wider landscape sheet layout!
        rows, cols = base_cols, base_rows
    else:
        page_w = A4_PORTRAIT_W
        page_h = A4_PORTRAIT_H
        rows, cols = PORTRAIT_GRID_MAP.get(n_up, (1, 1))

    # Calculate individual cell geometry dimensions
    cell_w = (page_w - (cols + 1) * padding) / cols
    cell_h = (page_h - (rows + 1) * padding) / rows
    
    rects = []
    for r in range(rows):
        for c in range(cols):
            x0 = padding + c * (cell_w + padding)
            y0 = padding + r * (cell_h + padding)
            x1 = x0 + cell_w
            y1 = y0 + cell_h
            rects.append(fitz.Rect(x0, y0, x1, y1))
            
    return rects, rows * cols, page_w, page_h

def process_pdf_pages(doc, page_indices, custom_watermark, n_up, orientation, out_doc):
    """Processes, inverts, and maps page coordinates cleanly inside orientation bounds."""
    if n_up == 1:
        # Standard full page scaling layout
        for page_num in page_indices:
            if page_num >= len(doc): continue
            page = doc[page_num]
            zoom_matrix = fitz.Matrix(2, 2)
            pix = page.get_pixmap(matrix=zoom_matrix)
            pix.invert_irect(pix.irect)
            
            # Match single page dimension adjustments
            new_page = out_doc.new_page(width=page.rect.width, height=page.rect.height)
            new_page.insert_image(page.rect, stream=pix.tobytes())
            new_page.insert_text((20, 40), custom_watermark, fontsize=18, color=(1, 0, 0))
    else:
        # Resolve target canvas metrics
        grid_rects, max_per_page, target_w, target_h = get_grid_layout(n_up, orientation)
        current_rect_idx = 0
        new_page = None
        
        for page_num in page_indices:
            if page_num >= len(doc): continue
            
            if current_rect_idx == 0:
                new_page = out_doc.new_page(width=target_w, height=target_h)
                
            page = doc[page_num]
            zoom_matrix = fitz.Matrix(2, 2)
            pix = page.get_pixmap(matrix=zoom_matrix)
            pix.invert_irect(pix.irect)
            
            target_rect = grid_rects[current_rect_idx]
            new_page.insert_image(target_rect, stream=pix.tobytes(), keep_proportion=True)
            
            stamp_font = 6 if n_up >= 9 else 10
            new_page.insert_text((target_rect.x0 + 4, target_rect.y0 + 12), custom_watermark, fontsize=stamp_font, color=(1, 0, 0))
            
            current_rect_idx += 1
            if current_rect_idx >= max_per_page:
                current_rect_idx = 0

# --- API ENDPOINTS ---
@app.route('/api/v1/process-pdf', methods=['POST'])
def process_pdf_endpoint():
    if 'file' not in request.files:
        return jsonify({"error": "No file part provided"}), 400
    
    file = request.files['file']
    custom_watermark = request.form.get('watermark', 'Optimized by PrepPrint.in')
    pages_to_keep_str = request.form.get('pages_to_keep', '')
    n_up = int(request.form.get('n_up', 1))
    orientation = request.form.get('orientation', 'portrait') # Catch orientation variable
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        pdf_bytes = file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        out_doc = fitz.open()
        
        if pages_to_keep_str.strip():
            page_indices = [int(p) for p in pages_to_keep_str.split(',') if p.strip().isdigit()]
        else:
            page_indices = list(range(len(doc)))
            
        process_pdf_pages(doc, page_indices, custom_watermark, n_up, orientation, out_doc)
            
        output_stream = io.BytesIO()
        out_doc.save(output_stream)
        out_doc.close()
        doc.close()
        output_stream.seek(0)
        
        return send_file(output_stream, as_attachment=True, download_name=f"PrepPrint_{file.filename}", mimetype='application/pdf')
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": "Internal Server Error"}), 500

@app.route('/api/v1/merge-pdfs', methods=['POST'])
def merge_pdfs_endpoint():
    if 'files' not in request.files:
        return jsonify({"error": "No files provided"}), 400
    
    files = request.files.getlist('files')
    custom_watermark = request.form.get('watermark', 'Optimized by PrepPrint.in')
    page_maps = request.form.getlist('page_maps')
    n_up = int(request.form.get('n_up', 1))
    orientation = request.form.get('orientation', 'portrait') # Catch orientation variable
    
    if not files or files[0].filename == '':
        return jsonify({"error": "No selected files"}), 400

    try:
        out_doc = fitz.open()
        
        for index, file in enumerate(files):
            pdf_bytes = file.read()
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            if index < len(page_maps) and page_maps[index].strip():
                page_indices = [int(p) for p in page_maps[index].split(',') if p.strip().isdigit()]
            else:
                page_indices = list(range(len(doc)))
            
            process_pdf_pages(doc, page_indices, custom_watermark, n_up, orientation, out_doc)
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