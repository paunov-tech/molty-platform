from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn
import os
import re
import PyPDF2
import math

app = FastAPI(title="MOLTY ULTIMATE")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MATERIJALI ---
CURRENT_DIR = os.getcwd()
PDF_FOLDER = os.path.join(CURRENT_DIR, "tehnicki_listovi")

def estimate_price(name, density):
    name_upper = name.upper()
    if "INSUL" in name_upper: return 450.0 
    if density > 2800: return 1200.0 
    if "CAST" in name_upper: return 850.0 
    return 600.0 

def scan_local_materials():
    materials = []
    if not os.path.exists(PDF_FOLDER):
        return [
            {"name": "CALDE CAST F 60", "category": "working", "density": 2450, "lambda_val": 1.6, "price": 950},
            {"name": "CALDE INSUL 1000", "category": "insulation", "density": 800, "lambda_val": 0.2, "price": 450}
        ]
    
    for filename in os.listdir(PDF_FOLDER):
        if filename.lower().endswith(".pdf"):
            mat_name = filename.replace(".pdf", "").replace(".PDF", "").replace("_", " ")
            category, lambda_val, density = "working", 1.5, 2400
            try:
                reader = PyPDF2.PdfReader(os.path.join(PDF_FOLDER, filename))
                if len(reader.pages) > 0:
                    text = reader.pages[0].extract_text() or ""
                    dm = re.search(r"(\d+[.,]\d+)\s*(g/cm3|kg/dm3)", text)
                    if dm:
                        val = float(dm.group(1).replace(",", "."))
                        density = val * 1000 if val < 10 else val
                    if density < 1600 or "INSUL" in text.upper():
                        category = "insulation"
                        lambda_val = 0.2
            except: pass
            
            materials.append({
                "name": mat_name, 
                "category": category, 
                "density": int(density), 
                "lambda_val": round(lambda_val, 2),
                "price": estimate_price(mat_name, density)
            })
    materials.sort(key=lambda x: x["name"])
    return materials

CACHED_MATERIALS = scan_local_materials()

# --- MODELI ---
class LayerInput(BaseModel):
    material: str
    thickness: int
    lambda_val: float
    density: float
    price: float 

class SimulationRequest(BaseModel):
    target_temp: int
    ambient_temp: int
    layers: List[LayerInput]
    
    # GEOMETRIJA
    shape: str       # "cylinder", "flat", "cone"...
    dim1: float      # Dužina (mm) ILI Površina (m2) ako je flat
    dim2: float      # Svetli Otvor (mm) - samo za cilindre

@app.get("/api/materials")
def get_materials():
    return CACHED_MATERIALS

@app.post("/api/simulate")
def calculate(req: SimulationRequest):
    # 1. TERMIKA
    total_resistance = 0.1
    analyzed_layers = []
    
    for layer in req.layers:
        d_m = layer.thickness / 1000.0
        lam = layer.lambda_val if layer.lambda_val > 0 else 1.0
        r_th = d_m / lam
        total_resistance += r_th
        analyzed_layers.append(layer.dict())

    delta_t = req.target_temp - req.ambient_temp
    heat_flux = round(delta_t / total_resistance, 2)
    
    curr_t = req.target_temp
    profile = [{"pos": 0, "temp": round(curr_t)}]
    acc_th = 0
    for l in analyzed_layers:
        r_val = (l["thickness"]/1000.0) / (l["lambda_val"] if l["lambda_val"]>0 else 1)
        curr_t -= heat_flux * r_val
        acc_th += l["thickness"]
        profile.append({"pos": acc_th, "temp": round(curr_t)})
    shell_temp = round(curr_t, 1)

    # 2. GEOMETRIJA (RAZLIKOVANJE OBLIKA)
    bill_of_materials = []
    total_weight = 0
    total_cost = 0
    
    # Promenljive za cilindar
    L_m = req.dim1 / 1000.0 # Dužina u metrima
    current_ID_mm = req.dim2 # Svetli otvor u mm
    
    # Promenljiva za Flat
    Flat_Area_m2 = req.dim1 # Ovde dim1 glumim površinu u m2
    
    final_shell_diameter = 0

    for layer in analyzed_layers:
        d_mm = layer["thickness"]
        d_m = d_mm / 1000.0
        
        vol_m3 = 0
        ID_disp = 0
        OD_disp = 0

        if req.shape == "cylinder":
            # CILINDAR (Inside-Out)
            ID_mm = current_ID_mm
            OD_mm = ID_mm + (2 * d_mm)
            
            ID_m = ID_mm / 1000.0
            OD_m = OD_mm / 1000.0
            
            vol_m3 = (math.pi * L_m * (OD_m**2 - ID_m**2)) / 4
            
            ID_disp = ID_mm
            OD_disp = OD_mm
            current_ID_mm = OD_mm # Pomeramo granicu
            final_shell_diameter = OD_mm

        elif req.shape == "flat":
            # RAVNA PLOČA
            vol_m3 = Flat_Area_m2 * d_m
            ID_disp = 0 # Nema prečnika
            OD_disp = 0

        # --- Masa i Cena ---
        weight_kg = vol_m3 * layer["density"]
        cost_eur = (weight_kg / 1000.0) * layer["price"]
        
        total_weight += weight_kg
        total_cost += cost_eur
        
        bill_of_materials.append({
            "name": layer["material"],
            "thickness_mm": d_mm,
            "ID_mm": round(ID_disp, 0) if req.shape == "cylinder" else "-",
            "OD_mm": round(OD_disp, 0) if req.shape == "cylinder" else "-",
            "vol_m3": round(vol_m3, 3),
            "density": layer["density"],
            "weight_kg": round(weight_kg, 1),
            "price_per_ton": layer["price"],
            "total_cost": round(cost_eur, 2)
        })

    return {
        "status": "success",
        "shell_temp": shell_temp,
        "heat_flux": heat_flux,
        "profile": profile,
        "layers_viz": analyzed_layers,
        "geometry": {
            "bill_of_materials": bill_of_materials,
            "total_weight_kg": round(total_weight, 1),
            "total_cost_eur": round(total_cost, 2),
            "req_shell_diameter_mm": round(final_shell_diameter, 1) if req.shape == "cylinder" else 0
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
