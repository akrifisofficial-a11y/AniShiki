// ============================================
// 🕒 ANILIST.JS — Анонсы через AniList GraphQL
// ============================================

const ANILIST_API = 'https://graphql.anilist.co';
const KODIK_API_KEY = 'd99ff2ab48b0d9c42ace4901bee833ff';
const KODIK_API_URL = 'https://kodik-api.com';

// ===== DOM =====
const gridEl = document.getElementById('al-grid');
const searchInput = document.getElementById('al-search-input');
const searchBtn = document.getElementById('al-search-btn');
const loaderEl = document.getElementById('al-loader');
const refreshBtn = document.getElementById('al-refresh-btn');

let allAnons = [];
let isLoading = false;

// ===== ЗАГРУЗКА АНОНСОВ С ANILIST =====
async function fetchAnons() {
  try {
    const query = `
      query {
        Page(page: 1, perPage: 50) {
          media(
            type: ANIME,
            status: NOT_YET_RELEASED,
            sort: [START_DATE],
            isAdult: false
          ) {
            id
            idMal
            title { romaji english native }
            description
            startDate { year month day }
            format
            episodes
            coverImage { large medium }
            averageScore
            genres
          }
        }
      }
    `;

    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const media = data.data?.Page?.media || [];

    console.log(`✅ Загружено ${media.length} анонсов с AniList`);

    // Фильтруем: только те, у кого есть дата и она в будущем
    const now = new Date();
    const futureAnons = media.filter(item => {
      if (!item.startDate?.year) return false;
      
      // Собираем дату
      const year = item.startDate.year;
      const month = (item.startDate.month || 1) - 1;
      const day = item.startDate.day || 1;
      const airDate = new Date(year, month, day);
      
      return airDate > now;
    });

    console.log(`📊 Будущих анонсов: ${futureAnons.length}`);
    return futureAnons;

  } catch (err) {
    console.error('❌ Ошибка загрузки AniList:', err);
    return [];
  }
}

// ===== ПОЛУЧЕНИЕ РУССКОГО НАЗВАНИЯ ИЗ KODIK =====
async function getRussianTitleFromKodik(anime) {
  const malId = anime.idMal;

  if (!malId) return { title: null, kodikId: null };

  try {
    const params = new URLSearchParams({
      token: KODIK_API_KEY,
      mal_id: malId,
      with_material_data: 'true',
      limit: 1
    });

    const url = `${KODIK_API_URL}/search?${params}`;
    const response = await fetch(url);

    if (!response.ok) return { title: null, kodikId: null };

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const kodikAnime = data.results[0];
      return {
        title: kodikAnime.title || kodikAnime.material_data?.title || null,
        kodikId: kodikAnime.id || null
      };
    }

    return { title: null, kodikId: null };
  } catch (err) {
    return { title: null, kodikId: null };
  }
}

// ===== ФОРМАТИРОВАНИЕ ДАТЫ =====
function formatStartDate(startDate) {
  if (!startDate?.year) return 'Дата неизвестна';

  const year = startDate.year;
  const month = startDate.month;
  const day = startDate.day;

  if (month && day) {
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  if (month) {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('ru-RU', {
      month: 'long',
      year: 'numeric'
    });
  }

  return String(year);
}

// ===== ФОРМАТИРОВАНИЕ ТИПА =====
function formatType(format) {
  const types = {
    TV: 'ТВ-сериал',
    TV_SHORT: 'Короткометражка',
    MOVIE: 'Фильм',
    SPECIAL: 'Спешл',
    OVA: 'OVA',
    ONA: 'ONA',
    MUSIC: 'Клип'
  };
  return types[format] || format || 'Аниме';
}

// ===== РЕНДЕР =====
function renderAnons(animes) {
  if (!gridEl) return;

  if (animes.length === 0) {
    gridEl.innerHTML = `
      <div class="al-empty">
        <span class="icon">🕒</span>
        <p>Анонсы не найдены</p>
        <p style="font-size:0.8rem; color:#444; margin-top:8px;">Попробуйте обновить позже</p>
      </div>
    `;
    return;
  }

  let html = '';

  animes.forEach((anime, index) => {
    const poster = anime.coverImage?.large || anime.coverImage?.medium || 'https://via.placeholder.com/200x280?text=No+Image';

    // Русское название (если нашли в Kodik), иначе — английское
    const title = anime.russianTitle || anime.title.english || anime.title.romaji || 'Без названия';
    const titleOrig = anime.title.romaji || '';

    const dateStr = formatStartDate(anime.startDate);
    const typeLabel = formatType(anime.format);
    const episodes = anime.episodes || '—';
    const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '—';

    html += `
      <div class="anime-card" 
           data-anilist-id="${anime.id}"
           data-mal-id="${anime.idMal || ''}"
           data-kodik-id="${anime.kodikId || ''}"
           style="animation-delay:${index * 0.03}s;">
        <img src="${poster}" alt="${title}" loading="lazy" 
             onerror="this.src='https://via.placeholder.com/200x280?text=No+Image'" />
        <div class="info">
          <div class="title">${title}</div>
          ${titleOrig && titleOrig !== title ? `<div style="font-size:0.7rem;color:#666;">${titleOrig}</div>` : ''}
          <div class="year">📅 ${dateStr}</div>
          <div class="episodes">🎬 ${typeLabel} · 📺 ${episodes} эп.</div>
        </div>
      </div>
    `;
  });

  gridEl.innerHTML = html;

  // Клик
  gridEl.querySelectorAll('.anime-card').forEach(card => {
    card.addEventListener('click', async () => {
      const kodikId = card.dataset.kodikId;
      const malId = card.dataset.malId;
      const anilistId = card.dataset.anilistId;

      // Если есть Kodik ID — сразу открываем плеер
      if (kodikId) {
        window.location.href = `index.html#anime/${kodikId}`;
        return;
      }

      // Пробуем найти в Kodik по MAL ID
      if (malId) {
        try {
          const params = new URLSearchParams({
            token: KODIK_API_KEY,
            mal_id: malId
          });
          const url = `${KODIK_API_URL}/search?${params}`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.results?.length > 0) {
            window.location.href = `index.html#anime/${data.results[0].id}`;
            return;
          }
        } catch (err) {
          console.warn('⚠️ Не найдено в Kodik:', err);
        }
      }

      // Fallback — открываем AniList
      if (anilistId) {
        window.open(`https://anilist.co/anime/${anilistId}`, '_blank');
      }
    });
  });
}

