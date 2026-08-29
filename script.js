// ===== КОНФИГУРАЦИЯ =====
const KODIK_API_KEY = 'd99ff2ab48b0d9c42ace4901bee833ff'; // замените на свой
const KODIK_API_URL = 'kodik-api.com';

// ===== DOM-элементы =====
const listSection = document.getElementById('anime-list');
const playerSection = document.getElementById('player-section');
const catalogEl = document.getElementById('catalog');
const loaderEl = document.getElementById('loader');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const backBtn = document.getElementById('back-btn');
const playerIframe = document.getElementById('player-iframe');
const animeInfoEl = document.getElementById('anime-info');

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function showSection(section) {
  document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
  section.classList.add('active');
}

// ===== ЗАГРУЗКА СПИСКА АНИМЕ =====
async function fetchAnimeList(query = '') {
  catalogEl.innerHTML = '';
  loaderEl.style.display = 'block';

  try {
    const params = new URLSearchParams({
      token: KODIK_API_KEY,
      sort: 'updated_at',
      order: 'desc',
      limit: 30,
      with_material_data: 'true',
      ...(query && { title: query }),
    });
    const url = `${KODIK_API_URL}/search?${params}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Ошибка HTTP ${response.status}`);
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

// ===== ОТРИСОВКА КАРТОЧЕК (клик → меняем хеш) =====
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
    // Вместо прямого вызова openPlayer – меняем хеш
    card.addEventListener('click', () => {
      window.location.hash = `anime/${id}`;
    });
    catalogEl.appendChild(card);
  });
}

// ===== ЗАГРУЗКА ОДНОГО АНИМЕ ПО ID (для страницы) =====
async function loadAnimeById(animeId) {
  // Показываем плеер-секцию с индикацией загрузки
  showSection(playerSection);
  animeInfoEl.innerHTML = '<div class="loader">Загрузка данных...</div>';
  playerIframe.src = ''; // очищаем плеер

  try {
    const params = new URLSearchParams({
      token: KODIK_API_KEY,
      id: animeId,
    });
    const url = `${KODIK_API_URL}/anime?${params}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data.results || data.results.length === 0) throw new Error('Аниме не найдено');
    const anime = data.results[0];

    // Строим плеер (последний сезон, первая серия)
    const season = anime.last_season || 1;
    const episode = anime.last_episode || 1;
    const playerSrc = `https://kodik.tv/seria/${animeId}/${season}/${episode}`;
    playerIframe.src = playerSrc;

    // Извлекаем данные
    const title = anime.title || 'Без названия';
    const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/300x450?text=No+Image';
    const description = anime.description || anime.material_data?.description || 'Описание отсутствует.';
    const year = anime.year || anime.material_data?.year || '—';
    const rating = anime.rating?.imdb || anime.material_data?.rating || '—';
    const genres = anime.genres ? anime.genres.join(', ') : (anime.material_data?.genres?.join(', ') || '—');

    // Отображаем детальную информацию с постером
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
        </div>
      </div>
    `;

    // Обновляем заголовок страницы
    document.title = `${title} — Quarwatch`;

  } catch (err) {
    console.error(err);
    animeInfoEl.innerHTML = `<p style="color:#ff7a7a;">Ошибка загрузки аниме: ${err.message}</p>`;
    // Если ошибка, можно вернуться к списку? Но оставим пользователя на странице с ошибкой.
  }
}

// ===== ОБРАБОТКА ИЗМЕНЕНИЯ ХЕША (маршрутизация) =====
function handleHashChange() {
  const hash = window.location.hash.slice(1); // убираем '#'
  if (hash.startsWith('anime/')) {
    const id = hash.split('/')[1];
    if (id) {
      loadAnimeById(id);
      return;
    }
  }
  // Если хеш пустой или не соответствует, показываем список
  showSection(listSection);
  // Если мы на главной, можно обновить список (но не обязательно)
  // Для экономии запросов оставим как есть, но если хотим обновить – раскомментируйте:
  // fetchAnimeList();
}

// ===== КНОПКА "НАЗАД" =====
function goBack() {
  // Останавливаем плеер
  playerIframe.src = '';
  // Возвращаемся в историю или просто убираем хеш
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.hash = '';
  }
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
window.addEventListener('hashchange', handleHashChange);

searchBtn.addEventListener('click', () => {
  const query = searchInput.value.trim();
  // При поиске переходим на главную, если не там
  if (window.location.hash) {
    window.location.hash = '';
    // Небольшая задержка, чтобы DOM успел обновиться, затем запускаем поиск
    setTimeout(() => fetchAnimeList(query), 50);
  } else {
    fetchAnimeList(query);
  }
});
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});
backBtn.addEventListener('click', goBack);

// ===== СТАРТ ПРИЛОЖЕНИЯ =====
// Проверяем хеш при загрузке
if (window.location.hash) {
  handleHashChange();
} else {
  // Показываем список
  showSection(listSection);
  fetchAnimeList();
}

// Дополнительно: если пользователь кликнул на карточку, но мы уже на странице аниме, ничего страшного – хеш изменится и перезагрузит данные.
