// ═══════════════════════════════════════════════════
// MOLTY API: Google Drive Sync v2
// Dual-folder: ROOT (TDS/tehnika) + COMMERCIAL (fakture/ponude)
//
// Modes:
//   ?mode=health     → test connection + list both folders
//   ?mode=folders    → list customer folders in COMMERCIAL
//   ?mode=recent     → recently modified files in COMMERCIAL
//   ?mode=folder&id= → contents of specific folder
//   ?mode=scan       → full commercial scan (all files, no date filter)
//
// Env vars:
//   GOOGLE_SERVICE_ACCOUNT_KEY (base64-encoded JSON)
//   CALDERYS_ROOT_FOLDER_ID    → CALDERYS_CENTRAL_2026 (TDS, tehnika)
//   COMMERCIAL_FOLDER_ID       → Stari CALDERYS_CENTRAL (fakture, ponude)
// ═══════════════════════════════════════════════════
import { google } from 'googleapis';

const ROOT_FOLDER = process.env.CALDERYS_ROOT_FOLDER_ID || '1udwOxXmYlYQAhWSKh0-An7GY53mPeiFE';
const COMMERCIAL_FOLDER = process.env.COMMERCIAL_FOLDER_ID || '1zsDeckOseY0gMerBHU8nG0p-qKXDV8bN';

// ── Auth ──
function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  
  let key;
  try {
    key = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    try { key = JSON.parse(raw); } catch { throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY format'); }
  }

  return new google.auth.GoogleAuth({
    credentials: { client_email: key.client_email, private_key: key.private_key },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuth() });
}

// ── Helper: get folder info safely ──
async function getFolderInfo(drive, folderId) {
  try {
    const res = await drive.files.get({ fileId: folderId, fields: 'id,name,modifiedTime' });
    return { id: res.data.id, name: res.data.name, accessible: true };
  } catch (e) {
    return { id: folderId, name: 'N/A', accessible: false, error: e.message };
  }
}

// ── Mode: Health Check ──
async function healthCheck() {
  const drive = getDrive();
  const [root, commercial] = await Promise.all([
    getFolderInfo(drive, ROOT_FOLDER),
    getFolderInfo(drive, COMMERCIAL_FOLDER),
  ]);

  return {
    success: true,
    connected: true,
    rootFolder: root.name,
    rootAccessible: root.accessible,
    commercialFolder: commercial.name,
    commercialAccessible: commercial.accessible,
    commercialId: COMMERCIAL_FOLDER,
    timestamp: new Date().toISOString(),
  };
}

// ── Mode: List Customer Folders (from COMMERCIAL) ──
async function listFolders() {
  const drive = getDrive();
  const folders = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `'${COMMERCIAL_FOLDER}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'nextPageToken, files(id, name, modifiedTime, createdTime)',
      pageSize: 100,
      orderBy: 'name',
      pageToken: pageToken || undefined,
    });
    folders.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return {
    success: true,
    count: folders.length,
    source: 'commercial',
    folders: folders.map(f => ({
      id: f.id, name: f.name,
      modifiedTime: f.modifiedTime, createdTime: f.createdTime,
      driveLink: `https://drive.google.com/drive/folders/${f.id}`,
    })),
    timestamp: new Date().toISOString(),
  };
}

