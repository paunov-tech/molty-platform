// ═══════════════════════════════════════════════════
// MOLTY API: Google Drive Sync v5 — CLEAN
// Searches ONLY under COMMERCIAL folder tree
// ═══════════════════════════════════════════════════
import { google } from 'googleapis';

const COMMERCIAL_FOLDER = process.env.COMMERCIAL_FOLDER_ID || '1zsDeckOseY0gMerBHU8nG0p-qKXDV8bN';

function getDrive() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  let key;
  try { key = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); }
  catch { try { key = JSON.parse(raw); } catch { throw new Error('Invalid key'); } }
  return google.drive({ version: 'v3', auth: new google.auth.GoogleAuth({
    credentials: { client_email: key.client_email, private_key: key.private_key },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  }) });
}

// ── Build folder tree under COMMERCIAL ──
async function buildFolderTree(drive) {
  const allFolders = [];
  let pt = null;
  do {
    const r = await drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'nextPageToken, files(id, name, parents)',
      pageSize: 1000,
      pageToken: pt || undefined,
    });
    allFolders.push(...(r.data.files || []));
    pt = r.data.nextPageToken;
  } while (pt);

  const parentOf = {};
  const nameOf = {};
  for (const f of allFolders) {
    parentOf[f.id] = f.parents?.[0];
    nameOf[f.id] = f.name;
  }

  // Trace up to COMMERCIAL to find top-level customer folder name
  function getCustomerName(folderId) {
    let cur = folderId;
    for (let i = 0; i < 10; i++) {
      const parent = parentOf[cur];
      if (!parent) return null;
      if (parent === COMMERCIAL_FOLDER) return nameOf[cur];
      cur = parent;
    }
    return null;
  }

  const folderToCustomer = {};
  for (const f of allFolders) {
    const cust = getCustomerName(f.id);
    if (cust) folderToCustomer[f.id] = cust;
  }

  return { folderToCustomer, count: Object.keys(folderToCustomer).length };
}

// ── Health ──
async function healthCheck() {
  const drive = getDrive();
  try {
    const r = await drive.files.get({ fileId: COMMERCIAL_FOLDER, fields: 'id,name' });
    return { success: true, connected: true, folder: r.data.name, folderId: COMMERCIAL_FOLDER };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── Search commercial docs ONLY under COMMERCIAL tree ──
async function recentFiles() {
  const drive = getDrive();

  // 1. Build folder tree (1-2 API calls)
  const { folderToCustomer, count: treeSize } = await buildFolderTree(drive);

  // 2. Targeted filename search: keyword × year
  const keywords = ['Invoice', 'Rechnung', 'Angebot', 'Offer', 'Proforma'];
  const years = ['2021', '2022', '2023', '2024', '2025', '2026'];

  const queries = [];
  for (const kw of keywords) {
    for (const yr of years) {
      queries.push(`name contains '${kw}' and name contains '${yr}'`);
    }
  }

  const allFiles = new Map();
  const runQuery = async (filter) => {
    const q = `${filter} and trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
    let pt = null;
    do {
      const r = await drive.files.list({
        q, fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink, parents)',
        pageSize: 500, pageToken: pt || undefined,
      });
      for (const f of (r.data.files || [])) {
        if (!allFiles.has(f.id)) allFiles.set(f.id, f);
      }
      pt = r.data.nextPageToken;
    } while (pt);
  };

  for (let i = 0; i < queries.length; i += 10) {
    await Promise.all(queries.slice(i, i + 10).map(q => runQuery(q)));
  }

  // 3. Filter — ONLY files whose parent is in COMMERCIAL tree
  const enriched = [];
  let skipped = 0;
  for (const f of allFiles.values()) {
    const pid = f.parents?.[0];
    const custName = pid ? folderToCustomer[pid] : null;
    if (!custName) { skipped++; continue; }
    enriched.push({
      id: f.id, name: f.name, mimeType: f.mimeType,
      modifiedTime: f.modifiedTime, size: f.size,
      parentId: pid, customerFolder: custName, _docType: 'commercial',
    });
  }

  enriched.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));
  const customers = [...new Set(enriched.map(f => f.customerFolder))].sort();

  return {
    success: true, count: enriched.length,
    files: enriched,
    customerFolders: customers.length, customerNames: customers,
    skipped, treeSize,
  };
}

// ── Handler ──
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'GET only' });
  const { mode } = req.query;
  try {
    let result;
    switch (mode) {
      case 'health':  result = await healthCheck(); break;
      case 'recent':  result = await recentFiles(); break;
      default: return res.status(400).json({ success: false, error: `Unknown mode: ${mode}` });
    }
    return res.status(200).json(result);
  } catch (err) {
    return res.status(200).json({ success: false, error: err.message });
  }
}
