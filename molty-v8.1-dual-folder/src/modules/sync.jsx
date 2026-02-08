// ═══════════════════════════════════════════════════
// MOLTY MODULE: Drive Sync v2 — Auto Pipeline
// Skenira COMMERCIAL folder → Parsira PDF fakture → Ažurira kupce
// ═══════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef } from "react";
import { C, fm, fe } from "../core/theme.js";
import { Card, Stat, Badge, SectionTitle } from "../core/ui.jsx";
import { store, useCustomers } from "../core/store.js";

// ── API ──
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
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};
const daysBetween = (d1, d2) => Math.floor(Math.abs(new Date(d1) - new Date(d2)) / 86400000);
const mimeIcon = (m) => {
  if (!m) return "📄";
  if (m.includes("spreadsheet")) return "📊";
  if (m.includes("document") || m.includes("word")) return "📝";
  if (m === "application/pdf") return "📕";
  if (m.includes("image")) return "🖼️";
  return "📄";
};
const isParseable = (m) => m === "application/pdf" || m?.includes("document") || m?.includes("word");

// ── Customer matching ──
function matchCustomer(folderName, customers) {
  if (!folderName) return null;
  const fn = folderName.toLowerCase().trim();
  for (const c of customers) {
    const name = c.name?.toLowerCase() || "";
    const aka = c.aka?.toLowerCase() || "";
    if (fn === name || fn === aka) return c;
    if (aka && (fn.includes(aka) || aka.includes(fn))) return c;
    if (name && (fn.includes(name) || name.includes(fn))) return c;
    const keywords = [...name.split(/\s+/), ...aka.split(/\s+/)].filter(w => w.length > 3);
    for (const kw of keywords) { if (fn.includes(kw)) return c; }
  }
  return null;
}

// ═══ PIPELINE ═══
async function stepScan(sinceDays) {
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString();
  const res = await api("recent", { since });
  if (!res.success) throw new Error(res.error || "Scan failed");
  return res;
}

function stepFilter(files) {
  return files.filter(f => isParseable(f.mimeType));
}

async function stepParse(docs, onProgress) {
  const results = [];
  for (let i = 0; i < docs.length; i++) {
    onProgress(i + 1, docs.length, docs[i].name);
    try {
      const res = await parseDoc(docs[i].id);
      if (res.success && res.parsed) {
        results.push({ file: docs[i], parsed: res.parsed });
      } else {
        results.push({ file: docs[i], error: res.message || "No data" });
      }
    } catch (e) {
      results.push({ file: docs[i], error: e.message });
    }
    if (i < docs.length - 1) await new Promise(r => setTimeout(r, 800));
  }
  return results;
}

function stepApply(parsedResults, customers) {
  const changes = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const { file, parsed } of parsedResults) {
    if (!parsed) continue;
    const customer = matchCustomer(file.customerFolder, customers) || matchCustomer(parsed.customer?.name, customers);

    if (customer && (parsed.type === "invoice" || parsed.type === "offer" || parsed.type === "order")) {
      const updates = {};
      let changed = false;

      if (parsed.date && (!customer.lastOrder || parsed.date > customer.lastOrder)) {
        updates.lastOrder = parsed.date;
        updates.daysIdle = daysBetween(parsed.date, today);
        updates.status = "active";
        changed = true;
      }
      if (parsed.totalAmount && (parsed.currency === "EUR" || !parsed.currency)) {
        updates.revenue = (customer.revenue || 0) + parsed.totalAmount;
        updates.invoices = (customer.invoices || 0) + 1;
        changed = true;
      }
      if (parsed.items?.length > 0) {
        const newMats = parsed.items.map(it => it.material).filter(Boolean);
        const existing = customer.topMaterials || [];
        const merged = [...new Set([...existing, ...newMats])];
        if (merged.length > existing.length) { updates.topMaterials = merged; changed = true; }
      }
      if (parsed.date && customer.period) {
        const year = parsed.date.slice(0, 4);
        const [startY, endY] = customer.period.split("-");
        const ns = year < startY ? year : startY;
        const ne = year > endY ? year : endY;
        if (ns !== startY || ne !== endY) { updates.period = `${ns}-${ne}`; changed = true; }
      }

      if (changed) {
        store.update("customers", customer.id, updates);
        changes.push({
          type: "customer_update", customer: customer.name, aka: customer.aka,
          updates, source: file.name, docNumber: parsed.documentNumber,
          total: parsed.totalAmount, currency: parsed.currency,
        });
      }
    }

    // New materials
    if (parsed.items) {
      const existingMats = store.get("materials").map(m => m.name.toLowerCase());
      for (const item of parsed.items) {
        if (item.material && !existingMats.includes(item.material.toLowerCase())) {
          store.add("materials", {
            name: item.material, category: "Imported", unit: item.unit || "kg",
            price: item.unitPrice || 0, totalKg: item.quantity || 0,
            totalEur: item.totalPrice || 0, source: `${file.customerFolder} / ${file.name}`,
          });
          existingMats.push(item.material.toLowerCase());
          changes.push({ type: "new_material", material: item.material, source: file.customerFolder });
        }
      }
    }
  }

  store.log("drive_sync", { parsed: parsedResults.length, changes: changes.length, timestamp: today });
  return changes;
}

