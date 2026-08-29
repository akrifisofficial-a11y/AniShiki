// ===== КОНФИГУРАЦИЯ =====
const KODIK_API_KEY = 'd99ff2ab48b0d9c42ace4901bee833ff';
const KODIK_API_URL = 'https://kodik-api.com';

// ===== DOM =====
const listSection = document.getElementById('anime-list');
const playerSection = document.getElementById('player-section');
const catalogEl = document.getElementById('catalog');
const loaderEl = document.getElementById('loader');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const backBtn = document.getElementById('back-btn');
const playerContainer = document.getElementById('player-container');
const kodikPlayerDiv = document.getElementById('kodik-player');
const animeInfoEl = document.getElementById('anime-info');

let currentAnimeId = null;
let kodikScriptLoaded = false; // флаг, что скрипт уже загружен

function showSection(section) {
  document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
  section.classList.add('active');
}

// ===== ЗАГРУЗКА КАТАЛОГА =====
async function fetchAnimeList(query = '') {
  catalogEl.innerHTML = '';
  loaderEl.style.display = 'block';

  try {
    let endpoint = '/list';
    let params = {
      token: KODIK_API_KEY,
      sort: 'updated_at',
      order: 'desc',
      limit: 30,
      with_material_data: 'true',
      with_player_link: 'true',
      types: 'anime-serial,anime,movie'
    };

    if (query.trim()) {
      endpoint = '/search';
      params.title = query.trim();
    }

    const url = `${KODIK_API_URL}${endpoint}?${new URLSearchParams(params)}`;
    console.log('Запрос каталога:', url);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      catalogEl.innerHTML = '<p style="text-align:center;color:#7a8aaa;">Ничего не найдено</p>';
      return;
    }
    renderAnimeList(data.results);
  } catch (err) {
    console.error(err);
    catalogEl.innerHTML = `<p style="text-align:center;color:#ff7a7a;">Ошибка: ${err.message}</p>`;
  } finally {
    loaderEl.style.display = 'none';
  }
}

