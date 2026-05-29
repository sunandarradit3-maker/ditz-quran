const state = {
  surahs: [],
  currentSurah: null,
  currentJuz: null,
  qari: localStorage.getItem('ditz-qari') || '05',
  fontScale: Number(localStorage.getItem('ditz-font-scale') || 1),
  bookmarks: JSON.parse(localStorage.getItem('ditz-bookmarks') || '[]'),
  lastRead: JSON.parse(localStorage.getItem('ditz-last-read') || 'null'),
  theme: localStorage.getItem('ditz-theme') || 'dark'
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  surahList: $('#surahList'),
  juzGrid: $('#juzGrid'),
  bookmarkList: $('#bookmarkList'),
  surahSearch: $('#surahSearch'),
  globalSearch: $('#globalSearch'),
  reader: $('#reader'),
  readerTitle: $('#readerTitle'),
  readerSubtitle: $('#readerSubtitle'),
  readerMode: $('#readerMode'),
  tafsirButton: $('#tafsirButton'),
  tafsirDrawer: $('#tafsirDrawer'),
  tafsirTitle: $('#tafsirTitle'),
  tafsirContent: $('#tafsirContent'),
  searchResultsWrap: $('#searchResultsWrap'),
  searchResults: $('#searchResults'),
  searchTitle: $('#searchTitle'),
  toast: $('#toast'),
  qariSelect: $('#qariSelect'),
  commandDialog: $('#commandDialog'),
  sidebar: $('#sidebar')
};

const juzDescriptions = {
  1: 'Al-Fatihah 1 - Al-Baqarah 141',
  2: 'Al-Baqarah 142 - 252',
  3: 'Al-Baqarah 253 - Ali Imran 92',
  4: 'Ali Imran 93 - An-Nisa 23',
  5: 'An-Nisa 24 - 147',
  6: 'An-Nisa 148 - Al-Ma\'idah 81',
  7: 'Al-Ma\'idah 82 - Al-An\'am 110',
  8: 'Al-An\'am 111 - Al-A\'raf 87',
  9: 'Al-A\'raf 88 - Al-Anfal 40',
  10: 'Al-Anfal 41 - At-Taubah 92',
  11: 'At-Taubah 93 - Hud 5',
  12: 'Hud 6 - Yusuf 52',
  13: 'Yusuf 53 - Ibrahim 52',
  14: 'Al-Hijr 1 - An-Nahl 128',
  15: 'Al-Isra 1 - Al-Kahf 74',
  16: 'Al-Kahf 75 - Taha 135',
  17: 'Al-Anbiya 1 - Al-Hajj 78',
  18: 'Al-Mu\'minun 1 - Al-Furqan 20',
  19: 'Al-Furqan 21 - An-Naml 55',
  20: 'An-Naml 56 - Al-Ankabut 45',
  21: 'Al-Ankabut 46 - Al-Ahzab 30',
  22: 'Al-Ahzab 31 - Yasin 27',
  23: 'Yasin 28 - Az-Zumar 31',
  24: 'Az-Zumar 32 - Fussilat 46',
  25: 'Fussilat 47 - Al-Jatsiyah 37',
  26: 'Al-Ahqaf 1 - Az-Zariyat 30',
  27: 'Az-Zariyat 31 - Al-Hadid 29',
  28: 'Al-Mujadilah 1 - At-Tahrim 12',
  29: 'Al-Mulk 1 - Al-Mursalat 50',
  30: 'An-Naba 1 - An-Nas 6'
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function debounce(fn, delay = 450) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 2600);
}

async function api(path) {
  const response = await fetch(path);
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Request gagal.');
  }
  return payload.data;
}

function setLoading(message = 'Memuat data...') {
  els.reader.innerHTML = `
    <div class="loading-card glass" aria-hidden="true"></div>
    <div class="empty-state glass">
      <div class="empty-icon">﷽</div>
      <h3>${escapeHtml(message)}</h3>
      <p>Data sedang diambil dari API dan akan disimpan sementara di cache server.</p>
    </div>
  `;
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('ditz-theme', theme);
  $('#themeToggle').textContent = theme === 'dark' ? '🌙' : '☀️';
}

function setArabicFontScale(scale) {
  state.fontScale = Math.max(0.8, Math.min(scale, 1.55));
  document.documentElement.style.setProperty('--arabic-size', `${2.15 * state.fontScale}rem`);
  localStorage.setItem('ditz-font-scale', state.fontScale);
}

