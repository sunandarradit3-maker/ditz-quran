# DiTz STORE Qur'an 30 Juz

Website full-stack Qur'an 30 juz dengan terjemahan Bahasa Indonesia, UI premium modern, backend Node.js, dan frontend vanilla tanpa build tools.

## Fitur

- Qur'an 30 juz dan 114 surat
- Teks Arab, latin, dan terjemahan Bahasa Indonesia
- Audio per ayat dengan pilihan 6 qari
- Pencarian surat dan pencarian ayat/terjemah seluruh Qur'an
- Mode baca surat dan mode baca juz
- Tafsir per surat
- Bookmark ayat dengan LocalStorage
- Lanjutkan bacaan terakhir
- Mode fokus, dark/light mode, ukuran font Arab
- Voice search browser `id-ID`
- PWA app shell cache
- Backend proxy + memory cache agar API lebih ringan

## Jalankan lokal

```bash
npm install
npm start
```

Lalu buka:

```txt
http://localhost:3000
```

> Proyek ini tidak memakai dependency eksternal. `npm install` hanya membuat lockfile bila diperlukan.

## Endpoint Backend

```txt
GET /api/health
GET /api/surahs
GET /api/surahs/:number
GET /api/juz/:number
GET /api/tafsir/:number
GET /api/search?q=kata&limit=35
```

## Struktur

```txt
ditz-store-quran/
├─ server.js
├─ package.json
├─ README.md
└─ public/
   ├─ index.html
   ├─ styles.css
   ├─ app.js
   ├─ manifest.webmanifest
   ├─ sw.js
   └─ icon.svg
```

## Sumber data

Aplikasi mengambil data dari EQuran.id API v2 melalui backend proxy. Pastikan server punya koneksi internet saat mengakses data Qur'an pertama kali.
