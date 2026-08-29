// ===== КОНФИГУРАЦИЯ =====
const KODIK_API_KEY = 'd99ff2ab48b0d9c42ace4901bee833ff';
const KODIK_API_URL = 'https://kodik-api.com';

// Настройки Shikimori OAuth (замените на свои)
const SHIKIMORI_CLIENT_ID = 'ВАШ_CLIENT_ID'; // получите на https://shikimori.one/oauth/applications
const SHIKIMORI_REDIRECT_URI = 'https://ваш-сайт.github.io/callback';
const SHIKIMORI_AUTH_URL = 'https://shikimori.one/oauth/authorize';

// ===== DOM-элементы =====
const listSection = document.getElementById('anime-list');
const playerSection = document.getElementById('player-section');
const catalogEl = document.getElementById('catalog');
const loaderEl = document.getElementById('loader');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const backBtn = document.getElementById('back-btn');
const shareBtn = document.getElementById('share-btn');
const playerIframe = document.getElementById('player-iframe');
const animeInfoEl = document.getElementById('anime-info');
const loginBtn = document.getElementById('login-btn');
const userInfoEl = document.getElementById('user-info');

// ===== СОСТОЯНИЕ =====
let currentAnimeId = null;
let currentAnimeData = null;
let accessToken = localStorage.getItem('shikimori_token') || null;
let userData = null;

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function showSection(section) {
  document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
  section.classList.add('active');
}

// ===== АВТОРИЗАЦИЯ SHIKIMORI =====
function loginShikimori() {
  const params = new URLSearchParams({
    client_id: SHIKIMORI_CLIENT_ID,
    redirect_uri: SHIKIMORI_REDIRECT_URI,
    response_type: 'code',
    scope: 'user_rates'
  });
  window.location.href = `${SHIKIMORI_AUTH_URL}?${params}`;
}

function logoutShikimori() {
  localStorage.removeItem('shikimori_token');
  localStorage.removeItem('shikimori_user');
  accessToken = null;
  userData = null;
  updateUserUI();
}

function updateUserUI() {
  if (userData) {
    loginBtn.textContent = `👤 ${userData.nickname}`;
    loginBtn.onclick = logoutShikimori;
    userInfoEl.textContent = `Привет, ${userData.nickname}!`;
  } else {
    loginBtn.textContent = 'Войти через Shikimori';
    loginBtn.onclick = loginShikimori;
    userInfoEl.textContent = '';
  }
}

