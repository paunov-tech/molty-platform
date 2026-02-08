import { useState } from "react";
import { C, fe } from "../core/theme.js";
import { Card, Input } from "../core/ui.jsx";
import { useMaterials } from "../core/store.js";

export default function Materials({ onAddToQuote }) {
  const materials = useMaterials();
  const [q, setQ] = useState("");
  const [catF, setCatF] = useState("");

  const cats = [...new Set(materials.map(m => m.cat))];
  const filt = materials.filter(m => (!catF || m.cat === catF) && (!q || m.name.toLowerCase().includes(q.toLowerCase())));

  return <>
    <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
      {["", ...cats].map(ct => (
        <button key={ct} onClick={() => setCatF(ct)} style={{padding:"4px 10px",borderRadius:5,border:`1px solid ${catF===ct?C.or:C.brd}`,background:catF===ct?C.or+"18":"transparent",color:catF===ct?C.or:C.txM,fontSize:10,cursor:"pointer"}}>{ct||"Sve"}</button>
      ))}
    </div>
    <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Pretraži materijal..." style={{width:"100%",marginBottom:10}}/>
    <div style={{display:"grid",gap:6}}>
      {filt.sort((a,b) => b.totalEur - a.totalEur).map(m => (
        <Card key={m.code||m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</div>
            <div style={{fontSize:9,color:C.txD}}>{m.code} · {m.cat}{m.tMax?` · ${m.tMax}°C`:""} · {m.sales}× prodato</div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:12,fontWeight:700,color:C.or}}>{fe(m.price)}/{m.unit}</div>
            <div style={{fontSize:9,color:C.txD}}>Σ {fe(m.totalEur)}</div>
          </div>
          {onAddToQuote && <button onClick={() => onAddToQuote(m)} style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${C.or}33`,background:C.or+"0d",color:C.or,fontSize:9,cursor:"pointer",fontWeight:700,flexShrink:0}}>+Ponuda</button>}
        </Card>
      ))}
    </div>
  </>;
}
