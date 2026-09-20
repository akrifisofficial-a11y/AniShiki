// ============================================
// 🏠 HOME.JS — Логика страницы "О проекте"
// ============================================

const KODIK_API_KEY = 'd99ff2ab48b0d9c42ace4901bee833ff';
const KODIK_API_URL = 'https://kodik-api.com';

// ===== СТАТИСТИКА САЙТА =====
async function loadSiteStats() {
  try {
    // Запрос к Kodik API для получения общего количества аниме
    const params = new URLSearchParams({
      token: KODIK_API_KEY,
      limit: 1,
      with_material_data: 'true',
      types: 'anime-serial,anime'
    });

    const url = `${KODIK_API_URL}/list?${params}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.total) {
      const total = parseInt(data.total);
      // Форматируем число с пробелами
      const formatted = total.toLocaleString('ru-RU');

      // Обновляем на странице
      const heroTotal = document.getElementById('hero-total');
      const statAnime = document.getElementById('stat-anime');

      if (heroTotal) heroTotal.textContent = formatted;
      if (statAnime) statAnime.textContent = formatted;
    }
  } catch (err) {
    console.warn('⚠️ Не удалось загрузить статистику:', err);

    const heroTotal = document.getElementById('hero-total');
    const statAnime = document.getElementById('stat-anime');
    if (heroTotal) heroTotal.textContent = '1000+';
    if (statAnime) statAnime.textContent = '1000+';
  }
}

// ===== ВРЕМЯ РАБОТЫ =====
function loadUptime() {
  const startTime = localStorage.getItem('quarwatch_start_time');
  const el = document.getElementById('stat-uptime');
  if (!el) return;

  if (startTime) {
    const diff = Date.now() - parseInt(startTime);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    el.textContent = `${hours}ч ${minutes}м`;
  } else {
    // Если время не сохранено — ставим сейчас
    localStorage.setItem('quarwatch_start_time', Date.now().toString());
    el.textContent = '0ч 0м';
  }
}

// ===== КОНТАКТ =====
const contactBtn = document.getElementById('contact-btn');
if (contactBtn) {
  contactBtn.addEventListener('click', (e) => {
    e.preventDefault();

    // Простое модальное окно с контактами
    const email = 'quarwatch@example.com';

    if (navigator.clipboard) {
      navigator.clipboard.writeText(email).then(() => {
        showNotification(`📧 Email скопирован: ${email}`);
      }).catch(() => {
        showNotification(`📧 Напишите нам: ${email}`);
      });
    } else {
      showNotification(`📧 Напишите нам: ${email}`);
    }
  });
}

// ===== УВЕДОМЛЕНИЯ =====
function showNotification(message) {
  const old = document.querySelector('.home-notification');
  if (old) old.remove();

  const notif = document.createElement('div');
  notif.className = 'home-notification';
  notif.textContent = message;
  notif.style.cssText = `
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(20, 26, 50, 0.98);
    color: #e0e5ff;
    padding: 12px 24px;
    border-radius: 30px;
    border: 1px solid #5a6a8a;
    font-family: 'Inter', sans-serif;
    font-size: 0.9rem;
    z-index: 99999;
    animation: slideUp 0.3s ease-out;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  `;

  if (!document.getElementById('home-notif-style')) {
    const style = document.createElement('style');
    style.id = 'home-notif-style';
    style.textContent = `
      @keyframes slideUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notif);

  setTimeout(() => {
    notif.style.opacity = '0';
    notif.style.transition = 'opacity 0.3s';
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

// ===== ФУТЕР: АКТУАЛЬНЫЙ ГОД =====
function updateFooterYear() {
  const yearEl = document.getElementById('current-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

// ===== СТАРТ =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('🏠 Страница "О проекте" загружена');

  updateFooterYear();
  loadSiteStats();
  loadUptime();

  // Обновляем время работы каждую минуту
  setInterval(loadUptime, 60000);
});
