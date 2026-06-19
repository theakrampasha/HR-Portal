from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def generate_offer_letter(name, role, salary, filename="offer_letter.pdf"):
    c = canvas.Canvas(filename, pagesize=letter)

    c.setFont("Helvetica", 12)

    c.drawString(100, 700, f"Dear {name},")
    c.drawString(100, 670, f"We are pleased to offer you the position of {role}.")
    c.drawString(100, 640, f"Your salary will be ₹{salary} per annum.")

    c.drawString(100, 600, "Congratulations and welcome to our company!")

    c.save()

    return filename