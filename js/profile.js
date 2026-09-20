// ============================================
// 👤 PROFILE.JS — Профиль пользователя
// ============================================

// ===== DOM =====
const avatarEl = document.getElementById('profile-avatar');
const nameEl = document.getElementById('profile-name');
const editNameBtn = document.getElementById('edit-name-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const clearBtn = document.getElementById('clear-btn');
const themeBtn = document.getElementById('theme-btn');
const achievementsList = document.getElementById('achievements-list');
const historyList = document.getElementById('history-list');
const favoritesList = document.getElementById('favorites-list');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalBody = document.getElementById('modal-body');

// ===== ЗАГРУЗКА ИМЕНИ =====
function loadName() {
  const name = localStorage.getItem('quarwatch_username') || 'Гость';
  nameEl.textContent = name;

  if (name !== 'Гость') {
    avatarEl.textContent = name[0].toUpperCase();
  } else {
    avatarEl.textContent = '👤';
  }
}

// ===== ИЗМЕНЕНИЕ ИМЕНИ =====
if (editNameBtn) {
  editNameBtn.addEventListener('click', () => {
    const currentName = localStorage.getItem('quarwatch_username') || 'Гость';
    const newName = prompt('Введите ваше имя:', currentName);

    if (newName && newName.trim()) {
      localStorage.setItem('quarwatch_username', newName.trim());
      loadName();
      showNotification('✅ Имя изменено!');
    }
  });
}

// ===== ЗАГРУЗКА СТАТИСТИКИ =====
function loadStats() {
  const history = JSON.parse(localStorage.getItem('quarwatch_history') || '[]');
  const favorites = JSON.parse(localStorage.getItem('quarwatch_favorites') || '[]');
  const totalViews = parseInt(localStorage.getItem('quarwatch_total_views') || '0');
  const achievements = JSON.parse(localStorage.getItem('quarwatch_achievements') || '[]');

  // Статистика
  const watchedEl = document.getElementById('stat-watched');
  const favoritesEl = document.getElementById('stat-favorites');
  const timeEl = document.getElementById('stat-time');
  const achievementsEl = document.getElementById('stat-achievements');

  if (watchedEl) watchedEl.textContent = history.length;
  if (favoritesEl) favoritesEl.textContent = favorites.length;

  // ~24 минуты на серию
  const hours = (totalViews * 24 / 60).toFixed(1);
  if (timeEl) timeEl.textContent = hours + 'ч';

  if (achievementsEl) achievementsEl.textContent = achievements.length;
}

// ===== ЗАГРУЗКА ДОСТИЖЕНИЙ =====
function loadAchievements() {
  if (!achievementsList) return;

  const achievements = JSON.parse(localStorage.getItem('quarwatch_achievements') || '[]');

  // Если достижений нет — проверяем и создаём
  if (achievements.length === 0) {
    checkAndCreateAchievements();
  }

  const updated = JSON.parse(localStorage.getItem('quarwatch_achievements') || '[]');

  if (updated.length === 0) {
    achievementsList.innerHTML = '<p class="empty-text">Пока нет достижений. Просмотри первое аниме!</p>';
    return;
  }

  let html = '';
  updated.forEach(a => {
    html += `
      <div class="achievement-badge">
        <span>${a.icon}</span>
        <span>${a.name}</span>
      </div>
    `;
  });

  achievementsList.innerHTML = html;
}

// ===== ПРОВЕРКА И СОЗДАНИЕ ДОСТИЖЕНИЙ =====
function checkAndCreateAchievements() {
  const history = JSON.parse(localStorage.getItem('quarwatch_history') || '[]');
  const favorites = JSON.parse(localStorage.getItem('quarwatch_favorites') || '[]');
  const totalViews = parseInt(localStorage.getItem('quarwatch_total_views') || '0');

  const achievements = [];

  if (history.length >= 1) achievements.push({ name: 'Новичок', icon: '🌱' });
  if (history.length >= 10) achievements.push({ name: 'Зритель', icon: '👀' });
  if (history.length >= 50) achievements.push({ name: 'Опытный', icon: '🎯' });
  if (history.length >= 100) achievements.push({ name: 'Мастер', icon: '🏆' });
  if (favorites.length >= 5) achievements.push({ name: 'Коллекционер', icon: '⭐' });
  if (favorites.length >= 20) achievements.push({ name: 'Знаток', icon: '💎' });
  if (totalViews >= 50) achievements.push({ name: 'Активный', icon: '🔥' });
  if (totalViews >= 500) achievements.push({ name: 'Суперзритель', icon: '⚡' });

  localStorage.setItem('quarwatch_achievements', JSON.stringify(achievements));
}

// ===== ЗАГРУЗКА ИСТОРИИ =====
function loadHistory() {
  if (!historyList) return;

  const history = JSON.parse(localStorage.getItem('quarwatch_history') || '[]');

  if (history.length === 0) {
    historyList.innerHTML = '<p class="empty-text">История пуста</p>';
    return;
  }

  let html = '';
  history.slice(0, 12).forEach(item => {
    const poster = item.poster || 'https://via.placeholder.com/90x135?text=No+Image';
    html += `
      <div class="mini-card" data-id="${item.id}">
        <img src="${poster}" alt="${item.title}" loading="lazy" 
             onerror="this.src='https://via.placeholder.com/90x135?text=No+Image'" />
        <div class="mini-title">${item.title}</div>
      </div>
    `;
  });

  historyList.innerHTML = html;

  historyList.querySelectorAll('.mini-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `index.html#anime/${card.dataset.id}`;
    });
  });
}

