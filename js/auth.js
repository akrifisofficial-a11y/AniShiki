// ============================================
// 🔐 AUTH.JS — Вход и регистрация
// ============================================

const GITHUB_TOKEN = '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';
const GITHUB_REPO = 'akrifisofficial-a11y/quarwatch-api';
const GITHUB_API = 'https://api.github.com';

// ===== DOM =====
const tabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const messageEl = document.getElementById('auth-message');

// ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК =====
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    if (tab.dataset.tab === 'login') {
      loginForm.classList.add('active');
      registerForm.classList.remove('active');
    } else {
      registerForm.classList.add('active');
      loginForm.classList.remove('active');
    }

    messageEl.className = 'auth-message';
  });
});

document.getElementById('switch-to-register')?.addEventListener('click', (e) => {
  e.preventDefault();
  tabs[1].click();
});

document.getElementById('switch-to-login')?.addEventListener('click', (e) => {
  e.preventDefault();
  tabs[0].click();
});

// ===== ХЕШИРОВАНИЕ ПАРОЛЯ =====
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ===== СООБЩЕНИЯ =====
function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = 'auth-message ' + type;
}

// ===== РЕГИСТРАЦИЯ =====
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const email = document.getElementById('reg-email').value.trim();

  if (!username || password.length < 6) {
    showMessage('❌ Пароль минимум 6 символов', 'error');
    return;
  }

  showMessage('⏳ Проверка...', 'info');

  try {
    // Проверяем, существует ли пользователь
    const users = await fetchUsers();

    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      showMessage('❌ Такое имя уже занято', 'error');
      return;
    }

    const hashedPassword = await hashPassword(password);

    // Отправляем workflow
    showMessage('⏳ Регистрация... (10-30 сек)', 'info');

    const response = await fetch(
      `${GITHUB_API}/repos/${GITHUB_REPO}/actions/workflows/register.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            username: username,
            password: hashedPassword,
            email: email
          }
        })
      }
    );

    if (response.status === 204) {
      showMessage('✅ Зарегистрировано! Теперь войди.', 'success');
      registerForm.reset();

      // Автоматически переключаемся на вход
      setTimeout(() => {
        tabs[0].click();
        document.getElementById('login-username').value = username;
      }, 2000);
    } else {
      showMessage(`❌ Ошибка: ${response.status}`, 'error');
    }
  } catch (err) {
    console.error(err);
    showMessage('❌ Ошибка соединения', 'error');
  }
});

// ===== ВХОД =====
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!username || !password) {
    showMessage('❌ Заполните все поля', 'error');
    return;
  }

  showMessage('⏳ Проверка...', 'info');

  try {
    const users = await fetchUsers();
    const hashedPassword = await hashPassword(password);

    const user = users.find(u =>
      u.username.toLowerCase() === username.toLowerCase() &&
      u.password === hashedPassword
    );

    if (user) {
      // Сохраняем сессию
      localStorage.setItem('quarwatch_current_user', JSON.stringify({
        username: user.username,
        email: user.email,
        avatar: user.avatar || '👤',
        registered_at: user.registered_at
      }));

      showMessage('✅ Вход выполнен!', 'success');

      setTimeout(() => {
        window.location.href = 'profile.html';
      }, 1000);
    } else {
      showMessage('❌ Неверное имя или пароль', 'error');
    }
  } catch (err) {
    console.error(err);
    showMessage('❌ Ошибка соединения', 'error');
  }
});

// ===== ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ =====
async function fetchUsers() {
  try {
    const url = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/data/users.json?t=${Date.now()}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.users || [];
  } catch (err) {
    console.error('Ошибка загрузки:', err);
    return [];
  }
}

// ===== ПРОВЕРКА АВТОРИЗАЦИИ =====
function getCurrentUser() {
  const data = localStorage.getItem('quarwatch_current_user');
  return data ? JSON.parse(data) : null;
}

// Если уже вошёл — редирект в профиль
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (user) {
    showMessage(`✅ Вы уже вошли как ${user.username}`, 'success');
    setTimeout(() => {
      window.location.href = 'profile.html';
    }, 1500);
  }
});
