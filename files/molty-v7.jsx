import { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// MOLTY v7.0 — Calderys Serbia / Volcano Refractory d.o.o.
// Integrisana Poslovna Platforma — REALNI PODACI iz Master Excel-a
// 154 stavki · 86 faktura · 18 kupaca · 81 materijal · 962.027 EUR
// ═══════════════════════════════════════════════════════════════════════════

// ─── DESIGN TOKENS ───
const C = {
  bg:"#08090a", sf:"#111214", card:"#16171b", cardH:"#1c1d22",
  brd:"#25262b", brdL:"#38393f",
  tx:"#f5f5f7", txM:"#9ca3af", txD:"#6b7280",
  or:"#f97316", orL:"#fb923c", orD:"#c2410c",
  bl:"#3b82f6", gr:"#22c55e", rd:"#ef4444", pu:"#a78bfa",
  yl:"#eab308", cy:"#06b6d4",
};

// ─── REAL DATA: 18 CUSTOMERS from Master Excel ───
const CUSTOMERS = [
  { id:1, name:"ArcelorMittal Zenica", co:"BA", fl:"🇧🇦", city:"Zenica", ind:"Čelik", gr:"A", inv:21, itm:43, rev:350638, per:"2021-2024", st:"active", last:"2024-12-15", idle:55, lat:44.20, lng:17.91, mats:["Brick ERSPIN 8003","Brick ERMAG 6024","FC Brick A43","CALDE FLOW G UC 70S20","IF Brick PORIT10","CALDE TROWEL HQ 82 U","CALDE CAST MW STRONG LITE","CALDE CAST HYMOR 2800"] },
  { id:2, name:"HBIS Group Serbia", co:"RS", fl:"🇷🇸", city:"Smederevo", ind:"Čelik", gr:"A", inv:3, itm:4, rev:145513, per:"2024-2026", st:"active", last:"2026-01-20", idle:19, lat:44.66, lng:20.93, mats:["CALDER GUN SUPERAL X 70","CALDE GUN SUPERAL X 70","CALDE PATCH PB 82 U"] },
  { id:3, name:"Progress AD", co:"BG", fl:"🇧🇬", city:"Plovdiv", ind:"Čelik", gr:"A", inv:12, itm:12, rev:91154, per:"2022-2024", st:"active", last:"2024-09-10", idle:151, lat:42.15, lng:24.75, mats:["SILICA MIX 7 A 0,6","SILICA MIX 5 A 0,8","CALDE SILICA MIX 5 A 0,6"] },
  { id:4, name:"Moravacem", co:"RS", fl:"🇷🇸", city:"Popovac", ind:"Cement", gr:"B", inv:5, itm:15, rev:72240, per:"2021-2024", st:"active", last:"2024-01-31", idle:373, lat:43.85, lng:21.40, mats:["CALDE GUN MW STRONG LITE","CALDE CAST XL 106 C/G","CALDE GUN MM 55 S5","CALDE SOL CAST A 50 SZ","CALDE CAST LW Mix"] },
  { id:5, name:"Cimos d.d.", co:"SI", fl:"🇸🇮", city:"Koper", ind:"Livnica", gr:"A", inv:10, itm:18, rev:66992, per:"2021-2023", st:"dormant", last:"2023-10-19", idle:477, lat:45.54, lng:13.73, mats:["CALDE MIX SA 68 S MD","CALDE CAST T 96","CALDE MIX SA 68 S"] },
  { id:6, name:"Autoflex Livnica Čoka", co:"RS", fl:"🇷🇸", city:"Čoka", ind:"Livnica", gr:"B", inv:4, itm:10, rev:59790, per:"2023-2024", st:"active", last:"2024-11-20", idle:80, lat:45.94, lng:20.14, mats:["CALDE CAST F 65","CALDE CAST LX 58","CALDE CAST T 96"] },
  { id:7, name:"Bamex Metal BG", co:"BG", fl:"🇧🇬", city:"Plovdiv", ind:"Livnica", gr:"B", inv:4, itm:4, rev:33631, per:"2022-2023", st:"dormant", last:"2023-09-27", idle:499, lat:42.14, lng:24.74, mats:["SILICA MIX 5 A 0,8","SILICA MIX 5 A 0,6"] },
  { id:8, name:"OSSAM AD", co:"BG", fl:"🇧🇬", city:"Lovech", ind:"Čelik", gr:"B", inv:4, itm:9, rev:29997, per:"2022-2024", st:"active", last:"2024-01-15", idle:389, lat:43.14, lng:24.72, mats:["CALDE SILICA MIX 5 A 0,6","CALDE CAST HYMOR 80 Al"] },
  { id:9, name:"Bamex Metal BG Ltd", co:"BG", fl:"🇧🇬", city:"Plovdiv", ind:"Čelik", gr:"B", inv:4, itm:4, rev:28405, per:"2022-2024", st:"active", last:"2024-05-15", idle:269, lat:42.15, lng:24.75, mats:["SILICA MIX 5 A 0,6"] },
  { id:10, name:"Valjaonica Bakra Sevojno", co:"RS", fl:"🇷🇸", city:"Sevojno", ind:"Bakar", gr:"B", inv:2, itm:5, rev:26723, per:"2023-2023", st:"dormant", last:"2023-06-15", idle:603, lat:43.84, lng:19.88, mats:["CALDE CAST HYMOR 2800","CALDE TROWEL HQ 82 U"] },
  { id:11, name:"Livarna Gorica d.o.o.", co:"SI", fl:"🇸🇮", city:"Nova Gorica", ind:"Livnica", gr:"B", inv:2, itm:6, rev:21132, per:"2023-2023", st:"dormant", last:"2023-04-20", idle:659, lat:45.96, lng:13.64, mats:["CALDE CAST F 65","CALDE CAST LX 58"] },
  { id:12, name:"Berg Montana Fittings", co:"BG", fl:"🇧🇬", city:"Montana", ind:"Livnica", gr:"C", inv:5, itm:10, rev:12987, per:"2023-2024", st:"active", last:"2024-06-10", idle:243, lat:43.41, lng:23.23, mats:["CALDE CAST T 96","CALDE CAST HR 70 BFS"] },
  { id:13, name:"LAFARGE BFC", co:"RS", fl:"🇷🇸", city:"Beočin", ind:"Cement", gr:"C", inv:2, itm:2, rev:10810, per:"2019-2019", st:"dormant", last:"2019-09-12", idle:2340, lat:45.19, lng:19.72, mats:["Installation services"] },
  { id:14, name:"Livar d.d.", co:"SI", fl:"🇸🇮", city:"Ivančna Gorica", ind:"Livnica", gr:"C", inv:1, itm:1, rev:3229, per:"2024-2024", st:"active", last:"2024-03-10", idle:335, lat:45.94, lng:14.80, mats:["CALDE SILICA MIX 5 A 0,6"] },
  { id:15, name:"Valji d.o.o.", co:"SI", fl:"🇸🇮", city:"Štore", ind:"Čelik", gr:"C", inv:1, itm:2, rev:3008, per:"2026-2026", st:"active", last:"2026-01-30", idle:9, lat:46.22, lng:15.31, mats:["CALDE SILICA MIX 5 A 0,6"] },
  { id:16, name:"Cranfield Foundry", co:"MK", fl:"🇲🇰", city:"Skoplje", ind:"Livnica", gr:"C", inv:2, itm:2, rev:2678, per:"2020-2020", st:"dormant", last:"2020-08-15", idle:1998, lat:41.99, lng:21.43, mats:["CALDE FLOW G UC 60S20"] },
  { id:17, name:"Ferro Preis d.o.o.", co:"HR", fl:"🇭🇷", city:"Zagreb", ind:"Livnica", gr:"C", inv:3, itm:6, rev:2422, per:"2024-2024", st:"active", last:"2024-07-05", idle:218, lat:45.81, lng:15.98, mats:["CALDE MIX SA 68 S"] },
  { id:18, name:"MIV Varaždin", co:"HR", fl:"🇭🇷", city:"Varaždin", ind:"Livnica", gr:"C", inv:1, itm:1, rev:677, per:"2026-2026", st:"active", last:"2026-01-28", idle:11, lat:46.30, lng:16.34, mats:["CALDE CAST T 96"] },
];

const REVENUE_YEARS = [
  { y:"2019", v:10810 },{ y:"2020", v:2678 },{ y:"2021", v:125783 },
  { y:"2022", v:339401 },{ y:"2023", v:224049 },{ y:"2024", v:166694 },{ y:"2026", v:92611 },
];

const MATERIALS = [
  { n:"CALDER GUN SUPERAL X 70", c:"1007066", u:"TO", p:1852.63, s:3, t:133038, cat:"Gunning" },
  { n:"SILICA MIX 5 A 0,6", c:"1003642", u:"TO", p:422.68, s:15, t:109728, cat:"Silica" },
  { n:"Brick ERSPIN 8003 Ty.30/0", c:"2018121", u:"TO", p:2271.60, s:3, t:108125, cat:"Brick" },
  { n:"Brick ERMAG 6024 Ty.30/0", c:"2018120", u:"TO", p:3164.10, s:3, t:71249, cat:"Brick" },
  { n:"SILICA MIX 7 A 0,6", c:"1002349", u:"TO", p:335.00, s:4, t:27778, cat:"Silica" },
  { n:"CALDE PATCH PB 82 U", c:"1012745", u:"TO", p:2479.00, s:3, t:24790, cat:"Patching" },
  { n:"CALDE GUN MM 55 S5", c:"1012341", u:"TO", p:1158.00, s:2, t:24300, cat:"Gunning" },
  { n:"SILICA MIX 5 A 0,8", c:"1003490", u:"TO", p:372.00, s:6, t:23957, cat:"Silica" },
  { n:"CALDE MIX SA 68 S MD", c:"1016432", u:"TO", p:1597.00, s:5, t:21402, cat:"Ramming" },
  { n:"CALDE CAST F 65", c:"1006877", u:"TO", p:1450.00, s:3, t:20444, cat:"Castable" },
  { n:"CALDE CAST T 96", c:"1006078", u:"TO", p:2894.85, s:6, t:19533, cat:"Castable" },
  { n:"CALDE CAST LX 58", c:"1006544", u:"TO", p:1569.00, s:1, t:18075, cat:"Castable" },
  { n:"CALDE CAST HYMOR 2800", c:"1006506", u:"TO", p:830.00, s:3, t:16766, cat:"Castable" },
  { n:"Glass textile 600 V4A-1P", c:"4028488", u:"M2", p:13.90, s:1, t:16680, cat:"Auxiliary" },
  { n:"FC Brick A43 Ty.29914_SCM-0", c:"4029231", u:"TO", p:745.00, s:3, t:16207, cat:"Brick" },
  { n:"CALDE CAST XL 106 C/G", c:"1006601", u:"TO", p:875.00, s:2, t:14875, cat:"Castable" },
  { n:"IF-Brick 26/N2 250x124x64", c:"4000202", u:"PC", p:2.60, s:1, t:13000, cat:"Brick" },
  { n:"CALDE CAST MW STRONG LITE", c:"1006602", u:"TO", p:710.00, s:1, t:11360, cat:"Castable" },
  { n:"CALDE GUN MW STRONG LITE", c:"1006629", u:"TO", p:666.00, s:3, t:10910, cat:"Gunning" },
  { n:"IF Brick PORIT10 390x123x65mm", c:"4023841", u:"PC", p:4.84, s:2, t:10427, cat:"Brick" },
  { n:"FC Brick A43 Ty.29915_SCM-0", c:"4029232", u:"TO", p:745.00, s:3, t:8113, cat:"Brick" },
  { n:"FC Brick A43 Ty.29916_SCM-0", c:"4029233", u:"TO", p:745.00, s:3, t:12516, cat:"Brick" },
  { n:"FC Brick A43 Ty.29913_SCM-0", c:"4029230", u:"TO", p:745.00, s:2, t:4944, cat:"Brick" },
  { n:"CALDE FLOW G UC 70S20", c:"1007111", u:"TO", p:1339.00, s:3, t:7816, cat:"Flow Control" },
  { n:"CALDE TROWEL HQ 82 U", c:"1005607", u:"TO", p:1090.00, s:3, t:5450, cat:"Trowelling" },
  { n:"CALDE SOL CAST A 50 SZ", c:"1014122", u:"TO", p:1150.00, s:1, t:6900, cat:"Castable" },
  { n:"CALDE CAST LW Mix 115", c:"1006553", u:"TO", p:625.00, s:2, t:5625, cat:"Castable" },
  { n:"CALDE CAST HR 70 BFS", c:"1006520", u:"TO", p:920.00, s:2, t:3680, cat:"Castable" },
  { n:"CF-VF N-Joint", c:"4029700", u:"PC", p:65.00, s:1, t:2080, cat:"Auxiliary" },
  { n:"FC Brick A30 Ty.26766", c:"4027952", u:"PC", p:22.50, s:1, t:3150, cat:"Brick" },
];

const PIPELINE = [
  { id:1, cust:"HBIS Group Serbia", deal:"BOF Relining Q2 2026", val:85000, stage:"negotiation", prob:70, note:"Tender aktivan. Kineski dobavljači nude niže cene — kvalitet je naš argument." },
  { id:2, cust:"ArcelorMittal Zenica", deal:"EAF Hearth Repair 2026", val:65000, stage:"proposal", prob:60, note:"Čekamo tehničku specifikaciju od maintenance tima." },
  { id:3, cust:"Moravacem", deal:"Rotary Kiln — SOL CAST + GUN", val:45000, stage:"proposal", prob:55, note:"Ponuda poslata 01/2024, follow-up potreban." },
  { id:4, cust:"Progress AD", deal:"IF Reline Plovdiv", val:35000, stage:"qualified", prob:50, note:"Uspavan 5+ meseci — hitna reaktivacija!" },
  { id:5, cust:"Cimos d.d.", deal:"Annual Supply 2026", val:30000, stage:"qualified", prob:40, note:"Uspavan od 10/2023. MIX SA 68 S + CAST T 96." },
  { id:6, cust:"Autoflex Čoka", deal:"IF Lining CAST F 65", val:25000, stage:"negotiation", prob:75, note:"Redovan kupac, CAST F 65 + CAST LX 58 combo." },
];

const ACTIONS = [
  { id:1, pri:"HITNO", act:"Reaktivacija Cimos — 477 dana bez narudžbe", who:"MP", dl:"15.02.2026", st:"pending" },
  { id:2, pri:"HITNO", act:"Reaktivacija Progress AD — 151 dana idle", who:"MP", dl:"15.02.2026", st:"pending" },
  { id:3, pri:"HITNO", act:"HBIS BOF tender — tehnička ponuda", who:"MP+RM", dl:"28.02.2026", st:"in_progress" },
  { id:4, pri:"VISOK", act:"AMZ EAF Hearth — specifikacija", who:"MP", dl:"01.03.2026", st:"pending" },
  { id:5, pri:"VISOK", act:"Moravacem — follow-up SOL CAST ponuda", who:"RM", dl:"20.02.2026", st:"pending" },
  { id:6, pri:"VISOK", act:"Bamex Metal BG — reaktivacija (499 dana!)", who:"MP", dl:"28.02.2026", st:"pending" },
  { id:7, pri:"SREDNJI", act:"Valjaonica Sevojno — reaktivacija (603 dana)", who:"MP", dl:"01.03.2026", st:"pending" },
  { id:8, pri:"SREDNJI", act:"Berg Montana — ponuda za Q2", who:"RM", dl:"15.03.2026", st:"pending" },
  { id:9, pri:"SREDNJI", act:"Livarna Gorica — nova IF lining ponuda", who:"MP", dl:"15.03.2026", st:"pending" },
  { id:10, pri:"NISKO", act:"LAFARGE BFC — istražiti (2340 dana!)", who:"MP", dl:"31.03.2026", st:"pending" },
  { id:11, pri:"NISKO", act:"Cranfield Foundry — status (1998 dana)", who:"RM", dl:"31.03.2026", st:"pending" },
  { id:12, pri:"NISKO", act:"Proširiti TDS bazu na 40+ materijala", who:"MP", dl:"30.04.2026", st:"in_progress" },
];

// ─── FORMATTERS ───
const fm = n => n?.toLocaleString("de-DE",{maximumFractionDigits:0}) ?? "0";
const fe = n => `€${fm(n)}`;

const grC = { A:C.or, B:C.bl, C:C.txD };
const stC = { active:C.gr, dormant:C.rd, new:C.cy };
const sgC = { qualified:C.yl, proposal:C.bl, negotiation:C.or, won:C.gr };
const prC = { HITNO:C.rd, VISOK:C.or, SREDNJI:C.yl, NISKO:C.txD };
const stL = { pending:"⏳ Čeka", in_progress:"🔄 U toku", done:"✅ Gotovo" };

// ─── COMPONENTS ───
const Bd = ({color,children,sm}) => <span style={{display:"inline-block",padding:sm?"1px 6px":"2px 10px",borderRadius:4,fontSize:sm?9:10,fontWeight:700,letterSpacing:.5,background:color+"18",color,border:`1px solid ${color}33`,whiteSpace:"nowrap"}}>{children}</span>;

const Cd = ({children,style,onClick}) => {
  const [h,setH] = useState(false);
  return <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{background:h&&onClick?C.cardH:C.card,border:`1px solid ${h&&onClick?C.or+"44":C.brd}`,borderRadius:10,padding:16,cursor:onClick?"pointer":"default",transition:"all .15s",...style}}>
    {children}
  </div>;
};

