// ============================================
// 🏠 HOME.JS — Главная страница
// ============================================

const KODIK_API_KEY = 'd99ff2ab48b0d9c42ace4901bee833ff';
const KODIK_API_URL = 'https://kodik-api.com';

// ===== DOM =====
const todayUpdatesEl = document.getElementById('today-updates');
const upcomingReleasesEl = document.getElementById('upcoming-releases');
const popularListEl = document.getElementById('popular-list');
const mainSearch = document.getElementById('main-search');

// ===== ЗАГРУЗКА СПИСКА С KODIK =====
async function fetchAnimeList(options = {}) {
  const {
    limit = 20,
    sort = 'updated_at',
    order = 'desc',
    types = 'anime-serial,anime'
  } = options;

  try {
    const params = new URLSearchParams({
      token: KODIK_API_KEY,
      limit,
      with_material_data: 'true',
      types,
      sort,
      order
    });

    const response = await fetch(`${KODIK_API_URL}/list?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.error('❌ Ошибка загрузки:', err);
    return [];
  }
}

// ===== ФОРМАТ ВРЕМЕНИ =====
function formatTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (e) {
    return '';
  }
}

// ===== ПРОВЕРКА: ОБНОВЛЕНО СЕГОДНЯ? =====
function isToday(isoString) {
  if (!isoString) return false;
  const date = new Date(isoString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// ===== ПРОВЕРКА: ОБНОВЛЕНО ВЧЕРА? =====
function isYesterday(isoString) {
  if (!isoString) return false;
  const date = new Date(isoString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}

// ===== РЕНДЕР ГОРИЗОНТАЛЬНОГО СПИСКА =====
function renderHorizontalList(container, animes, options = {}) {
  if (!container) return;

  const { showTime = false } = options;

  if (animes.length === 0) {
    container.innerHTML = '<p style="color:#444;font-size:0.8rem;padding:20px;">Ничего не найдено</p>';
    return;
  }

  let html = '';
  animes.forEach(anime => {
    const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/140x210?text=No+Image';
    const title = anime.title || anime.material_data?.title || 'Без названия';
    const year = anime.year || anime.material_data?.year || '';
    const episodes = anime.episodes_count || anime.material_data?.episodes_count || '';

    // Время обновления
    let timeHtml = '';
    if (showTime && anime.updated_at) {
      const time = formatTime(anime.updated_at);
      if (time) {
        if (isToday(anime.updated_at)) {
          timeHtml = `<span style="color:#4caf50;">🕐 ${time} сегодня</span>`;
        } else if (isYesterday(anime.updated_at)) {
          timeHtml = `<span style="color:#ffd700;">🕐 ${time} вчера</span>`;
        } else {
          const date = new Date(anime.updated_at);
          const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
          timeHtml = `<span style="color:#666;">🕐 ${dateStr}</span>`;
        }
      }
    }

    html += `
      <div class="mini-card" data-id="${anime.id}">
        <img src="${poster}" alt="${title}" loading="lazy" 
             onerror="this.src='https://via.placeholder.com/140x210?text=No+Image'" />
        <div class="mini-info">
          <div class="mini-title">${title}</div>
          <div class="mini-meta">
            ${year}${episodes ? ` · ${episodes} эп.` : ''}
          </div>
          ${timeHtml ? `<div class="mini-meta" style="font-size:0.65rem;margin-top:2px;">${timeHtml}</div>` : ''}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.mini-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `index.html#anime/${card.dataset.id}`;
    });
  });
}

