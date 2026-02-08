import { useState, useEffect, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
// MOLTY v7.0 — REAL-TIME CONNECTED EDITION
// Powered by SIAL Python Miner & Google Sheets
// ═══════════════════════════════════════════════════════════════

// 👇 TVOJ LINK JE UBACEN OVDE 👇
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzZG7Ih0wrElS5pQazbsfh5RlRIsR5ShrsTPOOgi9uEDF7dsiXoxKZEmOGAwKgTw/pub?output=csv";

function App() {
  const [tab, setTab] = useState("dashboard");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Stanja za podatke iz Baze
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // --- 1. FUNKCIJA ZA POVLAČENJE PODATAKA IZ GOOGLE SHEETA ---
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        const text = await response.text();
        
        // Jednostavan CSV parser (Google Sheets format)
        const rows = text.split('\n').slice(1); // Preskačemo zaglavlje (prvi red)
        
        const parsedProducts = rows.map((row, index) => {
          // Razdvajanje po zarezu (ignorišemo zareze unutar navodnika)
          const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
          
          if (cols.length < 3) return null;

          // Mapiranje kolona iz Python Rudara:
          // 0: Šifra | 1: Naziv | 2: Klijent | 3: Cena | 4: Datum
          return {
            id: index,
            code: cols[0]?.replace(/"/g, "").trim() || "N/A",
            name: cols[1]?.replace(/"/g, "").trim() || "Nepoznato",
            client: cols[2]?.replace(/"/g, "").trim() || "Stock",
            price: parseFloat(cols[3]?.replace(/"/g, "").replace(",", ".")) || 0,
            date: cols[4]?.replace(/"/g, "").trim() || "-",
            // Kategorizacija na osnovu imena za lepši prikaz
            category: (cols[1] || "").toUpperCase().includes("CAST") ? "Betoni" : 
                      (cols[1] || "").toUpperCase().includes("BRICK") ? "Opeke" : 
                      (cols[1] || "").toUpperCase().includes("MIX") ? "Mase" : "Ostalo"
          };
        }).filter(item => item !== null && item.price > 0 && item.name.length > 2);

        setProducts(parsedProducts);
        setLastUpdate(new Date().toLocaleDateString("sr-RS"));
        setLoading(false);

      } catch (error) {
        console.error("Greška pri učitavanju baze:", error);
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // --- 2. STATISTIKA NA OSNOVU PRAVIH PODATAKA ---
  const stats = useMemo(() => {
    const totalItems = products.length;
    const avgPrice = products.reduce((acc, p) => acc + p.price, 0) / (totalItems || 1);
    const topProduct = [...products].sort((a,b) => b.price - a.price)[0];
    
    // Brojanje jedinstvenih klijenata
    const uniqueClients = [...new Set(products.map(p => p.client))].filter(c => c && c.length > 3).length;

    return { totalItems, avgPrice, topProduct, uniqueClients };
  }, [products]);


  // --- KOMPONENTE (UI) ---

  const SidebarItem = ({ id, label, icon }) => (
    <div 
      onClick={() => setTab(id)}
      style={{
        padding: "12px 16px", cursor: "pointer", borderRadius: 8, marginBottom: 4,
        backgroundColor: tab === id ? "#292524" : "transparent",
        color: tab === id ? "#f97316" : "#a8a29e",
        display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s"
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontWeight: 500 }}>{label}</span>
    </div>
  );

  const StatCard = ({ title, value, sub, color = "#f97316" }) => (
    <div style={{ backgroundColor: "#1c1917", padding: 24, borderRadius: 12, border: "1px solid #292524", flex: 1 }}>
      <div style={{ color: "#a8a29e", fontSize: 13, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{title}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#fafaf9" }}>{value}</div>
      <div style={{ color: color, fontSize: 13, marginTop: 4 }}>{sub}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#0c0a09", color: "#fafaf9", fontFamily: "Inter, sans-serif" }}>
      
      {/* SIDEBAR */}
      <div style={{ width: 260, borderRight: "1px solid #292524", padding: 24, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, paddingLeft: 8 }}>
          <div style={{ width: 32, height: 32, backgroundColor: "#f97316", borderRadius: 6 }}></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1 }}>MOLTY</div>
            <div style={{ fontSize: 10, color: "#78716c", fontWeight: 600 }}>CALDERYS INTEGRATED</div>
          </div>
        </div>
        
        <SidebarItem id="dashboard" label="Dashboard" icon="📊" />
        <SidebarItem id="products" label="Baza Materijala" icon="📦" />
        <SidebarItem id="customers" label="Kupci (CRM)" icon="👥" />
        <SidebarItem id="drive" label="Dokumentacija" icon="📂" />

        <div style={{ marginTop: "auto", padding: 16, backgroundColor: "#1c1917", borderRadius: 12, border: "1px solid #292524" }}>
          <div style={{ fontSize: 11, color: "#78716c", marginBottom: 4 }}>ULOGOVAN KAO</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Miroslav Paunov</div>
          <div style={{ fontSize: 11, color: "#44403c" }}>paunov@calderyserbia.com</div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", padding: 40 }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
            {tab === "dashboard" && "Pregled Poslovanja"}
            {tab === "products" && "Centralna Baza Proizvoda"}
            {tab === "customers" && "Lista Kupaca"}
            {tab === "drive" && "Arhiva Dokumentacije"}
          </h1>
          <div style={{ display: "flex", gap: 12, alignItems: "center", backgroundColor: "#1c1917", padding: "6px 12px", borderRadius: 20, fontSize: 13 }}>
             {loading && <><span style={{animation: "spin 1s linear infinite"}}>🔄</span> <span style={{color: "#f97316"}}>Osvežavam podatke...</span></>}
             {!loading && <><span style={{color: "#22c55e", fontSize: 16}}>●</span> <span style={{color: "#a8a29e"}}>Baza ažurirana: {lastUpdate}</span></>}
          </div>
        </div>

        {/* DASHBOARD TAB */}
        {tab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
             <div style={{ display: "flex", gap: 24 }}>
               <StatCard title="Ukupno Materijala" value={stats.totalItems} sub="Pronađeno u fakturama" />
               <StatCard title="Prosečna Cena" value={`€${stats.avgPrice.toFixed(2)}`} sub="Po toni/komadu" color="#3b82f6" />
               <StatCard title="Aktivni Kupci" value={stats.uniqueClients} sub="Detektovani u folderima" color="#22c55e" />
             </div>

             <div style={{ backgroundColor: "#1c1917", padding: 24, borderRadius: 12, border: "1px solid #292524" }}>
               <h3 style={{ marginTop: 0, color: "#d6d3d1" }}>🔥 Najvredniji Materijal (Top Cena)</h3>
               {stats.topProduct ? (
                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                    <div>
                        <div style={{ fontSize: 24, color: "#f97316", fontWeight: 700 }}>{stats.topProduct.name}</div>
                        <div style={{ color: "#78716c", marginTop: 4 }}>Šifra: {stats.topProduct.code} | Kupac: {stats.topProduct.client} | Datum: {stats.topProduct.date}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: "#fafaf9" }}>€{stats.topProduct.price.toFixed(2)}</div>
                        <div style={{ fontSize: 12, color: "#a8a29e" }}>po jedinici mere</div>
                    </div>
                 </div>
               ) : (
                 <div style={{ color: "#78716c" }}>Učitavam podatke...</div>
               )}
             </div>
          </div>
        )}

        {/* PRODUCTS TAB (Tabela) */}
        {tab === "products" && (
          <div style={{ backgroundColor: "#1c1917", borderRadius: 12, border: "1px solid #292524", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #292524", backgroundColor: "#292524", color: "#a8a29e", textAlign: "left" }}>
                  <th style={{ padding: 16 }}>ŠIFRA</th>
                  <th style={{ padding: 16 }}>NAZIV MATERIJALA</th>
                  <th style={{ padding: 16 }}>KATEGORIJA</th>
                  <th style={{ padding: 16 }}>POSLEDNJI KUPAC</th>
                  <th style={{ padding: 16 }}>DATUM</th>
                  <th style={{ padding: 16, textAlign: "right" }}>CENA (EUR)</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan={6} style={{padding: 40, textAlign: "center", color: "#78716c"}}>Učitavam podatke sa Google Drive-a...</td></tr>
                ) : (
                  products.map((p, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #292524", transition: "background 0.2s" }} 
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "#262626"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                      <td style={{ padding: 16, fontFamily: "monospace", color: "#78716c" }}>{p.code}</td>
                      <td style={{ padding: 16, fontWeight: 500, color: "#e7e5e4" }}>{p.name}</td>
                      <td style={{ padding: 16 }}>
                        <span style={{ 
                            padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                            backgroundColor: p.category === "Betoni" ? "#1e3a8a" : "#3f3f46",
                            color: p.category === "Betoni" ? "#bfdbfe" : "#d6d3d1"
                        }}>{p.category}</span>
                      </td>
                      <td style={{ padding: 16, color: "#a8a29e" }}>{p.client}</td>
                      <td style={{ padding: 16, color: "#78716c", fontSize: 12 }}>{p.date}</td>
                      <td style={{ padding: 16, textAlign: "right", color: "#f97316", fontWeight: 700 }}>{p.price.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* OSTALI TABOVI (Placeholders) */}
        {(tab === "customers" || tab === "drive") && (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: 400, color: "#57534e", border: "2px dashed #292524", borderRadius: 12 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🚧</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Modul u pripremi</div>
            <div style={{ fontSize: 14 }}>Radojka treba da definiše parametre za ovaj deo.</div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
