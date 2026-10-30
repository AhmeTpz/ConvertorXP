"""Local acceptance fixtures; requires python-docx, python-pptx, openpyxl, Pillow."""
from pathlib import Path
from docx import Document
from docx.shared import Inches
from pptx import Presentation
from openpyxl import Workbook
from PIL import Image

root = Path('.cxp-stage1/fixtures')
root.mkdir(parents=True, exist_ok=True)
image = Path('tests/fixtures/sample.png').resolve()
doc = Document()
doc.add_heading('ConvertorXP Türkçe belge', 0)
doc.add_paragraph('Çağrı, öğrenci, İstanbul: ığüşöç İĞÜŞÖÇ')
table = doc.add_table(rows=2, cols=2)
table.cell(0,0).text='Ürün';table.cell(0,1).text='Adet'
table.cell(1,0).text='Fotoğraf';table.cell(1,1).text='12'
doc.add_picture(str(image), width=Inches(2))
doc.add_page_break();doc.add_heading('İkinci sayfa', 1)
doc.add_paragraph('Sayfa sonu korunmalı.')
doc.save(root/'Türkçe belge.docx')
slides = Presentation()
for i in range(2):
    slide = slides.slides.add_slide(slides.slide_layouts[1])
    slide.shapes.title.text = f'Slayt {i+1} — Türkçe'
    slide.placeholders[1].text = 'Dönüşüm denemesi: ığüşöç'
slides.save(root/'Türkçe sunum.pptx')
book = Workbook()
for i in range(2):
    sheet = book.active if i == 0 else book.create_sheet()
    sheet.title = f'Sayfa {i+1}'
    sheet.append(['Ürün', 'Adet']);sheet.append(['Fotoğraf',12])
    sheet['D20']='YAZDIRILMAMALI'
    sheet.print_area='A1:B2'
    sheet.page_setup.paperSize=sheet.PAPERSIZE_A4
    sheet.page_setup.fitToWidth=1;sheet.page_setup.fitToHeight=1
book.save(root/'Türkçe tablo.xlsx')
im=Image.open(image).convert('RGB')
exif=Image.Exif();exif[274]=6
im.save(root/'yönlü.jpg',exif=exif)
(root/'bozuk.docx').write_bytes(b'not an Office document')
print(root.resolve())
