// ═══════════════════════════════════════════════════
// MOLTY API: Google Drive Sync
// Vercel Serverless Function
// 
// Modes:
//   ?mode=health     → test connection
//   ?mode=folders    → list customer folders
//   ?mode=recent     → recently modified files
//   ?mode=folder&id= → contents of specific folder
//
// Env vars required:
//   GOOGLE_SERVICE_ACCOUNT_KEY (base64-encoded JSON)
//   CALDERYS_ROOT_FOLDER_ID (optional, defaults to hardcoded)
// ═══════════════════════════════════════════════════
import { google } from 'googleapis';

const ROOT_FOLDER = process.env.CALDERYS_ROOT_FOLDER_ID || '1udwOxXmYlYQAhWSKh0-An7GY53mPeiFE';

// ── Auth ──
function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  
  let key;
  try {
    // Try base64 first, then raw JSON
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    key = JSON.parse(decoded);
  } catch {
    try {
      key = JSON.parse(raw);
    } catch {
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY format');
    }
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: key.client_email,
      private_key: key.private_key,
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

function getDrive() {
  const auth = getAuth();
  return google.drive({ version: 'v3', auth });
}

// ── Mode: Health Check ──
async function healthCheck() {
  const drive = getDrive();
  const res = await drive.files.get({
    fileId: ROOT_FOLDER,
    fields: 'id,name,modifiedTime',
  });
  return {
    success: true,
    connected: true,
    rootFolder: res.data.name,
    rootId: res.data.id,
    timestamp: new Date().toISOString(),
  };
}

// ── Mode: List Customer Folders ──
async function listFolders() {
  const drive = getDrive();
  const folders = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `'${ROOT_FOLDER}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
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
    folders: folders.map(f => ({
      id: f.id,
      name: f.name,
      modifiedTime: f.modifiedTime,
      createdTime: f.createdTime,
      driveLink: `https://drive.google.com/drive/folders/${f.id}`,
    })),
    timestamp: new Date().toISOString(),
  };
}

// ── Mode: Recent Files ──
async function recentFiles(since) {
  const drive = getDrive();
  
  // Default: last 7 days
  const sinceDate = since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  // Step 1: Get all customer folder IDs
  const foldersRes = await drive.files.list({
    q: `'${ROOT_FOLDER}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 200,
  });
  const folderMap = {};
  for (const f of foldersRes.data.files || []) {
    folderMap[f.id] = f.name;
  }
  const folderIds = Object.keys(folderMap);

  // Step 2: Query recent files across all customer folders
  // Build query in batches (Drive API has query length limits)
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

  // Step 3: Enrich with parent folder name
  const enriched = allFiles.map(f => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    createdTime: f.createdTime,
    size: f.size,
    webViewLink: f.webViewLink,
    parentId: f.parents?.[0],
    customerFolder: folderMap[f.parents?.[0]] || 'Nepoznat',
  }));

  // Sort by modified time desc
  enriched.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));

  return {
    success: true,
    since: sinceDate,
    count: enriched.length,
    files: enriched,
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

  // Also get folder info
  const folderInfo = await drive.files.get({
    fileId: folderId,
    fields: 'id,name,modifiedTime',
  });

  return {
    success: true,
    folder: folderInfo.data.name,
    folderId,
    count: files.length,
    files: files.map(f => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      modifiedTime: f.modifiedTime,
      createdTime: f.createdTime,
      size: f.size,
      webViewLink: f.webViewLink,
    })),
    timestamp: new Date().toISOString(),
  };
}

// ── Main Handler ──
export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { mode, since, id } = req.query;

  try {
    let result;
    
    switch (mode) {
      case 'health':
        result = await healthCheck();
        break;
      case 'folders':
        result = await listFolders();
        break;
      case 'recent':
        result = await recentFiles(since);
        break;
      case 'folder':
        result = await folderContents(id);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown mode: ${mode}. Use: health, folders, recent, folder`,
        });
    }

    // Cache for 5 min (CDN) / 1 min (browser)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(result);

  } catch (err) {
    console.error('Drive Sync Error:', err.message);
    
    const status = err.message.includes('not configured') ? 503 : 500;
    return res.status(status).json({
      success: false,
      error: err.message,
      hint: status === 503
        ? 'Potrebno podesiti GOOGLE_SERVICE_ACCOUNT_KEY u Vercel Environment Variables'
        : 'Proveri da li je CALDERYS_CENTRAL folder deljjen sa servisnim nalogom',
    });
  }
}
