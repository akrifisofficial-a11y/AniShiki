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
const shareBtn = document.getElementById('share-btn'); // новая кнопка
const playerIframe = document.getElementById('player-iframe');
const animeInfoEl = document.getElementById('anime-info');

let currentAnimeId = null;
let currentSeason = 1;
let currentEpisode = 1;

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
      types: 'anime-serial,anime,movie'
    };

    if (query.trim()) {
      endpoint = '/search';
      params.title = query.trim();
    }

    const url = `${KODIK_API_URL}${endpoint}?${new URLSearchParams(params)}`;
    console.log('📡 Запрос каталога:', url);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      catalogEl.innerHTML = '<p style="text-align:center;color:#7a8aaa;">Ничего не найдено</p>';
      return;
    }
    renderAnimeList(data.results);
  } catch (err) {
    console.error('❌ Ошибка загрузки каталога:', err);
    catalogEl.innerHTML = `<p style="text-align:center;color:#ff7a7a;">Ошибка: ${err.message}</p>`;
  } finally {
    loaderEl.style.display = 'none';
  }
}

// ===== ОТРИСОВКА КАРТОЧЕК =====
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

// ===== КОПИРОВАНИЕ ССЫЛКИ =====
function copyPageLink() {
  const url = window.location.href;
  
  // Используем современный API, если доступен
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => {
        showCopyNotification('✅ Ссылка скопирована!');
      })
      .catch(() => {
        // Если clipboard API не сработал, используем fallback
        fallbackCopy(url);
      });
  } else {
    // Для старых браузеров
    fallbackCopy(url);
  }
}

// ===== FALLBACK ДЛЯ СТАРЫХ БРАУЗЕРОВ =====
function fallbackCopy(text) {
  const input = document.createElement('input');
  input.value = text;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  try {
    document.execCommand('copy');
    showCopyNotification('✅ Ссылка скопирована!');
  } catch (err) {
    showCopyNotification('❌ Не удалось скопировать ссылку');
  }
  document.body.removeChild(input);
}

// ===== УВЕДОМЛЕНИЕ О КОПИРОВАНИИ =====
function showCopyNotification(message) {
  // Удаляем старое уведомление, если есть
  const oldNotification = document.querySelector('.copy-notification');
  if (oldNotification) {
    oldNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = 'copy-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(20, 26, 50, 0.95);
    color: #e0e5ff;
    padding: 12px 24px;
    border-radius: 30px;
    border: 1px solid #5a6a8a;
    backdrop-filter: blur(10px);
    font-family: 'Orbitron', sans-serif;
    font-size: 0.9rem;
    z-index: 9999;
    animation: slideUp 0.3s ease-out;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  `;

  // Добавляем анимацию
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // Автоматически скрываем через 3 секунды
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ===== ЗАГРУЗКА СТРАНИЦЫ ТАЙТЛА =====
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
    });
    const url = `${KODIK_API_URL}/search?${params}`;
    console.log('📡 Запрос деталей:', url);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data.results || data.results.length === 0) throw new Error('Тайтл не найден');
    const anime = data.results[0];

    // =========================================
    // ПЛЕЕР – ИСПОЛЬЗУЕМ ГОТОВУЮ ССЫЛКУ ИЗ API
    // =========================================
    let playerSrc = null;

    // Прямая ссылка на плеер из поля link
    if (anime.link) {
      playerSrc = anime.link.startsWith('//') ? `https:${anime.link}` : anime.link;
      console.log('🎬 Ссылка на плеер из API:', playerSrc);
    } else {
      console.error('❌ Нет ссылки на плеер в ответе API');
      playerSrc = 'about:blank';
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

    // ===== ОПРЕДЕЛЯЕМ СЕЗОН И СЕРИЮ =====
    currentSeason = anime.last_season || 1;
    currentEpisode = anime.last_episode || 1;

    // ===== ОСТАЛЬНЫЕ ДАННЫЕ =====
    const title = anime.title || 'Без названия';
    const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/300x450?text=No+Image';
    const description = anime.description || anime.material_data?.description || 'Описание отсутствует.';
    const year = anime.year || anime.material_data?.year || '—';
    const rating = anime.rating?.imdb || anime.material_data?.rating || '—';
    const genres = anime.genres ? anime.genres.join(', ') : (anime.material_data?.genres?.join(', ') || '—');

    // ===== ПОКАЗЫВАЕМ НОМЕР СЕЗОНА И СЕРИИ ПОД ПЛЕЕРОМ =====
    const episodeInfo = `
      <div style="margin-top: 12px; padding: 10px 16px; background: rgba(20, 26, 50, 0.5); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
        <span style="color: #9aa3c0; font-size: 0.9rem;">
          ▶ Сезон ${currentSeason}, серия ${currentEpisode}
        </span>
      </div>
    `;

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
          ${episodeInfo}
        </div>
      </div>
    `;
    document.title = `${title} — Quarwatch`;
  } catch (err) {
    console.error('❌ Ошибка загрузки тайтла:', err);
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
shareBtn.addEventListener('click', copyPageLink); // добавляем обработчик

// ===== СТАРТ =====
if (window.location.hash) {
  handleHashChange();
} else {
  showSection(listSection);
  fetchAnimeList();
        }
