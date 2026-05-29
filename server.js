import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;
const API_BASE = 'https://equran.id/api/v2';
const CACHE_TTL = 1000 * 60 * 60 * 24;

const memoryCache = new Map();

const JUZ_MAP = [
  null,
  { juz: 1, start: { surah: 1, ayah: 1 }, end: { surah: 2, ayah: 141 } },
  { juz: 2, start: { surah: 2, ayah: 142 }, end: { surah: 2, ayah: 252 } },
  { juz: 3, start: { surah: 2, ayah: 253 }, end: { surah: 3, ayah: 92 } },
  { juz: 4, start: { surah: 3, ayah: 93 }, end: { surah: 4, ayah: 23 } },
  { juz: 5, start: { surah: 4, ayah: 24 }, end: { surah: 4, ayah: 147 } },
  { juz: 6, start: { surah: 4, ayah: 148 }, end: { surah: 5, ayah: 81 } },
  { juz: 7, start: { surah: 5, ayah: 82 }, end: { surah: 6, ayah: 110 } },
  { juz: 8, start: { surah: 6, ayah: 111 }, end: { surah: 7, ayah: 87 } },
  { juz: 9, start: { surah: 7, ayah: 88 }, end: { surah: 8, ayah: 40 } },
  { juz: 10, start: { surah: 8, ayah: 41 }, end: { surah: 9, ayah: 92 } },
  { juz: 11, start: { surah: 9, ayah: 93 }, end: { surah: 11, ayah: 5 } },
  { juz: 12, start: { surah: 11, ayah: 6 }, end: { surah: 12, ayah: 52 } },
  { juz: 13, start: { surah: 12, ayah: 53 }, end: { surah: 14, ayah: 52 } },
  { juz: 14, start: { surah: 15, ayah: 1 }, end: { surah: 16, ayah: 128 } },
  { juz: 15, start: { surah: 17, ayah: 1 }, end: { surah: 18, ayah: 74 } },
  { juz: 16, start: { surah: 18, ayah: 75 }, end: { surah: 20, ayah: 135 } },
  { juz: 17, start: { surah: 21, ayah: 1 }, end: { surah: 22, ayah: 78 } },
  { juz: 18, start: { surah: 23, ayah: 1 }, end: { surah: 25, ayah: 20 } },
  { juz: 19, start: { surah: 25, ayah: 21 }, end: { surah: 27, ayah: 55 } },
  { juz: 20, start: { surah: 27, ayah: 56 }, end: { surah: 29, ayah: 45 } },
  { juz: 21, start: { surah: 29, ayah: 46 }, end: { surah: 33, ayah: 30 } },
  { juz: 22, start: { surah: 33, ayah: 31 }, end: { surah: 36, ayah: 27 } },
  { juz: 23, start: { surah: 36, ayah: 28 }, end: { surah: 39, ayah: 31 } },
  { juz: 24, start: { surah: 39, ayah: 32 }, end: { surah: 41, ayah: 46 } },
  { juz: 25, start: { surah: 41, ayah: 47 }, end: { surah: 45, ayah: 37 } },
  { juz: 26, start: { surah: 46, ayah: 1 }, end: { surah: 51, ayah: 30 } },
  { juz: 27, start: { surah: 51, ayah: 31 }, end: { surah: 57, ayah: 29 } },
  { juz: 28, start: { surah: 58, ayah: 1 }, end: { surah: 66, ayah: 12 } },
  { juz: 29, start: { surah: 67, ayah: 1 }, end: { surah: 77, ayah: 50 } },
  { juz: 30, start: { surah: 78, ayah: 1 }, end: { surah: 114, ayah: 6 } }
];

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function sendJson(res, status, payload, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message, detail = null) {
  sendJson(res, status, {
    success: false,
    message,
    detail,
    generatedAt: new Date().toISOString()
  });
}

function normalizeQuery(value = '') {
  return decodeURIComponent(value).trim().toLowerCase();
}

function isBetween(surahNo, ayahNo, range) {
  const afterStart = surahNo > range.start.surah || (surahNo === range.start.surah && ayahNo >= range.start.ayah);
  const beforeEnd = surahNo < range.end.surah || (surahNo === range.end.surah && ayahNo <= range.end.ayah);
  return afterStart && beforeEnd;
}

