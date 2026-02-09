from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import sessionmaker, declarative_base
from google.cloud.sql.connector import Connector, IPTypes
from pydantic import BaseModel
import os
import PyPDF2
import re

# ==============================================================================
# ⚙️ PODEŠAVANJA (SVE JE VEĆ POPUNJENO)
# ==============================================================================
INSTANCE_CONNECTION_NAME = "molty-production:europe-west3:molty-db-v1"
DB_USER = "postgres"
DB_PASS = "M70208037AB2Pula"
DB_NAME = "postgres"
PDF_FOLDER = "tehnicki_listovi" # Folder gde su ti PDF-ovi

# Ključ mora biti u folderu
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "molty-key.json"

# ==============================================================================
# 🔌 KONEKCIJA SA BAZOM
# ==============================================================================
def getconn():
    with Connector() as connector:
        conn = connector.connect(
            INSTANCE_CONNECTION_NAME,
            "pg8000",
            user=DB_USER,
            password=DB_PASS,
            db=DB_NAME,
            ip_type=IPTypes.PUBLIC,
        )
        return conn

engine = create_engine("postgresql+pg8000://", creator=getconn)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Model podataka u bazi
class MaterialDB(Base):
    __tablename__ = "materijali"
    id = Column(Integer, primary_key=True)
    naziv = Column(String)
    kod = Column(String)
    cena = Column(Float)

# ==============================================================================
# 🧠 PDF LOGIKA (UČITAVANJE ZNANJA)
# ==============================================================================
pdf_knowledge = {}

def load_pdf_knowledge():
    if not os.path.exists(PDF_FOLDER):
        print(f"⚠️ UPOZORENJE: Folder '{PDF_FOLDER}' ne postoji!")
        return

    print(f"📂 Skeniram folder: {PDF_FOLDER}...")
    for f in os.listdir(PDF_FOLDER):
        if f.endswith(".pdf"):
            try:
                path = os.path.join(PDF_FOLDER, f)
                reader = PyPDF2.PdfReader(path)
                text = "".join([p.extract_text() for p in reader.pages])
                
                # Izvlačenje Temperature
                temp = 0
                tm = re.search(r"(\d{4})\s*°C", text)
                if tm: temp = int(tm.group(1))

                # Izvlačenje Gustine
                dens = 2400
                dm = re.search(r"(\d+[.,]\d+)\s*(g/cm3|kg/dm3)", text)
                if dm:
                    val = float(dm.group(1).replace(",", "."))
                    dens = val * 1000 if val < 10 else val
                
                # Ključ za pretragu (Uprošćeno ime fajla)
                simple_name = f.upper().replace(".PDF", "").replace(" ", "").replace("-", "")
                pdf_knowledge[simple_name] = {"temp": temp, "dens": dens, "file": f}
            except Exception as e:
                print(f"❌ Greška kod fajla {f}: {e}")

# ==============================================================================
# 🚀 API SERVER
# ==============================================================================
app = FastAPI(title="MOLTY ENTERPRISE API")

# Dozvoljavamo pristup sa Web Sajta (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # U produkciji ovde ide tvoj domen
    allow_methods=["*"],
    allow_headers=["*"],
)

# Šta očekujemo od Frontenda (JSON format)
class Inquiry(BaseModel):
    temp: int
    area: float

@app.on_event("startup")
def startup_event():
    print("🚀 POKREĆEM MOLTY ENGINE...")
    load_pdf_knowledge()
    print(f"✅ Učitano {len(pdf_knowledge)} PDF-ova u memoriju.")

@app.get("/")
def read_root():
    return {"status": "System Online", "db": "Connected", "pdf_engine": "Active"}

@app.post("/api/recommend")
def recommend_material(req: Inquiry):
    # 1. Uzmi cene iz Baze
    db = SessionLocal()
    materials = db.query(MaterialDB).all()
    db.close()
    
    candidates = []
    
    # 2. Spoji Bazu i PDF podatke
    for mat in materials:
        mat_clean = str(mat.naziv).upper().replace(" ", "").replace("-", "").replace("®", "")
        
        # Default vrednosti ako nema PDF-a
        tech_data = {"temp": 1500, "dens": 2400, "file": None}
        
        # Tražimo par u PDF memoriji
        for pdf_key, pdf_val in pdf_knowledge.items():
            if pdf_key in mat_clean or mat_clean in pdf_key:
                tech_data = pdf_val
                break
        
        # 3. Filtriraj i Računaj
        if tech_data["temp"] >= req.temp:
            qty = req.area * 0.15 * (tech_data["dens"]/1000) * 1.05
            total_price = qty * mat.cena
            
            candidates.append({
                "id": mat.id,
                "name": mat.naziv,
                "sap_code": mat.kod,
                "max_temp": tech_data["temp"],
                "price_per_ton": mat.cena,
                "density": tech_data["dens"],
                "total_qty": round(qty, 2),
                "total_price": round(total_price, 2),
                "source_pdf": tech_data["file"]
            })
    
    # Sortiraj najeftinije prvo
    candidates.sort(key=lambda x: x["total_price"])
    
    if not candidates:
        return {"status": "error", "message": "Nema materijala za tu temperaturu."}
        
    return {
        "status": "success", 
        "best_match": candidates[0], 
        "alternatives": candidates[1:5] # Vrati top 5
    }
