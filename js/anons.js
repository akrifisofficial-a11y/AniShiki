// ============================================
// 🕒 ANONS.JS — Рабочая версия с MAL API
// ============================================

const MAL_CLIENT_ID = 'b60e162b23102d8a77a9569380e5d57b';
const MAL_API_URL = 'https://api.myanimelist.net/v2';

// ===== DOM =====
const gridEl = document.getElementById('anons-grid') || document.getElementById('mal-anons-grid');
const searchInput = document.getElementById('anons-search') || document.getElementById('mal-anons-search-input');
const searchBtn = document.getElementById('anons-search-btn') || document.getElementById('mal-anons-search-btn');
const loaderEl = document.getElementById('anons-loader') || document.getElementById('mal-anons-loader');

let allAnons = [];
let isLoading = false;

// ===== УТИЛИТЫ =====

// Русское название
function getRussianTitle(anime) {
  if (anime.alternative_titles?.ru) return anime.alternative_titles.ru;
  if (anime.alternative_titles?.synonyms) {
    const ru = anime.alternative_titles.synonyms.find(s => /[а-яё]/i.test(s));
    if (ru) return ru;
  }
  return anime.title || 'Без названия';
}

// ===== ЗАГРУЗКА АНОНСОВ =====
async function fetchMALAnons() {
  try {
    // ⚠️ ВАЖНО: используем сезонный эндпоинт для анонсов
    // Он работает без поискового запроса
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // Запрашиваем аниме за текущий и следующий год
    // и фильтруем по статусу на клиенте
    const url = `${MAL_API_URL}/anime/season/${nextYear}/winter?limit=100&fields=id,title,main_picture,alternative_titles,start_date,synopsis,mean,num_episodes,media_type,status`;
    
    console.log('📡 Запрос анонсов (сезон):', url);

    const response = await fetch(url, {
      headers: {
        'X-MAL-CLIENT-ID': MAL_CLIENT_ID
      }
    });

    if (!response.ok) {
      console.error('❌ HTTP ошибка:', response.status);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 Ответ API:', data);

    if (!data.data || data.data.length === 0) {
      console.warn('⚠️ API вернул пустой массив');
      return [];
    }

    // Разворачиваем node и фильтруем только анонсы
    const animes = data.data
      .map(item => item.node || item)
      .filter(anime => anime.status === 'not_yet_aired');

    console.log(`✅ Загружено ${animes.length} анонсов (из ${data.data.length})`);
    return animes;

  } catch (err) {
    console.error('❌ Ошибка загрузки:', err);
    return [];
  }
}

// ===== АЛЬТЕРНАТИВНЫЙ СПОСОБ: через поиск =====
async function fetchMALAnonsBySearch() {
  try {
    // Ищем аниме с пустым запросом, но с фильтром
    // Используем поиск по популярным жанрам для анонсов
    const url = `${MAL_API_URL}/anime?q=a&limit=100&fields=id,title,main_picture,alternative_titles,start_date,mean,num_episodes,media_type,status`;

    const response = await fetch(url, {
      headers: {
        'X-MAL-CLIENT-ID': MAL_CLIENT_ID
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    
    // Фильтруем только анонсы
    const animes = (data.data || [])
      .map(item => item.node || item)
      .filter(anime => anime.status === 'not_yet_aired');

    console.log(`✅ Поиск: найдено ${animes.length} анонсов`);
    return animes;

  } catch (err) {
    console.error('❌ Ошибка поиска:', err);
    return [];
  }
}

// ===== РЕНДЕР =====
function renderAnons(animes) {
  if (!gridEl) {
    console.error('❌ gridEl не найден!');
    return;
  }

  if (animes.length === 0) {
    gridEl.innerHTML = `
      <div class="anons-empty" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #555;">
        <span style="font-size:3rem; display:block; margin-bottom:12px;">🕒</span>
        <p>Анонсы не найдены</p>
        <p style="font-size:0.8rem; color:#444; margin-top:8px;">
          API не вернул анонсы. Попробуйте позже.
        </p>
      </div>
    `;
    return;
  }

  let html = '';

  animes.forEach((anime, index) => {
    let poster = 'https://via.placeholder.com/200x280?text=No+Image';
    if (anime.main_picture?.medium) poster = anime.main_picture.medium;
    else if (anime.main_picture?.large) poster = anime.main_picture.large;

    const title = getRussianTitle(anime);
    const titleOrig = anime.title || '';

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
          ${titleOrig && titleOrig !== title ? `<div style="font-size:0.7rem;color:#666;">${titleOrig}</div>` : ''}
          <div class="year">📅 ${dateStr}</div>
          <div class="episodes">📺 ${episodes} эп. · ⭐ ${score}</div>
        </div>
      </div>
    `;
  });

  gridEl.innerHTML = html;

  // Клик
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
  if (gridEl) gridEl.innerHTML = '<div class="loader">Загрузка анонсов...</div>';

  try {
    // Пробуем сначала сезонный эндпоинт
    let animes = await fetchMALAnons();
    
    // Если пусто — пробуем через поиск
    if (animes.length === 0) {
      console.log('🔄 Сезонный эндпоинт пуст, пробуем поиск...');
      animes = await fetchMALAnonsBySearch();
    }

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

// ===== СТАРТ =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('🕒 Страница анонсов загружена');
  loadAnons();
});

// Год в футере
const yearEl = document.getElementById('current-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