const Stat = ({label,value,sub,color=C.or,icon}) => (
  <Cd style={{flex:1,minWidth:130}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>
        <div style={{fontSize:9,color:C.txD,letterSpacing:1.2,fontWeight:700,marginBottom:5,textTransform:"uppercase",fontFamily:"'SF Mono',monospace"}}>{label}</div>
        <div style={{fontSize:24,fontWeight:800,color,letterSpacing:-.5,lineHeight:1}}>{value}</div>
        {sub&&<div style={{fontSize:10,color:C.txM,marginTop:4}}>{sub}</div>}
      </div>
      {icon&&<span style={{fontSize:20,opacity:.4}}>{icon}</span>}
    </div>
  </Cd>
);

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [selC, setSelC] = useState(null);
  const [q, setQ] = useState("");
  const [qItems, setQItems] = useState([]);
  const [qCust, setQCust] = useState("");
  const [catF, setCatF] = useState("");

  const totRev = CUSTOMERS.reduce((s,c)=>s+c.rev,0);
  const totInv = CUSTOMERS.reduce((s,c)=>s+c.inv,0);
  const actN = CUSTOMERS.filter(c=>c.st==="active").length;
  const dorN = CUSTOMERS.filter(c=>c.st==="dormant").length;
  const alerts = useMemo(()=>CUSTOMERS.filter(c=>c.idle>90).sort((a,b)=>b.idle-a.idle),[]);
  const pipTot = PIPELINE.reduce((s,p)=>s+p.val,0);
  const pipW = PIPELINE.reduce((s,p)=>s+p.val*p.prob/100,0);
  const maxR = Math.max(...REVENUE_YEARS.map(r=>r.v));

  const coStats = useMemo(()=>{
    const m={};
    CUSTOMERS.forEach(c=>{
      if(!m[c.co])m[c.co]={fl:c.fl,n:0,r:0};
      m[c.co].n++; m[c.co].r+=c.rev;
    });
    return Object.entries(m).sort((a,b)=>b[1].r-a[1].r);
  },[]);

  const filtC = CUSTOMERS.filter(c=>!q||c.name.toLowerCase().includes(q.toLowerCase())||c.city.toLowerCase().includes(q.toLowerCase())||c.ind.toLowerCase().includes(q.toLowerCase()));
  const filtM = MATERIALS.filter(m=>(!catF||m.cat===catF)&&(!q||m.n.toLowerCase().includes(q.toLowerCase())));
  const cats = [...new Set(MATERIALS.map(m=>m.cat))];

  const addQ = m => { if(!qItems.find(x=>x.c===m.c)) setQItems([...qItems,{...m,qty:1}]); };

  const tabs = [
    {id:"dashboard",lb:"Dashboard",ic:"📊"},
    {id:"customers",lb:`Kupci (${CUSTOMERS.length})`,ic:"🏭"},
    {id:"materials",lb:`Materijali (${MATERIALS.length})`,ic:"🧱"},
    {id:"pipeline",lb:`Pipeline (${PIPELINE.length})`,ic:"💰"},
    {id:"quotes",lb:"Ponude",ic:"📄"},
    {id:"actions",lb:`Akcije (${ACTIONS.filter(a=>a.st!=="done").length})`,ic:"🎯"},
    {id:"alerts",lb:`Alarmi (${alerts.length})`,ic:"🔔"},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.tx,fontFamily:"'Segoe UI','SF Pro Display',system-ui,-apple-system,sans-serif"}}>

      {/* HEADER */}
      <header style={{background:"linear-gradient(135deg,#0c0c0e,#1a1308)",borderBottom:`1px solid ${C.brd}`,padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(16px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:8,background:`linear-gradient(135deg,${C.or},${C.orD})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:15,color:"#fff",boxShadow:`0 2px 12px ${C.or}44`}}>M</div>
          <div>
            <div style={{fontSize:15,fontWeight:800,letterSpacing:-.3}}>MOLTY <span style={{color:C.or}}>v7</span></div>
            <div style={{fontSize:8,color:C.txD,letterSpacing:1.5,textTransform:"uppercase"}}>Calderys Serbia · Volcano Refractory</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <Bd color={C.gr}>LIVE</Bd>
          <span style={{fontSize:9,color:C.txD,fontFamily:"monospace"}}>08.02.2026</span>
        </div>
      </header>

      {/* NAV TABS */}
      <nav style={{display:"flex",gap:3,padding:"6px 12px",overflowX:"auto",background:C.sf,borderBottom:`1px solid ${C.brd}`,WebkitOverflowScrolling:"touch"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setSelC(null);setQ("");setCatF("")}}
            style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:6,border:tab===t.id?`1px solid ${C.or}33`:"1px solid transparent",cursor:"pointer",fontSize:11,fontWeight:tab===t.id?700:500,whiteSpace:"nowrap",background:tab===t.id?C.or+"15":"transparent",color:tab===t.id?C.or:C.txM,transition:"all .15s",flexShrink:0}}>
            <span style={{fontSize:13}}>{t.ic}</span>{t.lb}
          </button>
        ))}
      </nav>

      {/* CONTENT */}
      <main style={{padding:"14px 16px",maxWidth:1200,margin:"0 auto"}}>

        {/* ═══ DASHBOARD ═══ */}
        {tab==="dashboard"&&<>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
            <Stat label="UKUPAN PRIHOD" value={fe(totRev)} sub={`2019–2026 · ${totInv} faktura`} icon="💶"/>
            <Stat label="KUPCI" value={CUSTOMERS.length} sub={`${actN} aktivnih · ${dorN} uspavanih`} color={C.bl} icon="🏭"/>
            <Stat label="PIPELINE" value={fe(pipTot)} sub={`Pond: ${fe(Math.round(pipW))}`} color={C.gr} icon="📈"/>
            <Stat label="ALARMI" value={alerts.length} sub="90+ dana neaktivni" color={C.rd} icon="🔔"/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <Cd>
              <div style={{fontSize:10,fontWeight:700,color:C.txD,letterSpacing:1.2,marginBottom:10,textTransform:"uppercase"}}>Prihod po godini</div>
              {REVENUE_YEARS.map(r=>(
                <div key={r.y} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                  <span style={{fontSize:10,color:C.txD,width:30,fontWeight:700,fontFamily:"monospace"}}>{r.y}</span>
                  <div style={{flex:1,height:16,background:C.sf,borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(r.v/maxR)*100}%`,background:`linear-gradient(90deg,${C.or}66,${C.or})`,borderRadius:3,transition:"width .6s ease"}}/>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,color:r.y==="2022"?C.or:C.tx,minWidth:56,textAlign:"right",fontFamily:"monospace"}}>{fe(r.v)}</span>
                </div>
              ))}
            </Cd>
            <Cd>
              <div style={{fontSize:10,fontWeight:700,color:C.txD,letterSpacing:1.2,marginBottom:10,textTransform:"uppercase"}}>Top 5 kupaca</div>
              {CUSTOMERS.slice(0,5).map((c,i)=>(
                <div key={c.id} onClick={()=>{setTab("customers");setSelC(c)}} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 4px",borderRadius:6,cursor:"pointer",transition:"background .12s",marginBottom:2}} onMouseEnter={e=>e.currentTarget.style.background=C.cardH} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{fontSize:10,fontWeight:800,color:C.txD,width:14,fontFamily:"monospace"}}>{i+1}</span>
                  <span style={{fontSize:14}}>{c.fl}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600}}>{c.name}</div>
                    <div style={{fontSize:9,color:C.txD}}>{c.city} · {c.ind} · {c.inv} fakt</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.or}}>{fe(c.rev)}</div>
                    <Bd color={grC[c.gr]} sm>{c.gr}</Bd>
                  </div>
                </div>
              ))}
            </Cd>
          </div>

          <Cd style={{marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:700,color:C.txD,letterSpacing:1.2,marginBottom:10,textTransform:"uppercase"}}>Po državama</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {coStats.map(([co,s])=>(
                <div key={co} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 12px",background:C.sf,borderRadius:7,border:`1px solid ${C.brd}`}}>
                  <span style={{fontSize:18}}>{s.fl}</span>
                  <div><div style={{fontSize:11,fontWeight:700}}>{co}</div><div style={{fontSize:9,color:C.txD}}>{s.n} kupaca</div></div>
                  <div style={{fontSize:12,fontWeight:700,color:C.or,marginLeft:6}}>{fe(s.r)}</div>
                </div>
              ))}
            </div>
          </Cd>

          {alerts.length>0&&<Cd style={{borderLeft:`3px solid ${C.rd}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.rd,marginBottom:8}}>⚠️ ALARMI — {alerts.length} uspavanih kupaca</div>
            {alerts.slice(0,5).map(c=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 0",borderBottom:`1px solid ${C.brd}`}}>
                <span>{c.fl}</span>
                <span style={{flex:1,fontSize:11,fontWeight:500}}>{c.name}</span>
                <Bd color={c.idle>365?C.rd:C.yl} sm>{c.idle}d</Bd>
                <span style={{fontSize:10,color:C.txD,minWidth:50,textAlign:"right"}}>{fe(c.rev)}</span>
              </div>
            ))}
          </Cd>}
        </>}

        {/* ═══ CUSTOMERS ═══ */}
        {tab==="customers"&&<>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pretraži — ime, grad, industrija..." style={{width:"100%",padding:"9px 14px",borderRadius:7,border:`1px solid ${C.brd}`,background:C.sf,color:C.tx,fontSize:12,marginBottom:10}}/>

          {selC?<div>
            <button onClick={()=>setSelC(null)} style={{background:"none",border:"none",color:C.or,cursor:"pointer",fontSize:11,padding:0,marginBottom:10}}>← Nazad</button>
            <Cd style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div>
                  <div style={{fontSize:20,fontWeight:800}}>{selC.fl} {selC.name}</div>
                  <div style={{fontSize:11,color:C.txM}}>{selC.city}, {selC.co} · {selC.ind}</div>
                </div>
                <div style={{display:"flex",gap:5}}><Bd color={grC[selC.gr]}>Grade {selC.gr}</Bd><Bd color={stC[selC.st]}>{selC.st}</Bd></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {[["PRIHOD",fe(selC.rev),C.or],["FAKTURE",`${selC.inv} / ${selC.itm} st.`,C.bl],["PERIOD",selC.per,C.tx],["NEAKTIVAN",`${selC.idle} dana`,selC.idle>180?C.rd:selC.idle>90?C.yl:C.gr]].map(([l,v,c],i)=>(
                  <div key={i} style={{background:C.sf,padding:10,borderRadius:7}}>
                    <div style={{fontSize:8,color:C.txD,letterSpacing:1,textTransform:"uppercase"}}>{l}</div>
                    <div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
            </Cd>
            <Cd>
              <div style={{fontSize:10,fontWeight:700,color:C.txD,letterSpacing:1,marginBottom:8}}>GLAVNI MATERIJALI</div>
              {selC.mats.map((m,i)=><div key={i} style={{padding:"5px 0",borderBottom:`1px solid ${C.brd}`,fontSize:11,display:"flex",alignItems:"center",gap:6}}><span style={{color:C.or}}>●</span>{m}</div>)}
            </Cd>
          </div>:
          <div style={{display:"grid",gap:6}}>
            {filtC.sort((a,b)=>b.rev-a.rev).map(c=>(
              <Cd key={c.id} onClick={()=>setSelC(c)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px"}}>
                <span style={{fontSize:20}}>{c.fl}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700}}>{c.name}</div>
                  <div style={{fontSize:9,color:C.txD}}>{c.city} · {c.ind} · {c.per}</div>
                </div>
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <Bd color={stC[c.st]} sm>{c.st}</Bd>
                  <Bd color={grC[c.gr]} sm>{c.gr}</Bd>
                  {c.idle>180&&<Bd color={C.rd} sm>⚠{c.idle}d</Bd>}
                </div>
                <div style={{textAlign:"right",minWidth:72}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.or}}>{fe(c.rev)}</div>
                  <div style={{fontSize:9,color:C.txD}}>{c.inv} fakt · {c.itm} st.</div>
                </div>
              </Cd>
            ))}
          </div>}
        </>}

        {/* ═══ MATERIALS ═══ */}
        {tab==="materials"&&<>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
            {["",  ...cats].map(ct=>(
              <button key={ct} onClick={()=>setCatF(ct)} style={{padding:"4px 10px",borderRadius:5,border:`1px solid ${catF===ct?C.or:C.brd}`,background:catF===ct?C.or+"18":"transparent",color:catF===ct?C.or:C.txM,fontSize:10,cursor:"pointer",fontWeight:catF===ct?700:500}}>{ct||"Sve"}</button>
            ))}
          </div>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pretraži materijal..." style={{width:"100%",padding:"8px 12px",borderRadius:6,border:`1px solid ${C.brd}`,background:C.sf,color:C.tx,fontSize:11,marginBottom:10}}/>
          <div style={{display:"grid",gap:6}}>
            {filtM.sort((a,b)=>b.t-a.t).map(m=>(
              <Cd key={m.c} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px"}}>
                <div style={{width:32,height:32,borderRadius:6,background:C.sf,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🧱</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.n}</div>
                  <div style={{fontSize:9,color:C.txD}}>{m.c} · {m.cat} · {m.s}× prodato</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.or}}>{fe(m.p)}/{m.u}</div>
                  <div style={{fontSize:9,color:C.txD}}>Σ {fe(m.t)}</div>
                </div>
                <button onClick={()=>addQ(m)} style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${C.or}33`,background:C.or+"0d",color:C.or,fontSize:9,cursor:"pointer",fontWeight:700,flexShrink:0}}>+Ponuda</button>
              </Cd>
            ))}
          </div>
        </>}

        {/* ═══ PIPELINE ═══ */}
        {tab==="pipeline"&&<>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
            <Stat label="PIPELINE" value={fe(pipTot)} icon="💰"/>
            <Stat label="PONDERISANO" value={fe(Math.round(pipW))} color={C.gr} icon="📊"/>
            <Stat label="DEALS" value={PIPELINE.length} color={C.bl} icon="🤝"/>
          </div>
          <div style={{display:"grid",gap:8}}>
            {PIPELINE.sort((a,b)=>b.val-a.val).map(p=>(
              <Cd key={p.id} style={{padding:"11px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700}}>{p.deal}</div>
                    <div style={{fontSize:10,color:C.txM}}>{p.cust}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:15,fontWeight:800,color:C.or}}>{fe(p.val)}</div>
                    <Bd color={sgC[p.stage]}>{p.stage}</Bd>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                  <div style={{flex:1,height:5,background:C.sf,borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${p.prob}%`,background:p.prob>60?C.gr:p.prob>40?C.yl:C.rd,borderRadius:3}}/>
                  </div>
                  <span style={{fontSize:10,fontWeight:700}}>{p.prob}%</span>
                </div>
                <div style={{fontSize:10,color:C.txD,fontStyle:"italic"}}>{p.note}</div>
              </Cd>
            ))}
          </div>
        </>}

        {/* ═══ QUOTES ═══ */}
        {tab==="quotes"&&<>
          <Cd style={{marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:C.txD,letterSpacing:1,marginBottom:8,textTransform:"uppercase"}}>Nova ponuda</div>
            <select value={qCust} onChange={e=>setQCust(e.target.value)} style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1px solid ${C.brd}`,background:C.sf,color:C.tx,fontSize:11,marginBottom:10}}>
              <option value="">Izaberi kupca...</option>
              {CUSTOMERS.map(c=><option key={c.id} value={c.name}>{c.fl} {c.name} — {c.city}</option>)}
            </select>
            {qItems.length===0?
              <div style={{textAlign:"center",padding:16,color:C.txD,fontSize:11}}>Idi na tab Materijali → klikni "+Ponuda" da dodaš stavke</div>:
              <div>
                <div style={{display:"grid",gridTemplateColumns:"2fr 70px 90px 70px 30px",gap:6,marginBottom:6,fontSize:9,color:C.txD,fontWeight:700}}>
                  <span>MATERIJAL</span><span style={{textAlign:"center"}}>KOL.</span><span style={{textAlign:"right"}}>CENA</span><span style={{textAlign:"right"}}>UKUPNO</span><span/>
                </div>
                {qItems.map((qi,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 70px 90px 70px 30px",gap:6,alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${C.brd}`}}>
                    <div><div style={{fontSize:11,fontWeight:500}}>{qi.n}</div><div style={{fontSize:8,color:C.txD}}>{qi.c}</div></div>
                    <input type="number" value={qi.qty} min={0.1} step={0.1} onChange={e=>{const nq=[...qItems];nq[i].qty=parseFloat(e.target.value)||0;setQItems(nq)}}
                      style={{width:"100%",padding:"3px 5px",borderRadius:3,border:`1px solid ${C.brd}`,background:C.sf,color:C.tx,fontSize:11,textAlign:"center"}}/>
                    <div style={{textAlign:"right",fontSize:11}}>{fe(qi.p)}/{qi.u}</div>
                    <div style={{textAlign:"right",fontSize:11,fontWeight:700,color:C.or}}>{fe(Math.round(qi.p*qi.qty))}</div>
                    <button onClick={()=>setQItems(qItems.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:C.rd,cursor:"pointer",fontSize:13}}>×</button>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",marginTop:6,borderTop:`2px solid ${C.or}`}}>
                  <span style={{fontSize:12,fontWeight:700}}>UKUPNO</span>
                  <span style={{fontSize:18,fontWeight:800,color:C.or}}>{fe(qItems.reduce((s,qi)=>s+qi.p*qi.qty,0))}</span>
                </div>
              </div>
            }
          </Cd>
        </>}

        {/* ═══ ACTIONS ═══ */}
        {tab==="actions"&&<>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
            <Stat label="AKCIJE" value={ACTIONS.length} color={C.bl} icon="🎯"/>
            <Stat label="HITNE" value={ACTIONS.filter(a=>a.pri==="HITNO").length} color={C.rd} icon="🔴"/>
            <Stat label="U TOKU" value={ACTIONS.filter(a=>a.st==="in_progress").length} color={C.yl} icon="🔄"/>
          </div>
          {["HITNO","VISOK","SREDNJI","NISKO"].map(p=>{
            const its=ACTIONS.filter(a=>a.pri===p);
            return its.length?<div key={p} style={{marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:prC[p],letterSpacing:1.2,marginBottom:6}}>{p} ({its.length})</div>
              {its.map(a=>(
                <Cd key={a.id} style={{marginBottom:5,padding:"9px 14px",borderLeft:`3px solid ${prC[a.pri]}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:600}}>{a.act}</div>
                      <div style={{fontSize:9,color:C.txD,marginTop:2}}>{a.who} · Rok: {a.dl}</div>
                    </div>
                    <Bd color={a.st==="done"?C.gr:a.st==="in_progress"?C.yl:C.txD} sm>{stL[a.st]}</Bd>
                  </div>
                </Cd>
              ))}
            </div>:null;
          })}
        </>}

        {/* ═══ ALERTS ═══ */}
        {tab==="alerts"&&<>
          <Cd style={{marginBottom:10,borderLeft:`3px solid ${C.rd}`}}>
            <div style={{fontSize:12,fontWeight:700,color:C.rd,marginBottom:3}}>⚠️ {alerts.length} kupaca bez narudžbe 90+ dana</div>
            <div style={{fontSize:10,color:C.txM}}>Uspavani prihod: {fe(alerts.reduce((s,c)=>s+c.rev,0))}</div>
          </Cd>
          <div style={{display:"grid",gap:6}}>
            {alerts.map(c=>(
              <Cd key={c.id} onClick={()=>{setTab("customers");setSelC(c)}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderLeft:`3px solid ${c.idle>365?C.rd:c.idle>180?C.or:C.yl}`}}>
                <span style={{fontSize:18}}>{c.fl}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700}}>{c.name}</div>
                  <div style={{fontSize:9,color:C.txD}}>{c.city} · {c.ind} · Poslednja: {c.last}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:20,fontWeight:800,color:c.idle>365?C.rd:c.idle>180?C.or:C.yl}}>{c.idle}</div>
                  <div style={{fontSize:7,color:C.txD,letterSpacing:1}}>DANA</div>
                </div>
                <div style={{textAlign:"right",minWidth:60}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.or}}>{fe(c.rev)}</div>
                  <Bd color={grC[c.gr]} sm>{c.gr}</Bd>
                </div>
              </Cd>
            ))}
          </div>
        </>}
      </main>

      {/* FOOTER */}
      <footer style={{textAlign:"center",padding:"16px 0",borderTop:`1px solid ${C.brd}`,margin:"16px 20px 0"}}>
        <span style={{fontSize:9,color:C.txD,letterSpacing:.5}}>MOLTY v7.0 · Volcano Refractory / Calderys Serbia · {fm(totRev)} EUR · {CUSTOMERS.length} kupaca · {totInv} faktura · {MATERIALS.length} materijala</span>
      </footer>
    </div>
  );
}
