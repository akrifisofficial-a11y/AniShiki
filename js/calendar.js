// ============================================
// 📅 CALENDAR.JS — Календарь релизов (обновлён)
// ============================================

const KODIK_API_KEY = 'd99ff2ab48b0d9c42ace4901bee833ff';
const KODIK_API_URL = 'https://kodik-api.com';

// ===== СОСТОЯНИЕ =====
const state = {
  releases: [],
  anons: [],
  grouped: {},
  selectedDay: null
};

// ===== DOM =====
const daysNav = document.getElementById('days-nav');
const calendarContent = document.getElementById('calendar-content');

// ===== УТИЛИТЫ =====

// Форматирование даты в ISO (YYYY-MM-DD)
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Название дня недели
function getDayName(date) {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[date.getDay()];
}

// ===== ЗАГРУЗКА ВЫШЕДШИХ РЕЛИЗОВ =====
async function fetchReleases() {
  try {
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

// ===== ЗАГРУЗКА АНОНСОВ =====
async function fetchAnons() {
  try {
    const params = new URLSearchParams({
      token: KODIK_API_KEY,
      limit: 100,
      with_material_data: 'true',
      types: 'anime-serial,anime',
      anime_status: 'anons'
    });

    const url = `${KODIK_API_URL}/list?${params}`;
    console.log('📡 Запрос анонсов:', url);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.warn('⚠️ Ошибка загрузки анонсов:', err);
    return [];
  }
}

// ===== ГРУППИРОВКА ПО ДАТАМ =====
function groupByDate(releases, anons) {
  const grouped = {};

  // Вышедшие — по дате обновления
  releases.forEach(item => {
    const dateStr = item.updated_at || item.created_at;
    if (!dateStr) return;
    const date = dateStr.split('T')[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push({ ...item, isAnons: false });
  });

  // Анонсы — по предполагаемой дате (если есть) или в отдельную секцию
  anons.forEach(item => {
    // Анонсы без точной даты — добавляем в конец списка (сегодня+13)
    let dateStr = null;
    
    if (item.release_date) {
      dateStr = item.release_date.split('T')[0];
    } else if (item.material_data?.release_date) {
      dateStr = item.material_data.release_date.split('T')[0];
    }
    
    if (!dateStr) {
      // Если нет даты — ставим на "последний день" календаря
      const future = new Date();
      future.setDate(future.getDate() + 13);
      dateStr = formatDate(future);
    }
    
    if (!grouped[dateStr]) grouped[dateStr] = [];
    grouped[dateStr].push({ ...item, isAnons: true });
  });

  return grouped;
}

// ===== РЕНДЕР НАВИГАЦИИ (14 дней от СЕГОДНЯ) =====
function renderDaysNav(grouped) {
  if (!daysNav) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = '';

  // 14 дней, начиная с СЕГОДНЯ
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dateStr = formatDate(date);
    const count = grouped[dateStr]?.length || 0;
    const isToday = i === 0;
    const isActive = state.selectedDay === dateStr;

    html += `
      <button class="day-btn ${isActive ? 'active' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}">
        <span class="day-name">${isToday ? 'Сегодня' : getDayName(date)}</span>
        <span class="day-number">${date.getDate()}</span>
        ${count > 0 ? `<span class="day-count">${count}</span>` : ''}
      </button>
    `;
  }

  daysNav.innerHTML = html;

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

  // Сортируем: анонсы в конце
  releases.sort((a, b) => (a.isAnons ? 1 : 0) - (b.isAnons ? 1 : 0));

  let html = '';

  releases.forEach((anime, index) => {
    const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/90x135?text=No+Image';
    const title = anime.title || anime.material_data?.title || 'Без названия';
    const year = anime.year || anime.material_data?.year || '—';
    const episodes = anime.episodes_count || anime.material_data?.episodes_count || '';
    const quality = anime.quality || '';

    let timeStr = '';
    if (anime.updated_at && !anime.isAnons) {
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
            ${anime.isAnons ? `<span class="episode-badge" style="background:rgba(255,193,7,0.15);border-color:rgba(255,193,7,0.3);color:#ffc107;">🕒 Анонс</span>` : ''}
          </div>
        </div>
      </div>
    `;
  });

  calendarContent.innerHTML = html;

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

  // Устанавливаем СЕГОДНЯ как выбранный день
  state.selectedDay = formatDate(new Date());

  if (calendarContent) {
    calendarContent.innerHTML = '<div class="loader">Загрузка релизов...</div>';
  }

  // Загружаем параллельно: релизы + анонсы
  const [releases, anons] = await Promise.all([
    fetchReleases(),
    fetchAnons()
  ]);

  state.releases = releases;
  state.anons = anons;

  if (releases.length === 0 && anons.length === 0) {
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

  // Группируем
  const grouped = groupByDate(releases, anons);
  state.grouped = grouped;

  // Рендерим
  renderDaysNav(grouped);
  renderContent(grouped);

  console.log(`✅ Календарь загружен: ${releases.length} релизов, ${anons.length} анонсов`);
}

// ============================================
// ⏰ АВТООБНОВЛЕНИЕ ДАТЫ И ДАННЫХ
// ============================================

// Отслеживаем смену дня
let currentDayString = new Date().toDateString();

function checkDateChange() {
  const newDayString = new Date().toDateString();

  if (newDayString !== currentDayString) {
    currentDayString = newDayString;
    console.log('📅 Новый день! Обновляем календарь...');
    init();
  }
}

// Проверка каждую минуту
setInterval(checkDateChange, 60000);

// Проверка при возврате на вкладку
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) checkDateChange();
});

// Автообновление данных каждые 30 минут
setInterval(() => {
  console.log('🔄 Автообновление календаря...');
  init();
}, 1800000); // 30 минут

// ===== СТАРТ =====
document.addEventListener('DOMContentLoaded', init);

// Год в футере
const yearEl = document.getElementById('current-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