// ═══ FEED ITEM ═══
function FeedItem({ item }) {
  const s = { display: "flex", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.brd}` };
  if (item.type === "customer_update") return (
    <div style={s}>
      <span style={{ fontSize: 18 }}>🏭</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.tx }}>
          {item.customer} <span style={{ color: C.txD, fontWeight: 400 }}>({item.aka})</span>
        </div>
        <div style={{ fontSize: 10, color: C.txM, marginTop: 2 }}>
          {item.docNumber && <span>📋 {item.docNumber} · </span>}
          {item.total != null && <span style={{ color: C.or, fontWeight: 700 }}>€{fm(item.total)} · </span>}
          {item.updates.lastOrder && <span>📅 {item.updates.lastOrder}</span>}
        </div>
        <div style={{ fontSize: 9, color: C.txD, marginTop: 2 }}>iz: {item.source}</div>
      </div>
    </div>
  );
  if (item.type === "new_material") return (
    <div style={s}>
      <span style={{ fontSize: 14 }}>🧱</span>
      <div>
        <div style={{ fontSize: 11, color: C.cy }}>+ {item.material}</div>
        <div style={{ fontSize: 9, color: C.txD }}>{item.source}</div>
      </div>
    </div>
  );
  if (item.type === "new_file") return (
    <div style={s}>
      <span style={{ fontSize: 14 }}>{mimeIcon(item.mimeType)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: C.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
        <div style={{ fontSize: 9, color: C.txD }}>
          📁 {item.folder}{item.subfolder ? ` / ${item.subfolder}` : ""} · {timeAgo(item.modified)}
          {isParseable(item.mimeType) && <span style={{ color: C.pu, marginLeft: 6 }}>🧠 parseable</span>}
        </div>
      </div>
      {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: C.bl, textDecoration: "none" }}>↗</a>}
    </div>
  );
  if (item.type === "parse_error") return (
    <div style={s}>
      <span style={{ fontSize: 14 }}>⚠️</span>
      <div>
        <div style={{ fontSize: 11, color: C.rd }}>{item.name}</div>
        <div style={{ fontSize: 9, color: C.txD }}>{item.error}</div>
      </div>
    </div>
  );
  return null;
}

// ═══ MAIN ═══
export default function Sync() {
  const customers = useCustomers();
  const [status, setStatus] = useState("checking");
  const [health, setHealth] = useState(null);
  const [sinceDays, setSinceDays] = useState(30);
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState("");
  const [feed, setFeed] = useState([]);
  const [stats, setStats] = useState(null);
  const [lastSync, setLastSync] = useState(() => {
    try { return localStorage.getItem("molty_last_sync") || null; } catch { return null; }
  });
  const abortRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api("health");
        setHealth(res);
        setStatus(res.success && res.commercialAccessible ? "connected" : res.success ? "partial" : "error");
      } catch { setStatus("disconnected"); }
    })();
  }, []);

  const runSync = useCallback(async (mode = "full") => {
    abortRef.current = false;
    const newFeed = [];

    try {
      setPhase("scanning");
      setProgress("📡 Skeniram komercijalni folder...");
      const scanRes = await stepScan(sinceDays);

      for (const f of scanRes.files || []) {
        newFeed.push({
          type: "new_file", name: f.name, folder: f.customerFolder,
          subfolder: f.subfolder, mimeType: f.mimeType,
          modified: f.modifiedTime, link: f.webViewLink,
        });
      }

      if (abortRef.current) { setPhase("idle"); return; }
      if (mode === "scan") {
        setFeed(newFeed);
        setStats({ totalFiles: scanRes.count, folders: scanRes.customerFolders, docsFound: 0, parsed: 0, errors: 0, customerUpdates: 0, newMaterials: 0 });
        setPhase("done");
        const now = new Date().toISOString();
        setLastSync(now);
        try { localStorage.setItem("molty_last_sync", now); } catch {}
        return;
      }

      // Filter parseable
      setPhase("filtering");
      setProgress("🔍 Tražim fakture (PDF/Docs)...");
      const docs = stepFilter(scanRes.files || []);

      if (docs.length === 0) {
        setFeed(newFeed);
        setStats({ totalFiles: scanRes.count, folders: scanRes.customerFolders, docsFound: 0, parsed: 0, errors: 0, customerUpdates: 0, newMaterials: 0 });
        setPhase("done");
        return;
      }

      // Parse
      setPhase("parsing");
      const parsed = await stepParse(docs, (cur, tot, name) => {
        setProgress(`🧠 Parsiram ${cur}/${tot}: ${name}`);
      });
      if (abortRef.current) { setPhase("idle"); return; }

      // Add parse errors to feed
      for (const r of parsed) {
        if (r.error) newFeed.unshift({ type: "parse_error", name: r.file.name, error: r.error });
      }

      // Apply
      setPhase("applying");
      setProgress("💾 Ažuriram kupce i materijale...");
      const changes = stepApply(parsed.filter(r => r.parsed), customers);

      setFeed([...changes, ...newFeed]);
      setStats({
        totalFiles: scanRes.count, folders: scanRes.customerFolders,
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
      setProgress(`❌ ${e.message}`);
      setPhase("idle");
    }
  }, [sinceDays, customers]);

  const abort = () => { abortRef.current = true; setPhase("idle"); setProgress("Prekinuto."); };
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
          <div style={{ fontSize: 11, color: C.txM, padding: "8px 12px", background: C.sf, borderRadius: 6 }}>
            {health?.error || "API nije dostupan"}
          </div>
          <div style={{ fontSize: 11, color: C.txM, marginTop: 12, lineHeight: 1.8 }}>
            Env vars: <code style={{ color: C.cy }}>GOOGLE_SERVICE_ACCOUNT_KEY</code>, <code style={{ color: C.cy }}>COMMERCIAL_FOLDER_ID</code>, <code style={{ color: C.cy }}>ANTHROPIC_API_KEY</code>
          </div>
        </Card>
      </div>
    );
  }

  if (status === "checking") {
    return <div style={{ textAlign: "center", padding: 40, color: C.txD }}>📡 Provera konekcije...</div>;
  }

  // ── PARTIAL (root OK, commercial missing) ──
  if (status === "partial") {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <Card style={{ borderColor: C.or + "44" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.or }} />
            <span style={{ fontSize: 12, color: C.or, fontWeight: 600 }}>Delimično povezan</span>
          </div>
          <div style={{ fontSize: 11, color: C.txM, lineHeight: 1.8 }}>
            ✅ Root folder: <strong>{health?.rootFolder}</strong><br/>
            ❌ Komercijalni folder: <strong>nema pristup</strong><br/><br/>
            Podeli folder sa fakturama sa:<br/>
            <code style={{ color: C.cy, fontSize: 10 }}>molty-reader@molty-486812.iam.gserviceaccount.com</code><br/><br/>
            Zatim dodaj u Vercel env vars:<br/>
            <code style={{ color: C.cy, fontSize: 10 }}>COMMERCIAL_FOLDER_ID = 1zsDeckOseY0gMerBHU8nG0p-qKXDV8bN</code>
          </div>
        </Card>
      </div>
    );
  }

  // ── CONNECTED ──
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.gr, boxShadow: `0 0 6px ${C.gr}` }} />
        <span style={{ fontSize: 11, color: C.gr, fontWeight: 600 }}>Povezan</span>
        <span style={{ fontSize: 10, color: C.txD }}>📂 {health?.commercialFolder || "Commercial"}</span>
        {lastSync && <span style={{ fontSize: 10, color: C.txD, marginLeft: "auto" }}>Sync: {timeAgo(lastSync)}</span>}
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <Stat label="Folderi" value={stats.folders} icon="📁" color={C.bl} />
          <Stat label="Fajlova" value={stats.totalFiles} icon="📄" color={C.bl} />
          <Stat label="Parsirano" value={stats.parsed} sub={stats.errors > 0 ? `${stats.errors} err` : ""} icon="🧠" color={C.pu} />
          <Stat label="Kupci" value={stats.customerUpdates} icon="🏭" color={C.gr} />
          <Stat label="Materijali" value={stats.newMaterials} icon="🧱" color={C.cy} />
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
                color: sinceDays === d ? C.or : C.txD, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
              {d}d
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {isRunning
            ? <button onClick={abort} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.rd}55`,
                background: C.rd + "15", color: C.rd, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>⏹ Prekini</button>
            : <>
                <button onClick={() => runSync("full")} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.or}55`,
                  background: C.or + "15", color: C.or, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>⚡ AUTO SYNC</button>
                <button onClick={() => runSync("scan")} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.bl}55`,
                  background: C.bl + "15", color: C.bl, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>👁 Skeniraj</button>
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
                {phase === "scanning" && "📡 Skeniram..."}
                {phase === "filtering" && "🔍 Filtriram..."}
                {phase === "parsing" && "🧠 Claude parsira..."}
                {phase === "applying" && "💾 Ažuriram..."}
              </div>
              <div style={{ fontSize: 10, color: C.txM, marginTop: 2 }}>{progress}</div>
            </div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
        </Card>
      )}

      {/* Feed */}
      {feed.length > 0 && (
        <div>
          {feed.some(f => f.type === "customer_update" || f.type === "new_material") && (
            <Card style={{ marginBottom: 10, borderColor: C.gr + "33" }}>
              <SectionTitle>✅ Promene ({feed.filter(f => f.type === "customer_update" || f.type === "new_material").length})</SectionTitle>
              {feed.filter(f => f.type === "customer_update" || f.type === "new_material").map((item, i) => <FeedItem key={`c${i}`} item={item} />)}
            </Card>
          )}
          {feed.some(f => f.type === "parse_error") && (
            <Card style={{ marginBottom: 10, borderColor: C.rd + "33" }}>
              <SectionTitle>⚠️ Greške parsiranja</SectionTitle>
              {feed.filter(f => f.type === "parse_error").map((item, i) => <FeedItem key={`e${i}`} item={item} />)}
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
              return Object.entries(byFolder).sort((a, b) => b[1].length - a[1].length).map(([folder, files]) => (
                <div key={folder} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.brd}` }}>
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

      {phase === "idle" && feed.length === 0 && (
        <Card style={{ textAlign: "center", padding: 30 }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 13, color: C.tx, fontWeight: 600, marginBottom: 4 }}>Auto Sync Pipeline</div>
          <div style={{ fontSize: 11, color: C.txM, lineHeight: 1.6 }}>
            📡 Skenira komercijalni folder → 🧠 Claude parsira PDF fakture → 🏭 Ažurira kupce<br/>
            <span style={{ color: C.or, fontWeight: 700 }}>⚡ AUTO SYNC</span> za kompletan pipeline · <span style={{ color: C.bl, fontWeight: 700 }}>👁 Skeniraj</span> samo da vidiš fajlove
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
