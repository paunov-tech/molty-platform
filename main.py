from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn
import os
import math

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELI ---
class LayerInput(BaseModel):
    material: str
    thickness: int
    lambda_val: float
    density: float
    price: float 

class GeometryReq(BaseModel):
    type: str       # "cylinder" ili "flat"
    dim1: float     # Dužina (m) ILI Površina (m2)
    dim2: float     # Svetli Otvor (mm) - samo za cilindar

class SimReq(BaseModel):
    target_temp: int
    ambient_temp: int
    layers: List[LayerInput]
    geometry: GeometryReq

# --- PRORAČUN ---
@app.post("/api/simulate")
def calc(req: SimReq):
    # 1. TERMIKA (Zajednička za sve)
    total_r = 0.1
    for l in req.layers:
        total_r += (l.thickness/1000.0) / (l.lambda_val if l.lambda_val>0 else 1)
    
    dt = req.target_temp - req.ambient_temp
    flux = round(dt / total_r, 2)
    
    # Profil T
    curr = req.target_temp
    prof = [{"pos":0, "temp":curr}]
    acc = 0
    for l in req.layers:
        r = (l.thickness/1000.0)/(l.lambda_val if l.lambda_val>0 else 1)
        curr -= flux * r
        acc += l.thickness
        prof.append({"pos":acc, "temp":round(curr)})
    
    shell_t = round(curr, 1)

    # 2. GEOMETRIJA (RAZDVOJENA LOGIKA)
    bom = []
    tot_w = 0
    tot_c = 0
    
    # Ako je CILINDAR
    if req.geometry.type == "cylinder":
        L_m = req.geometry.dim1
        curr_ID_mm = req.geometry.dim2 # Svetli otvor
        
        for l in req.layers:
            d_mm = l.thickness
            ID_m = curr_ID_mm / 1000.0
            OD_m = (curr_ID_mm + 2*d_mm) / 1000.0
            
            # Zapremina cevi
            vol = (math.pi * L_m * (OD_m**2 - ID_m**2)) / 4
            w = vol * l.density
            c = (w/1000.0) * l.price
            
            # Površina (unutrašnja)
            area = math.pi * ID_m * L_m
            
            bom.append({
                "name": l.material,
                "th": d_mm,
                "id": round(curr_ID_mm),
                "od": round(curr_ID_mm + 2*d_mm),
                "area": round(area, 2),
                "vol": round(vol, 3),
                "w": round(w, 1),
                "cost": round(c, 2)
            })
            tot_w += w
            tot_c += c
            curr_ID_mm += 2*d_mm

    # Ako je RAVNI ZID (FLAT)
    else:
        Area_m2 = req.geometry.dim1 # Ovo je sada površina
        
        for l in req.layers:
            d_mm = l.thickness
            vol = Area_m2 * (d_mm / 1000.0)
            w = vol * l.density
            c = (w/1000.0) * l.price
            
            bom.append({
                "name": l.material,
                "th": d_mm,
                "id": "-", # Nema prečnika
                "od": "-", 
                "area": Area_m2,
                "vol": round(vol, 3),
                "w": round(w, 1),
                "cost": round(c, 2)
            })
            tot_w += w
            tot_c += c

    return {
        "shell_temp": shell_t,
        "heat_flux": flux,
        "profile": prof,
        "total_weight": round(tot_w, 1),
        "total_cost": round(tot_c, 2),
        "bom": bom,
        "req_shell": bom[-1]["od"] if req.geometry.type == "cylinder" else "-"
    }

# --- SEARCH MATERIJALA ---
@app.get("/api/materials")
def get_mats():
    # Hardkodovano da ne zavisimo od PDF-ova ako puknu
    return [
        {"name":"CALDE CAST F 60", "density":2450, "lambda_val":1.8, "price":950},
        {"name":"CALDE CAST M 50", "density":2200, "lambda_val":1.6, "price":850},
        {"name":"CALDE INSUL 1000", "density":800, "lambda_val":0.2, "price":450},
        {"name":"CALDE CAST S 80", "density":2800, "lambda_val":2.5, "price":1200},
        {"name":"SILICA BRICK", "density":1800, "lambda_val":1.1, "price":600}
    ]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
