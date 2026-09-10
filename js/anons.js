// ============================================
// 🕒 MAL-ANONS.JS — Исправленный
// ============================================

const MAL_CLIENT_ID = 'b60e162b23102d8a77a9569380e5d57b';
const MAL_API_URL = 'https://api.myanimelist.net/v2';

// ===== DOM =====
const gridEl = document.getElementById('mal-anons-grid');
const searchInput = document.getElementById('mal-anons-search-input');
const searchBtn = document.getElementById('mal-anons-search-btn');
const refreshBtn = document.getElementById('mal-refresh-btn');
const loaderEl = document.getElementById('mal-anons-loader');

let allAnons = [];
let isLoading = false;

// ✅ ИСПРАВЛЕНИЕ: русское название
function getRussianTitle(anime) {
  if (anime.alternative_titles?.ru) {
    return anime.alternative_titles.ru;
  }
  
  if (anime.alternative_titles?.synonyms) {
    const ruSynonym = anime.alternative_titles.synonyms.find(s => /[а-яё]/i.test(s));
    if (ruSynonym) return ruSynonym;
  }
  
  return anime.title || 'Без названия';
}

// ✅ ИСПРАВЛЕНИЕ: правильная загрузка
async function fetchMALAnons() {
  try {
    const url = `${MAL_API_URL}/anime?q=&limit=50&status=not_yet_aired&fields=id,title,main_picture,alternative_titles,start_date,synopsis,mean,num_episodes,media_type,status`;

    console.log('📡 Запрос анонсов MAL:', url);

    const response = await fetch(url, {
      headers: {
        'X-MAL-CLIENT-ID': MAL_CLIENT_ID
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    
    // ✅ ИСПРАВЛЕНИЕ: разворачиваем node
    const animes = (data.data || []).map(item => item.node || item);
    
    console.log(`✅ Загружено ${animes.length} анонсов`);
    return animes;
  } catch (err) {
    console.error('❌ Ошибка:', err);
    return [];
  }
}

// ===== РЕНДЕР =====
function renderAnons(animes) {
  if (!gridEl) return;

  if (animes.length === 0) {
    gridEl.innerHTML = `
      <div class="mal-anons-empty">
        <span class="icon">🕒</span>
        <p>Анонсы не найдены</p>
      </div>
    `;
    return;
  }

  let html = '';

  animes.forEach((anime, index) => {
    let poster = 'https://via.placeholder.com/200x280?text=No+Image';
    if (anime.main_picture?.medium) {
      poster = anime.main_picture.medium;
    } else if (anime.main_picture?.large) {
      poster = anime.main_picture.large;
    }

    // ✅ ИСПРАВЛЕНИЕ: русское название
    const title = getRussianTitle(anime);
    const titleOriginal = anime.title || '';

    let dateStr = 'Дата неизвестна';
    if (anime.start_date) {
      const date = new Date(anime.start_date);
      dateStr = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }

    const episodes = anime.num_episodes || '—';
    const score = anime.mean ? anime.mean.toFixed(1) : '—';

    html += `
      <div class="anime-card" data-mal-id="${anime.id}" style="animation-delay:${index * 0.03}s;">
        <img src="${poster}" alt="${title}" loading="lazy" 
             onerror="this.src='https://via.placeholder.com/200x280?text=No+Image'" />
        <div class="info">
          <div class="title">${title}</div>
          ${titleOriginal && titleOriginal !== title ? `<div class="title-en" style="font-size:0.7rem;color:#666;">${titleOriginal}</div>` : ''}
          <div class="year">📅 ${dateStr}</div>
          <div class="episodes">📺 ${episodes} эп. · ⭐ ${score}</div>
        </div>
      </div>
    `;
  });

  gridEl.innerHTML = html;

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

        if (data.results && data.results.length > 0) {
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
  if (refreshBtn) refreshBtn.disabled = true;

  try {
    const freshAnons = await fetchMALAnons();
    allAnons = freshAnons;
    renderAnons(freshAnons);
  } catch (err) {
    console.error('❌ Ошибка:', err);
    gridEl.innerHTML = `
      <div class="mal-anons-empty">
        <span class="icon">😔</span>
        <p>Не удалось загрузить анонсы</p>
      </div>
    `;
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
    const t1 = (anime.title || '').toLowerCase();
    const t2 = (anime.alternative_titles?.en || '').toLowerCase();
    const t3 = (anime.alternative_titles?.ru || '').toLowerCase();
    const t4 = (anime.alternative_titles?.ja || '').toLowerCase();
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

if (refreshBtn) {
  refreshBtn.addEventListener('click', loadAnons);
}

// ===== СТАРТ =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('🕒 Страница анонсов MAL загружена');
  loadAnons();
  setInterval(loadAnons, 1800000);
});

// Год в футере
const yearEl = document.getElementById('current-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
