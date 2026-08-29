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
const playerIframe = document.getElementById('player-iframe');
const animeInfoEl = document.getElementById('anime-info');

let currentAnimeId = null;

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

// ===== ЗАГРУЗКА СТРАНИЦЫ ТАЙТЛА (с эпизодами) =====
async function loadAnimeById(animeId) {
  if (currentAnimeId === animeId && document.getElementById('anime-detail')) {
    return;
  }
  currentAnimeId = animeId;
  showSection(playerSection);
  animeInfoEl.innerHTML = '<div class="loader">Загрузка...</div>';
  playerIframe.src = '';

  try {
    const params = new URLSearchParams({
      token: KODIK_API_KEY,
      id: animeId,
      with_material_data: 'true',
      with_player_link: 'true',
      with_seasons: 'true',   // запрашиваем сезоны
      with_episodes: 'true'   // запрашиваем эпизоды
    });
    const url = `${KODIK_API_URL}/search?${params}`;
    console.log('Запрос деталей:', url);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data.results || data.results.length === 0) throw new Error('Тайтл не найден');
    const anime = data.results[0];

    // ===== ПОЛУЧАЕМ ССЫЛКУ НА ПЛЕЕР =====
    let playerSrc = null;

    // 1. Пробуем player_link из корня (обычно ведёт на первую серию или страницу выбора)
    if (anime.player_link) {
      playerSrc = anime.player_link.startsWith('//') ? `https:${anime.player_link}` : anime.player_link;
      console.log('🎬 Используем player_link (корневой):', playerSrc);
    } else {
      // 2. Если нет, ищем первый сезон и первый эпизод
      const episodesData = anime.episodes;
      if (episodesData && typeof episodesData === 'object') {
        // Находим минимальный номер сезона
        const seasonKeys = Object.keys(episodesData).map(Number).sort((a,b) => a - b);
        if (seasonKeys.length > 0) {
          const firstSeason = seasonKeys[0];
          const episodes = episodesData[firstSeason];
          if (Array.isArray(episodes) && episodes.length > 0) {
            const firstEpisode = episodes[0];
            if (firstEpisode.player_link) {
              playerSrc = firstEpisode.player_link.startsWith('//') ? `https:${firstEpisode.player_link}` : firstEpisode.player_link;
              console.log(`🎬 Используем player_link из эпизода ${firstEpisode.episode} (сезон ${firstSeason}):`, playerSrc);
            }
          }
        }
      }
    }

    // 3. Если всё ещё нет, пробуем собрать из hash
    if (!playerSrc) {
      const hash = anime.hash || anime.player_hash || anime.material_data?.hash || null;
      if (hash) {
        playerSrc = `https://kodikplayer.com/serial/${animeId}/${hash}/720p`;
        console.log('🛠️ Собрано из hash:', playerSrc);
      } else {
        console.error('❌ Не удалось найти ссылку для плеера');
        playerSrc = 'about:blank';
      }
    }

    // Добавляем autoplay
    if (playerSrc && playerSrc !== 'about:blank') {
      try {
        const urlObj = new URL(playerSrc);
        if (!urlObj.searchParams.has('autoplay')) {
          urlObj.searchParams.set('autoplay', '1');
        }
        playerSrc = urlObj.toString();
      } catch (e) {
        console.warn('Не удалось добавить autoplay');
      }
    }
    playerIframe.src = playerSrc || 'about:blank';

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
  playerIframe.src = '';
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
