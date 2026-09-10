// ============================================
// 📅 CALENDAR.JS — Исправленное время + анонсы
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

// Форматирование даты в ISO (YYYY-MM-DD) — ЛОКАЛЬНОЕ время
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ✅ ИСПРАВЛЕНИЕ: правильное форматирование времени из UTC
function formatTime(isoString) {
  if (!isoString) return '';
  
  try {
    // Парсим ISO строку — она в UTC
    const date = new Date(isoString);
    
    // Проверяем, что дата валидна
    if (isNaN(date.getTime())) return '';
    
    // Форматируем в локальное время
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
  } catch (e) {
    return '';
  }
}

// ✅ ИСПРАВЛЕНИЕ: правильная дата из UTC
function formatDateFromISO(isoString) {
  if (!isoString) return null;
  
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;
    
    // Возвращаем локальную дату в формате YYYY-MM-DD
    return formatDate(date);
  } catch (e) {
    return null;
  }
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
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.error('❌ Ошибка загрузки релизов:', err);
    return [];
  }
}

// ===== ЗАГРУЗКА АНОНСОВ С MAL =====
const MAL_CLIENT_ID = 'b60e162b23102d8a77a9569380e5d57b';
const MAL_API_URL = 'https://api.myanimelist.net/v2';

async function fetchMALAnons() {
  try {
    const url = `${MAL_API_URL}/anime?q=&limit=50&status=not_yet_aired&fields=id,title,main_picture,alternative_titles,start_date,synopsis,mean,num_episodes,media_type,status`;

    const response = await fetch(url, {
      headers: {
        'X-MAL-CLIENT-ID': MAL_CLIENT_ID
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    console.log(`✅ Загружено ${data.data?.length || 0} анонсов с MAL`);
    return data.data || [];
  } catch (err) {
    console.warn('⚠️ Ошибка загрузки анонсов MAL:', err);
    return [];
  }
}

// ✅ ИСПРАВЛЕНИЕ: получение русского названия
function getRussianTitle(malAnime) {
  // 1. Проверяем alternative_titles.ru
  if (malAnime.alternative_titles?.ru) {
    return malAnime.alternative_titles.ru;
  }
  
  // 2. Проверяем synonyms
  if (malAnime.alternative_titles?.synonyms) {
    const ruSynonym = malAnime.alternative_titles.synonyms.find(s => 
      /[а-яё]/i.test(s) // Проверяем наличие кириллицы
    );
    if (ruSynonym) return ruSynonym;
  }
  
  // 3. Fallback — английское или оригинальное
  return malAnime.title || 'Без названия';
}

// ===== ГРУППИРОВКА ПО ДАТАМ =====
function groupByDate(releases, malAnons) {
  const grouped = {};

  // Вышедшие релизы — по дате обновления (локальное время!)
  releases.forEach(item => {
    const dateStr = formatDateFromISO(item.updated_at || item.created_at);
    if (!dateStr) return;

    if (!grouped[dateStr]) grouped[dateStr] = [];
    grouped[dateStr].push({
      ...item,
      isAnons: false,
      timeStr: formatTime(item.updated_at)
    });
  });

  // Анонсы MAL — по дате выхода
  malAnons.forEach(item => {
    const anime = item.node || item;
    if (!anime.start_date) return;

    const dateStr = anime.start_date; // MAL отдаёт YYYY-MM-DD

    if (!grouped[dateStr]) grouped[dateStr] = [];
    grouped[dateStr].push({
      id: anime.id,
      title: getRussianTitle(anime),
      poster: anime.main_picture?.medium || anime.main_picture?.large || '',
      year: anime.start_date.split('-')[0],
      episodes: anime.num_episodes || '',
      mal_id: anime.id,
      isAnons: true,
      timeStr: ''
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

  const items = grouped[state.selectedDay] || [];

  if (items.length === 0) {
    calendarContent.innerHTML = `
      <div class="calendar-empty">
        <span class="icon">📭</span>
        <p>В этот день релизов нет</p>
        <p class="hint">Попробуйте выбрать другой день</p>
      </div>
    `;
    return;
  }

  // Сортируем: вышедшие сначала, потом анонсы
  items.sort((a, b) => (a.isAnons ? 1 : 0) - (b.isAnons ? 1 : 0));

  let html = '';

  items.forEach((item, index) => {
    const poster = item.isAnons 
      ? (item.poster || 'https://via.placeholder.com/90x135?text=No+Image')
      : (item.material_data?.poster_url || item.poster_url || 'https://via.placeholder.com/90x135?text=No+Image');
    
    const title = item.title || item.material_data?.title || 'Без названия';
    const year = item.year || item.material_data?.year || '—';
    const episodes = item.episodes || item.episodes_count || item.material_data?.episodes_count || '';
    const quality = item.quality || '';

    // ✅ ИСПРАВЛЕНИЕ: показываем время только для вышедших
    const timeHtml = item.timeStr 
      ? `<span class="time-badge">🕐 ${item.timeStr}</span>` 
      : '';

    html += `
      <div class="release-card" data-id="${item.id}" data-mal-id="${item.mal_id || ''}" data-is-anons="${item.isAnons}" style="animation-delay:${index * 0.05}s;">
        <div class="poster">
          <img src="${poster}" alt="${title}" loading="lazy" 
               onerror="this.src='https://via.placeholder.com/90x135?text=No+Image'" />
        </div>
        <div class="info">
          <div class="title">${title}</div>
          <div class="meta">
            <span>📅 ${year}</span>
            ${quality ? `<span>💎 ${quality}</span>` : ''}
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px;">
            ${episodes ? `<span class="episode-badge">📺 ${episodes} эп.</span>` : ''}
            ${timeHtml}
            ${item.isAnons ? `<span class="episode-badge" style="background:rgba(255,193,7,0.15);border-color:rgba(255,193,7,0.3);color:#ffc107;">🕒 Анонс</span>` : ''}
          </div>
        </div>
      </div>
    `;
  });

  calendarContent.innerHTML = html;

  // Клик по карточке
  calendarContent.querySelectorAll('.release-card').forEach(card => {
    card.addEventListener('click', async () => {
      const isAnons = card.dataset.isAnons === 'true';
      const malId = card.dataset.malId;
      const id = card.dataset.id;

      if (isAnons && malId) {
        // Анонс — ищем в Kodik по MAL ID
        try {
          const params = new URLSearchParams({
            token: KODIK_API_KEY,
            mal_id: malId
          });
          const url = `${KODIK_API_URL}/search?${params}`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.results && data.results.length > 0) {
            window.location.href = `index.html#anime/${data.results[0].id}`;
          } else {
            window.open(`https://myanimelist.net/anime/${malId}`, '_blank');
          }
        } catch (err) {
          window.open(`https://myanimelist.net/anime/${malId}`, '_blank');
        }
      } else if (id) {
        // Вышедший релиз — открываем в Kodik
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

  // Загружаем параллельно
  const [releases, malAnons] = await Promise.all([
    fetchReleases(),
    fetchMALAnons()
  ]);

  state.releases = releases;
  state.anons = malAnons;

  if (releases.length === 0 && malAnons.length === 0) {
    if (calendarContent) {
      calendarContent.innerHTML = `
        <div class="calendar-empty">
          <span class="icon">😔</span>
          <p>Не удалось загрузить релизы</p>
        </div>
      `;
    }
    return;
  }

  const grouped = groupByDate(releases, malAnons);
  state.grouped = grouped;

  renderDaysNav(grouped);
  renderContent(grouped);

  console.log(`✅ Календарь загружен: ${releases.length} релизов, ${malAnons.length} анонсов`);
}

// ============================================
// ⏰ АВТООБНОВЛЕНИЕ
// ============================================

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

// Автообновление данных каждые 30 минут
setInterval(() => {
  console.log('🔄 Автообновление календаря...');
  init();
}, 1800000);

// ===== СТАРТ =====
document.addEventListener('DOMContentLoaded', init);

// Год в футере
const yearEl = document.getElementById('current-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
