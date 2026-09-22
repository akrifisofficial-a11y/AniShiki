// ============================================
// 🚀 QUARWATCH — SCRIPT.JS
// ============================================

const KODIK_API_KEY = 'd99ff2ab48b0d9c42ace4901bee833ff';
const KODIK_API_URL = 'https://kodik-api.com';

console.log('🚀 Quarwatch запущен');

// ===== ПРОВЕРКА ТИПОВ =====
const ALLOWED_TYPES = ['anime-serial', 'anime'];

function isAnime(item) {
  if (!item) return false;
  return ALLOWED_TYPES.includes(item.type);
}

function filterAnimeOnly(results) {
  if (!results || !Array.isArray(results)) return [];
  return results.filter(item => isAnime(item));
}

function removeDuplicates(animes) {
  const seenIds = new Set();
  const seenTitles = new Set();
  const unique = [];

  animes.forEach(anime => {
    const titleKey = anime.title?.toLowerCase().trim() || '';
    if (!seenIds.has(anime.id) && !seenTitles.has(titleKey)) {
      seenIds.add(anime.id);
      seenTitles.add(titleKey);
      unique.push(anime);
    }
  });

  return unique;
}

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let allLoadedIds = new Set();
let currentAnimeId = null;
let currentCategory = 'series';
let nextPageUrl = null;
let isLoading = false;
let isFetchingMore = false;
let currentQuery = '';

// ===== DOM =====
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
const logoLink = document.getElementById('logo-link');
const loadMoreBtn = document.getElementById('load-more-btn');

// ===== МОДАЛЬНОЕ ОКНО =====
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalBody = document.getElementById('modal-body');

const modalImageOverlay = document.getElementById('modal-image-overlay');
const modalImage = document.getElementById('modal-image');
const modalImageClose = document.getElementById('modal-image-close');

// =========================================
// ГАМБУРГЕР
// =========================================
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');

if (hamburger && navMenu) {
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
      hamburger.classList.remove('active');
      navMenu.classList.remove('open');
    }
  });
}

// =========================================
// ПОИСК (СКРЫТЫЙ)
// =========================================
const searchToggle = document.getElementById('search-toggle');
const searchBar = document.getElementById('search-bar');

if (searchToggle && searchBar) {
  searchToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    searchBar.classList.toggle('hidden');
    if (!searchBar.classList.contains('hidden')) {
      searchInput?.focus();
    }
  });
}

// =========================================
// ПОИСК ПО КНОПКЕ / ENTER
// =========================================
if (searchBtn && searchInput) {
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
}

// =========================================
// НИЖНЯЯ НАВИГАЦИЯ
// =========================================
const bottomNavItems = document.querySelectorAll('.bottom-nav-item[data-type]');

bottomNavItems.forEach(item => {
  item.addEventListener('click', () => {
    const type = item.dataset.type;

    bottomNavItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    setCategory(type);
  });
});

// =========================================
// УТИЛИТЫ
// =========================================
function showSection(section) {
  document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
  section.classList.add('active');
}

function setCategory(type) {
  allLoadedIds.clear();
  currentCategory = type;
  nextPageUrl = null;
  currentQuery = '';
  if (searchInput) searchInput.value = '';

  if (window.location.hash) {
    window.location.hash = '';
  }

  fetchAnimeList();
}