// ===== ЗАГРУЗКА ИЗБРАННОГО =====
function loadFavorites() {
  if (!favoritesList) return;

  const favorites = JSON.parse(localStorage.getItem('quarwatch_favorites') || '[]');

  if (favorites.length === 0) {
    favoritesList.innerHTML = '<p class="empty-text">Избранное пусто</p>';
    return;
  }

  let html = '';
  favorites.slice(0, 12).forEach(item => {
    const poster = item.poster || 'https://via.placeholder.com/90x135?text=No+Image';
    html += `
      <div class="mini-card" data-id="${item.id}">
        <img src="${poster}" alt="${item.title}" loading="lazy" 
             onerror="this.src='https://via.placeholder.com/90x135?text=No+Image'" />
        <div class="mini-title">${item.title}</div>
      </div>
    `;
  });

  favoritesList.innerHTML = html;

  favoritesList.querySelectorAll('.mini-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `index.html#anime/${card.dataset.id}`;
    });
  });
}

// ===== ЭКСПОРТ =====
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    const data = {
      username: localStorage.getItem('quarwatch_username') || 'Гость',
      history: JSON.parse(localStorage.getItem('quarwatch_history') || '[]'),
      favorites: JSON.parse(localStorage.getItem('quarwatch_favorites') || '[]'),
      achievements: JSON.parse(localStorage.getItem('quarwatch_achievements') || '[]'),
      stats: {
        totalViews: localStorage.getItem('quarwatch_total_views') || '0',
        theme: localStorage.getItem('quarwatch_theme') || 'dark'
      },
      exportDate: new Date().toISOString(),
      version: '3.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quarwatch_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('📤 Данные экспортированы!');
  });
}

// ===== ИМПОРТ =====
if (importBtn) {
  importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);

          if (data.username) localStorage.setItem('quarwatch_username', data.username);
          if (data.history) localStorage.setItem('quarwatch_history', JSON.stringify(data.history));
          if (data.favorites) localStorage.setItem('quarwatch_favorites', JSON.stringify(data.favorites));
          if (data.achievements) localStorage.setItem('quarwatch_achievements', JSON.stringify(data.achievements));
          if (data.stats?.totalViews) localStorage.setItem('quarwatch_total_views', data.stats.totalViews);

          showNotification('✅ Данные импортированы!');
          setTimeout(() => location.reload(), 1000);
        } catch (err) {
          showNotification('❌ Ошибка импорта');
        }
      };
      reader.readAsText(file);
    };

    input.click();
  });
}

// ===== ОЧИСТКА =====
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    if (confirm('Очистить все данные? Это действие необратимо.')) {
      localStorage.clear();
      showNotification('🗑️ Данные очищены');
      setTimeout(() => location.reload(), 1000);
    }
  });
}

// ===== ТЕМА =====
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const current = localStorage.getItem('quarwatch_theme') || 'dark';
    const newTheme = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('quarwatch_theme', newTheme);
    showNotification(`Тема: ${newTheme === 'dark' ? '🌙 Тёмная' : '☀️ Светлая'}`);
  });
}

// ===== УВЕДОМЛЕНИЯ =====
function showNotification(message) {
  const old = document.querySelector('.profile-notification');
  if (old) old.remove();

  const notif = document.createElement('div');
  notif.className = 'profile-notification';
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

  if (!document.getElementById('profile-notif-style')) {
    const style = document.createElement('style');
    style.id = 'profile-notif-style';
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
  }, 2500);
}

// ===== МОДАЛЬНОЕ ОКНО =====
function closeModal() {
  modalOverlay?.classList.remove('open');
  document.body.style.overflow = '';
}

modalClose?.addEventListener('click', closeModal);
modalOverlay?.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// ===== СТАРТ =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('👤 Профиль загружен');
  loadName();
  loadStats();
  loadAchievements();
  loadHistory();
  loadFavorites();
});
