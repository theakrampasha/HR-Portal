from docx import Document
from docx2pdf import convert
import os
from datetime import datetime

TEMPLATE_PATH = "app/offer_templates/offer.docx"

def generate_offer(candidate):

    if not os.path.exists(TEMPLATE_PATH):
        raise Exception("❌ Offer template not uploaded")

    doc = Document(TEMPLATE_PATH)

    # 🔥 REPLACE PLACEHOLDERS
    for para in doc.paragraphs:
        text = para.text

        text = text.replace("{{name}}", candidate.name)
        text = text.replace("{{salary}}", candidate.salary)
        text = text.replace("{{joining_date}}", candidate.joiningDate)
        text = text.replace("{{offer_date}}", datetime.today().strftime("%d-%m-%Y"))
        text = text.replace("{{hr_name}}", "HR Team")

        para.text = text

    os.makedirs("temp", exist_ok=True)

    docx_path = f"temp/{candidate.name}.docx"
    pdf_path = f"temp/{candidate.name}.pdf"

    doc.save(docx_path)

    # Convert DOCX → PDF
    convert(docx_path, pdf_path)

    return pdf_path