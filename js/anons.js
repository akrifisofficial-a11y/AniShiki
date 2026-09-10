// ============================================
// 🕒 ANONS.JS — Страница анонсов
// ============================================

const KODIK_API_KEY = 'd99ff2ab48b0d9c42ace4901bee833ff';
const KODIK_API_URL = 'https://kodik-api.com';

// ===== СОСТОЯНИЕ =====
const state = {
  anons: [],
  filtered: [],
  nextPage: null,
  isLoading: false,
  query: ''
};

// ===== DOM =====
const gridEl = document.getElementById('anons-grid');
const searchInput = document.getElementById('anons-search');
const searchBtn = document.getElementById('anons-search-btn');
const loadMoreBtn = document.getElementById('load-more-anons');

// ===== ЗАГРУЗКА АНОНСОВ С KODIK API =====
async function fetchAnons(url = null) {
  try {
    // Если URL не передан — строим новый запрос
    let requestUrl = url;

    if (!requestUrl) {
      const params = new URLSearchParams({
        token: KODIK_API_KEY,
        limit: 30,
        with_material_data: 'true',
        types: 'anime-serial,anime',
        anime_status: 'anons'  // 🔑 Фильтр по статусу "анонс"
      });
      requestUrl = `${KODIK_API_URL}/list?${params}`;
    }

    console.log('📡 Запрос анонсов:', requestUrl);

    const response = await fetch(requestUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return {
      results: data.results || [],
      nextPage: data.next_page || null,
      total: data.total || 0
    };
  } catch (err) {
    console.error('❌ Ошибка загрузки анонсов:', err);
    return { results: [], nextPage: null, total: 0 };
  }
}

// ===== ПОИСК АНОНСОВ ПО НАЗВАНИЮ =====
async function searchAnons(query) {
  try {
    const params = new URLSearchParams({
      token: KODIK_API_KEY,
      title: query,
      limit: 30,
      with_material_data: 'true',
      types: 'anime-serial,anime',
      anime_status: 'anons'
    });
    const url = `${KODIK_API_URL}/search?${params}`;
    console.log('🔍 Поиск анонсов:', url);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.error('❌ Ошибка поиска:', err);
    return [];
  }
}

// ===== РЕНДЕР КАРТОЧЕК =====
function renderAnons(animes, append = false) {
  if (!gridEl) return;

  if (!append) {
    gridEl.innerHTML = '';
  }

  if (animes.length === 0) {
    if (!append) {
      gridEl.innerHTML = `
        <div class="anons-empty">
          <span class="icon">🕒</span>
          <p>Анонсы не найдены</p>
          <p style="font-size:0.8rem; color:#444; margin-top:8px;">Попробуйте обновить позже</p>
        </div>
      `;
    }
    return;
  }

  animes.forEach(anime => {
    const card = document.createElement('div');
    card.className = 'anime-card';

    const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/200x280?text=No+Image';
    const title = anime.title || anime.material_data?.title || 'Без названия';
    const year = anime.year || anime.material_data?.year || '';
    const episodes = anime.episodes_count || anime.material_data?.episodes_count || '';

    card.innerHTML = `
      <img src="${poster}" alt="${title}" loading="lazy" />
      <div class="info">
        <div class="title">${title}</div>
        <div class="year">${year}</div>
        ${episodes ? `<div class="episodes">📺 ${episodes} серий</div>` : ''}
      </div>
    `;

    card.dataset.animeId = anime.id;

    card.addEventListener('click', function() {
      const id = this.dataset.animeId;
      if (id) {
        window.location.href = `index.html#anime/${id}`;
      }
    });

    gridEl.appendChild(card);
  });
}

// ===== ЗАГРУЗКА =====
function showLoader() {
  if (!gridEl) return;
  if (state.anons.length === 0) {
    gridEl.innerHTML = '<div class="loader">Загрузка анонсов...</div>';
  }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
async function loadAnons() {
  if (state.isLoading) return;
  state.isLoading = true;

  showLoader();

  const data = await fetchAnons();
  state.anons = [...state.anons, ...data.results];
  state.filtered = [...state.anons];
  state.nextPage = data.nextPage;

  renderAnons(data.results, state.anons.length > data.results.length);

  if (loadMoreBtn) {
    loadMoreBtn.style.display = data.nextPage ? 'block' : 'none';
  }

  console.log(`✅ Загружено ${data.results.length} анонсов (всего: ${state.anons.length}, в базе: ${data.total})`);
  state.isLoading = false;
}

// ===== ПОИСК =====
async function handleSearch() {
  const query = searchInput.value.trim();

  if (!query) {
    state.filtered = [...state.anons];
    renderAnons(state.filtered);
    return;
  }

  gridEl.innerHTML = '<div class="loader">Поиск...</div>';
  const results = await searchAnons(query);
  state.filtered = results;
  renderAnons(results);
}

// ===== ОБРАБОТЧИКИ =====
if (searchBtn && searchInput) {
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
}

if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', async () => {
    if (!state.nextPage) return;
    loadMoreBtn.textContent = '⏳ Загрузка...';
    loadMoreBtn.disabled = true;

    const data = await fetchAnons(state.nextPage);
    state.anons = [...state.anons, ...data.results];
    state.filtered = [...state.anons];
    state.nextPage = data.nextPage;

    renderAnons(data.results, true);

    loadMoreBtn.textContent = '📥 Загрузить ещё';
    loadMoreBtn.disabled = false;
    loadMoreBtn.style.display = data.nextPage ? 'block' : 'none';
  });
}

// ===== СТАРТ =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('🕒 Инициализация страницы анонсов...');
  loadAnons();
});

// Год в футере
const yearEl = document.getElementById('current-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
