import pandas as pd
import os
import PyPDF2
import re

# 👇 👇 👇 TVOJ LINK MORA OVDE 👇 👇 👇
GOOGLE_SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR5MyXuM6b4mgWSfJBl7rxgZnE6D12VIqHRBCRaNf-0p2ZJD-aYzFN9iV-ushE_8DLNXhqyXPnmeJNA/pub?output=csv"
PDF_FOLDER = "tehnicki_listovi"

class MoltyBrain:
    def __init__(self):
        self.prices = {} 
        self.tech = {}   
        
        # Učitaj podatke čim se klasa pokrene
        self.load_prices()
        self.read_pdfs()

    def clean_text(self, text):
        text = str(text).upper()
        for junk in ["2018", "CRH", "CALDE", "CAST", "GUN", "PDF", "MATERIJAL", "®", "_", "-", ".", "TDS"]:
            text = text.replace(junk, " ")
        return set(text.split())

    def load_prices(self):
        if "OVDE_NALEPIS" in GOOGLE_SHEET_CSV: return

        try:
            # Čitanje cena sa Google-a
            df = pd.read_csv(GOOGLE_SHEET_CSV, header=None, on_bad_lines='skip', engine='python')
            for i, row in df.iloc[2:].iterrows():
                try:
                    name = str(row[4])
                    code = str(row[5])
                    p_str = str(row[8]).replace(".", "").replace(",", ".")
                    price = float(p_str) if pd.notnull(row[8]) else 0

                    if price > 0:
                        tokens = self.clean_text(name)
                        # Ključ je originalno ime, vrednost su podaci
                        self.prices[name] = {"price": price, "code": code, "tokens": tokens, "raw_name": name}
                except: continue
        except: pass

    def find_best_price_match(self, pdf_filename):
        pdf_tokens = self.clean_text(pdf_filename)
        best_match = None
        best_score = 0

        for csv_name, data in self.prices.items():
            common = pdf_tokens.intersection(data['tokens'])
            if len(common) > best_score and len(common) >= 2:
                best_score = len(common)
                best_match = data
        return best_match

    def read_pdfs(self):
        if not os.path.exists(PDF_FOLDER): return
        for fname in os.listdir(PDF_FOLDER):
            if fname.endswith(".pdf"):
                self.analyze_pdf(os.path.join(PDF_FOLDER, fname), fname)

    def analyze_pdf(self, path, fname):
        try:
            reader = PyPDF2.PdfReader(path)
            text = "".join([p.extract_text() for p in reader.pages])
            
            # Temperatura
            temp = 0
            tm = re.search(r"(\d{4})\s*°C", text)
            if tm: temp = int(tm.group(1))

            # Gustina
            dens = 2400
            dm = re.search(r"(\d+[.,]\d+)\s*(g/cm3|kg/dm3)", text)
            if dm:
                v = float(dm.group(1).replace(",", "."))
                dens = v * 1000 if v < 10 else v

            # Cena
            match = self.find_best_price_match(fname)
            price_val = match['price'] if match else 0
            code_val = match['code'] if match else "N/A"
            name_val = match['raw_name'] if match else fname.replace(".pdf", "")

            # Čuvanje u memoriju koju Web App čita
            self.tech[fname] = {
                "temp": temp, 
                "dens": dens, 
                "price": price_val, 
                "code": code_val, 
                "name": name_val, 
                "file": fname
            }
        except: pass
