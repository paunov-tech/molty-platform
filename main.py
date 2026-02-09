from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List
import uvicorn
import os
import re
import PyPDF2

app = FastAPI(title="MOLTY THERMAL CORE v3")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ⚠️ OVO JE KLJUČNO - Putanja do foldera
# Pokušavamo da nađemo folder gde god da je
CURRENT_DIR = os.getcwd()
PDF_FOLDER = os.path.join(CURRENT_DIR, "tehnicki_listovi")

# ---------------------------------------------------------
# 🧠 NAPREDNI SKENER (KOJI NE ODUSTAJE)
# ---------------------------------------------------------
def scan_local_materials():
    materials = []
    
    # PROVERA FOLDERA
    if not os.path.exists(PDF_FOLDER):
        print(f"❌ GREŠKA: Folder nije pronađen na putanji: {PDF_FOLDER}")
        print("👉 Savet: Proveri da li se folder zove 'tehnicki_listovi' (tačno tako)")
        return []

    print(f"📂 Skeniram folder: {PDF_FOLDER}")
    files = os.listdir(PDF_FOLDER)
    print(f"📄 Pronađeno fajlova: {len(files)}")
    
    for filename in files:
        if filename.lower().endswith(".pdf"):
            # Podrazumevane vrednosti (Fallback)
            mat_name = filename.replace(".pdf", "").replace(".PDF", "").replace("_", " ")
            category = "working"
            lambda_val = 1.5
            density = 2400

            try:
                # Pokušavamo da izvučemo pametne podatke
                file_path = os.path.join(PDF_FOLDER, filename)
                reader = PyPDF2.PdfReader(file_path)
                
                # Čitamo samo prvu stranu da uštedimo vreme
                text = reader.pages[0].extract_text() or "" 
                
                # --- Detekcija Gustine ---
                dens_match = re.search(r"(\d+[.,]\d+)\s*(g/cm3|kg/dm3)", text)
                if dens_match:
                    val = float(dens_match.group(1).replace(",", "."))
                    if val < 10: density = val * 1000
                    else: density = val
                
                # --- Detekcija Kategorije ---
                text_upper = text.upper()
                if density < 1600 or "INSUL" in text_upper or "LIGHT" in text_upper or "IZOL" in text_upper:
                    category = "insulation"
                    lambda_val = 0.2
                elif "GUN" in text_upper or "SPRAY" in text_upper:
                    category = "working"
                    lambda_val = 1.8
                elif "CAST" in text_upper:
                    lambda_val = 1.6

                print(f"✅ Učitan: {mat_name} (L={lambda_val}, D={density})")

            except Exception as e:
                # Ako ne možemo da pročitamo PDF, IPAK GA DODAJEMO u listu!
                print(f"⚠️ Nije pročitana fizika za {filename}, koristim default vrednosti.")
            
            # DODAJ U LISTU BEZ OBZIRA NA SVE
            materials.append({
                "name": mat_name,
                "category": category,
                "density": int(density),
                "lambda_val": round(lambda_val, 2),
                "filename": filename
            })
    
    materials.sort(key=lambda x: x["name"])
    return materials

# Učitaj odmah
CACHED_MATERIALS = []

@app.on_event("startup")
def startup_event():
    global CACHED_MATERIALS
    CACHED_MATERIALS = scan_local_materials()

# ---------------------------------------------------------
# 🔌 API
# ---------------------------------------------------------

@app.get("/api/materials")
def get_materials():
    return CACHED_MATERIALS

class LayerInput(BaseModel):
    type: str
    material: str
    thickness: int
    lambda_val: float

class SimulationRequest(BaseModel):
    target_temp: int
    ambient_temp: int
    layers: List[LayerInput]

@app.post("/api/simulate")
def calculate_heat_transfer(req: SimulationRequest):
    total_resistance = 0
    r_surface_air = 0.1 
    analyzed_layers = []
    
    for layer in req.layers:
        d_m = layer.thickness / 1000.0
        lam = layer.lambda_val if layer.lambda_val > 0 else 1.0
        r_th = d_m / lam
        total_resistance += r_th
        analyzed_layers.append({
            "name": layer.material, "d_mm": layer.thickness, "lambda": lam, "r_val": r_th
        })

    total_resistance += r_surface_air
    delta_t = req.target_temp - req.ambient_temp
    heat_flux = delta_t / total_resistance
    
    current_temp = req.target_temp
    profile = [{"pos": 0, "temp": round(current_temp), "label": "Hot Face"}]
    acc_th = 0

    for layer in analyzed_layers:
        dt = heat_flux * layer["r_val"]
        current_temp -= dt
        acc_th += layer["d_mm"]
        profile.append({"pos": acc_th, "temp": round(current_temp), "label": "Spoj"})

    return {
        "status": "success", "shell_temp": round(current_temp, 1), 
        "heat_flux": round(heat_flux, 2), "profile": profile, "layers_viz": analyzed_layers
    }

@app.get("/", response_class=HTMLResponse)
def read_root():
    try:
        with open("dashboard.html", "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "<h1>Nema dashboard.html</h1>"

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

