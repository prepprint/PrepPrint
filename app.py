import os
import fitz  # PyMuPDF
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import io
import traceback
from dotenv import load_dotenv
from PIL import Image
import google.generativeai as genai
import json
import cv2
import numpy as np

load_dotenv()

app = Flask(__name__)
CORS(app)

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
PORT = int(os.getenv("PORT", 5000))

# Configure Gemini AI
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
generation_config = {
  "temperature": 0.2,
  "response_mime_type": "application/json",
}
model = genai.GenerativeModel("gemini-1.5-flash", generation_config=generation_config)

# Standard A4 Base Dimensions in points
A4_PORTRAIT_W = 595
A4_PORTRAIT_H = 842

PORTRAIT_GRID_MAP = {
    1: (1, 1), 2: (2, 1), 3: (3, 1), 4: (2, 2), 
    6: (3, 2), 8: (4, 2), 9: (3, 3), 12: (4, 3), 16: (4, 4)   
}

def get_grid_layout(n_up, orientation, padding=12, gutter_type='none', is_odd_page=True):
    if orientation == "landscape":
        page_w, page_h = A4_PORTRAIT_H, A4_PORTRAIT_W
        base_rows, base_cols = PORTRAIT_GRID_MAP.get(n_up, (1, 1))
        rows, cols = base_cols, base_rows
    else:
        page_w, page_h = A4_PORTRAIT_W, A4_PORTRAIT_H
        rows, cols = PORTRAIT_GRID_MAP.get(n_up, (1, 1))

    avail_w = page_w
    h_offset = 0
    
    if gutter_type == 'left':
        avail_w, h_offset = page_w - 36, 36
    elif gutter_type == 'alternating':
        avail_w, h_offset = page_w - 36, 36 if is_odd_page else 0

    cell_w = (avail_w - (cols + 1) * padding) / cols
    cell_h = (page_h - (rows + 1) * padding) / rows
    
    rects = []
    for r in range(rows):
        for c in range(cols):
            x0 = h_offset + padding + c * (cell_w + padding)
            y0 = padding + r * (cell_h + padding)
            rects.append(fitz.Rect(x0, y0, x0 + cell_w, y0 + cell_h))
            
    return rects, rows * cols, page_w, page_h

def process_pdf_pages(doc, page_indices, custom_watermark, n_up, orientation, gutter_type, out_doc, do_invert=True, preserve_images=False, current_rect_idx=0, new_page=None):
    if n_up == 1:
        for page_num in page_indices:
            if page_num >= len(doc): continue
            page = doc[page_num]
            w, h = page.rect.width, page.rect.height
            is_odd = (len(out_doc) % 2 == 0)
            
            if gutter_type == 'left':
                target_rect = fitz.Rect(36, 0, w + 36, h)
                new_page = out_doc.new_page(width=w + 36, height=h)
            elif gutter_type == 'alternating':
                target_rect = fitz.Rect(36 if is_odd else 0, 0, w + (36 if is_odd else 0), h)
                new_page = out_doc.new_page(width=w + 36, height=h)
            else:
                target_rect = fitz.Rect(0, 0, w, h)
                new_page = out_doc.new_page(width=w, height=h)
                
            new_page.show_pdf_page(target_rect, doc, page_num)
            
            if do_invert:
                annot = new_page.add_rect_annot(target_rect)
                annot.set_colors(stroke=None, fill=(1, 1, 1))
                annot.update(fill_color=(1, 1, 1), blend_mode=fitz.PDF_BM_Difference)
                
                if preserve_images:
                    for img_info in doc[page_num].get_images():
                        xref = img_info[0]
                        base_image = doc.extract_image(xref)
                        if base_image:
                            image_bytes = base_image["image"]
                            for rect in doc[page_num].get_image_rects(xref):
                                mapped_rect = fitz.Rect(
                                    target_rect.x0 + rect.x0, target_rect.y0 + rect.y0,
                                    target_rect.x0 + rect.x1, target_rect.y0 + rect.y1
                                )
                                new_page.insert_image(mapped_rect, stream=image_bytes)

            if custom_watermark.strip():
                new_page.insert_text((20, h - 20), custom_watermark, fontsize=14, color=(1, 0, 0))
        return 0, None
    else:
        is_odd_sheet = (len(out_doc) % 2 == 0)
        grid_rects, max_per_page, target_w, target_h = get_grid_layout(n_up, orientation, gutter_type=gutter_type, is_odd_page=is_odd_sheet)

        for page_num in page_indices:
            if page_num >= len(doc): continue
            page = doc[page_num]
            
            if new_page is None:
                is_odd_sheet = (len(out_doc) % 2 == 0)
                grid_rects, max_per_page, target_w, target_h = get_grid_layout(n_up, orientation, gutter_type=gutter_type, is_odd_page=is_odd_sheet)
                new_page = out_doc.new_page(width=target_w, height=target_h)
                if custom_watermark.strip():
                    new_page.insert_text((20, target_h - 20), custom_watermark, fontsize=12, color=(1, 0, 0))
                current_rect_idx = 0
                
            target_rect = grid_rects[current_rect_idx]
            new_page.show_pdf_page(target_rect, doc, page_num)
            
            if do_invert:
                annot = new_page.add_rect_annot(target_rect)
                annot.set_colors(stroke=None, fill=(1, 1, 1))
                annot.update(fill_color=(1, 1, 1), blend_mode=fitz.PDF_BM_Difference)
                
                if preserve_images:
                    for img_info in doc[page_num].get_images():
                        xref = img_info[0]
                        base_image = doc.extract_image(xref)
                        if base_image:
                            image_bytes = base_image["image"]
                            for rect in doc[page_num].get_image_rects(xref):
                                scale_x = target_rect.width / page.rect.width
                                scale_y = target_rect.height / page.rect.height
                                mapped_rect = fitz.Rect(
                                    target_rect.x0 + (rect.x0 * scale_x), target_rect.y0 + (rect.y0 * scale_y),
                                    target_rect.x0 + (rect.x1 * scale_x), target_rect.y0 + (rect.y1 * scale_y)
                                )
                                new_page.insert_image(mapped_rect, stream=image_bytes)
            
            current_rect_idx += 1
            if current_rect_idx >= max_per_page:
                current_rect_idx = 0
                new_page = None
                
        return current_rect_idx, new_page

