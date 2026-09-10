// ============================================
// 📅 CALENDAR.JS — Календарь релизов
// ============================================

const KODIK_API_KEY = 'd99ff2ab48b0d9c42ace4901bee833ff';
const KODIK_API_URL = 'https://kodik-api.com';

// ===== СОСТОЯНИЕ =====
const state = {
  releases: [],
  selectedDay: null,
  weekStart: null
};

// ===== DOM =====
const daysNav = document.getElementById('days-nav');
const calendarContent = document.getElementById('calendar-content');

// ===== УТИЛИТЫ =====

// Форматирование даты в ISO (YYYY-MM-DD)
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Получение названия дня недели
function getDayName(date) {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[date.getDay()];
}

// Получение начала недели (понедельник)
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// ===== ЗАГРУЗКА РЕЛИЗОВ С KODIK API =====
async function fetchReleases() {
  try {
    // Запрашиваем аниме, которые вышли за последние 30 дней
    const params = new URLSearchParams({
      token: KODIK_API_KEY,
      limit: 100,
      with_material_data: 'true',
      types: 'anime-serial,anime',
      sort: 'updated_at',
      order: 'desc'
    });

    const url = `${KODIK_API_URL}/list?${params}`;
    console.log('📡 Запрос релизов:', url);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.error('❌ Ошибка загрузки релизов:', err);
    return [];
  }
}

// ===== ГРУППИРОВКА ПО ДНЯМ =====
function groupByDate(releases) {
  const grouped = {};

  releases.forEach(item => {
    // Берём дату обновления или год
    const dateStr = item.updated_at || item.created_at;
    if (!dateStr) return;

    const date = dateStr.split('T')[0];

    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(item);
  });

  return grouped;
}

// ===== РЕНДЕР НАВИГАЦИИ =====
function renderDaysNav(grouped) {
  if (!daysNav) return;

  const today = new Date();
  const weekStart = getWeekStart(today);

  let html = '';

  for (let i = 0; i < 14; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);

    const dateStr = formatDate(date);
    const count = grouped[dateStr]?.length || 0;
    const isToday = formatDate(today) === dateStr;
    const isActive = state.selectedDay === dateStr;

    html += `
      <button class="day-btn ${isActive ? 'active' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}">
        <span class="day-name">${getDayName(date)}</span>
        <span class="day-number">${date.getDate()}</span>
        ${count > 0 ? `<span class="day-count">${count}</span>` : ''}
      </button>
    `;
  }

  daysNav.innerHTML = html;

  // Обработчики
  daysNav.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedDay = btn.dataset.date;
      renderDaysNav(grouped);
      renderContent(grouped);
    });
  });
}

// ===== РЕНДЕР КОНТЕНТА =====
function renderContent(grouped) {
  if (!calendarContent) return;

  const releases = grouped[state.selectedDay] || [];

  if (releases.length === 0) {
    calendarContent.innerHTML = `
      <div class="calendar-empty">
        <span class="icon">📭</span>
        <p>В этот день релизов нет</p>
        <p class="hint">Попробуйте выбрать другой день</p>
      </div>
    `;
    return;
  }

  let html = '';

  releases.forEach((anime, index) => {
    const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/90x135?text=No+Image';
    const title = anime.title || anime.material_data?.title || 'Без названия';
    const year = anime.year || anime.material_data?.year || '—';
    const episodes = anime.episodes_count || anime.material_data?.episodes_count || '';
    const quality = anime.quality || '';

    // Время обновления
    let timeStr = '';
    if (anime.updated_at) {
      const time = anime.updated_at.split('T')[1]?.slice(0, 5);
      if (time) timeStr = time;
    }

    html += `
      <div class="release-card" data-id="${anime.id}" style="animation-delay:${index * 0.05}s;">
        <div class="poster">
          <img src="${poster}" alt="${title}" loading="lazy" />
        </div>
        <div class="info">
          <div class="title">${title}</div>
          <div class="meta">
            <span>📅 ${year}</span>
            ${quality ? `<span>💎 ${quality}</span>` : ''}
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px;">
            ${episodes ? `<span class="episode-badge">📺 ${episodes} серий</span>` : ''}
            ${timeStr ? `<span class="time-badge">🕐 ${timeStr}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  });

  calendarContent.innerHTML = html;

  // Клик по карточке → переход на главную с открытием аниме
  calendarContent.querySelectorAll('.release-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      if (id) {
        window.location.href = `index.html#anime/${id}`;
      }
    });
  });
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
async function init() {
  console.log('📅 Инициализация календаря...');

  // Сегодняшняя дата по умолчанию
  state.selectedDay = formatDate(new Date());

  // Показываем загрузку
  if (calendarContent) {
    calendarContent.innerHTML = '<div class="loader">Загрузка релизов...</div>';
  }

  // Загружаем данные
  const releases = await fetchReleases();
  state.releases = releases;

  if (releases.length === 0) {
    if (calendarContent) {
      calendarContent.innerHTML = `
        <div class="calendar-empty">
          <span class="icon">😔</span>
          <p>Не удалось загрузить релизы</p>
          <p class="hint">Попробуйте обновить страницу позже</p>
        </div>
      `;
    }
    return;
  }

  // Группируем по датам
  const grouped = groupByDate(releases);

  // Рендерим
  renderDaysNav(grouped);
  renderContent(grouped);

  console.log('✅ Календарь загружен:', releases.length, 'релизов');
}

// ===== СТАРТ =====
document.addEventListener('DOMContentLoaded', init);

// Год в футере
const yearEl = document.getElementById('current-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
