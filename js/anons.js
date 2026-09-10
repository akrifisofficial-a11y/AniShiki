// ============================================
// 🕒 ANONS.JS — Анонсы через Jikan API
// ============================================

const JIKAN_API = 'https://api.jikan.moe/v4';

// ===== DOM =====
const gridEl = document.getElementById('anons-grid') || document.getElementById('mal-anons-grid');
const searchInput = document.getElementById('anons-search') || document.getElementById('mal-anons-search-input');
const searchBtn = document.getElementById('anons-search-btn') || document.getElementById('mal-anons-search-btn');
const loaderEl = document.getElementById('anons-loader') || document.getElementById('mal-anons-loader');

let allAnons = [];
let isLoading = false;

// ===== ЗАГРУЗКА АНОНСОВ =====
async function fetchAnons() {
  try {
    // Jikan API v4 — статус "upcoming" = анонсы
    const url = `${JIKAN_API}/anime?status=upcoming&limit=25&order_by=start_date&sort=asc`;

    console.log('📡 Запрос анонсов (Jikan):', url);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    console.log(`✅ Получено ${data.data?.length || 0} анонсов`);

    return data.data || [];
  } catch (err) {
    console.error('❌ Ошибка загрузки анонсов:', err);
    return [];
  }
}

// ===== РУССКОЕ НАЗВАНИЕ =====
function getRussianTitle(anime) {
  // Jikan возвращает titles с типами
  if (anime.titles) {
    const ruTitle = anime.titles.find(t => t.type === 'Russian');
    if (ruTitle) return ruTitle.title;
  }
  
  // Fallback
  return anime.title || anime.title_english || 'Без названия';
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
    const poster = anime.images?.jpg?.image_url || 'https://via.placeholder.com/200x280?text=No+Image';
    const title = getRussianTitle(anime);
    const titleOrig = anime.title || '';
    
    let dateStr = 'Дата неизвестна';
    if (anime.aired?.from) {
      const date = new Date(anime.aired.from);
      dateStr = date.toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
    }

    const episodes = anime.episodes || '—';
    const score = anime.score ? anime.score.toFixed(1) : '—';

    html += `
      <div class="anime-card" data-mal-id="${anime.mal_id}" style="animation-delay:${index * 0.03}s;">
        <img src="${poster}" alt="${title}" loading="lazy" 
             onerror="this.src='https://via.placeholder.com/200x280?text=No+Image'" />
        <div class="info">
          <div class="title">${title}</div>
          ${titleOrig && titleOrig !== title ? `<div style="font-size:0.7rem;color:#666;">${titleOrig}</div>` : ''}
          <div class="year">📅 ${dateStr}</div>
          <div class="episodes">📺 ${episodes} эп. · ⭐ ${score}</div>
        </div>
      </div>
    `;
  });

  gridEl.innerHTML = html;

  // Клик — ищем в Kodik
  gridEl.querySelectorAll('.anime-card').forEach(card => {
    card.addEventListener('click', async () => {
      const malId = card.dataset.malId;
      if (!malId) return;

      try {
        const params = new URLSearchParams({
          token: 'd99ff2ab48b0d9c42ace4901bee833ff',
          mal_id: malId
        });
        const url = `https://kodik-api.com/search?${params}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.results?.length > 0) {
          window.location.href = `index.html#anime/${data.results[0].id}`;
        } else {
          window.open(`https://myanimelist.net/anime/${malId}`, '_blank');
        }
      } catch (err) {
        window.open(`https://myanimelist.net/anime/${malId}`, '_blank');
      }
    });
  });
}

// ===== ЗАГРУЗКА =====
async function loadAnons() {
  if (isLoading) return;
  isLoading = true;

  if (loaderEl) loaderEl.style.display = 'block';
  if (gridEl) gridEl.innerHTML = '<div class="loader">Загрузка анонсов...</div>';

  try {
    const animes = await fetchAnons();
    allAnons = animes;
    renderAnons(animes);
  } catch (err) {
    console.error('❌ Ошибка:', err);
  } finally {
    isLoading = false;
    if (loaderEl) loaderEl.style.display = 'none';
  }
}

// ===== ПОИСК =====
function filterAnons(query) {
  const q = query.toLowerCase().trim();
  if (!q) { renderAnons(allAnons); return; }

  const filtered = allAnons.filter(anime => {
    const t1 = (anime.title || '').toLowerCase();
    const t2 = (anime.title_english || '').toLowerCase();
    const t3 = (anime.title_japanese || '').toLowerCase();
    const t4 = (anime.titles?.find(t => t.type === 'Russian')?.title || '').toLowerCase();
    return t1.includes(q) || t2.includes(q) || t3.includes(q) || t4.includes(q);
  });

  renderAnons(filtered);
}

// ===== ОБРАБОТЧИКИ =====
if (searchBtn && searchInput) {
  searchBtn.addEventListener('click', () => filterAnons(searchInput.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') filterAnons(searchInput.value);
  });
}

// ===== СТАРТ =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('🕒 Страница анонсов (Jikan) загружена');
  loadAnons();
});
