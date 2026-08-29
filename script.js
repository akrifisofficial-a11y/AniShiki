// ===== КОНФИГУРАЦИЯ =====
const KODIK_API_KEY = 'd99ff2ab48b0d9c42ace4901bee833ff';
const KODIK_API_URL = 'https://kodik-api.com';

// Настройки Shikimori OAuth (замените на свои)
const SHIKIMORI_CLIENT_ID = 'ВАШ_CLIENT_ID';
const SHIKIMORI_REDIRECT_URI = 'https://ваш-сайт.github.io/ваш-репозиторий/callback.html';
const SHIKIMORI_AUTH_URL = 'https://shikimori.one/oauth/authorize';

// ===== СОСТОЯНИЕ =====
let currentType = 'anime';
let currentAnimeId = null;
let currentAnimeData = null;
let accessToken = localStorage.getItem('shikimori_token') || null;
let userData = null;

// ===== DOM-элементы =====
const listSection = document.getElementById('anime-list');
const playerSection = document.getElementById('player-section');
const catalogEl = document.getElementById('catalog');
const loaderEl = document.getElementById('loader');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const backBtn = document.getElementById('back-btn');
const shareBtn = document.getElementById('share-btn');
const playerIframe = document.getElementById('player-iframe');
const animeInfoEl = document.getElementById('anime-info');
const loginBtn = document.getElementById('login-btn');
const userInfoEl = document.getElementById('user-info');
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');
const menuLinks = document.querySelectorAll('.nav-menu a');

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function showSection(section) {
    document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
    section.classList.add('active');
}

// ===== МЕНЮ =====
function toggleMenu() {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('open');
}

function setActiveType(type) {
    currentType = type;
    menuLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.type === type) {
            link.classList.add('active');
        }
    });
    hamburger.classList.remove('active');
    navMenu.classList.remove('open');
    fetchAnimeList();
}

hamburger.addEventListener('click', toggleMenu);
menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const type = link.dataset.type;
        if (type) setActiveType(type);
    });
});

// ===== АВТОРИЗАЦИЯ SHIKIMORI =====
function loginShikimori() {
    const params = new URLSearchParams({
        client_id: SHIKIMORI_CLIENT_ID,
        redirect_uri: SHIKIMORI_REDIRECT_URI,
        response_type: 'code',
        scope: 'user_rates'
    });
    window.location.href = `${SHIKIMORI_AUTH_URL}?${params}`;
}

function logoutShikimori() {
    localStorage.removeItem('shikimori_token');
    localStorage.removeItem('shikimori_user');
    accessToken = null;
    userData = null;
    updateUserUI();
}

function updateUserUI() {
    if (userData) {
        loginBtn.textContent = `👤 ${userData.nickname}`;
        loginBtn.onclick = logoutShikimori;
        userInfoEl.textContent = `Привет, ${userData.nickname}!`;
    } else {
        loginBtn.textContent = 'Войти через Shikimori';
        loginBtn.onclick = loginShikimori;
        userInfoEl.textContent = '';
    }
}