async function fetchEquran(endpoint) {
  const key = endpoint;
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return { ...cached.value, cached: true };
  }

  const url = `${API_BASE}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DiTz-STORE-Quran/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`EQuran returned HTTP ${response.status}`);
    }

    const json = await response.json();
    const value = {
      success: true,
      source: 'EQuran.id API v2',
      cached: false,
      generatedAt: new Date().toISOString(),
      data: json.data ?? json
    };
    memoryCache.set(key, { time: Date.now(), value });
    return value;
  } finally {
    clearTimeout(timeout);
  }
}

async function getSurah(number) {
  const parsed = Number(number);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 114) {
    throw new RangeError('Nomor surat harus 1 sampai 114.');
  }
  return fetchEquran(`/surat/${parsed}`);
}

async function getJuz(number) {
  const juzNumber = Number(number);
  if (!Number.isInteger(juzNumber) || juzNumber < 1 || juzNumber > 30) {
    throw new RangeError('Nomor juz harus 1 sampai 30.');
  }

  const range = JUZ_MAP[juzNumber];
  const tasks = [];
  for (let surahNo = range.start.surah; surahNo <= range.end.surah; surahNo += 1) {
    tasks.push(getSurah(surahNo));
  }

  const surahs = await Promise.all(tasks);
  const items = surahs.map((item) => {
    const surah = item.data;
    const ayat = (surah.ayat || []).filter((ayah) => isBetween(surah.nomor, ayah.nomorAyat, range));
    return { ...surah, ayat };
  }).filter((surah) => surah.ayat.length > 0);

  return {
    success: true,
    source: 'EQuran.id API v2 + DiTz STORE juz mapper',
    cached: surahs.every((item) => item.cached),
    generatedAt: new Date().toISOString(),
    data: {
      juz: juzNumber,
      range,
      surahs,
      items,
      totalAyat: items.reduce((total, surah) => total + surah.ayat.length, 0)
    }
  };
}

async function searchQuran(query, limit = 30) {
  const q = normalizeQuery(query);
  const max = Math.max(1, Math.min(Number(limit) || 30, 80));

  if (q.length < 2) {
    return {
      success: true,
      source: 'EQuran.id API v2 + DiTz STORE search',
      cached: true,
      generatedAt: new Date().toISOString(),
      data: { query: q, total: 0, results: [] }
    };
  }

  const results = [];
  const surahList = await fetchEquran('/surat');
  const metaMatches = (surahList.data || []).filter((surah) => {
    const haystack = [surah.nomor, surah.namaLatin, surah.nama, surah.arti, surah.tempatTurun].join(' ').toLowerCase();
    return haystack.includes(q);
  }).slice(0, 10).map((surah) => ({ type: 'surah', surah }));

  results.push(...metaMatches);

  for (let start = 1; start <= 114 && results.length < max; start += 8) {
    const chunk = Array.from({ length: 8 }, (_, index) => start + index).filter((number) => number <= 114);
    const details = await Promise.all(chunk.map((number) => getSurah(number).catch(() => null)));

    for (const item of details.filter(Boolean)) {
      const surah = item.data;
      for (const ayah of surah.ayat || []) {
        const haystack = [ayah.teksArab, ayah.teksLatin, ayah.teksIndonesia].join(' ').toLowerCase();
        if (haystack.includes(q)) {
          results.push({
            type: 'ayah',
            surah: {
              nomor: surah.nomor,
              nama: surah.nama,
              namaLatin: surah.namaLatin,
              arti: surah.arti
            },
            ayah
          });
        }
        if (results.length >= max) break;
      }
      if (results.length >= max) break;
    }
  }

  return {
    success: true,
    source: 'EQuran.id API v2 + DiTz STORE search',
    cached: false,
    generatedAt: new Date().toISOString(),
    data: {
      query: q,
      total: results.length,
      results: results.slice(0, max)
    }
  };
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  const safePath = path.normalize(pathname).replace(/^([../\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
    });
    res.end(content);
  } catch {
    const fallback = await fs.readFile(path.join(PUBLIC_DIR, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(fallback);
  }
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    if (pathname === '/api/health') {
      sendJson(res, 200, {
        success: true,
        app: 'DiTz STORE Quran',
        status: 'online',
        cacheItems: memoryCache.size,
        time: new Date().toISOString()
      });
      return;
    }

    if (pathname === '/api/surahs') {
      const data = await fetchEquran('/surat');
      sendJson(res, 200, data);
      return;
    }

    const surahMatch = pathname.match(/^\/api\/surahs\/(\d+)$/);
    if (surahMatch) {
      const data = await getSurah(surahMatch[1]);
      sendJson(res, 200, data);
      return;
    }

    const tafsirMatch = pathname.match(/^\/api\/tafsir\/(\d+)$/);
    if (tafsirMatch) {
      const number = Number(tafsirMatch[1]);
      if (!Number.isInteger(number) || number < 1 || number > 114) {
        throw new RangeError('Nomor surat harus 1 sampai 114.');
      }
      const data = await fetchEquran(`/tafsir/${number}`);
      sendJson(res, 200, data);
      return;
    }

    const juzMatch = pathname.match(/^\/api\/juz\/(\d+)$/);
    if (juzMatch) {
      const data = await getJuz(juzMatch[1]);
      sendJson(res, 200, data);
      return;
    }

    if (pathname === '/api/search') {
      const q = url.searchParams.get('q') || '';
      const limit = url.searchParams.get('limit') || '30';
      const data = await searchQuran(q, limit);
      sendJson(res, 200, data);
      return;
    }

    sendError(res, 404, 'Endpoint tidak ditemukan.');
  } catch (error) {
    const status = error instanceof RangeError ? 400 : 502;
    sendError(res, status, error.message || 'Terjadi kesalahan server.', {
      endpoint: pathname,
      source: 'DiTz STORE Backend'
    });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET') {
    sendError(res, 405, 'Method tidak didukung. Gunakan GET.');
    return;
  }

  if (req.url.startsWith('/api/')) {
    await handleApi(req, res);
    return;
  }

  await serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`DiTz STORE Quran running at http://localhost:${PORT}`);
});
