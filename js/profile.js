// ============================================
// 👤 PROFILE.JS — Профиль с авторизацией
// ============================================

// ⚠️ ЗАМЕНИ ЭТИ ДВЕ СТРОКИ НА СВОИ:
const GITHUB_TOKEN = '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';
const GITHUB_REPO = 'akrifisofficial-a11y/quarwatch-api';
const GITHUB_API = 'https://api.github.com';

// ===== DOM =====
const authRequired = document.getElementById('auth-required');
const profileContent = document.getElementById('profile-content');
const avatarEl = document.getElementById('profile-avatar');
const nameEl = document.getElementById('profile-name');
const emailEl = document.getElementById('profile-email');
const avatarModal = document.getElementById('avatar-modal');
const avatarGrid = document.getElementById('avatar-grid');

// ===== ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ =====
function getCurrentUser() {
  const data = localStorage.getItem('quarwatch_current_user');
  return data ? JSON.parse(data) : null;
}

// ===== ЗАГРУЗКА ПРОФИЛЯ =====
function loadProfile() {
  const user = getCurrentUser();

  if (!user) {
    if (authRequired) authRequired.style.display = 'block';
    if (profileContent) profileContent.style.display = 'none';
    return;
  }

  if (authRequired) authRequired.style.display = 'none';
  if (profileContent) profileContent.style.display = 'block';

  // Имя
  if (nameEl) nameEl.textContent = user.username || 'Гость';
  if (emailEl) emailEl.textContent = user.email || 'Email не указан';

  // Аватар
  if (avatarEl) {
    if (user.avatar && user.avatar.startsWith('http')) {
      avatarEl.innerHTML = `<img src="${user.avatar}" alt="Avatar" />`;
    } else {
      avatarEl.textContent = user.avatar || user.username[0].toUpperCase();
    }
  }

  // Статистика
  loadStats();
  loadAchievements();
  loadHistory();
  loadFavorites();
}

// ===== ИЗМЕНЕНИЕ ИМЕНИ =====
document.getElementById('edit-name-btn')?.addEventListener('click', async () => {
  const user = getCurrentUser();
  if (!user) return;

  const newName = prompt('Введите новое имя:', user.username);
  if (!newName || !newName.trim()) return;

  const oldName = user.username;

  // Сохраняем в localStorage
  user.username = newName.trim();
  localStorage.setItem('quarwatch_current_user', JSON.stringify(user));

  // Отправляем в GitHub
  await updateUserInGitHub({
    old_username: oldName,
    new_username: newName.trim(),
    action: 'update_name'
  });

  if (nameEl) nameEl.textContent = newName.trim();
  showNotification('✅ Имя изменено!');
});

// ===== ОТКРЫТИЕ МОДАЛЬНОГО ОКНА АВАТАРА =====
document.getElementById('avatar-edit-btn')?.addEventListener('click', () => {
  if (avatarModal) avatarModal.classList.add('open');
});

document.getElementById('avatar-modal-close')?.addEventListener('click', () => {
  if (avatarModal) avatarModal.classList.remove('open');
});

// Закрытие по клику вне окна
if (avatarModal) {
  avatarModal.addEventListener('click', (e) => {
    if (e.target === avatarModal) avatarModal.classList.remove('open');
  });
}

// ===== ВЫБОР АВАТАРА =====
if (avatarGrid) {
  avatarGrid.querySelectorAll('.avatar-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      const avatar = btn.dataset.avatar;
      await saveAvatar(avatar);
    });
  });
}

// ===== АВАТАР ПО URL =====
document.getElementById('avatar-url-btn')?.addEventListener('click', async () => {
  const url = document.getElementById('avatar-url')?.value.trim();
  if (!url) return;
  await saveAvatar(url);
});