// Обработка колбэка (редирект от Shikimori)
async function handleShikimoriCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) {
    console.log('Получен код авторизации:', code);
    alert('Код получен, но для завершения входа нужен бэкенд. Подробнее в консоли.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// ===== ЗАГРУЗКА СПИСКА АНИМЕ (только аниме) =====
async function fetchAnimeList(query = '') {
  catalogEl.innerHTML = '';
  loaderEl.style.display = 'block';

  try {
    let endpoint, params = {
      token: KODIK_API_KEY,
      sort: 'updated_at',
      order: 'desc',
      limit: 30,
      with_material_data: 'true',
      types: 'anime-serial,anime'
    };

    if (query.trim()) {
      endpoint = '/search';
      params.title = query.trim();
    } else {
      endpoint = '/list';
    }

    const url = `${KODIK_API_URL}${endpoint}?${new URLSearchParams(params)}`;
    console.log('Запрос:', url);

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ошибка HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      catalogEl.innerHTML = '<p style="text-align:center;color:#7a8aaa;">Ничего не найдено</p>';
      return;
    }
    renderAnimeList(data.results);
  } catch (err) {
    console.error(err);
    catalogEl.innerHTML = `<p style="text-align:center;color:#ff7a7a;">Ошибка загрузки: ${err.message}</p>`;
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

// ===== ЗАГРУЗКА ДАННЫХ ОДНОГО АНИМЕ (с ссылкой на Shikimori) =====
async function loadAnimeById(animeId) {
  currentAnimeId = animeId;
  showSection(playerSection);
  animeInfoEl.innerHTML = '<div class="loader">Загрузка данных...</div>';
  playerIframe.src = '';

  try {
    const params = new URLSearchParams({
      token: KODIK_API_KEY,
      id: animeId,
      with_material_data: 'true',
    });
    const url = `${KODIK_API_URL}/search?${params}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data.results || data.results.length === 0) throw new Error('Аниме не найдено');
    const anime = data.results[0];
    currentAnimeData = anime;

    // --- Плеер ---
    const season = anime.last_season || 1;
    const episode = anime.last_episode || 1;
    const playerSrc = `https://kodik.tv/seria/${animeId}/${season}/${episode}`;
    playerIframe.src = playerSrc;

    // --- Данные ---
    const title = anime.title || 'Без названия';
    const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/300x450?text=No+Image';
    const description = anime.description || anime.material_data?.description || 'Описание отсутствует.';
    const year = anime.year || anime.material_data?.year || '—';
    const rating = anime.rating?.imdb || anime.material_data?.rating || '—';
    const genres = anime.genres ? anime.genres.join(', ') : (anime.material_data?.genres?.join(', ') || '—');

    // --- Ссылка на Shikimori ---
    const shikimoriId = anime.shikimori_id || anime.material_data?.shikimori_id || null;
    let shikimoriLinkHtml = '';
    if (shikimoriId) {
      shikimoriLinkHtml = `<a href="https://shikimori.one/animes/${shikimoriId}" target="_blank" class="shikimori-link">🔗 Страница на Shikimori</a>`;
    }

    // --- Кнопка добавления в список (только если авторизован) ---
    let addBtnHtml = '';
    if (accessToken) {
      addBtnHtml = `<button id="add-to-list-btn" class="back-btn" style="margin-top:10px;">📥 Добавить в мой список</button>`;
    }

    // --- Вёрстка страницы аниме ---
    animeInfoEl.innerHTML = `
      <div class="anime-detail">
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
          <div style="margin-top:16px;color:#9aa3c0;font-size:0.9rem;">
            ▶ Сезон ${season}, серия ${episode}
          </div>
          <div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:12px;">
            ${shikimoriLinkHtml}
            ${addBtnHtml}
          </div>
        </div>
      </div>
    `;

    document.title = `${title} — Quarwatch`;

    // --- Обработчик кнопки добавления в список ---
    document.getElementById('add-to-list-btn')?.addEventListener('click', addToShikimoriList);
  } catch (err) {
    console.error(err);
    animeInfoEl.innerHTML = `<p style="color:#ff7a7a;">Ошибка загрузки аниме: ${err.message}</p>`;
  }
}

// ===== ДОБАВЛЕНИЕ В СПИСОК SHIKIMORI =====
async function addToShikimoriList() {
  if (!accessToken) {
    alert('Войдите в Shikimori, чтобы добавлять аниме в список.');
    return;
  }
  if (!currentAnimeData) {
    alert('Данные аниме не загружены.');
    return;
  }

  const shikimoriId = currentAnimeData.shikimori_id || currentAnimeData.material_data?.shikimori_id;
  if (!shikimoriId) {
    alert('Не удалось найти ID на Shikimori для этого аниме.');
    return;
  }

  try {
    const response = await fetch('https://shikimori.one/api/v2/user_rates', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_rate: {
          target_id: shikimoriId,
          target_type: 'Anime',
          status: 'planned'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    alert('Аниме добавлено в ваш список!');
    console.log('Ответ Shikimori:', result);
  } catch (err) {
    console.error(err);
    alert('Не удалось добавить в список: ' + err.message);
  }
}

// ===== КОПИРОВАНИЕ ССЫЛКИ =====
function copyPageLink() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    alert('Ссылка скопирована!');
  }).catch(() => {
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    alert('Ссылка скопирована!');
  });
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

function goBack() {
  playerIframe.src = '';
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.hash = '';
  }
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
shareBtn?.addEventListener('click', copyPageLink);
loginBtn?.addEventListener('click', loginShikimori);

// ===== ИНИЦИАЛИЗАЦИЯ ПОЛЬЗОВАТЕЛЯ =====
async function initUser() {
  const storedUser = localStorage.getItem('shikimori_user');
  if (storedUser) {
    try {
      userData = JSON.parse(storedUser);
      accessToken = localStorage.getItem('shikimori_token');
      updateUserUI();
    } catch(e) {}
  }
  if (accessToken && !userData) {
    try {
      const resp = await fetch('https://shikimori.one/api/users/whoami', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (resp.ok) {
        userData = await resp.json();
        localStorage.setItem('shikimori_user', JSON.stringify(userData));
        updateUserUI();
      } else {
        localStorage.removeItem('shikimori_token');
        accessToken = null;
      }
    } catch(e) {}
  }
}

// ===== СТАРТ =====
(async function() {
  await handleShikimoriCallback();
  await initUser();

  if (window.location.hash) {
    handleHashChange();
  } else {
    showSection(listSection);
    fetchAnimeList();
  }
})();
