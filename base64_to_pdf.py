import base64

# Read base64 string from file
with open('sample_pdf.txt', 'r') as file:
    base64_string = file.read().strip()

# Decode base64 to binary
pdf_data = base64.b64decode(base64_string)

# Write to PDF file
with open('sample.pdf', 'wb') as pdf_file:
    pdf_file.write(pdf_data)

print("PDF file 'sample.pdf' created successfully!")