function closeMobileSidebar() {
  els.sidebar.classList.remove('open');
}

function renderJuzGrid() {
  els.juzGrid.innerHTML = Array.from({ length: 30 }, (_, index) => {
    const number = index + 1;
    return `
      <button class="juz-button" data-juz="${number}">
        <strong>Juz ${number}</strong>
        <span>${escapeHtml(juzDescriptions[number])}</span>
      </button>
    `;
  }).join('');
}

function renderSurahList(list = state.surahs) {
  els.surahList.classList.remove('skeleton-list');
  els.surahList.innerHTML = list.map((surah) => `
    <button class="surah-item ${state.currentSurah?.nomor === surah.nomor ? 'active' : ''}" data-surah="${surah.nomor}">
      <span class="number-badge">${surah.nomor}</span>
      <span class="surah-meta">
        <strong>${escapeHtml(surah.namaLatin)}</strong>
        <span>${escapeHtml(surah.arti)} · ${surah.jumlahAyat} ayat</span>
      </span>
      <span class="arabic-mini">${escapeHtml(surah.nama)}</span>
    </button>
  `).join('');
}

function renderBookmarks() {
  if (!state.bookmarks.length) {
    els.bookmarkList.innerHTML = `
      <div class="empty-state glass" style="min-height: 220px;">
        <h3>Belum ada bookmark.</h3>
        <p>Tekan ikon ⭐ di ayat yang ingin disimpan.</p>
      </div>
    `;
    return;
  }

  els.bookmarkList.innerHTML = state.bookmarks.map((item) => `
    <button class="bookmark-item" data-bookmark="${item.surah}:${item.ayah}">
      <span class="number-badge">${item.ayah}</span>
      <span>
        <strong>${escapeHtml(item.surahName)}:${item.ayah}</strong>
        <span>${escapeHtml(item.translation.slice(0, 78))}${item.translation.length > 78 ? '...' : ''}</span>
      </span>
      <span>↗</span>
    </button>
  `).join('');
}

function isBookmarked(surah, ayah) {
  return state.bookmarks.some((item) => item.surah === surah && item.ayah === ayah);
}

function saveBookmarks() {
  localStorage.setItem('ditz-bookmarks', JSON.stringify(state.bookmarks));
  renderBookmarks();
}

function toggleBookmark(surah, ayah, translation, surahName) {
  const exists = isBookmarked(surah, ayah);
  if (exists) {
    state.bookmarks = state.bookmarks.filter((item) => !(item.surah === surah && item.ayah === ayah));
    showToast('Bookmark dihapus.');
  } else {
    state.bookmarks.unshift({ surah, ayah, translation, surahName, savedAt: new Date().toISOString() });
    showToast('Ayat disimpan ke bookmark.');
  }
  saveBookmarks();
  const button = document.querySelector(`[data-bookmark-toggle="${surah}:${ayah}"]`);
  if (button) button.classList.toggle('active', !exists);
}

function getAyahAudio(ayah) {
  const audio = ayah.audio || {};
  return audio[state.qari] || audio['05'] || audio['01'] || Object.values(audio)[0] || '';
}

function saveLastRead(surah, ayah = 1, type = 'surah') {
  state.lastRead = { surah, ayah, type, savedAt: new Date().toISOString() };
  localStorage.setItem('ditz-last-read', JSON.stringify(state.lastRead));
}

function bismillahCard() {
  return `
    <article class="ayah-card bismillah-card">
      <p class="card-arabic">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</p>
      <p class="card-translation">Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.</p>
    </article>
  `;
}

function ayahCard(surah, ayah) {
  const audio = getAyahAudio(ayah);
  const bookmarked = isBookmarked(surah.nomor, ayah.nomorAyat);
  const ref = `${surah.namaLatin} · ${surah.nomor}:${ayah.nomorAyat}`;
  return `
    <article class="ayah-card" id="ayah-${surah.nomor}-${ayah.nomorAyat}">
      <div class="card-head">
        <div class="card-ref"><span class="number-badge">${ayah.nomorAyat}</span><span>${escapeHtml(ref)}</span></div>
        <div class="card-actions">
          <button class="round-action ${bookmarked ? 'active' : ''}" title="Bookmark" data-bookmark-toggle="${surah.nomor}:${ayah.nomorAyat}" data-surah-name="${escapeHtml(surah.namaLatin)}" data-translation="${escapeHtml(ayah.teksIndonesia)}">⭐</button>
          <button class="round-action" title="Salin ayat" data-copy="${surah.nomor}:${ayah.nomorAyat}">⧉</button>
          ${audio ? `<button class="round-action" title="Putar audio" data-audio="${escapeHtml(audio)}">▶</button>` : ''}
        </div>
      </div>
      <p class="card-arabic">${escapeHtml(ayah.teksArab)}</p>
      <p class="card-latin">${escapeHtml(ayah.teksLatin || '')}</p>
      <p class="card-translation">${escapeHtml(ayah.teksIndonesia || '')}</p>
    </article>
  `;
}

