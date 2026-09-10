// ============================================
// 🕒 ANONS.JS — Анонсы через Simkl + русские названия из Kodik
// ============================================

const SIMKL_CLIENT_ID = '33d74ff1646b1ba67a8abfd4c4b268e368305fa44b271f09acdb6fd7caf77ca8';
const SIMKL_APP_NAME = 'quarwatch';
const SIMKL_APP_VERSION = '1.0';
const SIMKL_API = 'https://api.simkl.com';

const KODIK_API_KEY = 'd99ff2ab48b0d9c42ace4901bee833ff';
const KODIK_API_URL = 'https://kodik-api.com';

// ===== DOM =====
const gridEl = document.getElementById('anons-grid') || document.getElementById('mal-anons-grid');
const searchInput = document.getElementById('anons-search') || document.getElementById('mal-anons-search-input');
const searchBtn = document.getElementById('anons-search-btn') || document.getElementById('mal-anons-search-btn');
const loaderEl = document.getElementById('anons-loader') || document.getElementById('mal-anons-loader');
const refreshBtn = document.getElementById('refresh-anons') || document.getElementById('mal-refresh-btn');

let allAnons = [];
let isLoading = false;

// ===== ЗАГРУЗКА АНОНСОВ С SIMKL =====
async function fetchAnons() {
  try {
    const url = `${SIMKL_API}/anime/premieres/soon?client_id=${SIMKL_CLIENT_ID}&app-name=${SIMKL_APP_NAME}&app-version=${SIMKL_APP_VERSION}&limit=60`;

    console.log('📡 Запрос анонсов (Simkl premieres/soon):', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': `${SIMKL_APP_NAME}/${SIMKL_APP_VERSION}`
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    console.log(`✅ Получено ${data.length || 0} анонсов с Simkl`);

    const now = new Date();
    const futureAnons = data.filter(item => {
      if (!item.date) return false;
      const airDate = new Date(item.date);
      return airDate > now;
    });

    return futureAnons;
  } catch (err) {
    console.error('❌ Ошибка загрузки анонсов:', err);
    return [];
  }
}

// ============================================
// 🇷🇺 ПОЛУЧЕНИЕ РУССКОГО НАЗВАНИЯ ИЗ KODIK
// ============================================

async function getRussianTitleFromKodik(anime) {
  const ids = anime.ids || {};
  
  // Пробуем найти в Kodik по разным ID
  const idTypes = [
    { type: 'mal_id', value: ids.mal },
    { type: 'shikimori_id', value: ids.shikimori },
    { type: 'kinopoisk_id', value: ids.kinopoisk },
    { type: 'imdb_id', value: ids.imdb },
    { type: 'worldart_id', value: ids.worldart }
  ];

  for (const { type, value } of idTypes) {
    if (!value) continue;

    try {
      const params = new URLSearchParams({
        token: KODIK_API_KEY,
        [type]: value,
        with_material_data: 'true',
        limit: 1
      });

      const url = `${KODIK_API_URL}/search?${params}`;
      const response = await fetch(url);
      
      if (!response.ok) continue;

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const kodikAnime = data.results[0];
        
        // 🔑 Берём русское название из Kodik
        const russianTitle = kodikAnime.title || kodikAnime.material_data?.title;
        
        if (russianTitle) {
          console.log(`🇷🇺 Найдено русское название для "${anime.title}": ${russianTitle}`);
          return {
            title: russianTitle,
            kodikId: kodikAnime.id,
            found: true
          };
        }
      }
    } catch (err) {
      // Продолжаем поиск по другим ID
      continue;
    }
  }

  // Если не нашли в Kodik — возвращаем оригинальное
  console.log(`⚠️ Русское название не найдено для "${anime.title}"`);
  return {
    title: anime.title || anime.en_title || 'Без названия',
    kodikId: null,
    found: false
  };
}

// ===== ОБОГАЩЕНИЕ АНОНСОВ РУССКИМИ НАЗВАНИЯМИ =====
async function enrichAnonsWithRussianTitles(anons) {
  console.log('🇷🇺 Поиск русских названий в Kodik...');
  
  const enriched = [];
  
  for (const anime of anons) {
    const result = await getRussianTitleFromKodik(anime);
    
    enriched.push({
      ...anime,
      russianTitle: result.title,
      kodikId: result.kodikId,
      hasRussianTitle: result.found
    });
    
    // Небольшая задержка, чтобы не перегружать Kodik API
    await new Promise(r => setTimeout(r, 150));
  }
  
  const foundCount = enriched.filter(a => a.hasRussianTitle).length;
  console.log(`✅ Найдено русских названий: ${foundCount} из ${anons.length}`);
  
  return enriched;
}