// ===== СОХРАНЕНИЕ АВАТАРА =====
async function saveAvatar(avatar) {
  const user = getCurrentUser();
  if (!user) return;

  user.avatar = avatar;
  localStorage.setItem('quarwatch_current_user', JSON.stringify(user));

  // Обновляем UI
  if (avatarEl) {
    if (avatar.startsWith('http')) {
      avatarEl.innerHTML = `<img src="${avatar}" alt="Avatar" />`;
    } else {
      avatarEl.textContent = avatar;
    }
  }

  if (avatarModal) avatarModal.classList.remove('open');
  showNotification('✅ Аватар обновлён!');

  // Отправляем в GitHub
  await updateUserInGitHub({
    username: user.username,
    avatar: avatar,
    action: 'update_avatar'
  });
}

// ===== ОБНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ В GITHUB =====
async function updateUserInGitHub(data) {
  try {
    const response = await fetch(
      `${GITHUB_API}/repos/${GITHUB_REPO}/actions/workflows/update-user.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: data
        })
      }
    );

    if (response.status === 204) {
      console.log('✅ Данные обновлены в GitHub');
      return true;
    } else {
      console.error('❌ Ошибка обновления:', response.status);
      return false;
    }
  } catch (err) {
    console.error('❌ Ошибка обновления:', err);
    return false;
  }
}

// ===== ВЫХОД =====
document.getElementById('logout-btn')?.addEventListener('click', () => {
  if (confirm('Выйти из аккаунта?')) {
    localStorage.removeItem('quarwatch_current_user');
    window.location.href = 'home.html';
  }
});

// ===== СТАТИСТИКА =====
function loadStats() {
  const history = JSON.parse(localStorage.getItem('quarwatch_history') || '[]');
  const favorites = JSON.parse(localStorage.getItem('quarwatch_favorites') || '[]');
  const totalViews = parseInt(localStorage.getItem('quarwatch_total_views') || '0');
  const achievements = JSON.parse(localStorage.getItem('quarwatch_achievements') || '[]');

  const watchedEl = document.getElementById('stat-watched');
  const favEl = document.getElementById('stat-favorites');
  const timeEl = document.getElementById('stat-time');
  const achEl = document.getElementById('stat-achievements');

  if (watchedEl) watchedEl.textContent = history.length;
  if (favEl) favEl.textContent = favorites.length;
  if (timeEl) timeEl.textContent = (totalViews * 24 / 60).toFixed(1) + 'ч';
  if (achEl) achEl.textContent = achievements.length;
}

// ===== ДОСТИЖЕНИЯ =====
function loadAchievements() {
  const list = document.getElementById('achievements-list');
  if (!list) return;

  const achievements = JSON.parse(localStorage.getItem('quarwatch_achievements') || '[]');

  if (achievements.length === 0) {
    list.innerHTML = '<p class="empty-text">Пока нет достижений</p>';
    return;
  }

  let html = '';
  achievements.forEach(a => {
    html += `
      <div class="achievement-badge">
        <span>${a.icon}</span>
        <span>${a.name}</span>
      </div>
    `;
  });
  list.innerHTML = html;
}

// ===== ИСТОРИЯ =====
function loadHistory() {
  const list = document.getElementById('history-list');
  if (!list) return;

  const history = JSON.parse(localStorage.getItem('quarwatch_history') || '[]');

  if (history.length === 0) {
    list.innerHTML = '<p class="empty-text">История пуста</p>';
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
  list.innerHTML = html;

  list.querySelectorAll('.mini-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `index.html#anime/${card.dataset.id}`;
    });
  });
}

// ===== ИЗБРАННОЕ =====
function loadFavorites() {
  const list = document.getElementById('favorites-list');
  if (!list) return;

  const favorites = JSON.parse(localStorage.getItem('quarwatch_favorites') || '[]');

  if (favorites.length === 0) {
    list.innerHTML = '<p class="empty-text">Избранное пусто</p>';
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
  list.innerHTML = html;

  list.querySelectorAll('.mini-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `index.html#anime/${card.dataset.id}`;
    });
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
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    animation: slideUp 0.3s ease-out;
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

// ===== СТАРТ =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('👤 Профиль загружен');
  loadProfile();
});