// ===== ЗАГРУЗКА КАТАЛОГА =====
async function fetchAnimeList(query = '') {
    catalogEl.innerHTML = '';
    loaderEl.style.display = 'block';

    try {
        let endpoint = '/list';
        let params = {
            token: KODIK_API_KEY,
            sort: 'updated_at',
            order: 'desc',
            limit: 30,
            with_material_data: 'true',
            with_player_link: 'true', // всё равно запрашиваем
            types: ''
        };

        let types = [];
        if (currentType === 'anime') {
            types = ['anime-serial', 'anime'];
        } else if (currentType === 'movie') {
            types = ['movie'];
        } else if (currentType === 'series') {
            types = ['anime-serial'];
        } else if (currentType === 'updates') {
            types = ['anime', 'anime-serial', 'movie', 'cartoon'];
        }
        if (types.length) {
            params.types = types.join(',');
        } else {
            delete params.types;
        }

        if (query.trim()) {
            endpoint = '/search';
            params.title = query.trim();
        }

        const url = `${KODIK_API_URL}${endpoint}?${new URLSearchParams(params)}`;
        console.log('Запрос каталога:', url);

        const response = await fetch(url);
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Ошибка HTTP ${response.status}: ${text}`);
        }

        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            catalogEl.innerHTML = '<p style="text-align:center;color:#7a8aaa;">Ничего не найдено</p>';
            return;
        }
        renderAnimeList(data.results);
    } catch (err) {
        console.error(err);
        catalogEl.innerHTML = `<p style="text-align:center;color:#ff7a7a;">Ошибка загрузки: ${err.message}</p>`;
    } finally {
        loaderEl.style.display = 'none';
    }
}

// ===== ОТРИСОВКА КАРТОЧЕК =====
function renderAnimeList(animes) {
    catalogEl.innerHTML = '';
    animes.forEach(anime => {
        const card = document.createElement('div');
        card.className = 'anime-card';

        const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/200x280?text=No+Image';
        const title = anime.title || anime.material_data?.title || 'Без названия';
        const year = anime.year || anime.material_data?.year || '';
        const id = anime.id;

        card.innerHTML = `
            <img src="${poster}" alt="${title}" loading="lazy" />
            <div class="info">
                <div class="title">${title}</div>
                <div class="year">${year}</div>
            </div>
        `;
        card.addEventListener('click', () => {
            window.location.hash = `anime/${id}`;
        });
        catalogEl.appendChild(card);
    });
}

// ===== ЗАГРУЗКА ДЕТАЛЕЙ КОНКРЕТНОГО ТАЙТЛА =====
async function loadAnimeById(animeId) {
    currentAnimeId = animeId;
    currentAnimeData = null;

    showSection(playerSection);
    animeInfoEl.innerHTML = '<div class="loader">Загрузка данных...</div>';
    playerIframe.src = '';

    try {
        const params = new URLSearchParams({
            token: KODIK_API_KEY,
            id: animeId,
            with_material_data: 'true',
            with_player_link: 'true',
        });
        const url = `${KODIK_API_URL}/search?${params}`;
        console.log('Запрос деталей:', url);
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Ошибка HTTP ${resp.status}`);
        const data = await resp.json();
        if (!data.results || data.results.length === 0) throw new Error('Тайтл не найден');
        const anime = data.results[0];
        currentAnimeData = anime;

        // ========== НОВАЯ ЛОГИКА ПЛЕЕРА ==========
        let playerSrc = null;

        // 1. ПРИОРИТЕТ – ссылка через hash
        const hash = anime.hash || anime.player_hash || anime.material_data?.hash || null;
        if (hash) {
            playerSrc = `https://kodikplayer.com/serial/${animeId}/${hash}/720p`;
            console.log('🎬 Используем hash-ссылку:', playerSrc);
        } else {
            // 2. Если hash нет – пробуем player_link
            if (anime.player_link) {
                playerSrc = anime.player_link.startsWith('//') ? `https:${anime.player_link}` : anime.player_link;
                console.log('🎬 Используем player_link:', playerSrc);
            } else {
                // 3. Резерв – старый метод через сезон/серию (почти никогда не понадобится)
                const season = anime.last_season || 1;
                const episode = anime.last_episode || 1;
                playerSrc = `https://kodik.tv/seria/${animeId}/${season}/${episode}`;
                console.warn('⚠️ Резервный URL (сезон/серия):', playerSrc);
            }
        }

        // Добавляем autoplay, если его нет
        if (playerSrc && playerSrc !== 'about:blank') {
            const urlObj = new URL(playerSrc);
            if (!urlObj.searchParams.has('autoplay')) {
                urlObj.searchParams.set('autoplay', '1');
            }
            playerSrc = urlObj.toString();
        }

        playerIframe.src = playerSrc || 'about:blank';

        // ========== ОСТАЛЬНЫЕ ДАННЫЕ ==========
        const title = anime.title || 'Без названия';
        const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/300x450?text=No+Image';
        const description = anime.description || anime.material_data?.description || 'Описание отсутствует.';
        const year = anime.year || anime.material_data?.year || '—';
        const rating = anime.rating?.imdb || anime.material_data?.rating || '—';
        const genres = anime.genres ? anime.genres.join(', ') : (anime.material_data?.genres?.join(', ') || '—');

        const shikimoriId = anime.shikimori_id || anime.material_data?.shikimori_id || null;
        let shikimoriLinkHtml = '';
        if (shikimoriId) {
            shikimoriLinkHtml = `<a href="https://shikimori.one/animes/${shikimoriId}" target="_blank" class="shikimori-link">🔗 Страница на Shikimori</a>`;
        }

        let addBtnHtml = '';
        if (accessToken) {
            addBtnHtml = `<button id="add-to-list-btn" class="back-btn" style="margin-top:10px;">📥 Добавить в мой список</button>`;
        }

        animeInfoEl.innerHTML = `
            <div class="anime-detail" id="anime-detail">
                <div class="poster">
                    <img src="${poster}" alt="${title}" />
                </div>
                <div class="info">
                    <h2>${title}</h2>
                    <div class="meta">
                        <span>📅 ${year}</span>
                        <span>⭐ ${rating}</span>
                        <span>🎭 ${genres}</span>
                    </div>
                    <div class="description">${description}</div>
                    <div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:12px;">
                        ${shikimoriLinkHtml}
                        ${addBtnHtml}
                    </div>
                </div>
            </div>
        `;

        document.title = `${title} — Quarwatch`;

        document.getElementById('add-to-list-btn')?.addEventListener('click', addToShikimoriList);
    } catch (err) {
        console.error(err);
        animeInfoEl.innerHTML = `<p style="color:#ff7a7a;">Ошибка загрузки: ${err.message}</p>`;
    }
}

