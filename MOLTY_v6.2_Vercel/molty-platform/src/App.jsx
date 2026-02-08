import { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
// MOLTY v6.2 — Business Intelligence Platform
// Volcano Refractory d.o.o. / Calderys Serbia
// ═══════════════════════════════════════════════════════════════

const CUSTOMERS = [
  { id: 1, name: "HBIS Group Serbia", aka: "Železara Smederevo", country: "🇷🇸", city: "Smederevo", industry: "Čelik", grade: "A", status: "active", driveFolder: true, contacts: [{ name: "—", role: "Nabavka", email: "—", phone: "—" }], products: ["BOF obloga", "EAF vatrostalna", "Odlivni sistemi", "Kazanski materijal"], projects: ["BOF tender 2024", "EAF relining Q1 2026"], notes: "Kineski dobavljači nude niže cene. Prioritet zadržati.", revenue2024: 45000, revenue2025: 52000, potentialRevenue: 120000 },
  { id: 2, name: "ArcelorMittal Zenica", aka: "ex Željezara Zenica", country: "🇧🇦", city: "Zenica", industry: "Čelik", grade: "A", status: "active", driveFolder: true, contacts: [{ name: "—", role: "Tehnički direktor", email: "—", phone: "—" }], products: ["Kazanski materijal", "Odlivni sistemi", "EAF obloga"], projects: ["Godišnji remont 2026"], notes: "Istorijski najveći kupac iz ex-YU doba. Održavati odnos.", revenue2024: 38000, revenue2025: 41000, potentialRevenue: 95000 },
  { id: 3, name: "Heidelberg Materials BiH", aka: "Cementara Kakanj", country: "🇧🇦", city: "Kakanj", industry: "Cement", grade: "B", status: "new", driveFolder: true, contacts: [{ name: "—", role: "Maintenance Mgr", email: "—", phone: "—" }], products: ["Obloga rotacione peći", "Cikloni", "Preheater"], projects: ["Prva ponuda Q1 2026"], notes: "NOV klijent 2026 — veliki potencijal.", revenue2024: 0, revenue2025: 5000, potentialRevenue: 80000 },
  { id: 4, name: "LTH Ulitki Ohrid", aka: "LTH Ohrid", country: "🇲🇰", city: "Ohrid", industry: "Aluminijum", grade: "A", status: "active", driveFolder: true, contacts: [{ name: "—", role: "Tehnički dir.", email: "—", phone: "—" }], products: ["CALDE PATCH 13LI", "CALDE CAST 13LI", "Izolacioni slojevi"], projects: ["Tilting furnace relining 2026", "Holding furnace maintenance"], notes: "Aktivni kupac. Redovne narudžbe za Al peći.", revenue2024: 22000, revenue2025: 28000, potentialRevenue: 55000 },
  { id: 5, name: "Feni Industries", aka: "Feronikl", country: "🇲🇰", city: "Kavadarci", industry: "Feronikl", grade: "B", status: "dormant", driveFolder: true, contacts: [{ name: "—", role: "Nabavka", email: "—", phone: "—" }], products: ["Rotacione peći obloga", "Elektro peći"], projects: [], notes: "Obustavljali proizvodnju. Pratiti status. Potencijal ogroman ako se pokrenu.", revenue2024: 0, revenue2025: 0, potentialRevenue: 150000 },
  { id: 6, name: "INA - Industrija Nafte", aka: "INA Rijeka", country: "🇭🇷", city: "Rijeka", industry: "Nafta", grade: "A", status: "active", driveFolder: true, contacts: [{ name: "—", role: "Maintenance Eng.", email: "—", phone: "—" }], products: ["CO Boiler refractory", "FCC jedinica", "Izolacija"], projects: ["CO Boiler revamp 2026"], notes: "Veliki projekat CO Boiler. API 936 compliance potreban.", revenue2024: 15000, revenue2025: 35000, potentialRevenue: 200000 },
  { id: 7, name: "Toplana Zrenjanin", aka: "JKP Gradska toplana", country: "🇷🇸", city: "Zrenjanin", industry: "Energetika", grade: "C", status: "stable", driveFolder: false, contacts: [{ name: "—", role: "Direktor", email: "—", phone: "—" }], products: ["Vatrostalni beton", "Šamotne opeke"], projects: [], notes: "Lokalni kupac. Male ali redovne narudžbe.", revenue2024: 3000, revenue2025: 3500, potentialRevenue: 8000 },
  { id: 8, name: "Cementara Kosjerić", aka: "Titan Cementara", country: "🇷🇸", city: "Kosjerić", industry: "Cement", grade: "B", status: "dormant", driveFolder: false, contacts: [{ name: "—", role: "Nabavka", email: "—", phone: "—" }], products: ["Obloga rotacione peći", "Cikloni"], projects: [], notes: "Uspavan kupac. Reaktivirati sa novom ponudom.", revenue2024: 0, revenue2025: 0, potentialRevenue: 60000 },
  { id: 9, name: "Impol Seval", aka: "Seval Sevojno", country: "🇷🇸", city: "Sevojno", industry: "Aluminijum", grade: "B", status: "active", driveFolder: true, contacts: [{ name: "—", role: "Tehnički dir.", email: "—", phone: "—" }], products: ["Al peći obloga", "CALDE materijali"], projects: ["Remont topionice 2026"], notes: "Jedina topiona aluminijuma u Srbiji. Strateški važan.", revenue2024: 12000, revenue2025: 18000, potentialRevenue: 45000 },
  { id: 10, name: "Termoelektrana Kostolac", aka: "TE-KO B", country: "🇷🇸", city: "Kostolac", industry: "Energetika", grade: "B", status: "new", driveFolder: false, contacts: [{ name: "—", role: "Održavanje", email: "—", phone: "—" }], products: ["Kotlovska vatrostalna", "Izolacija"], projects: ["Blok B2 remont"], notes: "Novi potencijalni kupac. Kineski investitori.", revenue2024: 0, revenue2025: 8000, potentialRevenue: 70000 },
];

const PRODUCTS = [
  { id: 1, name: "CALDE™ PATCH 13LI", type: "Patch", maxTemp: 1300, industry: "Aluminijum", desc: "Livable vatrostalni patch za Al peći" },
  { id: 2, name: "CALDE® CAST 13LI", type: "Cast", maxTemp: 1300, industry: "Aluminijum", desc: "Livable vatrostalni beton za Al peći" },
  { id: 3, name: "CALDE® CAST 16LI", type: "Cast", maxTemp: 1600, industry: "Čelik", desc: "Visoko-temperaturni beton za čeličane" },
  { id: 4, name: "CALDE® BRICK AL70", type: "Brick", maxTemp: 1700, industry: "Čelik", desc: "Alumina opeke za visoke temperature" },
  { id: 5, name: "CALDE® MORTAR HT", type: "Mortar", maxTemp: 1500, industry: "Univerzalno", desc: "Vatrostalni malter za visoke temperature" },
  { id: 6, name: "CALDE® BOARD ISO", type: "Insulation", maxTemp: 1100, industry: "Univerzalno", desc: "Izolacione ploče — smanjenje gubitaka toplote" },
  { id: 7, name: "CALDE® CAST CEM", type: "Cast", maxTemp: 1450, industry: "Cement", desc: "Vatrostalni beton za cementnu industriju" },
  { id: 8, name: "CALDE® GUNMIX 16", type: "Gunning", maxTemp: 1600, industry: "Čelik", desc: "Torkret masa za reparaciju peći" },
];

const PROJECTS = [
  { id: 1, customer: "HBIS Group Serbia", name: "EAF Relining 2026", status: "tender", value: 45000, deadline: "2026-03-15", priority: "critical" },
  { id: 2, customer: "INA - Industrija Nafte", name: "CO Boiler Revamp", status: "proposal", value: 85000, deadline: "2026-06-01", priority: "critical" },
  { id: 3, customer: "LTH Ulitki Ohrid", name: "Tilting Furnace Reline", status: "won", value: 18000, deadline: "2026-02-28", priority: "medium" },
  { id: 4, customer: "Heidelberg Materials BiH", name: "Rotary Kiln First Offer", status: "draft", value: 35000, deadline: "2026-04-01", priority: "high" },
  { id: 5, customer: "Impol Seval", name: "Topiona Remont Q2", status: "proposal", value: 22000, deadline: "2026-05-15", priority: "medium" },
  { id: 6, customer: "Termoelektrana Kostolac", name: "Blok B2 Kotao", status: "lead", value: 40000, deadline: "2026-09-01", priority: "medium" },
  { id: 7, customer: "ArcelorMittal Zenica", name: "Godišnji Remont 2026", status: "tender", value: 52000, deadline: "2026-04-15", priority: "high" },
];

const DRIVE_STRUCTURE = [
  { name: "01_KUPCI", icon: "👥", children: [
    { name: "HBIS_Smederevo", files: 34, mod: "28.01.2026" },
    { name: "ArcelorMittal_Zenica", files: 28, mod: "15.01.2026" },
    { name: "INA_Rijeka", files: 22, mod: "03.02.2026" },
    { name: "LTH_Ohrid", files: 18, mod: "05.02.2026" },
    { name: "Impol_Seval", files: 12, mod: "10.12.2025" },
    { name: "Heidelberg_Kakanj", files: 5, mod: "01.02.2026" },
  ]},
  { name: "02_ARHIVA_PROJEKATA", icon: "📁", children: [
    { name: "Čelik", files: 45, mod: "20.01.2026" },
    { name: "Aluminijum", files: 32, mod: "04.02.2026" },
    { name: "Cement", files: 15, mod: "22.11.2025" },
    { name: "Energetika", files: 19, mod: "18.12.2025" },
  ]},
  { name: "03_TEHNICKA_DOC", icon: "📐", children: [
    { name: "Calderys_Specifikacije", files: 120, mod: "15.10.2025" },
    { name: "SDS_Srpski", files: 45, mod: "20.09.2025" },
    { name: "API_936_Standards", files: 8, mod: "12.06.2025" },
  ]},
  { name: "04_PONUDE", icon: "📝", children: [
    { name: "2024", files: 23, mod: "15.12.2024" },
    { name: "2025", files: 31, mod: "28.12.2025" },
    { name: "2026", files: 7, mod: "06.02.2026" },
  ]},
];

const AI_INSIGHTS = [
  { type: "upsell", icon: "📈", title: "LTH Ohrid — upsell prilika", desc: "Kupuju samo PATCH i CAST, ali imaju 6 peći koje trebaju kompletnu oblogu uključujući izolaciju. Potencijal: +27.000€/god", priority: "high" },
  { type: "warning", icon: "⚠️", title: "Feni Industries — pratiti reaktivaciju", desc: "Mediji javljaju mogući restart proizvodnje feronikla u Q2 2026. Pripremiti ponudu pre konkurencije.", priority: "critical" },
  { type: "dormant", icon: "💤", title: "Cementara Kosjerić — uspavan 12+ meseci", desc: "Poslednja narudžba pre 14 meseci. Poslati tehničku ponudu za rotacionu peć sa novim CALDE® CAST CEM.", priority: "medium" },
  { type: "growth", icon: "🚀", title: "INA CO Boiler — najveći projekat 2026", desc: "Vrednost 85.000€+. Zahteva API 936 compliance dokumentaciju. Pripremiti kompletnu tehničku specifikaciju.", priority: "critical" },
  { type: "upsell", icon: "📈", title: "HBIS — proširiti na BOF segment", desc: "Trenutno kupuju samo za EAF. BOF obloga je 3x veća vrednost. Pripremiti tehničku prezentaciju.", priority: "high" },
  { type: "new", icon: "🆕", title: "Heidelberg Kakanj — prvi ugovor", desc: "Kontakt uspostavljen. Cementna industrija u BiH nema Calderys dobavljača. First-mover advantage.", priority: "high" },
  { type: "risk", icon: "🔴", title: "Kineski dobavljači na HBIS tenderu", desc: "HBIS je kineska kompanija — preferiraju kineske dobavljače. Fokus na kvalitet i lokalni servis kao prednost.", priority: "critical" },
  { type: "growth", icon: "🚀", title: "Impol Seval — jedina Al topiona u Srbiji", desc: "Strateški kupac. Remont u Q2 — pripremiti sveobuhvatnu ponudu sa instalacijom.", priority: "medium" },
];

const statusColor = (s) => ({ active: "#22c55e", new: "#3b82f6", dormant: "#ef4444", stable: "#a3a3a3", growing: "#f59e0b" }[s] || "#78716c");
const gradeColor = (g) => ({ A: "#f97316", B: "#3b82f6", C: "#78716c", D: "#ef4444" }[g] || "#78716c");
const priorityColor = (p) => ({ critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" }[p] || "#78716c");
const projectStatusLabel = (s) => ({ lead: "Lead", draft: "Nacrt", proposal: "Ponuda", tender: "Tender", won: "Dobijeno", lost: "Izgubljeno" }[s] || s);
const projectStatusColor = (s) => ({ lead: "#a3a3a3", draft: "#78716c", proposal: "#3b82f6", tender: "#f97316", won: "#22c55e", lost: "#ef4444" }[s] || "#78716c");
const fmt = (n) => new Intl.NumberFormat("de-DE").format(n);

// ─── COMPONENTS ───────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: "#1c1917", border: "1px solid #292524", borderRadius: 14, padding: "20px 22px", flex: 1, minWidth: 180 }}>
      <div style={{ fontSize: 11, color: "#78716c", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent || "#f5f5f4", fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Badge({ text, color, filled }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: filled ? color : color + "18", color: filled ? "#fff" : color, border: `1px solid ${color}44`
    }}>{text}</span>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────

function Dashboard({ setTab, setSelectedCustomer }) {
  const totalRev = CUSTOMERS.reduce((s, c) => s + c.revenue2025, 0);
  const totalPot = CUSTOMERS.reduce((s, c) => s + c.potentialRevenue, 0);
  const pipelineVal = PROJECTS.reduce((s, p) => s + p.value, 0);
  const activeCount = CUSTOMERS.filter(c => ["active", "new", "stable", "growing"].includes(c.status)).length;
  const dormantCount = CUSTOMERS.filter(c => c.status === "dormant").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats Row */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard label="Prihod 2025" value={`€${fmt(totalRev)}`} sub={`+${Math.round(((totalRev / CUSTOMERS.reduce((s,c)=>s+c.revenue2024,0))-1)*100)}% vs 2024`} accent="#22c55e" />
        <StatCard label="Pipeline" value={`€${fmt(pipelineVal)}`} sub={`${PROJECTS.length} aktivnih projekata`} accent="#f97316" />
        <StatCard label="Potencijal" value={`€${fmt(totalPot)}`} sub="Ukupno svih kupaca" accent="#3b82f6" />
        <StatCard label="Kupci" value={activeCount} sub={`+ ${dormantCount} uspavanih`} />
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Pipeline */}
        <div style={{ background: "#1c1917", border: "1px solid #292524", borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f5f5f4", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#f97316" }}>◆</span> Aktivni Projekti
          </div>
          {PROJECTS.sort((a,b) => {
            const o = { critical: 0, high: 1, medium: 2, low: 3 };
            return (o[a.priority]??9) - (o[b.priority]??9);
          }).map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #292524" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: priorityColor(p.priority), flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e7e5e4" }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "#78716c" }}>{p.customer}</div>
              </div>
              <Badge text={projectStatusLabel(p.status)} color={projectStatusColor(p.status)} />
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f5f5f4", fontFamily: "'JetBrains Mono', monospace", minWidth: 70, textAlign: "right" }}>€{fmt(p.value)}</div>
            </div>
          ))}
          <div style={{ marginTop: 14, padding: "12px 16px", background: "#f9731610", borderRadius: 10, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#f97316", fontWeight: 600, fontSize: 13 }}>Ukupno pipeline</span>
            <span style={{ color: "#f97316", fontWeight: 800, fontSize: 15, fontFamily: "'JetBrains Mono', monospace" }}>€{fmt(pipelineVal)}</span>
          </div>
        </div>

        {/* AI Insights Preview */}
        <div style={{ background: "#1c1917", border: "1px solid #292524", borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f5f5f4", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#f97316" }}>◎</span> AI Preporuke
          </div>
          {AI_INSIGHTS.filter(i => i.priority === "critical").map((ins, idx) => (
            <div key={idx} style={{ padding: "12px 14px", marginBottom: 10, background: "#292524", borderRadius: 10, borderLeft: `3px solid ${priorityColor(ins.priority)}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e7e5e4", marginBottom: 4 }}>{ins.icon} {ins.title}</div>
              <div style={{ fontSize: 12, color: "#a8a29e", lineHeight: 1.5 }}>{ins.desc}</div>
            </div>
          ))}
          <button onClick={() => setTab("insights")} style={{ width: "100%", marginTop: 8, padding: "10px", background: "#292524", border: "1px solid #3f3f46", borderRadius: 10, color: "#f97316", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Prikaži sve preporuke →
          </button>
        </div>
      </div>

      {/* Revenue by Customer */}
      <div style={{ background: "#1c1917", border: "1px solid #292524", borderRadius: 14, padding: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f5f5f4", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#f97316" }}>◉</span> Prihod po Kupcima — 2025
        </div>
        {[...CUSTOMERS].sort((a,b) => b.revenue2025 - a.revenue2025).map(c => {
          const maxRev = Math.max(...CUSTOMERS.map(x => x.revenue2025));
          const pct = maxRev > 0 ? (c.revenue2025 / maxRev) * 100 : 0;
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", cursor: "pointer" }}
              onClick={() => { setSelectedCustomer(c); setTab("customers"); }}>
              <div style={{ width: 140, fontSize: 12, color: "#d6d3d1", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
              <div style={{ flex: 1, height: 20, background: "#292524", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${gradeColor(c.grade)}, ${gradeColor(c.grade)}88)`, borderRadius: 6, transition: "width 0.6s ease" }} />
              </div>
              <div style={{ width: 75, textAlign: "right", fontSize: 12, fontWeight: 600, color: "#f5f5f4", fontFamily: "'JetBrains Mono', monospace" }}>€{fmt(c.revenue2025)}</div>
              <Badge text={c.grade} color={gradeColor(c.grade)} filled />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CUSTOMERS ─────────────────────────────────────────────────

function CustomersTab({ selected, setSelected }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? CUSTOMERS : CUSTOMERS.filter(c => c.status === filter || c.industry === filter || c.country.includes(filter));

  if (selected) {
    const c = selected;
    const growth = c.revenue2024 > 0 ? Math.round(((c.revenue2025 / c.revenue2024) - 1) * 100) : (c.revenue2025 > 0 ? 100 : 0);
    const utilization = c.potentialRevenue > 0 ? Math.round((c.revenue2025 / c.potentialRevenue) * 100) : 0;
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ background: "#292524", border: "none", color: "#a8a29e", padding: "8px 16px", borderRadius: 8, cursor: "pointer", marginBottom: 16, fontSize: 12 }}>← Nazad na listu</button>
        <div style={{ background: "#1c1917", border: "1px solid #292524", borderRadius: 14, padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg, ${gradeColor(c.grade)}, ${gradeColor(c.grade)}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff" }}>{c.name[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#f5f5f4" }}>{c.name}</div>
              <div style={{ fontSize: 13, color: "#78716c" }}>{c.aka} • {c.country} {c.city} • {c.industry}</div>
            </div>
            <Badge text={`Grade ${c.grade}`} color={gradeColor(c.grade)} filled />
            <Badge text={c.status} color={statusColor(c.status)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
            <StatCard label="Prihod 2025" value={`€${fmt(c.revenue2025)}`} accent="#22c55e" />
            <StatCard label="Rast" value={`${growth > 0 ? "+" : ""}${growth}%`} accent={growth >= 0 ? "#22c55e" : "#ef4444"} />
            <StatCard label="Potencijal" value={`€${fmt(c.potentialRevenue)}`} accent="#3b82f6" />
            <StatCard label="Iskorišćenost" value={`${utilization}%`} accent={utilization < 30 ? "#ef4444" : utilization < 60 ? "#f59e0b" : "#22c55e"} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#78716c", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Proizvodi</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {c.products.map((p, i) => <Badge key={i} text={p} color="#f97316" />)}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#78716c", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 20 }}>Projekti</div>
              {c.projects.length > 0 ? c.projects.map((p, i) => (
                <div key={i} style={{ padding: "8px 12px", background: "#292524", borderRadius: 8, marginBottom: 6, fontSize: 13, color: "#d6d3d1" }}>{p}</div>
              )) : <div style={{ fontSize: 12, color: "#78716c" }}>Nema aktivnih projekata</div>}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#78716c", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Kontakti</div>
              {c.contacts.map((ct, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "#292524", borderRadius: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e7e5e4" }}>{ct.name}</div>
                  <div style={{ fontSize: 11, color: "#78716c" }}>{ct.role} • {ct.email}</div>
                </div>
              ))}
              <div style={{ fontSize: 12, fontWeight: 700, color: "#78716c", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 20 }}>Napomene</div>
              <div style={{ padding: "12px 14px", background: "#f9731610", borderRadius: 10, borderLeft: "3px solid #f97316", fontSize: 13, color: "#d6d3d1", lineHeight: 1.6 }}>{c.notes}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filters = [
    { label: "Svi", value: "all" },
    { label: "Aktivni", value: "active" },
    { label: "Uspavani", value: "dormant" },
    { label: "Novi", value: "new" },
    { label: "🇷🇸", value: "🇷🇸" },
    { label: "🇧🇦", value: "🇧🇦" },
    { label: "🇲🇰", value: "🇲🇰" },
    { label: "🇭🇷", value: "🇭🇷" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {filters.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid #3f3f46",
            background: filter === f.value ? "#f97316" : "#292524", color: filter === f.value ? "#fff" : "#a8a29e"
          }}>{f.label}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {filtered.map(c => (
          <div key={c.id} onClick={() => setSelected(c)} style={{
            background: "#1c1917", border: "1px solid #292524", borderRadius: 14, padding: 20, cursor: "pointer",
            transition: "all 0.2s", borderLeft: `3px solid ${gradeColor(c.grade)}`
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#f97316"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#292524"; e.currentTarget.style.transform = "none"; }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f5f5f4" }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "#78716c" }}>{c.country} {c.city} • {c.industry}</div>
              </div>
              <Badge text={c.grade} color={gradeColor(c.grade)} filled />
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
              <div><div style={{ fontSize: 10, color: "#78716c" }}>2025</div><div style={{ fontSize: 15, fontWeight: 700, color: "#22c55e", fontFamily: "'JetBrains Mono', monospace" }}>€{fmt(c.revenue2025)}</div></div>
              <div><div style={{ fontSize: 10, color: "#78716c" }}>Potencijal</div><div style={{ fontSize: 15, fontWeight: 700, color: "#3b82f6", fontFamily: "'JetBrains Mono', monospace" }}>€{fmt(c.potentialRevenue)}</div></div>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <Badge text={c.status} color={statusColor(c.status)} />
              {c.driveFolder && <Badge text="Drive" color="#3b82f6" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DRIVE MAP ──────────────────────────────────────────────────

function DriveTab() {
  const [open, setOpen] = useState({});
  const toggle = (name) => setOpen(prev => ({ ...prev, [name]: !prev[name] }));
  const totalFiles = DRIVE_STRUCTURE.reduce((s, f) => s + f.children.reduce((ss, c) => ss + c.files, 0), 0);

  return (
    <div>
      <div style={{ background: "#1c1917", border: "1px solid #292524", borderRadius: 14, padding: 20, marginBottom: 16, display: "flex", gap: 20 }}>
        <StatCard label="Ukupno fajlova" value={totalFiles} accent="#f97316" />
        <StatCard label="Foldera" value={DRIVE_STRUCTURE.reduce((s, f) => s + f.children.length, 0) + DRIVE_STRUCTURE.length} />
        <StatCard label="Platforme" value="2" sub="Google Drive + Dropbox" />
      </div>
      <div style={{ background: "#1c1917", border: "1px solid #292524", borderRadius: 14, padding: 20 }}>
        {DRIVE_STRUCTURE.map((folder, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div onClick={() => toggle(folder.name)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#292524", borderRadius: 10, cursor: "pointer",
              borderLeft: "3px solid #f97316"
            }}>
              <span style={{ fontSize: 18 }}>{folder.icon}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#f5f5f4" }}>{folder.name}</span>
              <span style={{ fontSize: 11, color: "#78716c" }}>{folder.children.length} podfoldera</span>
              <span style={{ color: "#78716c", fontSize: 16 }}>{open[folder.name] ? "▾" : "▸"}</span>
            </div>
            {open[folder.name] && (
              <div style={{ marginLeft: 28, marginTop: 6 }}>
                {folder.children.map((child, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderBottom: "1px solid #1c1917" }}>
                    <span style={{ fontSize: 14 }}>📄</span>
                    <span style={{ flex: 1, fontSize: 13, color: "#d6d3d1" }}>{child.name}</span>
                    <span style={{ fontSize: 11, color: "#78716c", fontFamily: "'JetBrains Mono', monospace" }}>{child.files} fajlova</span>
                    <span style={{ fontSize: 11, color: "#57534e" }}>{child.mod}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PRODUCTS ────────────────────────────────────────────────────

function ProductsTab() {
  const [filterType, setFilterType] = useState("all");
  const types = ["all", ...new Set(PRODUCTS.map(p => p.type))];
  const filtered = filterType === "all" ? PRODUCTS : PRODUCTS.filter(p => p.type === filterType);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {types.map(t => (
          <button key={t} onClick={() => setFilterType(t)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid #3f3f46",
            background: filterType === t ? "#f97316" : "#292524", color: filterType === t ? "#fff" : "#a8a29e"
          }}>{t === "all" ? "Svi" : t}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {filtered.map(p => (
          <div key={p.id} style={{ background: "#1c1917", border: "1px solid #292524", borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f5f5f4" }}>{p.name}</div>
              <Badge text={p.type} color="#f97316" filled />
            </div>
            <div style={{ fontSize: 12, color: "#a8a29e", lineHeight: 1.5, marginBottom: 12 }}>{p.desc}</div>
            <div style={{ display: "flex", gap: 16 }}>
              <div><div style={{ fontSize: 10, color: "#78716c" }}>Max temp</div><div style={{ fontSize: 14, fontWeight: 700, color: "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>{p.maxTemp}°C</div></div>
              <div><div style={{ fontSize: 10, color: "#78716c" }}>Industrija</div><div style={{ fontSize: 13, fontWeight: 600, color: "#d6d3d1" }}>{p.industry}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PROJECTS ────────────────────────────────────────────────────

function ProjectsTab() {
  const stages = ["lead", "draft", "proposal", "tender", "won"];
  return (
    <div>
      {/* Pipeline funnel */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {stages.map(stage => {
          const stageProjects = PROJECTS.filter(p => p.status === stage);
          const stageValue = stageProjects.reduce((s, p) => s + p.value, 0);
          return (
            <div key={stage} style={{ flex: 1, background: "#1c1917", border: "1px solid #292524", borderRadius: 14, padding: 16, borderTop: `3px solid ${projectStatusColor(stage)}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: projectStatusColor(stage), textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{projectStatusLabel(stage)}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#f5f5f4", fontFamily: "'JetBrains Mono', monospace" }}>€{fmt(stageValue)}</div>
              <div style={{ fontSize: 11, color: "#78716c" }}>{stageProjects.length} projekata</div>
              <div style={{ marginTop: 12 }}>
                {stageProjects.map(p => (
                  <div key={p.id} style={{ padding: "8px 10px", background: "#292524", borderRadius: 8, marginBottom: 6, fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: "#e7e5e4" }}>{p.name}</div>
                    <div style={{ color: "#78716c", fontSize: 11 }}>{p.customer}</div>
                    <div style={{ color: "#f97316", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>€{fmt(p.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AI INSIGHTS ────────────────────────────────────────────────

function InsightsTab() {
  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
        <StatCard label="Kritične preporuke" value={AI_INSIGHTS.filter(i=>i.priority==="critical").length} accent="#ef4444" />
        <StatCard label="Upsell prilike" value={AI_INSIGHTS.filter(i=>i.type==="upsell").length} accent="#f97316" />
        <StatCard label="Uspavani kupci" value={CUSTOMERS.filter(c=>c.status==="dormant").length} accent="#78716c" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {AI_INSIGHTS.sort((a,b) => {
          const o = { critical: 0, high: 1, medium: 2, low: 3 };
          return (o[a.priority]??9) - (o[b.priority]??9);
        }).map((ins, idx) => (
          <div key={idx} style={{
            background: "#1c1917", border: "1px solid #292524", borderRadius: 14, padding: "18px 22px",
            borderLeft: `4px solid ${priorityColor(ins.priority)}`, transition: "all 0.2s"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f5f5f4" }}>{ins.icon} {ins.title}</div>
              <Badge text={ins.priority} color={priorityColor(ins.priority)} filled />
            </div>
            <div style={{ fontSize: 13, color: "#a8a29e", lineHeight: 1.6 }}>{ins.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MOLTY AI CHAT ──────────────────────────────────────────────

function MoltyAITab() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [history, setHistory] = useState([]);

  const handleAI = () => {
    if (!query.trim()) return;
    const q = query.toLowerCase();
    let resp = "";

    if (q.includes("uspavan") || q.includes("dormant") || q.includes("neaktiv")) {
      const dormant = CUSTOMERS.filter(c => c.status === "dormant");
      resp = `🔍 Pronašao sam ${dormant.length} uspavanih kupaca:\n\n${dormant.map(c => `• ${c.name} (${c.country} ${c.city}) — Potencijal: €${fmt(c.potentialRevenue)}\n  Proizvodi: ${c.products.join(", ")}\n  Napomena: ${c.notes}`).join("\n\n")}\n\n💡 PREPORUKA: Prioritet reaktivacija Feni Industries (€150K potencijal) i Cementara Kosjerić (€60K potencijal).`;
    } else if (q.includes("makedonij") || q.includes("🇲🇰") || q.includes("mk")) {
      const mk = CUSTOMERS.filter(c => c.country.includes("🇲🇰"));
      resp = `🇲🇰 Kupci u Severnoj Makedoniji:\n\n${mk.map(c => `• ${c.name} — ${c.city} — ${c.industry}\n  Status: ${c.status} | Grade: ${c.grade}\n  Prihod 2025: €${fmt(c.revenue2025)} | Potencijal: €${fmt(c.potentialRevenue)}`).join("\n\n")}`;
    } else if (q.includes("hbis") || q.includes("smederevo") || q.includes("železar")) {
      const c = CUSTOMERS.find(c => c.id === 1);
      resp = `🏭 ${c.name} (${c.aka})\n\n📍 ${c.country} ${c.city} | Industrija: ${c.industry}\n⭐ Grade: ${c.grade} | Status: ${c.status}\n\n💰 Finansije:\n• Prihod 2024: €${fmt(c.revenue2024)}\n• Prihod 2025: €${fmt(c.revenue2025)} (+${Math.round(((c.revenue2025/c.revenue2024)-1)*100)}%)\n• Potencijal: €${fmt(c.potentialRevenue)}\n\n📦 Proizvodi: ${c.products.join(", ")}\n🔧 Projekti: ${c.projects.join(", ")}\n\n⚠️ ${c.notes}`;
    } else if (q.includes("ina") || q.includes("boiler") || q.includes("rijeka")) {
      resp = `🛢️ INA - Industrija Nafte — CO Boiler Revamp 2026\n\n📍 Rijeka, Hrvatska | Industrija: Nafta\n💰 Vrednost projekta: €85.000\n📊 Status: Proposal fase\n⏰ Deadline: 01.06.2026\n🔴 Prioritet: KRITIČAN\n\n📋 Potrebno:\n• API 936 compliance dokumentacija\n• Kompletna tehnička specifikacija CO Boiler refractory\n• FCC jedinica izolacija\n\n💡 Ovo je NAJVEĆI projekat u 2026. Prioritizovati!`;
    } else if (q.includes("lth") || q.includes("ohrid") || q.includes("aluminijum")) {
      resp = `🏭 LTH Ulitki Ohrid — Aluminijumske peći\n\n📍 Ohrid, Severna Makedonija\n⭐ Grade A | Status: Aktivan\n\n💰 Prihod 2025: €${fmt(28000)} | Potencijal: €${fmt(55000)}\n📦 Trenutni proizvodi: CALDE PATCH 13LI, CALDE CAST 13LI, Izolacioni slojevi\n\n📈 UPSELL PRILIKA:\nKupuju samo patch i cast materijale, ali imaju 6 peći.\nKompletna obloga (working lining + insulation) bi podigla godišnju vrednost za +€27.000.\n\n🔧 Aktivni projekti:\n• Tilting furnace relining 2026 — €18.000 (DOBIJENO ✅)\n• Holding furnace maintenance`;
    } else if (q.includes("ponud") || q.includes("koliko ponud")) {
      resp = `📝 Pregled ponuda:\n\n• 2024: 23 ponude\n• 2025: 31 ponuda\n• 2026: 7 ponuda (do sada)\n\n📊 Ukupno: 61 ponuda u sistemu\n\n💡 Aktivne ponude u 2026:\n${PROJECTS.filter(p=>["proposal","tender","draft"].includes(p.status)).map(p => `• ${p.name} (${p.customer}) — €${fmt(p.value)} — ${projectStatusLabel(p.status)}`).join("\n")}`;
    } else if (q.includes("potencijal") || q.includes("ukupn")) {
      const total = CUSTOMERS.reduce((s,c) => s + c.potentialRevenue, 0);
      const current = CUSTOMERS.reduce((s,c) => s + c.revenue2025, 0);
      resp = `💰 Analiza potencijala:\n\n• Trenutni prihod 2025: €${fmt(current)}\n• Ukupan potencijal: €${fmt(total)}\n• Iskorišćenost: ${Math.round((current/total)*100)}%\n• Neiskorišćen potencijal: €${fmt(total - current)}\n\n🎯 Najveći neiskorišćen potencijal:\n${[...CUSTOMERS].sort((a,b) => (b.potentialRevenue-b.revenue2025) - (a.potentialRevenue-a.revenue2025)).slice(0,5).map(c => `• ${c.name}: €${fmt(c.potentialRevenue - c.revenue2025)} neiskorišćeno (${Math.round((c.revenue2025/c.potentialRevenue)*100)}% iskorišćenost)`).join("\n")}`;
    } else if (q.includes("drive") || q.includes("folder") || q.includes("struktur")) {
      resp = `📁 Google Drive struktura:\n\n${DRIVE_STRUCTURE.map(f => `${f.icon} ${f.name}\n${f.children.map(c => `   └── ${c.name} (${c.files} fajlova, ${c.mod})`).join("\n")}`).join("\n\n")}\n\n📊 Ukupno: ${DRIVE_STRUCTURE.reduce((s,f) => s + f.children.reduce((ss,c) => ss + c.files, 0), 0)} fajlova`;
    } else if (q.includes("pipeline") || q.includes("projekat") || q.includes("projekti")) {
      const total = PROJECTS.reduce((s,p) => s + p.value, 0);
      resp = `🔧 Aktivni projekti — Pipeline: €${fmt(total)}\n\n${PROJECTS.sort((a,b) => b.value - a.value).map(p => `${priorityColor(p.priority) === "#ef4444" ? "🔴" : priorityColor(p.priority) === "#f97316" ? "🟠" : "🟡"} ${p.name}\n   Kupac: ${p.customer} | €${fmt(p.value)} | ${projectStatusLabel(p.status)} | Rok: ${p.deadline}`).join("\n\n")}`;
    } else {
      resp = `🤖 Pretražujem bazu...\n\nNisam pronašao specifičan odgovor za "${query}". Pokušaj:\n\n• "Koji su uspavani kupci?"\n• "Kupci u Makedoniji"\n• "Status HBIS"\n• "INA CO Boiler projekat"\n• "LTH Ohrid"\n• "Koliko ponuda imamo?"\n• "Ukupan potencijal prihoda"\n• "Pipeline projekata"\n• "Drive struktura"`;
    }

    setHistory(prev => [...prev, { q: query, a: resp }]);
    setResponse(resp);
    setQuery("");
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ background: "#1c1917", border: "1px solid #292524", borderRadius: 14, padding: 24, marginBottom: 16, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #f97316, #ea580c)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 12 }}>M</div>
        <div style={{ fontSize: 20, fontWeight: 800, background: "linear-gradient(90deg, #f97316, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MOLTY AI Asistent</div>
        <div style={{ fontSize: 12, color: "#78716c", marginTop: 4 }}>Pitaj me o kupcima, projektima, proizvodima, Drive strukturi...</div>
      </div>

      {/* Chat History */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {history.map((h, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <div style={{ background: "#f97316", color: "#fff", padding: "10px 16px", borderRadius: "14px 14px 4px 14px", fontSize: 13, maxWidth: "70%" }}>{h.q}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ background: "#292524", color: "#d6d3d1", padding: "14px 18px", borderRadius: "14px 14px 14px 4px", fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.6, maxWidth: "85%" }}>{h.a}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 10 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAI()}
          placeholder="Pitaj MOLTY..." style={{
            flex: 1, background: "#1c1917", border: "1px solid #292524", color: "#e7e5e4", padding: "14px 18px", borderRadius: 12, fontSize: 14, outline: "none"
          }} />
        <button onClick={handleAI} style={{ background: "#f97316", color: "#fff", border: "none", padding: "14px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Pitaj ⬡</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "◈" },
    { id: "customers", label: "Kupci", icon: "◉" },
    { id: "drive", label: "Drive Mapa", icon: "◫" },
    { id: "products", label: "Proizvodi", icon: "◆" },
    { id: "projects", label: "Projekti", icon: "▦" },
    { id: "insights", label: "AI Insights", icon: "◎" },
    { id: "ai", label: "MOLTY AI", icon: "⬡" },
  ];

  const tabTitles = { dashboard: "Dashboard", customers: "CRM — Kupci", drive: "Google Drive Mapa", products: "Calderys Proizvodi", projects: "Pipeline Projekata", insights: "AI Preporuke", ai: "MOLTY AI Asistent" };

  return (
    <div style={{ fontFamily: "'Söhne', 'SF Pro', -apple-system, system-ui, sans-serif", background: "#0c0a09", color: "#e7e5e4", minHeight: "100vh", fontSize: 14 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #44403c; border-radius: 3px; }
        input, textarea { font-family: inherit; }
        body { margin: 0; background: #0c0a09; }
      `}</style>

      {/* Header */}
      <div style={{ background: "#1a1a1a", borderBottom: "1px solid #292524", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #f97316, #ea580c)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#fff" }}>M</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, background: "linear-gradient(90deg, #f97316, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MOLTY</div>
            <div style={{ fontSize: 10, color: "#78716c", letterSpacing: 2 }}>BUSINESS INTELLIGENCE v6.2</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.id !== "customers") setSelectedCustomer(null); }} style={{
              background: tab === t.id ? "#f97316" : "transparent", color: tab === t.id ? "#fff" : "#78716c",
              border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6
            }}
              onMouseEnter={e => { if (tab !== t.id) e.currentTarget.style.color = "#d6d3d1"; }}
              onMouseLeave={e => { if (tab !== t.id) e.currentTarget.style.color = "#78716c"; }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#f5f5f4", marginBottom: 20 }}>{tabTitles[tab]}</div>
        {tab === "dashboard" && <Dashboard setTab={setTab} setSelectedCustomer={setSelectedCustomer} />}
        {tab === "customers" && <CustomersTab selected={selectedCustomer} setSelected={setSelectedCustomer} />}
        {tab === "drive" && <DriveTab />}
        {tab === "products" && <ProductsTab />}
        {tab === "projects" && <ProjectsTab />}
        {tab === "insights" && <InsightsTab />}
        {tab === "ai" && <MoltyAITab />}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #292524", padding: "16px 28px", textAlign: "center", color: "#57534e", fontSize: 11, marginTop: 40 }}>
        MOLTY v6.2 — Volcano Refractory d.o.o. / Calderys Serbia — {new Date().getFullYear()}
      </div>
    </div>
  );
}