@app.route('/api/v1/process-pdf', methods=['POST'])
def process_pdf_endpoint():
    if 'file' not in request.files: return jsonify({"error": "No file part provided"}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({"error": "No selected file"}), 400

    custom_watermark = request.form.get('watermark', 'Optimized by PrepPrint.in')
    pages_to_keep_str = request.form.get('pages_to_keep', '')
    n_up = int(request.form.get('n_up', 1))
    orientation = request.form.get('orientation', 'portrait')
    gutter_type = request.form.get('gutter_margin', 'none')
    do_invert = request.form.get('invert_colors', 'true') == 'true'
    preserve_images = request.form.get('preserve_images', 'false') == 'true'
    
    try:
        doc = fitz.open(stream=file.read(), filetype="pdf")
        out_doc = fitz.open()
        page_indices = [int(p) for p in pages_to_keep_str.split(',')] if pages_to_keep_str.strip() else list(range(len(doc)))
            
        process_pdf_pages(doc, page_indices, custom_watermark, n_up, orientation, gutter_type, out_doc, do_invert=do_invert, preserve_images=preserve_images)
            
        output_stream = io.BytesIO()
        out_doc.save(output_stream, garbage=4, deflate=True) 
        out_doc.close(); doc.close()
        output_stream.seek(0)
        return send_file(output_stream, as_attachment=True, download_name=f"PrepPrint_{file.filename}", mimetype='application/pdf')
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Internal Server Error"}), 500

@app.route('/api/v1/merge-pdfs', methods=['POST'])
def merge_pdfs_endpoint():
    if 'files' not in request.files: return jsonify({"error": "No files provided"}), 400
    files = request.files.getlist('files')
    if not files or files[0].filename == '': return jsonify({"error": "No selected files"}), 400

    custom_watermark = request.form.get('watermark', 'Optimized by PrepPrint.in')
    page_maps = request.form.getlist('page_maps')
    n_up = int(request.form.get('n_up', 1))
    orientation = request.form.get('orientation', 'portrait')
    gutter_type = request.form.get('gutter_margin', 'none')
    do_invert = request.form.get('invert_colors', 'true') == 'true'
    preserve_images = request.form.get('preserve_images', 'false') == 'true'
    
    try:
        out_doc = fitz.open()
        global_rect_idx, global_active_page = 0, None
        
        for index, file in enumerate(files):
            doc = fitz.open(stream=file.read(), filetype="pdf")
            page_indices = [int(p) for p in page_maps[index].split(',')] if index < len(page_maps) and page_maps[index].strip() else list(range(len(doc)))
            
            global_rect_idx, global_active_page = process_pdf_pages(
                doc, page_indices, custom_watermark, n_up, orientation, gutter_type, out_doc,
                do_invert=do_invert, preserve_images=preserve_images,
                current_rect_idx=global_rect_idx, new_page=global_active_page
            )
            doc.close()
            
        output_stream = io.BytesIO()
        out_doc.save(output_stream, garbage=4, deflate=True)
        out_doc.close()
        output_stream.seek(0)
        return send_file(output_stream, as_attachment=True, download_name="PrepPrint_Merged.pdf", mimetype='application/pdf')
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Internal Server Error during merging"}), 500

@app.route('/api/v1/reduce-size', methods=['POST'])
def reduce_size_endpoint():
    try:
        if 'file' not in request.files: return jsonify({"error": "No file part provided"}), 400
        file = request.files['file']
        
        target_kb = float(request.form.get('target_kb', '150'))
        target_bytes = target_kb * 1024
        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
        output_stream = io.BytesIO()

        if ext == 'pdf':
            doc = fitz.open(stream=file.read(), filetype="pdf")
            doc.save(output_stream, garbage=4, deflate=True)
            doc.close()
            output_stream.seek(0)
            return send_file(output_stream, as_attachment=True, download_name=f"reduced_{file.filename}", mimetype='application/pdf')

        elif ext in ['jpg', 'jpeg', 'png']:
            img = Image.open(file.stream)
            if img.mode in ("RGBA", "P"): img = img.convert("RGB")
            quality = 95
            img.save(output_stream, format="JPEG", quality=quality)
            
            while output_stream.tell() > target_bytes and quality > 10:
                quality -= 5
                output_stream.seek(0); output_stream.truncate()
                img.save(output_stream, format="JPEG", quality=quality)
                
            if output_stream.tell() > target_bytes:
                scale = 0.9
                while output_stream.tell() > target_bytes and scale > 0.3:
                    new_width, new_height = int(img.width * scale), int(img.height * scale)
                    resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    output_stream.seek(0); output_stream.truncate()
                    resized_img.save(output_stream, format="JPEG", quality=quality)
                    scale -= 0.1

            output_stream.seek(0)
            return send_file(output_stream, as_attachment=True, download_name=f"reduced_{file.filename.rsplit('.', 1)[0]}.jpg", mimetype='image/jpeg')
        else:
            return jsonify({"error": f"Unsupported file type: {ext}"}), 400

    except Exception as e:
        return jsonify({"error": f"Backend Error: {str(e)}"}), 500

@app.route('/api/v1/generate-study-materials', methods=['POST'])
def generate_study_materials():
    try:
        file = request.files['file']
        doc = fitz.open(stream=file.read(), filetype="pdf")
        extracted_text = "".join([doc[page_num].get_text() for page_num in range(min(len(doc), 30))])
        doc.close()

        prompt = f"""
        You are an expert academic tutor. Analyze the following textbook chapter/notes and generate study materials.
        You MUST respond with a valid JSON object matching this exact structure:
        {{ "summary": "A high-yield, 3-paragraph summary of the core concepts.",
           "flashcards": [ {{"question": "Specific question?", "answer": "Clear, concise answer."}} ] }}
        Here is the text to analyze: {extracted_text}
        """
        response = model.generate_content(prompt)
        return jsonify(json.loads(response.text))
    except Exception as e:
        return jsonify({"error": f"AI Processing Error: {str(e)}"}), 500


# ==========================================
# 🟢 PREMIUM ENHANCEMENT ENGINE
# ==========================================

def order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

@app.route('/api/v1/scan/detect-corners', methods=['POST'])
def scan_detect_corners():
    try:
        if 'file' not in request.files: return jsonify({"error": "No file provided"}), 400
        file = request.files['file']
        
        file_bytes = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        if image is None:
            return jsonify({"error": "Invalid image"}), 400
        
        orig_h, orig_w = image.shape[:2]
        ratio = orig_h / 500.0
        resized = cv2.resize(image, (int(orig_w / ratio), 500))

        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(gray, 75, 200)

        cnts, _ = cv2.findContours(edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:5]

        screenCnt = None
        for c in cnts:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                screenCnt = approx
                break

        if screenCnt is None:
            corners = [{"x": 10, "y": 10}, {"x": 90, "y": 10}, {"x": 90, "y": 90}, {"x": 10, "y": 90}]
        else:
            screenCnt = (screenCnt.reshape(4, 2) * ratio)
            corners = [
                {"x": min(100, max(0, (pt[0] / orig_w) * 100)), 
                 "y": min(100, max(0, (pt[1] / orig_h) * 100))} 
                for pt in screenCnt
            ]

        return jsonify({"corners": corners})

    except Exception as e:
        return jsonify({"error": f"Corner detection failed: {str(e)}"}), 500

@app.route('/api/v1/scan/process', methods=['POST'])
def scan_process():
    try:
        if 'file' not in request.files: return jsonify({"error": "No file provided"}), 400
        file = request.files['file']
        
        corners_str = request.form.get('corners')
        filter_mode = request.form.get('filter_mode', 'color_enhanced')

        file_bytes = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

        if image is None:
            return jsonify({"error": "Backend could not decode image. Verify format."}), 400
            
        # Smart Downscaler
        MAX_DIMENSION = 1600
        h, w = image.shape[:2]
        if max(h, w) > MAX_DIMENSION:
            scale_factor = MAX_DIMENSION / float(max(h, w))
            image = cv2.resize(image, (int(w * scale_factor), int(h * scale_factor)), interpolation=cv2.INTER_AREA)

        orig_h, orig_w = image.shape[:2]

        if corners_str:
            pts_dict = json.loads(corners_str)
            pts = np.array([[(p['x'] / 100.0) * orig_w, (p['y'] / 100.0) * orig_h] for p in pts_dict], dtype="float32")
            
            rect = order_points(pts)
            (tl, tr, br, bl) = rect
            widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
            widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
            maxWidth = max(int(widthA), int(widthB))
            heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
            heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
            maxHeight = max(int(heightA), int(heightB))

            if maxWidth > 10 and maxHeight > 10:
                dst = np.array([[0, 0], [maxWidth - 1, 0], [maxWidth - 1, maxHeight - 1], [0, maxHeight - 1]], dtype="float32")
                M = cv2.getPerspectiveTransform(rect, dst)
                warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
            else:
                warped = image.copy()
        else:
            warped = image.copy()

        # Skip filters if image is tiny
        if warped.shape[0] < 25 or warped.shape[1] < 25:
            final_img = warped
        else:
            if filter_mode == 'color_enhanced':
                lab = cv2.cvtColor(warped, cv2.COLOR_BGR2LAB)
                l, a, b = cv2.split(lab)
                dilated = cv2.dilate(l, np.ones((7,7), np.uint8))
                bg = cv2.medianBlur(dilated, 21)
                diff = (255 - cv2.absdiff(l, bg)).astype(np.uint8) 
                l_norm = cv2.normalize(diff, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8UC1)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
                l_final = clahe.apply(l_norm)
                merged = cv2.merge((l_final, a, b))
                final_img = cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
                
            elif filter_mode == 'bw':
                gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
                dilated = cv2.dilate(gray, np.ones((7,7), np.uint8))
                bg = cv2.medianBlur(dilated, 21)
                diff = (255 - cv2.absdiff(gray, bg)).astype(np.uint8) 
                final_img = cv2.adaptiveThreshold(diff, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 10)
                
            elif filter_mode == 'print':
                gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
                dilated = cv2.dilate(gray, np.ones((7,7), np.uint8))
                bg = cv2.medianBlur(dilated, 21)
                diff = (255 - cv2.absdiff(gray, bg)).astype(np.uint8) 
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
                final_img = clahe.apply(diff)

            elif filter_mode == 'vibrant':
                hsv = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV)
                h, s, v = cv2.split(hsv)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
                v = clahe.apply(v)
                s = cv2.add(s, 30)
                final_hsv = cv2.merge((h, s, v))
                final_img = cv2.cvtColor(final_hsv, cv2.COLOR_HSV2BGR)
                
            elif filter_mode == 'high_contrast':
                gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
                final_img = cv2.convertScaleAbs(gray, alpha=1.5, beta=-30)

            elif filter_mode == 'ocr':
                gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
                gaussian = cv2.GaussianBlur(gray, (0, 0), 2.0)
                unsharp = cv2.addWeighted(gray, 1.5, gaussian, -0.5, 0)
                _, final_img = cv2.threshold(unsharp, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            else:
                final_img = warped

        is_success, buffer = cv2.imencode(".jpg", final_img, [cv2.IMWRITE_JPEG_QUALITY, 95])
        io_buf = io.BytesIO(buffer)
        io_buf.seek(0)
        
        return send_file(io_buf, mimetype='image/jpeg', as_attachment=True, download_name="Enhanced_Document.jpg")

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# 🟢 PDF BATCH EXPORT & BRANDING 🟢
@app.route('/api/v1/scan/export-pdf', methods=['POST'])
def scan_export_pdf():
    try:
        files = request.files.getlist('files')
        # 🟢 NEW: Listen for the watermark toggle from the frontend
        include_watermark = request.form.get('include_watermark', 'true') == 'true'
        
        if not files: return jsonify({"error": "No files provided"}), 400

        doc = fitz.open()
        A4_W, A4_H = 595.28, 841.89

        for file in files:
            img_bytes = file.read()
            page = doc.new_page(width=A4_W, height=A4_H)
            
            img = Image.open(io.BytesIO(img_bytes))
            img_w, img_h = img.width, img.height
            
            img_ratio = img_w / img_h
            page_ratio = A4_W / A4_H
            
            if img_ratio > page_ratio:
                new_w = A4_W
                new_h = A4_W / img_ratio
            else:
                new_h = A4_H
                new_w = A4_H * img_ratio
                
            x = (A4_W - new_w) / 2
            y = (A4_H - new_h) / 2
            
            page.insert_image(fitz.Rect(x, y, x + new_w, y + new_h), stream=img_bytes)
            
            # 🟢 CONDITIONAL BRANDING 🟢
            if include_watermark:
                branding_text = "Scanned via PrepPrint.in"
                text_length = fitz.get_text_length(branding_text, fontsize=10)
                page.insert_text((A4_W - text_length - 20, A4_H - 15), branding_text, fontsize=10, color=(0.5, 0.5, 0.5))

        output_stream = io.BytesIO()
        doc.save(output_stream, garbage=4, deflate=True)
        doc.close()
        output_stream.seek(0)
        
        # 🟢 EXPLICIT FILENAME BRANDING 🟢
        return send_file(output_stream, mimetype='application/pdf', as_attachment=True, download_name="PrepPrint_Enhanced_Scans.pdf")
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ==========================================
# 🟢 PRO CUTOUT & ID STUDIO ENGINE
# ==========================================
from rembg import remove, new_session

# Load the lightweight model to protect Render's RAM limits
bg_session = new_session("u2netp")

@app.route('/api/v1/studio/remove-bg', methods=['POST'])
def remove_background():
    try:
        if 'file' not in request.files: return jsonify({"error": "No file provided"}), 400
        file = request.files['file']
        
        img_bytes = file.read()
        
        # 🟢 AI Background Removal (Output is always transparent PNG)
        output_bytes = remove(img_bytes, session=bg_session)
        
        return send_file(io.BytesIO(output_bytes), mimetype='image/png')
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/studio/passport-sheet', methods=['POST'])
def generate_passport_sheet():
    try:
        if 'file' not in request.files: return jsonify({"error": "No file provided"}), 400
        file = request.files['file']
        img_bytes = file.read()
        
        doc = fitz.open()
        
        # Standard 4x6 inch photo paper size in points
        PAPER_W, PAPER_H = 288, 432
        # Standard Passport Size: 3.5cm x 4.5cm (approx 99 x 127 points)
        PHOTO_W, PHOTO_H = 99, 127
        
        page = doc.new_page(width=PAPER_W, height=PAPER_H)
        
        # Calculate grid for 6 photos on a 4x6 sheet (2 columns, 3 rows)
        margin_x = (PAPER_W - (2 * PHOTO_W)) / 3
        margin_y = (PAPER_H - (3 * PHOTO_H)) / 4
        
        for row in range(3):
            for col in range(2):
                x0 = margin_x + col * (PHOTO_W + margin_x)
                y0 = margin_y + row * (PHOTO_H + margin_y)
                
                rect = fitz.Rect(x0, y0, x0 + PHOTO_W, y0 + PHOTO_H)
                page.insert_image(rect, stream=img_bytes)
                # Draw a faint cut-line border
                page.draw_rect(rect, color=(0.8, 0.8, 0.8), width=0.5)

        output_stream = io.BytesIO()
        doc.save(output_stream, garbage=4, deflate=True)
        doc.close()
        output_stream.seek(0)
        
        return send_file(output_stream, mimetype='application/pdf', as_attachment=True, download_name="Passport_Print_Sheet_4x6.pdf")
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=(ENVIRONMENT == "development"))