// ═══════════════════════════════════════════════════
// MOLTY API: Document Parser v2 (Claude AI)
// Supports: Google Docs (text export) + PDF (base64 → Claude vision)
//
// Usage: GET /api/parse-doc?docId=XXXXX
//
// Env vars:
//   GOOGLE_SERVICE_ACCOUNT_KEY (base64-encoded JSON)
//   ANTHROPIC_API_KEY
// ═══════════════════════════════════════════════════
import { google } from 'googleapis';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

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

// ── Fetch Google Doc as text ──
async function fetchDocText(drive, docId) {
  const res = await drive.files.export({ fileId: docId, mimeType: 'text/plain' });
  return res.data;
}

// ── Fetch PDF as base64 ──
async function fetchPdfBase64(drive, docId) {
  const res = await drive.files.get(
    { fileId: docId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  const buffer = Buffer.from(res.data);
  // Max ~4MB for Claude API
  if (buffer.length > 4 * 1024 * 1024) {
    throw new Error('PDF prevelik (>4MB). Samo fakture do 4MB.');
  }
  return buffer.toString('base64');
}

// ── Parse with Claude — TEXT mode ──
async function parseText(text, fileName) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const prompt = buildPrompt(fileName);

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
      messages: [{
        role: 'user',
        content: `${prompt}\n\nSadržaj dokumenta:\n---\n${text.substring(0, 8000)}\n---`,
      }],
    }),
  });

  if (!response.ok) throw new Error(`Claude API: ${response.status}`);
  const data = await response.json();
  return extractJSON(data);
}

// ── Parse with Claude — PDF mode (base64 document) ──
async function parsePdf(base64Data, fileName) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const prompt = buildPrompt(fileName);

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
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Data,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API: ${response.status} - ${errText}`);
  }
  const data = await response.json();
  return extractJSON(data);
}

// ── Shared prompt ──
function buildPrompt(fileName) {
  return `Analiziraj ovaj poslovni dokument (faktura/ponuda/narudžbina) iz refractory industrije.
Ime fajla: ${fileName}

Odgovori ISKLJUČIVO u JSON formatu:
{
  "type": "invoice|offer|order|delivery|credit_note|other",
  "documentNumber": "string or null",
  "date": "YYYY-MM-DD or null",
  "customer": {
    "name": "ime kupca/firme",
    "country": "ISO 2-letter or null",
    "city": "grad or null"
  },
  "supplier": {
    "name": "ime dobavljača/prodavca or null"
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
  "notes": "kratke napomene"
}

VAŽNO: Ako nije faktura/ponuda (npr. ugovor, dopis, specifikacija) — stavi type="other" i popuni šta možeš.
Odgovori SAMO JSON, bez dodatnog teksta.`;
}

// ── Extract JSON from Claude response ──
function extractJSON(data) {
  const content = data.content?.[0]?.text || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude nije vratio validan JSON');
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
      fields: 'id,name,mimeType,modifiedTime,parents,size',
    });

    const { mimeType, name } = meta.data;
    let parsed;

    if (mimeType === 'application/pdf') {
      // PDF → download → base64 → Claude
      const base64 = await fetchPdfBase64(drive, docId);
      parsed = await parsePdf(base64, name);
    } else if (mimeType?.includes('document') || mimeType?.includes('word')) {
      // Google Doc or Word → export as text → Claude
      const text = await fetchDocText(drive, docId);
      if (!text || text.length < 10) {
        return res.status(200).json({ success: true, parsed: null, message: 'Prazan dokument', fileName: name });
      }
      parsed = await parseText(text, name);
    } else {
      return res.status(200).json({
        success: true, parsed: null,
        message: `Nepodržan format: ${mimeType}. Podržani: PDF, Google Docs.`,
        fileName: name,
      });
    }

    return res.status(200).json({
      success: true,
      fileName: name,
      fileId: docId,
      mimeType,
      modifiedTime: meta.data.modifiedTime,
      parsed,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('Parse Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
