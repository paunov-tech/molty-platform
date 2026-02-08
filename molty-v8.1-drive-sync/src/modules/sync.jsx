// ═══════════════════════════════════════════════════
// MOLTY MODULE: Drive Sync — Auto Pipeline
// Skeniraj → Parsiraj → Ažuriraj kupce automatski
// ═══════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef } from "react";
import { C, fm, fe } from "../core/theme.js";
import { Card, Stat, Badge, SectionTitle } from "../core/ui.jsx";
import { store, useCustomers } from "../core/store.js";

// ── API Helpers ──
const api = async (mode, params = {}) => {
  const qs = new URLSearchParams({ mode, ...params }).toString();
  const r = await fetch(`/api/drive-sync?${qs}`);
  return r.json();
};
const parseDoc = async (docId) => {
  const r = await fetch(`/api/parse-doc?docId=${docId}`);
  return r.json();
};

// ── Helpers ──
const timeAgo = (d) => {
  if (!d) return "";
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days}d`;
};

const daysBetween = (d1, d2) => Math.floor(Math.abs(new Date(d1) - new Date(d2)) / 86400000);

const mimeIcon = (m) => {
  if (!m) return "📄";
  if (m.includes("spreadsheet")) return "📊";
  if (m.includes("document") || m.includes("word")) return "📝";
  if (m.includes("pdf")) return "📕";
  if (m.includes("image")) return "🖼️";
  return "📄";
};

// ── Customer name matching ──
function matchCustomer(folderName, customers) {
  if (!folderName) return null;
  const fn = folderName.toLowerCase().trim();
  
  for (const c of customers) {
    const name = c.name?.toLowerCase() || "";
    const aka = c.aka?.toLowerCase() || "";
    
    if (fn === name || fn === aka) return c;
    if (fn.includes(aka) || aka.includes(fn)) return c;
    if (fn.includes(name) || name.includes(fn)) return c;
    
    const keywords = [
      ...name.split(/\s+/).filter(w => w.length > 3),
      ...aka.split(/\s+/).filter(w => w.length > 3),
    ];
    for (const kw of keywords) {
      if (fn.includes(kw)) return c;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════
// PIPELINE STEPS
// ═══════════════════════════════════════════════════

async function stepScan(sinceDays) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  const res = await api("recent", { since });
  if (!res.success) throw new Error(res.error || "Scan failed");
  return res;
}

function stepFilter(files) {
  return files.filter(f =>
    f.mimeType?.includes("document") || f.mimeType?.includes("word")
  );
}

async function stepParse(docs, onProgress) {
  const results = [];
  for (let i = 0; i < docs.length; i++) {
    onProgress(i + 1, docs.length, docs[i].name);
    try {
      const res = await parseDoc(docs[i].id);
      if (res.success && res.parsed) {
        results.push({ file: docs[i], parsed: res.parsed });
      }
    } catch (e) {
      results.push({ file: docs[i], error: e.message });
    }
    if (i < docs.length - 1) await new Promise(r => setTimeout(r, 500));
  }
  return results;
}

function stepApply(parsedResults, customers) {
  const changes = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const { file, parsed } of parsedResults) {
    if (!parsed) continue;

    const customer = matchCustomer(file.customerFolder, customers)
      || matchCustomer(parsed.customer?.name, customers);

    if (customer && (parsed.type === "invoice" || parsed.type === "offer")) {
      const updates = {};
      let changed = false;

      if (parsed.date && (!customer.lastOrder || parsed.date > customer.lastOrder)) {
        updates.lastOrder = parsed.date;
        updates.daysIdle = daysBetween(parsed.date, today);
        updates.status = "active";
        changed = true;
      }

      if (parsed.totalAmount && parsed.currency === "EUR") {
        updates.revenue = (customer.revenue || 0) + parsed.totalAmount;
        updates.invoices = (customer.invoices || 0) + 1;
        updates.items = (customer.items || 0) + (parsed.items?.length || 0);
        changed = true;
      }

      if (parsed.items?.length > 0) {
        const newMats = parsed.items.map(it => it.material).filter(Boolean);
        const existing = customer.topMaterials || [];
        const merged = [...new Set([...existing, ...newMats])];
        if (merged.length > existing.length) {
          updates.topMaterials = merged;
          changed = true;
        }
      }

      if (parsed.date) {
        const year = parsed.date.slice(0, 4);
        if (customer.period) {
          const [startY, endY] = customer.period.split("-");
          const newStart = year < startY ? year : startY;
          const newEnd = year > endY ? year : endY;
          if (newStart !== startY || newEnd !== endY) {
            updates.period = `${newStart}-${newEnd}`;
            changed = true;
          }
        }
      }

      if (changed) {
        store.update("customers", customer.id, updates);
        changes.push({
          type: "customer_update",
          customer: customer.name,
          aka: customer.aka,
          updates,
          source: file.name,
          docNumber: parsed.documentNumber,
          total: parsed.totalAmount,
          currency: parsed.currency,
        });
      }
    }

    if (parsed.items) {
      const existingMats = store.get("materials").map(m => m.name.toLowerCase());
      for (const item of parsed.items) {
        if (item.material && !existingMats.includes(item.material.toLowerCase())) {
          store.add("materials", {
            name: item.material,
            category: "Imported",
            unit: item.unit || "kg",
            price: item.unitPrice || 0,
            totalKg: item.quantity || 0,
            totalEur: item.totalPrice || 0,
            source: `${file.customerFolder} / ${file.name}`,
          });
          existingMats.push(item.material.toLowerCase());
          changes.push({
            type: "new_material",
            material: item.material,
            source: file.customerFolder,
          });
        }
      }
    }
  }

  store.log("drive_sync", {
    parsed: parsedResults.length,
    changes: changes.length,
    timestamp: today,
  });

  return changes;
}

// ═══════════════════════════════════════════════════
// FEED ITEM COMPONENT
// ═══════════════════════════════════════════════════
function FeedItem({ item }) {
  if (item.type === "customer_update") {
    return (
      <div style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.brd}` }}>
        <span style={{ fontSize: 18 }}>🏭</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.tx }}>
            {item.customer} <span style={{ color: C.txD, fontWeight: 400 }}>({item.aka})</span>
          </div>
          <div style={{ fontSize: 10, color: C.txM, marginTop: 2 }}>
            {item.docNumber && <span>📋 {item.docNumber} · </span>}
            {item.total && <span style={{ color: C.or, fontWeight: 700 }}>{item.currency === "EUR" ? "€" : ""}{fm(item.total)} · </span>}
            {item.updates.lastOrder && <span>📅 {item.updates.lastOrder} · </span>}
            {item.updates.status === "active" && <Badge color={C.gr} sm>REAKTIVIRAN</Badge>}
          </div>
          <div style={{ fontSize: 9, color: C.txD, marginTop: 2 }}>iz: {item.source}</div>
        </div>
      </div>
    );
  }
  if (item.type === "new_material") {
    return (
      <div style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.brd}` }}>
        <span style={{ fontSize: 14 }}>🧱</span>
        <div>
          <div style={{ fontSize: 11, color: C.cy }}>+ {item.material}</div>
          <div style={{ fontSize: 9, color: C.txD }}>{item.source}</div>
        </div>
      </div>
    );
  }
  if (item.type === "new_file") {
    return (
      <div style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.brd}` }}>
        <span style={{ fontSize: 14 }}>{mimeIcon(item.mimeType)}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
          <div style={{ fontSize: 9, color: C.txD }}>📁 {item.folder} · {timeAgo(item.modified)}</div>
        </div>
        {item.link && (
          <a href={item.link} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 9, color: C.bl, textDecoration: "none" }}>↗</a>
        )}
      </div>
    );
  }
  return null;
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function Sync() {
  const customers = useCustomers();
  const [status, setStatus] = useState("checking");
  const [statusMsg, setStatusMsg] = useState("");
  const [sinceDays, setSinceDays] = useState(30);
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState("");
  const [feed, setFeed] = useState([]);
  const [parseStats, setParseStats] = useState(null);
  const [lastSync, setLastSync] = useState(() => {
    try { return localStorage.getItem("molty_last_sync") || null; } catch { return null; }
  });
  const abortRef = useRef(false);

  // ── Health check ──
  useEffect(() => {
    (async () => {
      try {
        const res = await api("health");
        if (res.success) {
          setStatus("connected");
          setStatusMsg(res.rootFolder);
        } else {
          setStatus("error");
          setStatusMsg(res.error || res.hint);
        }
      } catch {
        setStatus("disconnected");
        setStatusMsg("API nije dostupan");
      }
    })();
  }, []);

  // ── FULL AUTO-SYNC PIPELINE ──
  const runSync = useCallback(async (mode = "full") => {
    abortRef.current = false;
    const newFeed = [];

    try {
      // STEP 1: Scan
      setPhase("scanning");
      setProgress("Skeniram Google Drive...");
      const scanRes = await stepScan(sinceDays);

      for (const f of scanRes.files || []) {
        newFeed.push({
          type: "new_file", name: f.name, folder: f.customerFolder,
          mimeType: f.mimeType, modified: f.modifiedTime, link: f.webViewLink,
        });
      }

      if (abortRef.current) { setPhase("idle"); return; }

      if (mode === "scan") {
        setFeed(newFeed);
        setParseStats({ totalFiles: scanRes.count, docsFound: 0, parsed: 0, errors: 0, customerUpdates: 0, newMaterials: 0 });
        setPhase("done");
        const now = new Date().toISOString();
        setLastSync(now);
        try { localStorage.setItem("molty_last_sync", now); } catch {}
        return;
      }

      // STEP 2: Filter
      setPhase("filtering");
      setProgress("Filtriram dokumente...");
      const docs = stepFilter(scanRes.files || []);
      
      if (docs.length === 0) {
        setFeed(newFeed);
        setParseStats({ totalFiles: scanRes.count, docsFound: 0, parsed: 0, errors: 0, customerUpdates: 0, newMaterials: 0 });
        setPhase("done");
        return;
      }

      // STEP 3: Parse
      setPhase("parsing");
      const parsed = await stepParse(docs, (cur, tot, name) => {
        setProgress(`🧠 Parsiram ${cur}/${tot}: ${name}`);
      });

      if (abortRef.current) { setPhase("idle"); return; }

      // STEP 4: Apply
      setPhase("applying");
      setProgress("Ažuriram kupce i materijale...");
      const changes = stepApply(parsed.filter(r => r.parsed), customers);

      const changeFeed = changes.map(c => ({ ...c }));
      setFeed([...changeFeed, ...newFeed]);
      setParseStats({
        totalFiles: scanRes.count,
        docsFound: docs.length,
        parsed: parsed.filter(r => r.parsed).length,
        errors: parsed.filter(r => r.error).length,
        customerUpdates: changes.filter(c => c.type === "customer_update").length,
        newMaterials: changes.filter(c => c.type === "new_material").length,
      });

      const now = new Date().toISOString();
      setLastSync(now);
      try { localStorage.setItem("molty_last_sync", now); } catch {}
      setPhase("done");
      setProgress("");

    } catch (e) {
      setProgress(`❌ Greška: ${e.message}`);
      setPhase("idle");
    }
  }, [sinceDays, customers]);

  const abort = () => { abortRef.current = true; setPhase("idle"); setProgress("Prekinuto."); };

  // ═══ RENDER ═══
  const isRunning = phase !== "idle" && phase !== "done";

  // ── DISCONNECTED ──
  if (status === "disconnected" || status === "error") {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <Card style={{ borderColor: C.rd + "44" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.rd }} />
            <span style={{ fontSize: 12, color: C.rd, fontWeight: 600 }}>Nije povezan</span>
          </div>
          <div style={{ fontSize: 11, color: C.txM, padding: "8px 12px", background: C.sf, borderRadius: 6 }}>{statusMsg}</div>
          <div style={{ fontSize: 11, color: C.txM, marginTop: 12, lineHeight: 1.8 }}>
            Potrebno: Vercel env vars → <code style={{ color: C.cy }}>GOOGLE_SERVICE_ACCOUNT_KEY</code> + <code style={{ color: C.cy }}>ANTHROPIC_API_KEY</code>
          </div>
        </Card>
      </div>
    );
  }

  if (status === "checking") {
    return <div style={{ textAlign: "center", padding: 40, color: C.txD }}>📡 Provera konekcije...</div>;
  }

  // ── CONNECTED ──
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.gr, boxShadow: `0 0 6px ${C.gr}` }} />
        <span style={{ fontSize: 11, color: C.gr, fontWeight: 600 }}>Povezan</span>
        <span style={{ fontSize: 10, color: C.txD }}>📂 {statusMsg}</span>
        {lastSync && <span style={{ fontSize: 10, color: C.txD, marginLeft: "auto" }}>Poslednji sync: {timeAgo(lastSync)}</span>}
      </div>

      {/* Stats */}
      {parseStats && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <Stat label="Fajlova" value={parseStats.totalFiles} icon="📄" color={C.bl} />
          <Stat label="Parsirano" value={parseStats.parsed} sub={parseStats.errors > 0 ? `${parseStats.errors} grešaka` : ""} icon="🧠" color={C.pu} />
          <Stat label="Kupci Ažurirani" value={parseStats.customerUpdates} icon="🏭" color={C.gr} />
          <Stat label="Novi Materijali" value={parseStats.newMaterials} icon="🧱" color={C.cy} />
        </div>
      )}

      {/* Controls */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: C.txD }}>Period:</span>
          {[7, 30, 90, 365].map(d => (
            <button key={d} onClick={() => setSinceDays(d)}
              style={{ padding: "3px 10px", borderRadius: 4, border: "none",
                background: sinceDays === d ? C.or + "20" : "transparent",
                color: sinceDays === d ? C.or : C.txD,
                fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
              {d}d
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {isRunning
            ? <button onClick={abort} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.rd}55`,
                background: C.rd + "15", color: C.rd, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                ⏹ Prekini
              </button>
            : <>
                <button onClick={() => runSync("full")} disabled={isRunning}
                  style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.or}55`,
                    background: C.or + "15", color: C.or, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  ⚡ AUTO SYNC
                </button>
                <button onClick={() => runSync("scan")} disabled={isRunning}
                  style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.bl}55`,
                    background: C.bl + "15", color: C.bl, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  👁 Samo Skeniraj
                </button>
              </>
          }
        </div>
      </Card>

      {/* Progress */}
      {isRunning && (
        <Card style={{ marginBottom: 14, borderColor: C.or + "44" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 20, height: 20, border: `2px solid ${C.or}`, borderTopColor: "transparent",
              borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <div>
              <div style={{ fontSize: 11, color: C.or, fontWeight: 600 }}>
                {phase === "scanning" && "📡 Skeniram Drive..."}
                {phase === "filtering" && "🔍 Filtriram dokumente..."}
                {phase === "parsing" && "🧠 Claude parsira..."}
                {phase === "applying" && "💾 Ažuriram bazu..."}
              </div>
              <div style={{ fontSize: 10, color: C.txM, marginTop: 2 }}>{progress}</div>
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
        </Card>
      )}

      {/* Activity Feed */}
      {feed.length > 0 && (
        <div>
          {feed.some(f => f.type === "customer_update" || f.type === "new_material") && (
            <Card style={{ marginBottom: 10, borderColor: C.gr + "33" }}>
              <SectionTitle>✅ Promene ({feed.filter(f => f.type !== "new_file").length})</SectionTitle>
              {feed.filter(f => f.type !== "new_file").map((item, i) => (
                <FeedItem key={`c${i}`} item={item} />
              ))}
            </Card>
          )}

          <Card>
            <SectionTitle>📄 Dokumenti ({feed.filter(f => f.type === "new_file").length})</SectionTitle>
            {(() => {
              const byFolder = {};
              for (const f of feed.filter(f => f.type === "new_file")) {
                const key = f.folder || "Ostalo";
                if (!byFolder[key]) byFolder[key] = [];
                byFolder[key].push(f);
              }
              return Object.entries(byFolder)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([folder, files]) => (
                  <div key={folder} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "6px 0", borderBottom: `1px solid ${C.brd}` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.bl }}>📁 {folder}</span>
                      <Badge color={C.bl} sm>{files.length}</Badge>
                    </div>
                    {files.map((f, i) => <FeedItem key={`f${i}`} item={f} />)}
                  </div>
                ));
            })()}
          </Card>
        </div>
      )}

      {/* Empty state */}
      {phase === "idle" && feed.length === 0 && (
        <Card style={{ textAlign: "center", padding: 30 }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 13, color: C.tx, fontWeight: 600, marginBottom: 4 }}>Auto Sync</div>
          <div style={{ fontSize: 11, color: C.txM, lineHeight: 1.6 }}>
            Klikni <span style={{ color: C.or, fontWeight: 700 }}>⚡ AUTO SYNC</span> da automatski:<br/>
            📡 Skeniraš Drive → 🧠 Parsiraš fakture → 🏭 Ažuriraš kupce
          </div>
        </Card>
      )}

      {phase === "done" && feed.length === 0 && (
        <Card style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 11, color: C.txM }}>✅ Nema novih dokumenata za poslednjih {sinceDays} dana.</div>
        </Card>
      )}
    </div>
  );
}