// ── Mode: Recent Files (from COMMERCIAL customer folders) ──
async function recentFiles(since) {
  const drive = getDrive();
  const sinceDate = since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Step 1: Get customer folders from COMMERCIAL
  const foldersRes = await drive.files.list({
    q: `'${COMMERCIAL_FOLDER}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 200,
  });
  const folderMap = {};
  for (const f of foldersRes.data.files || []) {
    folderMap[f.id] = f.name;
  }
  const folderIds = Object.keys(folderMap);

  if (folderIds.length === 0) {
    return { success: true, count: 0, files: [], customerFolders: 0, message: 'No customer folders found in COMMERCIAL folder' };
  }

  // Step 2: Query recent files in batches
  const allFiles = [];
  const batchSize = 20;

  for (let i = 0; i < folderIds.length; i += batchSize) {
    const batch = folderIds.slice(i, i + batchSize);
    const parentQueries = batch.map(id => `'${id}' in parents`).join(' or ');
    const q = `(${parentQueries}) and modifiedTime > '${sinceDate}' and trashed = false`;
    
    let pageToken = null;
    do {
      const res = await drive.files.list({
        q,
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, createdTime, parents, webViewLink, size)',
        pageSize: 100,
        orderBy: 'modifiedTime desc',
        pageToken: pageToken || undefined,
      });
      allFiles.push(...(res.data.files || []));
      pageToken = res.data.nextPageToken;
    } while (pageToken);
  }

  // Also check for files directly in customer folders' subfolders (one level deep)
  // Many customers have subfolders like "Fakture", "Ponude", etc.
  for (const folderId of folderIds) {
    try {
      const subRes = await drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 50,
      });
      const subFolders = subRes.data.files || [];
      if (subFolders.length === 0) continue;

      for (const sub of subFolders) {
        // Map subfolder files to parent customer name
        const subQ = `'${sub.id}' in parents and modifiedTime > '${sinceDate}' and trashed = false`;
        const subFiles = await drive.files.list({
          q: subQ,
          fields: 'files(id, name, mimeType, modifiedTime, createdTime, parents, webViewLink, size)',
          pageSize: 50,
        });
        for (const f of subFiles.data.files || []) {
          allFiles.push({ ...f, _parentCustomer: folderMap[folderId], _subfolder: sub.name });
        }
      }
    } catch {}
  }

  // Enrich
  const enriched = allFiles.map(f => ({
    id: f.id, name: f.name, mimeType: f.mimeType,
    modifiedTime: f.modifiedTime, createdTime: f.createdTime,
    size: f.size, webViewLink: f.webViewLink,
    parentId: f.parents?.[0],
    customerFolder: f._parentCustomer || folderMap[f.parents?.[0]] || 'Nepoznat',
    subfolder: f._subfolder || null,
  }));

  // Deduplicate by id
  const seen = new Set();
  const unique = enriched.filter(f => {
    if (seen.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });

  unique.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));

  return {
    success: true,
    since: sinceDate,
    count: unique.length,
    files: unique,
    customerFolders: Object.keys(folderMap).length,
    timestamp: new Date().toISOString(),
  };
}

// ── Mode: Folder Contents ──
async function folderContents(folderId) {
  if (!folderId) throw new Error('Missing folder id parameter');
  const drive = getDrive();
  const files = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, createdTime, webViewLink, size)',
      pageSize: 100,
      orderBy: 'modifiedTime desc',
      pageToken: pageToken || undefined,
    });
    files.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  const folderInfo = await drive.files.get({ fileId: folderId, fields: 'id,name,modifiedTime' });

  return {
    success: true,
    folder: folderInfo.data.name,
    folderId,
    count: files.length,
    files: files.map(f => ({
      id: f.id, name: f.name, mimeType: f.mimeType,
      modifiedTime: f.modifiedTime, createdTime: f.createdTime,
      size: f.size, webViewLink: f.webViewLink,
    })),
    timestamp: new Date().toISOString(),
  };
}

// ── Main Handler ──
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { mode, since, id } = req.query;

  try {
    let result;
    switch (mode) {
      case 'health':   result = await healthCheck(); break;
      case 'folders':  result = await listFolders(); break;
      case 'recent':   result = await recentFiles(since); break;
      case 'folder':   result = await folderContents(id); break;
      default:
        return res.status(400).json({ success: false, error: `Unknown mode: ${mode}` });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(result);

  } catch (err) {
    console.error('Drive Sync Error:', err.message);
    const status = err.message.includes('not configured') ? 503 : 500;
    return res.status(status).json({
      success: false,
      error: err.message,
      hint: status === 503
        ? 'Podesiti GOOGLE_SERVICE_ACCOUNT_KEY u Vercel env vars'
        : 'Proveri da li su oba foldera deljena sa servisnim nalogom',
    });
  }
}
