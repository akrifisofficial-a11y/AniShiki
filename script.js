// ===== КОНФИГУРАЦИЯ =====
// Вставьте сюда ваш API-ключ от Kodik (получить на https://kodikapi.com/)
const KODIK_API_KEY = 'ВАШ_API_КЛЮЧ'; // <-- замените
const KODIK_API_URL = 'https://kodikapi.com';

// ===== СОСТОЯНИЕ =====
let currentAnimeId = null;      // ID тайтла для плеера
let currentAnimeData = null;   // данные текущего аниме

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
    card.addEventListener('click', () => openPlayer(id));
    catalogEl.appendChild(card);
  });
}

// ===== ОТКРЫТИЕ ПЛЕЕРА =====
async function openPlayer(animeId) {
  currentAnimeId = animeId;
  // Получаем детальную информацию для плеера
  try {
    const params = new URLSearchParams({
      token: KODIK_API_KEY,
      id: animeId,
    });
    const url = `${KODIK_API_URL}/anime?${params}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Не удалось загрузить данные для плеера');
    const data = await resp.json();
    if (!data.results || data.results.length === 0) throw new Error('Аниме не найдено');
    const anime = data.results[0];
    currentAnimeData = anime;
    
    // Строим ссылку для плеера (первая серия первого сезона)
    // Используем kodik.tv/seria/{id}/{season}/{episode}
    const season = anime.last_season || 1;
    const episode = anime.last_episode || 1;
    // Иногда id бывает строкой, оставляем как есть
    const playerSrc = `https://kodik.tv/seria/${animeId}/${season}/${episode}`;
    
    // Вставляем плеер
    playerIframe.src = playerSrc;
    
    // Отображаем информацию
    const title = anime.title || 'Без названия';
    const description = anime.description || 'Описание отсутствует.';
    animeInfoEl.innerHTML = `
      <h2>${title}</h2>
      <p>${description}</p>
      <p style="margin-top:10px;color:#9aa3c0;">Сезон ${season}, серия ${episode}</p>
    `;
    
    // Переключаемся на секцию плеера
    showSection(playerSection);
    // Прокручиваем вверх
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    console.error(err);
    alert('Ошибка открытия плеера: ' + err.message);
  }
}

// ===== НАЗАД К СПИСКУ =====
function goBack() {
  playerIframe.src = ''; // останавливаем видео
  showSection(listSection);
  currentAnimeId = null;
  currentAnimeData = null;
}

// ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
searchBtn.addEventListener('click', () => {
  const query = searchInput.value.trim();
  fetchAnimeList(query);
});
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});
backBtn.addEventListener('click', goBack);

// ===== ЗАГРУЗКА ПРИ СТАРТЕ =====
fetchAnimeList();
