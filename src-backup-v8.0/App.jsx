import React, { useState, useEffect, useMemo, useCallback } from "react";

// ════════════════════════════════════════════════════════════════════════════
// 🧠 MOLTY OS ARCHITECTURE — CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  MASTER_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzZG7Ih0wrElS5pQazbsfh5RlRIsR5ShrsTPOOgi9uEDF7dsiXoxKZEmOGAwKgTw/pub?output=csv",
  VERSION: "1.0.0 (Neural Alpha)",
  COMPANY: "Calderys Serbia"
};

// 🔧 ENGINEERING PHYSICS CONSTANTS (Thermal DB)
const THERMAL_DB = {
  "STEEL_SHELL": { name: "Čelični Plašt (S235)", k: 50, maxT: 600, density: 7850, color: "#64748b", type: "casing" },
  "CALDE_CAST_F65": { name: "CALDE® CAST F 65", k: 1.8, maxT: 1600, density: 2450, color: "#94a3b8", type: "dense" },
  "CALDE_CAST_T96": { name: "CALDE® CAST T 96", k: 2.1, maxT: 1700, density: 2650, color: "#cbd5e1", type: "dense" },
  "SILICA_MIX": { name: "SILICA MIX 5", k: 1.4, maxT: 1500, density: 2200, color: "#e2e8f0", type: "dense" },
  "INSULATION_BOARD": { name: "Izolaciona Ploča 1260", k: 0.12, maxT: 1260, density: 300, color: "#fcd34d", type: "insulation" },
  "FIBER_BLANKET": { name: "Keramička Ćebad", k: 0.08, maxT: 1260, density: 128, color: "#fef08a", type: "insulation" },
  "AIR_GAP": { name: "Vazdušni Zazor", k: 0.03, maxT: 1000, density: 1.2, color: "#0f172a", type: "gas" }
};

// ════════════════════════════════════════════════════════════════════════════
// 🧩 SYSTEM MODULES (INTERNAL COMPONENTS)
// ════════════════════════════════════════════════════════════════════════════

/**
 * 1. NEURAL CORE HOOK
 * "Mozak" sistema. Učitava podatke, trenira (analizira) paterne i izbacuje insight-ove.
 */