// ===== ОТРИСОВКА =====
function renderAnimeList(animes) {
  catalogEl.innerHTML = '';
  animes.forEach(anime => {
    const card = document.createElement('div');
    card.className = 'anime-card';

    const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/200x280?text=No+Image';
    const title = anime.title || anime.material_data?.title || 'Без названия';
    const year = anime.year || anime.material_data?.year || '';
    const id = anime.id;

    card.innerHTML = `
      <img src="${poster}" alt="${title}" loading="lazy" />
      <div class="info">
        <div class="title">${title}</div>
        <div class="year">${year}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      window.location.hash = `anime/${id}`;
    });
    catalogEl.appendChild(card);
  });
}

// ===== ЗАГРУЗКА СТРАНИЦЫ ТАЙТЛА =====
async function loadAnimeById(animeId) {
  if (currentAnimeId === animeId && document.getElementById('anime-detail')) {
    return;
  }
  currentAnimeId = animeId;
  showSection(playerSection);
  animeInfoEl.innerHTML = '<div class="loader">Загрузка...</div>';

  // Очищаем старый плеер
  kodikPlayerDiv.innerHTML = '';

  try {
    const params = new URLSearchParams({
      token: KODIK_API_KEY,
      id: animeId,
      with_material_data: 'true',
      with_seasons: 'true',
      with_episodes: 'true'
    });
    const url = `${KODIK_API_URL}/search?${params}`;
    console.log('Запрос деталей:', url);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data.results || data.results.length === 0) throw new Error('Тайтл не найден');
    const anime = data.results[0];

    // ===== ОПРЕДЕЛЯЕМ СЕЗОН И ЭПИЗОД =====
    let season = 1;
    let episode = 1;

    // Если есть данные по эпизодам, берём первый сезон и первый эпизод
    if (anime.episodes && typeof anime.episodes === 'object') {
      const seasonKeys = Object.keys(anime.episodes).map(Number).sort((a,b) => a - b);
      if (seasonKeys.length > 0) {
        season = seasonKeys[0];
        const episodes = anime.episodes[season];
        if (Array.isArray(episodes) && episodes.length > 0) {
          episode = episodes[0].episode || 1;
        }
      }
    }

    // ===== ВСТРАИВАЕМ ПЛЕЕР ЧЕРЕЗ kodik-add.com =====
    const script = document.createElement('script');
    script.src = '//kodik-add.com/add-players.min.js';
    script.async = true;

    // Глобальный объект для параметров плеера
    window.kodikAddPlayers = {
      notBlockedForMe: true,
      types: "foreign-movie,russian-movie,foreign-cartoon,russian-cartoon,soviet-cartoon,multi-part-film,foreign-serial,russian-serial,cartoon-serial,russian-cartoon-serial,documentary-serial,russian-documentary-serial",
      season: season,
      episode: episode,
      min_age_confirmation: true,
      lgbt_preview_icon: true,
      lgbt_confirmation: true
    };

    // Удаляем старый скрипт, если он уже есть (чтобы избежать дублирования)
    const oldScript = document.querySelector('script[src*="kodik-add.com/add-players.min.js"]');
    if (oldScript) {
      oldScript.remove();
      // Также удаляем возможные глобальные переменные, которые могли остаться
      window.kodikAddPlayers = null;
    }

    // Добавляем новый скрипт
    document.body.appendChild(script);

    // Обработчик, когда скрипт загрузится
    script.onload = function() {
      console.log('✅ Плеер Kodik загружен');
      // Скрипт автоматически находит контейнер #kodik-player и вставляет плеер
    };

    // ===== ОСТАЛЬНЫЕ ДАННЫЕ =====
    const title = anime.title || 'Без названия';
    const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/300x450?text=No+Image';
    const description = anime.description || anime.material_data?.description || 'Описание отсутствует.';
    const year = anime.year || anime.material_data?.year || '—';
    const rating = anime.rating?.imdb || anime.material_data?.rating || '—';
    const genres = anime.genres ? anime.genres.join(', ') : (anime.material_data?.genres?.join(', ') || '—');

    animeInfoEl.innerHTML = `
      <div class="anime-detail" id="anime-detail">
        <div class="poster">
          <img src="${poster}" alt="${title}" />
        </div>
        <div class="info">
          <h2>${title}</h2>
          <div class="meta">
            <span>📅 ${year}</span>
            <span>⭐ ${rating}</span>
            <span>🎭 ${genres}</span>
          </div>
          <div class="description">${description}</div>
        </div>
      </div>
    `;
    document.title = `${title} — Quarwatch`;
  } catch (err) {
    console.error(err);
    animeInfoEl.innerHTML = `<p style="color:#ff7a7a;">Ошибка: ${err.message}</p>`;
  }
}

// ===== МАРШРУТИЗАЦИЯ =====
function handleHashChange() {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('anime/')) {
    const id = hash.split('/')[1];
    if (id) {
      loadAnimeById(id);
      return;
    }
  }
  showSection(listSection);
}

// ===== НАЗАД =====
function goBack() {
  // Очищаем плеер
  kodikPlayerDiv.innerHTML = '';
  const oldScript = document.querySelector('script[src*="kodik-add.com/add-players.min.js"]');
  if (oldScript) oldScript.remove();
  window.kodikAddPlayers = null;
  window.location.hash = '';
}

// ===== ОБРАБОТЧИКИ =====
window.addEventListener('hashchange', handleHashChange);
searchBtn.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (window.location.hash) {
    window.location.hash = '';
    setTimeout(() => fetchAnimeList(query), 50);
  } else {
    fetchAnimeList(query);
  }
});
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});
backBtn.addEventListener('click', goBack);

// ===== СТАРТ =====
if (window.location.hash) {
  handleHashChange();
} else {
  showSection(listSection);
  fetchAnimeList();
    }
