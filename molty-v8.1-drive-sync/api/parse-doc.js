// ═══════════════════════════════════════════════════
// MOLTY API: Document Parser (Claude AI)
// Parses Google Drive invoice/offer documents
// Extracts structured data: customer, materials, amounts
//
// Usage: GET /api/parse-doc?docId=XXXXX
//
// Env vars required:
//   GOOGLE_SERVICE_ACCOUNT_KEY (base64-encoded JSON)
//   ANTHROPIC_API_KEY
// ═══════════════════════════════════════════════════
import { google } from 'googleapis';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

// ── Google Auth (reuse from drive-sync) ──
function getDrive() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  
  let key;
  try {
    key = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    key = JSON.parse(raw);
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: key.client_email, private_key: key.private_key },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
}

// ── Fetch Google Doc as plain text ──
async function fetchDocText(drive, docId) {
  const res = await drive.files.export({
    fileId: docId,
    mimeType: 'text/plain',
  });
  return res.data;
}

// ── Parse with Claude API ──
async function parseWithClaude(text, fileName) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const prompt = `Analiziraj sledeći poslovni dokument (faktura/ponuda/narudžbina) iz refractory industrije i ekstrahuj strukturirane podatke.

Ime fajla: ${fileName}

Sadržaj dokumenta:
---
${text.substring(0, 8000)}
---

Odgovori ISKLJUČIVO u JSON formatu bez ikakvih dodatnih komentara:
{
  "type": "invoice|offer|order|delivery|other",
  "documentNumber": "broj dokumenta ili null",
  "date": "YYYY-MM-DD ili null",
  "customer": {
    "name": "ime kupca",
    "country": "ISO 2-letter code ili null",
    "city": "grad ili null"
  },
  "items": [
    {
      "material": "tačan naziv materijala",
      "quantity": number_or_null,
      "unit": "kg|t|kom|m2|null",
      "unitPrice": number_or_null,
      "totalPrice": number_or_null,
      "currency": "EUR|USD|RSD|null"
    }
  ],
  "totalAmount": number_or_null,
  "currency": "EUR|USD|RSD|null",
  "notes": "kratke napomene ako ima nešto relevantno"
}`;

  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || '';
  
  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude did not return valid JSON');
  
  return JSON.parse(jsonMatch[0]);
}

// ── Main Handler ──
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { docId } = req.query;
  if (!docId) {
    return res.status(400).json({ success: false, error: 'Missing docId parameter' });
  }

  try {
    const drive = getDrive();

    // Get file metadata
    const meta = await drive.files.get({
      fileId: docId,
      fields: 'id,name,mimeType,modifiedTime,parents',
    });

    // Export as text
    const text = await fetchDocText(drive, docId);
    if (!text || text.length < 10) {
      return res.status(200).json({
        success: true,
        parsed: null,
        message: 'Document is empty or too short to parse',
        fileName: meta.data.name,
      });
    }

    // Parse with Claude
    const parsed = await parseWithClaude(text, meta.data.name);

    return res.status(200).json({
      success: true,
      fileName: meta.data.name,
      fileId: docId,
      modifiedTime: meta.data.modifiedTime,
      parsed,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('Parse Error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