// =========================================
// ЗАГРУЗКА КАТАЛОГА
// =========================================
async function fetchAnimeList(query = '', loadMore = false) {
  if (isLoading) return;
  isLoading = true;
  isFetchingMore = loadMore;

  if (!loadMore) {
    if (catalogEl) catalogEl.innerHTML = '';
    nextPageUrl = null;
    currentQuery = query;
    allLoadedIds.clear();
    if (loaderEl) loaderEl.style.display = 'block';
  }

  if (loadMoreBtn) loadMoreBtn.style.display = 'none';

  try {
    // Формируем URL
    let endpoint = '/list';
    let params = {
      token: KODIK_API_KEY,
      limit: 30,
      with_material_data: 'true',
      types: 'anime-serial,anime'
    };

    // Категория
    if (currentCategory === 'series') {
      params.types = 'anime-serial';
    } else if (currentCategory === 'movie') {
      params.types = 'anime';
    }

    // Поиск
    if (query.trim()) {
      endpoint = '/search';
      params.title = query.trim();
      params.types = 'anime-serial,anime';
    }

    const url = `${KODIK_API_URL}${endpoint}?${new URLSearchParams(params)}`;
    console.log('📡 Запрос:', url);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    let filteredResults = filterAnimeOnly(data.results);
    let uniqueResults = removeDuplicates(filteredResults);

    // Убираем уже загруженные
    const newUniqueResults = [];
    uniqueResults.forEach(anime => {
      if (!allLoadedIds.has(anime.id)) {
        allLoadedIds.add(anime.id);
        newUniqueResults.push(anime);
      }
    });

    nextPageUrl = newUniqueResults.length > 0 ? data.next_page || null : null;

    if (newUniqueResults.length === 0) {
      if (!loadMore && catalogEl) {
        catalogEl.innerHTML = '<p style="text-align:center;color:#7a8aaa;padding:40px;">Аниме не найдено</p>';
      }
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      return;
    }

    renderAnimeList(newUniqueResults, loadMore);

    if (loadMoreBtn) {
      loadMoreBtn.style.display = nextPageUrl ? 'block' : 'none';
    }

  } catch (err) {
    console.error('❌ Ошибка загрузки:', err);
    if (!loadMore && catalogEl) {
      catalogEl.innerHTML = `
        <p style="text-align:center;color:#7a8aaa;margin-top:20px;">
          ⚠️ Не удалось загрузить данные
        </p>
        <p style="text-align:center;color:#5a6a8a;font-size:0.85rem;margin-top:10px;">
          Проверьте подключение или обновите страницу
        </p>
      `;
    }
  } finally {
    if (loaderEl) loaderEl.style.display = 'none';
    isLoading = false;
    isFetchingMore = false;
  }
}

// =========================================
// ОТРИСОВКА КАРТОЧЕК
// =========================================
function renderAnimeList(animes, append = false) {
  if (!catalogEl) return;

  if (!append) {
    catalogEl.innerHTML = '';
  }

  const uniqueAnimes = [];
  const seenIds = new Set();
  const seenTitles = new Set();

  animes.forEach(anime => {
    const titleKey = anime.title?.toLowerCase().trim() || '';
    if (!seenIds.has(anime.id) && !seenTitles.has(titleKey)) {
      seenIds.add(anime.id);
      seenTitles.add(titleKey);
      uniqueAnimes.push(anime);
    }
  });

  if (uniqueAnimes.length === 0) {
    catalogEl.innerHTML = '<p style="text-align:center;color:#7a8aaa;padding:40px;">Аниме не найдено</p>';
    return;
  }

  uniqueAnimes.forEach(anime => {
    const card = document.createElement('div');
    card.className = 'anime-card';

    const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/200x280?text=No+Image';
    const title = anime.title || anime.material_data?.title || 'Без названия';
    const year = anime.year || anime.material_data?.year || '';
    const id = anime.id;
    const episodes = anime.episodes_count || anime.material_data?.episodes_count || '';

    card.innerHTML = `
      <img src="${poster}" alt="${title}" loading="lazy" 
           onerror="this.src='https://via.placeholder.com/200x280?text=No+Image'" />
      <div class="info">
        <div class="title">${title}</div>
        <div class="year">${year}</div>
        ${episodes ? `<div class="episodes">📺 ${episodes} серий</div>` : ''}
      </div>
    `;

    card.dataset.animeId = id;

    card.addEventListener('click', function () {
      const animeId = this.dataset.animeId;
      if (currentAnimeId === animeId) return;
      window.location.hash = `anime/${animeId}`;
    });

    catalogEl.appendChild(card);
  });
}