// ===== ДОБАВЛЕНИЕ В СПИСОК SHIKIMORI =====
async function addToShikimoriList() {
    if (!accessToken) {
        alert('Войдите в Shikimori, чтобы добавлять в список.');
        return;
    }
    if (!currentAnimeData) {
        alert('Данные не загружены.');
        return;
    }

    const shikimoriId = currentAnimeData.shikimori_id || currentAnimeData.material_data?.shikimori_id;
    if (!shikimoriId) {
        alert('Не удалось найти ID на Shikimori.');
        return;
    }

    try {
        const response = await fetch('https://shikimori.one/api/v2/user_rates', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_rate: {
                    target_id: shikimoriId,
                    target_type: 'Anime',
                    status: 'watching'
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        alert('Добавлено в список "Смотрю"!');
        console.log('Ответ Shikimori:', result);
    } catch (err) {
        console.error(err);
        alert('Не удалось добавить в список: ' + err.message);
    }
}

// ===== КОПИРОВАНИЕ ССЫЛКИ =====
function copyPageLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        alert('Ссылка скопирована!');
    }).catch(() => {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        alert('Ссылка скопирована!');
    });
}

// ===== МАРШРУТИЗАЦИЯ =====
function handleHashChange() {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('anime/')) {
        const id = hash.split('/')[1];
        if (id) {
            loadAnimeById(id);
            return;
        }
    }
    showSection(listSection);
}

// ===== КНОПКА "НАЗАД" =====
function goBack() {
    playerIframe.src = '';
    window.location.hash = '';
}

// ===== ОБРАБОТЧИКИ =====
window.addEventListener('hashchange', handleHashChange);

searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (window.location.hash) {
        window.location.hash = '';
        setTimeout(() => fetchAnimeList(query), 50);
    } else {
        fetchAnimeList(query);
    }
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchBtn.click();
});

backBtn.addEventListener('click', goBack);
shareBtn?.addEventListener('click', copyPageLink);
loginBtn?.addEventListener('click', loginShikimori);

// ===== ИНИЦИАЛИЗАЦИЯ ПОЛЬЗОВАТЕЛЯ =====
async function initUser() {
    const storedUser = localStorage.getItem('shikimori_user');
    if (storedUser) {
        try {
            userData = JSON.parse(storedUser);
            accessToken = localStorage.getItem('shikimori_token');
            updateUserUI();
        } catch (e) {}
    }
    if (accessToken && !userData) {
        try {
            const resp = await fetch('https://shikimori.one/api/users/whoami', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (resp.ok) {
                userData = await resp.json();
                localStorage.setItem('shikimori_user', JSON.stringify(userData));
                updateUserUI();
            } else {
                localStorage.removeItem('shikimori_token');
                accessToken = null;
            }
        } catch (e) {}
    }
}

// ===== СТАРТ =====
(async function() {
    await initUser();

    const defaultLink = document.querySelector('.nav-menu a[data-type="anime"]');
    if (defaultLink) defaultLink.classList.add('active');

    if (window.location.hash) {
        handleHashChange();
    } else {
        showSection(listSection);
        fetchAnimeList();
    }
})();