// ===== РЕНДЕР =====
function renderAnons(animes) {
  if (!gridEl) return;

  if (animes.length === 0) {
    gridEl.innerHTML = `
      <div class="anons-empty" style="grid-column: 1/-1; text-align:center; padding:60px 20px; color:#555;">
        <span style="font-size:3rem; display:block; margin-bottom:12px;">🕒</span>
        <p>Анонсы не найдены</p>
      </div>
    `;
    return;
  }

  let html = '';

  animes.forEach((anime, index) => {
    const poster = anime.poster 
      ? `https://simkl.in/posters/${anime.poster}_m.jpg` 
      : 'https://via.placeholder.com/200x280?text=No+Image';

    // 🇷🇺 Используем русское название, если найдено
    const title = anime.russianTitle || anime.title || anime.en_title || 'Без названия';
    const titleOrig = anime.title || '';
    
    // Показываем оригинальное название, если оно отличается от русского
    const showOriginal = anime.hasRussianTitle && titleOrig && titleOrig !== title;

    let dateStr = 'Дата неизвестна';
    if (anime.date) {
      const date = new Date(anime.date);
      dateStr = date.toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
    }

    const animeType = anime.anime_type || 'anime';
    const typeLabels = {
      tv: 'ТВ-сериал',
      movie: 'Фильм',
      ova: 'OVA',
      ona: 'ONA',
      special: 'Спешл'
    };
    const typeLabel = typeLabels[animeType] || animeType;

    html += `
      <div class="anime-card" 
           data-mal-id="${anime.ids?.mal || ''}" 
           data-simkl-id="${anime.ids?.simkl || ''}"
           data-kodik-id="${anime.kodikId || ''}"
           style="animation-delay:${index * 0.03}s;">
        <img src="${poster}" alt="${title}" loading="lazy" 
             onerror="this.src='https://via.placeholder.com/200x280?text=No+Image'" />
        <div class="info">
          <div class="title">${title}</div>
          ${showOriginal ? `<div style="font-size:0.7rem;color:#666;">${titleOrig}</div>` : ''}
          <div class="year">📅 ${dateStr}</div>
          <div class="episodes">🎬 ${typeLabel}</div>
          ${anime.hasRussianTitle ? `<div style="font-size:0.65rem;color:#6c5ce7;">🇷🇺 Перевод найден</div>` : ''}
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
      const simklId = card.dataset.simklId;

      // Если есть Kodik ID — сразу открываем
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

      // Fallback — открываем Simkl
      if (simklId) {
        window.open(`https://simkl.com/anime/${simklId}`, '_blank');
      }
    });
  });
}

// ===== ЗАГРУЗКА =====
async function loadAnons() {
  if (isLoading) return;
  isLoading = true;

  if (loaderEl) loaderEl.style.display = 'block';
  if (refreshBtn) refreshBtn.disabled = true;
  if (gridEl) gridEl.innerHTML = '<div class="loader">Загрузка анонсов...</div>';

  try {
    // 1. Загружаем анонсы с Simkl
    const anons = await fetchAnons();
    
    if (anons.length === 0) {
      allAnons = [];
      renderAnons([]);
      return;
    }

    // 2. 🇷🇺 Обогащаем русскими названиями из Kodik
    if (gridEl) {
      gridEl.innerHTML = `<div class="loader">🇷🇺 Поиск русских названий... (0/${anons.length})</div>`;
    }
    
    const enriched = await enrichAnonsWithRussianTitles(anons);
    
    allAnons = enriched;
    renderAnons(enriched);
    
  } catch (err) {
    console.error('❌ Ошибка:', err);
  } finally {
    isLoading = false;
    if (loaderEl) loaderEl.style.display = 'none';
    if (refreshBtn) refreshBtn.disabled = false;
  }
}

// ===== ПОИСК =====
function filterAnons(query) {
  const q = query.toLowerCase().trim();
  if (!q) { renderAnons(allAnons); return; }

  const filtered = allAnons.filter(anime => {
    const ru = (anime.russianTitle || '').toLowerCase();
    const en = (anime.title || '').toLowerCase();
    const enTitle = (anime.en_title || '').toLowerCase();
    return ru.includes(q) || en.includes(q) || enTitle.includes(q);
  });

  renderAnons(filtered);
}

// ============================================
// 🗑️ АВТОМАТИЧЕСКОЕ УДАЛЕНИЕ ВЫШЕДШИХ
// ============================================

function removeAiredAnons() {
  const now = new Date();
  const beforeCount = allAnons.length;

  allAnons = allAnons.filter(anime => {
    if (!anime.date) return true;
    const airDate = new Date(anime.date);
    return airDate > now;
  });

  const removedCount = beforeCount - allAnons.length;
  if (removedCount > 0) {
    console.log(`🗑️ Удалено ${removedCount} вышедших анонсов`);
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
  console.log('🕒 Страница анонсов (Simkl + Kodik) загружена');
  loadAnons();

  setInterval(removeAiredAnons, 300000);
  setInterval(loadAnons, 1800000);
});

// Год в футере
const yearEl = document.getElementById('current-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