// ===== ОБОГАЩЕНИЕ РУССКИМИ НАЗВАНИЯМИ =====
async function enrichWithRussianTitles(anons) {
  console.log('🇷🇺 Поиск русских названий в Kodik...');

  const enriched = [];

  for (let i = 0; i < anons.length; i++) {
    const anime = anons[i];

    if (gridEl) {
      gridEl.innerHTML = `<div class="loader">🇷🇺 Поиск названий... (${i + 1}/${anons.length})</div>`;
    }

    const result = await getRussianTitleFromKodik(anime);

    enriched.push({
      ...anime,
      russianTitle: result.title,
      kodikId: result.kodikId
    });

    // Задержка между запросами
    await new Promise(r => setTimeout(r, 150));
  }

  const foundCount = enriched.filter(a => a.russianTitle).length;
  console.log(`✅ Найдено русских названий: ${foundCount} из ${anons.length}`);

  return enriched;
}

// ===== ЗАГРУЗКА =====
async function loadAnons() {
  if (isLoading) return;
  isLoading = true;

  if (loaderEl) loaderEl.style.display = 'block';
  if (refreshBtn) refreshBtn.disabled = true;
  if (gridEl) gridEl.innerHTML = '<div class="loader">Загрузка анонсов с AniList...</div>';

  try {
    // 1. Загружаем анонсы
    const anons = await fetchAnons();

    if (anons.length === 0) {
      allAnons = [];
      renderAnons([]);
      return;
    }

    // 2. Обогащаем русскими названиями
    const enriched = await enrichWithRussianTitles(anons);

    allAnons = enriched;
    renderAnons(enriched);

  } catch (err) {
    console.error('❌ Ошибка:', err);
    if (gridEl) {
      gridEl.innerHTML = `
        <div class="al-empty">
          <span class="icon">😔</span>
          <p>Не удалось загрузить анонсы</p>
        </div>
      `;
    }
  } finally {
    isLoading = false;
    if (loaderEl) loaderEl.style.display = 'none';
    if (refreshBtn) refreshBtn.disabled = false;
  }
}

// ===== ПОИСК =====
function filterAnons(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderAnons(allAnons);
    return;
  }

  const filtered = allAnons.filter(anime => {
    const ru = (anime.russianTitle || '').toLowerCase();
    const en = (anime.title.english || '').toLowerCase();
    const romaji = (anime.title.romaji || '').toLowerCase();
    const native = (anime.title.native || '').toLowerCase();
    return ru.includes(q) || en.includes(q) || romaji.includes(q) || native.includes(q);
  });

  renderAnons(filtered);
}

// ===== АВТОУДАЛЕНИЕ ВЫШЕДШИХ =====
function removeAiredAnons() {
  const now = new Date();
  const beforeCount = allAnons.length;

  allAnons = allAnons.filter(anime => {
    if (!anime.startDate?.year) return true;

    const year = anime.startDate.year;
    const month = (anime.startDate.month || 1) - 1;
    const day = anime.startDate.day || 1;
    const airDate = new Date(year, month, day);

    return airDate > now;
  });

  const removed = beforeCount - allAnons.length;
  if (removed > 0) {
    console.log(`🗑️ Удалено вышедших: ${removed}`);
    renderAnons(allAnons);
  }
}

// ===== ОБРАБОТЧИКИ =====
if (searchBtn && searchInput) {
  searchBtn.addEventListener('click', () => filterAnons(searchInput.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') filterAnons(searchInput.value);
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', loadAnons);
}

// ===== СТАРТ =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('🕒 Страница анонсов AniList загружена');
  loadAnons();

  // Проверка вышедших каждые 5 минут
  setInterval(removeAiredAnons, 300000);

  // Автообновление каждые 30 минут
  setInterval(loadAnons, 1800000);
});

// Год в футере
const yearEl = document.getElementById('current-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