function renderSurah(surah) {
  state.currentSurah = surah;
  state.currentJuz = null;
  renderSurahList();
  saveLastRead(surah.nomor, 1, 'surah');

  els.readerMode.textContent = 'Mode Surat';
  els.readerTitle.textContent = `${surah.nomor}. ${surah.namaLatin} (${surah.nama})`;
  els.readerSubtitle.textContent = `${surah.arti} · ${surah.tempatTurun} · ${surah.jumlahAyat} ayat`;
  els.tafsirButton.disabled = false;

  const shouldShowBismillah = ![1, 9].includes(Number(surah.nomor));
  els.reader.innerHTML = `${shouldShowBismillah ? bismillahCard() : ''}${surah.ayat.map((ayah) => ayahCard(surah, ayah)).join('')}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderJuz(data) {
  state.currentSurah = null;
  state.currentJuz = data.juz;
  renderSurahList();
  state.lastRead = { surah: data.range.start.surah, ayah: data.range.start.ayah, type: 'juz', juz: data.juz, savedAt: new Date().toISOString() };
  localStorage.setItem('ditz-last-read', JSON.stringify(state.lastRead));

  els.readerMode.textContent = 'Mode Juz';
  els.readerTitle.textContent = `Juz ${data.juz}`;
  els.readerSubtitle.textContent = `${juzDescriptions[data.juz]} · ${data.totalAyat} ayat`;
  els.tafsirButton.disabled = true;

  els.reader.innerHTML = data.items.map((surah) => `
    <div class="surah-break glass">
      <p class="eyebrow">Surat ${surah.nomor}</p>
      <h3>${escapeHtml(surah.namaLatin)} <span class="arabic-mini">${escapeHtml(surah.nama)}</span></h3>
    </div>
    ${surah.nomor !== 9 && surah.ayat[0]?.nomorAyat === 1 ? bismillahCard() : ''}
    ${surah.ayat.map((ayah) => ayahCard(surah, ayah)).join('')}
  `).join('');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadSurahs() {
  try {
    state.surahs = await api('/api/surahs');
    renderSurahList();
  } catch (error) {
    els.surahList.classList.remove('skeleton-list');
    els.surahList.innerHTML = `<div class="empty-state glass"><h3>Gagal memuat daftar surat.</h3><p>${escapeHtml(error.message)}</p></div>`;
  }
}

async function openSurah(number, ayahTarget = null) {
  try {
    closeMobileSidebar();
    setLoading(`Memuat surat ${number}...`);
    const surah = await api(`/api/surahs/${number}`);
    renderSurah(surah);
    if (ayahTarget) scrollToAyah(number, ayahTarget);
  } catch (error) {
    showToast(error.message);
    els.reader.innerHTML = `<div class="empty-state glass"><h3>Gagal memuat surat.</h3><p>${escapeHtml(error.message)}</p></div>`;
  }
}

async function openJuz(number) {
  try {
    closeMobileSidebar();
    setLoading(`Memuat juz ${number}...`);
    const data = await api(`/api/juz/${number}`);
    renderJuz(data);
  } catch (error) {
    showToast(error.message);
    els.reader.innerHTML = `<div class="empty-state glass"><h3>Gagal memuat juz.</h3><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function scrollToAyah(surah, ayah) {
  requestAnimationFrame(() => {
    const target = document.getElementById(`ayah-${surah}-${ayah}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.animate([
        { outlineColor: 'rgba(244, 201, 93, 0)', transform: 'scale(1)' },
        { outlineColor: 'rgba(244, 201, 93, 0.8)', transform: 'scale(1.01)' },
        { outlineColor: 'rgba(244, 201, 93, 0)', transform: 'scale(1)' }
      ], { duration: 1200, easing: 'ease-out' });
    }
  });
}

async function runGlobalSearch(query) {
  const q = query.trim();
  if (q.length < 2) {
    els.searchResultsWrap.classList.add('hidden');
    return;
  }

  els.searchResultsWrap.classList.remove('hidden');
  els.searchTitle.textContent = `Mencari "${q}"...`;
  els.searchResults.innerHTML = `<div class="loading-card"></div>`;

  try {
    const data = await api(`/api/search?q=${encodeURIComponent(q)}&limit=35`);
    els.searchTitle.textContent = `${data.total} hasil untuk "${q}"`;
    if (!data.results.length) {
      els.searchResults.innerHTML = `<p class="card-translation">Tidak ada hasil. Coba kata kunci lain.</p>`;
      return;
    }

    els.searchResults.innerHTML = data.results.map((item) => {
      if (item.type === 'surah') {
        return `
          <button class="search-hit" data-surah="${item.surah.nomor}">
            <span class="number-badge">${item.surah.nomor}</span>
            <span><strong>${escapeHtml(item.surah.namaLatin)}</strong><span>${escapeHtml(item.surah.arti)} · ${item.surah.jumlahAyat} ayat</span></span>
            <span class="arabic-mini">${escapeHtml(item.surah.nama)}</span>
          </button>
        `;
      }

      return `
        <button class="search-hit" data-surah="${item.surah.nomor}" data-ayah="${item.ayah.nomorAyat}">
          <span class="number-badge">${item.ayah.nomorAyat}</span>
          <span><strong>${escapeHtml(item.surah.namaLatin)} ${item.surah.nomor}:${item.ayah.nomorAyat}</strong><span>${escapeHtml(item.surah.arti)}</span></span>
          <span class="arabic-mini">${escapeHtml(item.surah.nama)}</span>
          <p>${escapeHtml(item.ayah.teksIndonesia)}</p>
        </button>
      `;
    }).join('');
  } catch (error) {
    els.searchTitle.textContent = 'Pencarian gagal';
    els.searchResults.innerHTML = `<p class="card-translation">${escapeHtml(error.message)}</p>`;
  }
}

async function loadTafsir() {
  if (!state.currentSurah) return;
  els.tafsirDrawer.classList.remove('hidden');
  els.tafsirTitle.textContent = `Tafsir ${state.currentSurah.namaLatin}`;
  els.tafsirContent.innerHTML = `<div class="loading-card"></div>`;

  try {
    const data = await api(`/api/tafsir/${state.currentSurah.nomor}`);
    const tafsirItems = data.tafsir || data.ayat || [];
    if (!tafsirItems.length) {
      els.tafsirContent.innerHTML = `<p>Data tafsir tidak ditemukan untuk surat ini.</p>`;
      return;
    }
    els.tafsirContent.innerHTML = tafsirItems.map((item) => `
      <div class="tafsir-item">
        <strong>Ayat ${escapeHtml(item.ayat || item.nomorAyat || '')}</strong>
        <p>${escapeHtml(item.teks || item.teksIndonesia || item.tafsir || '')}</p>
      </div>
    `).join('');
  } catch (error) {
    els.tafsirContent.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

function playAudio(url, button) {
  if (!url) return;
  if (playAudio.audio) {
    playAudio.audio.pause();
    document.querySelectorAll('[data-audio]').forEach((btn) => { btn.textContent = '▶'; });
  }
  playAudio.audio = new Audio(url);
  button.textContent = '⏸';
  playAudio.audio.addEventListener('ended', () => { button.textContent = '▶'; });
  playAudio.audio.play().catch(() => {
    button.textContent = '▶';
    showToast('Browser memblokir audio. Coba klik ulang.');
  });
}

function copyAyah(surahNo, ayahNo) {
  const card = document.getElementById(`ayah-${surahNo}-${ayahNo}`);
  if (!card) return;
  const arabic = card.querySelector('.card-arabic')?.textContent || '';
  const translation = card.querySelector('.card-translation')?.textContent || '';
  const latin = card.querySelector('.card-latin')?.textContent || '';
  const ref = card.querySelector('.card-ref span:last-child')?.textContent || `${surahNo}:${ayahNo}`;
  navigator.clipboard.writeText(`${ref}\n\n${arabic}\n\n${latin}\n\n${translation}`)
    .then(() => showToast('Ayat berhasil disalin.'))
    .catch(() => showToast('Gagal menyalin ayat.'));
}

function setupEvents() {
  document.addEventListener('click', (event) => {
    const surahButton = event.target.closest('[data-surah]');
    const juzButton = event.target.closest('[data-juz]');
    const bookmarkToggle = event.target.closest('[data-bookmark-toggle]');
    const bookmarkOpen = event.target.closest('[data-bookmark]');
    const audioButton = event.target.closest('[data-audio]');
    const copyButton = event.target.closest('[data-copy]');

    if (bookmarkToggle) {
      const [surah, ayah] = bookmarkToggle.dataset.bookmarkToggle.split(':').map(Number);
      toggleBookmark(surah, ayah, bookmarkToggle.dataset.translation || '', bookmarkToggle.dataset.surahName || `Surat ${surah}`);
      return;
    }

    if (audioButton) {
      playAudio(audioButton.dataset.audio, audioButton);
      return;
    }

    if (copyButton) {
      const [surah, ayah] = copyButton.dataset.copy.split(':').map(Number);
      copyAyah(surah, ayah);
      return;
    }

    if (bookmarkOpen) {
      const [surah, ayah] = bookmarkOpen.dataset.bookmark.split(':').map(Number);
      openSurah(surah, ayah);
      return;
    }

    if (surahButton && !surahButton.dataset.bookmarkToggle) {
      const ayah = surahButton.dataset.ayah ? Number(surahButton.dataset.ayah) : null;
      openSurah(Number(surahButton.dataset.surah), ayah);
      return;
    }

    if (juzButton) {
      openJuz(Number(juzButton.dataset.juz));
    }
  });

  els.surahSearch.addEventListener('input', () => {
    const q = els.surahSearch.value.trim().toLowerCase();
    const filtered = state.surahs.filter((surah) => [
      surah.nomor,
      surah.namaLatin,
      surah.nama,
      surah.arti,
      surah.tempatTurun
    ].join(' ').toLowerCase().includes(q));
    renderSurahList(filtered);
  });

  els.globalSearch.addEventListener('input', debounce(() => runGlobalSearch(els.globalSearch.value), 600));

  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach((item) => item.classList.remove('active'));
      $$('.panel').forEach((panel) => panel.classList.remove('active'));
      tab.classList.add('active');
      $(`#${tab.dataset.panel}`).classList.add('active');
    });
  });

  $('#themeToggle').addEventListener('click', () => setTheme(state.theme === 'dark' ? 'light' : 'dark'));
  $('#fontPlus').addEventListener('click', () => setArabicFontScale(state.fontScale + 0.1));
  $('#fontMinus').addEventListener('click', () => setArabicFontScale(state.fontScale - 0.1));
  $('#scrollTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  $('#focusToggle').addEventListener('click', () => document.body.classList.toggle('focus-mode'));
  $('#openSidebar').addEventListener('click', () => els.sidebar.classList.add('open'));
  $('#closeSidebar').addEventListener('click', closeMobileSidebar);
  $('#closeSearch').addEventListener('click', () => els.searchResultsWrap.classList.add('hidden'));
  $('#tafsirButton').addEventListener('click', loadTafsir);
  $('#closeTafsir').addEventListener('click', () => els.tafsirDrawer.classList.add('hidden'));

  $('#continueReading').addEventListener('click', () => {
    if (state.lastRead?.type === 'juz') {
      openJuz(state.lastRead.juz || 30);
      return;
    }
    if (state.lastRead?.surah) {
      openSurah(state.lastRead.surah, state.lastRead.ayah);
      return;
    }
    openSurah(1);
  });

  $('#openCommand').addEventListener('click', () => els.commandDialog.showModal());
  $('#closeCommand').addEventListener('click', () => els.commandDialog.close());

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      els.commandDialog.showModal();
    }
    if (event.key === 'Escape') {
      els.sidebar.classList.remove('open');
    }
  });

  els.commandDialog.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    els.commandDialog.close();
    if (action.startsWith('surah:')) openSurah(Number(action.split(':')[1]));
    if (action.startsWith('juz:')) openJuz(Number(action.split(':')[1]));
    if (action === 'theme') setTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  els.qariSelect.value = state.qari;
  els.qariSelect.addEventListener('change', () => {
    state.qari = els.qariSelect.value;
    localStorage.setItem('ditz-qari', state.qari);
    showToast('Qari audio diganti.');
  });

  $('#voiceSearch').addEventListener('click', () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice search belum didukung browser ini.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      els.globalSearch.value = text;
      runGlobalSearch(text);
    };
    recognition.start();
  });
}

async function init() {
  setTheme(state.theme);
  setArabicFontScale(state.fontScale);
  renderJuzGrid();
  renderBookmarks();
  setupEvents();
  await loadSurahs();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }
}

init();