// ===== 📊 ЗАГРУЗКА СТАТИСТИКИ =====
async function loadSiteStats() {
  try {
    // Общее количество аниме
    const allParams = new URLSearchParams({
      token: KODIK_API_KEY,
      limit: 1,
      types: 'anime-serial,anime'
    });

    const allRes = await fetch(`${KODIK_API_URL}/list?${allParams}`);
    const allData = await allRes.json();
    const totalAll = allData.total || 0;

    // Только сериалы
    const seriesParams = new URLSearchParams({
      token: KODIK_API_KEY,
      limit: 1,
      types: 'anime-serial'
    });

    const seriesRes = await fetch(`${KODIK_API_URL}/list?${seriesParams}`);
    const seriesData = await seriesRes.json();
    const totalSeries = seriesData.total || 0;

    // Только фильмы
    const movieParams = new URLSearchParams({
      token: KODIK_API_KEY,
      limit: 1,
      types: 'anime'
    });

    const movieRes = await fetch(`${KODIK_API_URL}/list?${movieParams}`);
    const movieData = await movieRes.json();
    const totalMovies = movieData.total || 0;

    // Обновляем DOM
    const totalEl = document.getElementById('stat-total-anime');
    const seriesEl = document.getElementById('stat-total-series');
    const moviesEl = document.getElementById('stat-total-movies');

    if (totalEl) totalEl.textContent = totalAll.toLocaleString('ru-RU');
    if (seriesEl) seriesEl.textContent = totalSeries.toLocaleString('ru-RU');
    if (moviesEl) moviesEl.textContent = totalMovies.toLocaleString('ru-RU');

    console.log(`📊 Статистика: ${totalAll} всего, ${totalSeries} сериалов, ${totalMovies} фильмов`);
  } catch (err) {
    console.error('❌ Ошибка загрузки статистики:', err);
  }
}

// ===== 🆕 ОБНОВЛЕНИЯ ЗА СЕГОДНЯ =====
async function loadTodayUpdates() {
  const animes = await fetchAnimeList({
    limit: 30,
    sort: 'updated_at',
    order: 'desc'
  });

  // Фильтруем — только сегодня
  const todayAnimes = animes.filter(a => isToday(a.updated_at));

  // Обновляем счётчик
  const todayEl = document.getElementById('stat-today-updates');
  if (todayEl) todayEl.textContent = todayAnimes.length;

  if (todayAnimes.length === 0) {
    if (todayUpdatesEl) {
      todayUpdatesEl.innerHTML = `
        <p style="color:#555;font-size:0.85rem;padding:20px;text-align:center;width:100%;">
          Сегодня ещё не было обновлений
        </p>
      `;
    }
    return;
  }

  renderHorizontalList(todayUpdatesEl, todayAnimes, { showTime: true });
  console.log(`🆕 Обновлено сегодня: ${todayAnimes.length}`);
}

// ===== 📅 БЛИЖАЙШИЕ РЕЛИЗЫ =====
async function loadUpcomingReleases() {
  const animes = await fetchAnimeList({
    limit: 30,
    sort: 'updated_at',
    order: 'desc'
  });

  // Показываем те, что обновлены за последние 2 дня
  const now = Date.now();
  const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;

  const recent = animes.filter(a => {
    if (!a.updated_at) return false;
    return new Date(a.updated_at).getTime() > twoDaysAgo;
  });

  if (recent.length === 0) {
    if (upcomingReleasesEl) {
      upcomingReleasesEl.innerHTML = `
        <p style="color:#555;font-size:0.85rem;padding:20px;text-align:center;width:100%;">
          Нет ближайших релизов
        </p>
      `;
    }
    return;
  }

  renderHorizontalList(upcomingReleasesEl, recent, { showTime: true });
  console.log(`📅 Ближайших релизов: ${recent.length}`);
}

// ===== 🔥 ПОПУЛЯРНОЕ =====
async function loadPopular() {
  const animes = await fetchAnimeList({
    limit: 20,
    sort: 'updated_at',
    order: 'desc'
  });

  renderHorizontalList(popularListEl, animes.slice(0, 10));
}

// ===== ПОИСК =====
if (mainSearch) {
  mainSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = mainSearch.value.trim();
      if (query) {
        window.location.href = `index.html?search=${encodeURIComponent(query)}`;
      }
    }
  });
}

// ===== ПЕРЕКЛЮЧАТЕЛЬ ПОИСКА =====
const searchToggle = document.getElementById('search-toggle');
const searchBar = document.getElementById('search-bar');

if (searchToggle && searchBar) {
  searchToggle.addEventListener('click', () => {
    searchBar.classList.toggle('hidden');
    if (!searchBar.classList.contains('hidden')) {
      document.getElementById('home-search-input')?.focus();
    }
  });
}

// ===== ГАМБУРГЕР =====
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');

if (hamburger && navMenu) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('open');
  });
}

// ===== ГОД В ФУТЕРЕ =====
const yearEl = document.getElementById('current-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===== СТАРТ =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('🏠 Главная загружена');

  loadSiteStats();
  loadTodayUpdates();
  loadUpcomingReleases();
  loadPopular();

  // Автообновление каждые 5 минут
  setInterval(() => {
    loadTodayUpdates();
    loadUpcomingReleases();
  }, 300000);
});