function useNeuralCore() {
  const [data, setData] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priceIndex, setPriceIndex] = useState({});

  useEffect(() => {
    async function initSystem() {
      try {
        const res = await fetch(CONFIG.MASTER_CSV);
        const text = await res.text();
        const rows = text.split('\n').slice(2); // Skip metadata
        
        const parsed = rows.map((r, i) => {
          const c = r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          if (c.length < 10) return null;
          return {
            id: i,
            client: c[0]?.replace(/"/g, "").trim(),
            date: c[3]?.replace(/"/g, "").trim(),
            mat: c[4]?.replace(/"/g, "").trim(),
            price: parseFloat(c[8]?.replace(/"/g, "").replace(",", ".")) || 0,
            qty: parseFloat(c[6]?.replace(/"/g, "").replace(",", ".")) || 0,
            total: parseFloat(c[10]?.replace(/"/g, "").replace(",", ".")) || 0,
          };
        }).filter(x => x && x.price > 0);

        // --- NEURAL PROCESSING (Pattern Recognition) ---
        const pIndex = {};
        const generatedInsights = [];

        // 1. Learning Prices
        parsed.forEach(p => {
            // Mapiranje imena iz fakture na inženjerske ključeve (Simple Fuzzy Match)
            let engKey = null;
            if(p.mat.includes("F 65")) engKey = "CALDE_CAST_F65";
            if(p.mat.includes("T 96")) engKey = "CALDE_CAST_T96";
            if(p.mat.includes("SILICA")) engKey = "SILICA_MIX";
            if(p.mat.includes("Paper") || p.mat.includes("Ploča")) engKey = "INSULATION_BOARD";

            if(engKey) {
                pIndex[engKey] = p.price; // Keep latest price
            }
        });

        // 2. Anomaly Detection
        const clientSpend = {};
        parsed.forEach(p => {
            if(!clientSpend[p.client]) clientSpend[p.client] = 0;
            clientSpend[p.client] += p.total;
        });
        
        const topClient = Object.entries(clientSpend).sort((a,b)=>b[1]-a[1])[0];
        if(topClient) generatedInsights.push({type: "success", msg: `Dominantan Kupac detektovan: ${topClient[0]} (€${topClient[1].toFixed(0)})`});

        setData(parsed);
        setPriceIndex(pIndex);
        setInsights(generatedInsights);
        setLoading(false);

      } catch (e) { console.error("Neural Core Failure:", e); }
    }
    initSystem();
  }, []);

  return { data, insights, loading, priceIndex };
}

/**
 * 2. ENGINEERING MODULE (Physics & CAD)
 */
const EngineeringModule = ({ priceIndex }) => {
  const [layers, setLayers] = useState([
    { id: 1, type: "CALDE_CAST_F65", d: 150 },
    { id: 2, type: "INSULATION_BOARD", d: 50 },
    { id: 3, type: "STEEL_SHELL", d: 10 }
  ]);
  const [env, setEnv] = useState({ tIn: 1200, tAmb: 25, wind: 2 });

  // PHYSICS SOLVER (Iterative)
  const sim = useMemo(() => {
    let tSurf = env.tAmb + 50;
    let flux = 0;
    let computedLayers = [];
    let totalCost = 0;

    // Iteracija za stabilizaciju temperature plašta
    for(let i=0; i<5; i++) {
        let rTotal = 0;
        let rConv = 1 / (10 + 4 * env.wind); // Konvekcija
        rTotal += rConv;

        computedLayers = layers.map(l => {
            const mat = THERMAL_DB[l.type];
            const r = (l.d / 1000) / mat.k;
            rTotal += r;
            
            // Cost calc
            const costPerTon = priceIndex[l.type] || (l.type === "STEEL_SHELL" ? 1500 : 0); // Fallback cena čelika
            const mass = (l.d/1000) * mat.density / 1000; // tona po m2
            const cost = mass * costPerTon;
            
            return { ...l, ...mat, R: r, cost };
        });

        flux = (env.tIn - env.tAmb) / rTotal;
        
        // Raspodela temperatura
        let currentT = env.tIn;
        computedLayers.forEach(l => {
            l.tStart = currentT;
            const drop = flux * l.R;
            currentT -= drop;
            l.tEnd = currentT;
        });
        tSurf = currentT;
    }
    
    totalCost = computedLayers.reduce((acc, l) => acc + l.cost, 0);

    return { flux, tSurf, layers: computedLayers, totalCost };
  }, [layers, env, priceIndex]);

  return (
    <div style={{display:"flex", gap:20, height:"100%"}}>
      {/* CONTROLS */}
      <div style={{width:300, background:"#1e293b", padding:20, borderRadius:8, display:"flex", flexDirection:"column", gap:15}}>
         <div style={{fontSize:12, color:"#94a3b8", fontWeight:700}}>PROCESNI PARAMETRI</div>
         <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
             <div><label style={{fontSize:10, color:"#cbd5e1"}}>T. Unutra (°C)</label><input type="number" value={env.tIn} onChange={e=>setEnv({...env, tIn:Number(e.target.value)})} style={inputStyle}/></div>
             <div><label style={{fontSize:10, color:"#cbd5e1"}}>T. Ambijent (°C)</label><input type="number" value={env.tAmb} onChange={e=>setEnv({...env, tAmb:Number(e.target.value)})} style={inputStyle}/></div>
         </div>
         
         <div style={{height:1, background:"#334155", margin:"10px 0"}} />
         
         <div style={{fontSize:12, color:"#94a3b8", fontWeight:700}}>KONSTRUKCIJA (Hot → Cold)</div>
         <div style={{flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:8}}>
            {layers.map((l, i) => (
                <div key={l.id} style={{background:"#0f172a", padding:10, borderRadius:4, borderLeft:`3px solid ${THERMAL_DB[l.type].color}`}}>
                    <div style={{fontSize:11, fontWeight:600}}>{THERMAL_DB[l.type].name}</div>
                    <div style={{display:"flex", alignItems:"center", gap:5, marginTop:5}}>
                        <input type="range" min="5" max="500" value={l.d} onChange={e=>{
                            const n = [...layers]; n[i].d = Number(e.target.value); setLayers(n);
                        }} style={{flex:1}} />
                        <span style={{fontSize:11, width:35, textAlign:"right"}}>{l.d}mm</span>
                    </div>
                </div>
            ))}
         </div>
         <button onClick={()=>setLayers([...layers, {id:Date.now(), type:"INSULATION_BOARD", d:25}])} style={btnStyle}>+ Dodaj Sloj</button>
      </div>

      {/* CAD VIEWPORT */}
      <div style={{flex:1, background:"#000", borderRadius:8, position:"relative", overflow:"hidden", border:"1px solid #334155"}}>
         <div style={{position:"absolute", top:15, left:15, fontFamily:"monospace", color:"#f97316", fontSize:12}}>
            AUTOCAD VIEWPORT [SCALE 1:2] <br/>
            FLUX: {sim.flux.toFixed(0)} W/m² | T_SHELL: {sim.tSurf.toFixed(1)}°C
         </div>

         {/* SVG RENDERER */}
         <svg width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
            <defs>
                <pattern id="hatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="10" style={{stroke:"#ffffff", strokeWidth:1, opacity:0.3}} />
                </pattern>
            </defs>
            <g transform="translate(100, 100)">
                {(() => {
                    let x = 0;
                    return sim.layers.map((l, i) => {
                        const width = l.d * 1.5; // Scale
                        const el = (
                            <g key={i}>
                                {/* Block */}
                                <rect x={x} y={0} width={width} height={400} fill={l.color} stroke="#000" />
                                <rect x={x} y={0} width={width} height={400} fill="url(#hatch)" />
                                
                                {/* Dim Line */}
                                <line x1={x} y1={-20} x2={x+width} y2={-20} stroke="#94a3b8" />
                                <text x={x+width/2} y={-25} fill="#94a3b8" fontSize="10" textAnchor="middle">{l.d}</text>
                                
                                {/* Gradient Line */}
                                <line x1={x} y1={400 - (l.tStart/env.tIn)*350} x2={x+width} y2={400 - (l.tEnd/env.tIn)*350} stroke="red" strokeWidth="2" strokeDasharray="4"/>
                                <text x={x} y={400 - (l.tStart/env.tIn)*350 - 5} fill="red" fontSize="10" fontWeight="bold">{l.tStart.toFixed(0)}°</text>
                            </g>
                        );
                        x += width;
                        return el;
                    });
                })()}
            </g>
         </svg>
      </div>

      {/* RESULTS / COST */}
      <div style={{width:220, background:"#1e293b", padding:20, borderRadius:8, borderLeft:"1px solid #334155"}}>
         <div style={{fontSize:11, color:"#94a3b8", marginBottom:5}}>TROŠKOVNIK ZIDA</div>
         <div style={{fontSize:24, fontWeight:700, color:"#22c55e"}}>€{sim.totalCost.toFixed(2)}</div>
         <div style={{fontSize:10, color:"#64748b", marginBottom:20}}>po m² (cene iz Baze)</div>

         <div style={{fontSize:11, color:"#94a3b8", marginBottom:5}}>AI SAFETY CHECK</div>
         <div style={{
             background: sim.tSurf > 60 ? "#450a0a" : "#064e3b", 
             color: sim.tSurf > 60 ? "#fca5a5" : "#6ee7b7",
             padding:10, borderRadius:4, fontSize:12, fontWeight:600
         }}>
             {sim.tSurf > 60 ? "⚠️ OPASNOST! Visoka T." : "✅ BEZBEDNO"}
         </div>
      </div>
    </div>
  );
};

/**
 * 3. GOOGLE PROJECT MODULE (Kanban)
 */
const ProjectModule = () => {
  return (
    <div style={{display:"flex", gap:20, height:"100%", overflowX:"auto"}}>
        {[
            {title: "BACKLOG", color: "#64748b", tasks: ["Analiza peći 3", "Naručivanje ankera"]},
            {title: "IN PROGRESS", color: "#f97316", tasks: ["Sušenje betona (Smederevo)", "Izrada crteža"]},
            {title: "DONE", color: "#22c55e", tasks: ["Isporuka SILICA MIX", "Fakturisanje"]}
        ].map(col => (
            <div key={col.title} style={{minWidth:300, background:"#1e293b", borderRadius:8, padding:15, display:"flex", flexDirection:"column"}}>
                <div style={{borderBottom:`3px solid ${col.color}`, paddingBottom:10, marginBottom:10, fontWeight:700, color:"#cbd5e1"}}>{col.title}</div>
                {col.tasks.map(t => (
                    <div key={t} style={{background:"#0f172a", padding:15, borderRadius:6, marginBottom:10, border:"1px solid #334155", fontSize:13}}>
                        {t}
                        <div style={{marginTop:10, display:"flex", justifyContent:"space-between", fontSize:10, color:"#64748b"}}>
                            <span>Radojka M.</span>
                            <span>Feb 2026</span>
                        </div>
                    </div>
                ))}
                <button style={{marginTop:"auto", width:"100%", padding:8, border:"1px dashed #475569", background:"transparent", color:"#94a3b8", cursor:"pointer"}}>+ Add Task</button>
            </div>
        ))}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 🚀 MAIN APPLICATION SHELL
// ════════════════════════════════════════════════════════════════════════════

function App() {
  const [activeTab, setActiveTab] = useState("eng");
  const { data, insights, loading, priceIndex } = useNeuralCore();

  if (loading) return <div style={{height:"100vh", background:"#0f172a", color:"#f97316", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace"}}>INITIALIZING NEURAL CORE...</div>;

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#0f172a", color: "#f1f5f9", fontFamily: "'Inter', sans-serif" }}>
      
      {/* 1. SIDEBAR */}
      <div style={{ width: 80, borderRight: "1px solid #334155", display:"flex", flexDirection:"column", alignItems:"center", padding:"20px 0" }}>
         <div style={{width:40, height:40, background:"#f97316", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:20, marginBottom:40}}>M</div>
         
         <NavIcon icon="📐" active={activeTab==="eng"} onClick={()=>setActiveTab("eng")} tooltip="Engineering" />
         <NavIcon icon="📅" active={activeTab==="pm"} onClick={()=>setActiveTab("pm")} tooltip="Projects" />
         <NavIcon icon="🧠" active={activeTab==="ai"} onClick={()=>setActiveTab("ai")} tooltip="Neural Data" />
         
         <div style={{marginTop:"auto", fontSize:10, color:"#64748b"}}>v{CONFIG.VERSION}</div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
         {/* Top Bar */}
         <div style={{ height: 60, borderBottom: "1px solid #334155", display:"flex", alignItems:"center", padding:"0 30px", justifyContent:"space-between" }}>
            <div style={{fontWeight:600, fontSize:18}}>
                {activeTab === "eng" && "ENGINEERING WORKBENCH (ASTM C680)"}
                {activeTab === "pm" && "PROJECT MANAGEMENT"}
                {activeTab === "ai" && "NEURAL DATA INSIGHTS"}
            </div>
            <div style={{fontSize:12, color:"#22c55e", display:"flex", alignItems:"center", gap:5}}>
                <div style={{width:8, height:8, background:"#22c55e", borderRadius:"50%"}}/> SYSTEM ONLINE
            </div>
         </div>

         {/* Workspace */}
         <div style={{ flex: 1, padding: 30, overflow:"hidden" }}>
             {activeTab === "eng" && <EngineeringModule priceIndex={priceIndex} />}
             {activeTab === "pm" && <ProjectModule />}
             {activeTab === "ai" && (
                 <div style={{padding:20}}>
                     <h3>System Insights</h3>
                     {insights.map((msg, i) => (
                         <div key={i} style={{background:"#064e3b", padding:15, borderRadius:6, marginBottom:10, borderLeft:"4px solid #34d399"}}>
                             {msg.msg}
                         </div>
                     ))}
                     <div style={{marginTop:20, color:"#94a3b8"}}>
                         Raw Data Rows Processed: {data.length}
                     </div>
                 </div>
             )}
         </div>
      </div>

    </div>
  );
}

// --- STYLES & HELPERS ---
const inputStyle = { width:"100%", background:"#0f172a", border:"1px solid #475569", color:"white", padding:6, borderRadius:4, marginTop:4 };
const btnStyle = { width:"100%", padding:10, background:"#334155", border:"none", borderRadius:4, color:"#cbd5e1", cursor:"pointer", fontSize:12, marginTop:10 };

const NavIcon = ({ icon, active, onClick, tooltip }) => (
    <div onClick={onClick} title={tooltip} style={{
        width: 50, height: 50, borderRadius: 12, display:"flex", alignItems:"center", justifyContent:"center",
        fontSize: 24, cursor:"pointer", marginBottom: 15, transition: "all 0.2s",
        background: active ? "#1e293b" : "transparent",
        color: active ? "#f97316" : "#64748b",
        border: active ? "1px solid #334155" : "none"
    }}>
        {icon}
    </div>
);

export default App;