// =========================================
// ЗАГРУЗКА ПЛЕЕРА
// =========================================
async function loadAnimeById(animeId) {
  if (currentAnimeId === animeId) return;

  currentAnimeId = animeId;
  showSection(playerSection);
  if (animeInfoEl) animeInfoEl.innerHTML = '<div class="loader">Загрузка...</div>';
  if (playerIframe) playerIframe.src = '';

  window.scrollTo({ top: 0, behavior: 'smooth' });

  try {
    const params = new URLSearchParams({
      token: KODIK_API_KEY,
      id: animeId,
      with_material_data: 'true'
    });

    const url = `${KODIK_API_URL}/search?${params}`;
    console.log('📡 Запрос тайтла:', url);

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();
    if (!data.results || data.results.length === 0) throw new Error('Тайтл не найден');

    const anime = data.results[0];

    // Плеер
    let playerSrc = 'about:blank';
    if (anime.link) {
      playerSrc = anime.link.startsWith('//') ? `https:${anime.link}` : anime.link;
      try {
        const urlObj = new URL(playerSrc);
        if (!urlObj.searchParams.has('autoplay')) {
          urlObj.searchParams.set('autoplay', '1');
        }
        playerSrc = urlObj.toString();
      } catch (e) {}
    }

    if (playerIframe) playerIframe.src = playerSrc;

    // Информация
    const title = anime.title || 'Без названия';
    const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/300x450?text=No+Image';
    const description = anime.description || anime.material_data?.description || 'Описание отсутствует.';
    const year = anime.year || anime.material_data?.year || '—';
    const rating = anime.rating?.imdb || anime.material_data?.rating || '—';

    let genresList = anime.genres || anime.material_data?.genres || [];
    if (typeof genresList === 'string') {
      genresList = genresList.split(',').map(g => g.trim());
    }
    const genresText = genresList.length > 0 ? genresList.join(', ') : '—';

    if (animeInfoEl) {
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
              <span>🎭 ${genresText}</span>
            </div>
            <div class="description">${description}</div>
          </div>
        </div>
      `;
    }

    document.title = `${title} — Quarwatch`;

    // Сохраняем в историю
    addToHistory(animeId, title, poster);

    // Увеличение постера
    const posterImg = document.querySelector('.anime-detail .poster img');
    if (posterImg) {
      posterImg.style.cursor = 'pointer';
      posterImg.addEventListener('click', () => {
        if (modalImage && modalImageOverlay) {
          modalImage.src = posterImg.src;
          modalImageOverlay.classList.add('open');
        }
      });
    }

  } catch (err) {
    console.error('❌ Ошибка загрузки тайтла:', err);
    if (animeInfoEl) {
      animeInfoEl.innerHTML = `
        <div class="anime-detail">
          <div class="info" style="text-align:center; padding:40px 20px;">
            <h2 style="color:#ff7a7a;">⛔ ОШИБКА</h2>
            <p style="color:#9aa3c0; margin:20px 0;">
              Не удалось загрузить данные.
            </p>
            <button class="back-btn" onclick="window.location.hash=''">← На главную</button>
          </div>
        </div>
      `;
    }
    if (playerIframe) playerIframe.src = 'about:blank';
  }
}

// =========================================
// ИСТОРИЯ
// =========================================
function addToHistory(animeId, title, poster) {
  let history = JSON.parse(localStorage.getItem('quarwatch_history') || '[]');
  history = history.filter(item => item.id !== animeId);
  history.unshift({ id: animeId, title, poster, timestamp: Date.now() });
  if (history.length > 20) history = history.slice(0, 20);
  localStorage.setItem('quarwatch_history', JSON.stringify(history));
}

// =========================================
// МАРШРУТИЗАЦИЯ
// =========================================
function handleHashChange() {
  const hash = window.location.hash.slice(1);

  if (hash.startsWith('anime/')) {
    const id = hash.split('/')[1];
    if (id) {
      loadAnimeById(id);
      return;
    }
  }

  currentAnimeId = null;
  showSection(listSection);
}

// =========================================
// НАЗАД
// =========================================
function goBack() {
  if (playerIframe) playerIframe.src = '';
  currentAnimeId = null;
  if (window.location.hash) {
    window.location.hash = '';
  } else {
    showSection(listSection);
  }
}

// =========================================
// ОБРАБОТЧИКИ
// =========================================
window.addEventListener('hashchange', handleHashChange);

if (backBtn) backBtn.addEventListener('click', goBack);

if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', () => {
    fetchAnimeList(currentQuery, true);
  });
}

// =========================================
// МОДАЛЬНОЕ ОКНО
// =========================================
if (modalClose) {
  modalClose.addEventListener('click', () => {
    modalOverlay?.classList.remove('open');
  });
}

if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.remove('open');
  });
}

if (modalImageClose) {
  modalImageClose.addEventListener('click', () => {
    modalImageOverlay?.classList.remove('open');
  });
}

if (modalImageOverlay) {
  modalImageOverlay.addEventListener('click', (e) => {
    if (e.target === modalImageOverlay) modalImageOverlay.classList.remove('open');
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    modalOverlay?.classList.remove('open');
    modalImageOverlay?.classList.remove('open');
  }
});

// =========================================
// БЕСКОНЕЧНЫЙ СКРОЛЛ
// =========================================
window.addEventListener('scroll', () => {
  if (isLoading || isFetchingMore || !nextPageUrl) return;

  const scrollPosition = window.innerHeight + window.scrollY;
  const pageHeight = document.documentElement.scrollHeight;

  if (scrollPosition >= pageHeight - 300) {
    fetchAnimeList(currentQuery, true);
  }
});

// =========================================
// ГОД В ФУТЕРЕ
// =========================================
(function updateFooterYear() {
  const yearSpan = document.getElementById('current-year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
})();

// =========================================
// СТАРТ
// =========================================
console.log('🚀 Инициализация...');

if (window.location.hash) {
  handleHashChange();
} else {
  showSection(listSection);
  fetchAnimeList();
}

console.log('✅ Quarwatch готов!');
