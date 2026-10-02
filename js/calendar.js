// ============================================
// 📅 CALENDAR.JS — Календарь релизов
// ============================================

const KODIK_API_KEY = 'd99ff2ab48b0d9c42ace4901bee833ff';
const KODIK_API_URL = 'https://kodik-api.com';

// ===== СОСТОЯНИЕ =====
const state = {
  releases: [],
  grouped: {},
  selectedDay: null
};

// ===== DOM =====
const daysNav = document.getElementById('days-nav');
const calendarContent = document.getElementById('calendar-content');

// ===== УТИЛИТЫ =====
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDayName(date) {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[date.getDay()];
}

// ✅ ФОРМАТ ВРЕМЕНИ (локальное)
function formatTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '';
  }
}

// ✅ ДАТА ИЗ ISO (локальная)
function formatDateFromISO(isoString) {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;
    return formatDate(date);
  } catch (e) {
    return null;
  }
}

// ===== ЗАГРУЗКА РЕЛИЗОВ =====
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

// ===== ГРУППИРОВКА ПО ДАТАМ =====
function groupByDate(releases) {
  const grouped = {};

  releases.forEach(item => {
    const dateStr = formatDateFromISO(item.updated_at || item.created_at);
    if (!dateStr) return;

    if (!grouped[dateStr]) grouped[dateStr] = [];

    // 🆕 Извлекаем озвучку
    const translation = item.translation || {};
    const translationTitle = translation.title || 'Неизвестно';
    const translationType = translation.type === 'voice' ? 'voice' : 'subs';

    grouped[dateStr].push({
      ...item,
      isAnons: false,
      timeStr: formatTime(item.updated_at),
      translationTitle: translationTitle,
      translationType: translationType
    });
  });

  return grouped;
}

// ===== РЕНДЕР НАВИГАЦИИ (14 дней от СЕГОДНЯ) =====
function renderDaysNav(grouped) {
  if (!daysNav) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = '';

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

  // Сортируем по времени (новые сверху)
  releases.sort((a, b) => {
    const timeA = a.updated_at || '';
    const timeB = b.updated_at || '';
    return timeB.localeCompare(timeA);
  });

  let html = '';

  releases.forEach((anime, index) => {
    const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/90x135?text=No+Image';
    const title = anime.title || anime.material_data?.title || 'Без названия';
    const year = anime.year || anime.material_data?.year || '—';
    const episodes = anime.episodes_count || anime.material_data?.episodes_count || '';

    // 🆕 ОЗВУЧКА
    const translationType = anime.translationType;
    const translationTitle = anime.translationTitle;

    // Иконка и класс для типа перевода
    const typeIcon = translationType === 'voice' ? '🎙️' : '📝';
    const typeLabel = translationType === 'voice' ? 'Озвучка' : 'Субтитры';
    const badgeClass = translationType === 'voice' ? '' : 'subs';

    // 🆕 ВРЕМЯ
    const timeStr = anime.timeStr;

    html += `
      <div class="release-card" data-id="${anime.id}" style="animation-delay:${index * 0.05}s;">
        <div class="poster">
          <img src="${poster}" alt="${title}" loading="lazy" 
               onerror="this.src='https://via.placeholder.com/90x135?text=No+Image'" />
        </div>
        <div class="info">
          <div class="title">${title}</div>
          <div class="meta">
            <span>📅 ${year}</span>
            ${episodes ? `<span>📺 ${episodes} эп.</span>` : ''}
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">
            <span class="translation-badge ${badgeClass}">
              ${typeIcon} ${typeLabel}: ${translationTitle}
            </span>
            ${timeStr ? `<span class="time-badge">🕐 ${timeStr}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  });

  calendarContent.innerHTML = html;

  // Клик по карточке
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

  state.selectedDay = formatDate(new Date());

  if (calendarContent) {
    calendarContent.innerHTML = '<div class="loader">Загрузка релизов...</div>';
  }

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

  const grouped = groupByDate(releases);
  state.grouped = grouped;

  renderDaysNav(grouped);
  renderContent(grouped);

  console.log(`✅ Календарь загружен: ${releases.length} релизов`);
}

// ===== АВТООБНОВЛЕНИЕ =====
let currentDayString = new Date().toDateString();

function checkDateChange() {
  const newDayString = new Date().toDateString();
  if (newDayString !== currentDayString) {
    currentDayString = newDayString;
    console.log('📅 Новый день! Обновляем календарь...');
    init();
  }
}

setInterval(checkDateChange, 60000);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) checkDateChange();
});

setInterval(() => {
  console.log('🔄 Автообновление календаря...');
  init();
}, 1800000); // 30 минут

// ===== СТАРТ =====
document.addEventListener('DOMContentLoaded', init);

// Год в футере
const yearEl = document.getElementById('current-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
