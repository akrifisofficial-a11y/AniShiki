// ===== КОНФИГУРАЦИЯ =====
const KODIK_API_KEY = 'd99ff2ab48b0d9c42ace4901bee833ff';
const KODIK_API_URL = 'https://kodik-api.com';

// ===== ТОЛЬКО ЭТИ ТИПЫ РАЗРЕШЕНЫ (АНИМЕ) =====
const ALLOWED_TYPES = ['anime-serial', 'anime'];

console.log('🚀 Quarwatch загружен!');

// ===== ПРОВЕРКА, ЧТО ТАЙТЛ - АНИМЕ =====
function isAnime(item) {
    if (!item) return false;
    return ALLOWED_TYPES.includes(item.type);
}

// ===== ФИЛЬТРАЦИЯ: ОСТАВЛЯЕМ ТОЛЬКО АНИМЕ =====
function filterAnimeOnly(results) {
    if (!results || !Array.isArray(results)) return [];
    return results.filter(item => isAnime(item));
}

// ===== ОСНОВНАЯ ФУНКЦИЯ УДАЛЕНИЯ ДУБЛИКАТОВ (ПО ID И НАЗВАНИЮ) =====
function removeDuplicates(animes) {
    const seenIds = new Set();
    const seenTitles = new Set();
    const unique = [];

    animes.forEach(anime => {
        const titleKey = anime.title?.toLowerCase().trim() || '';
        if (!seenIds.has(anime.id) && !seenTitles.has(titleKey)) {
            seenIds.add(anime.id);
            seenTitles.add(titleKey);
            unique.push(anime);
        } else {
            console.warn(`⛔ Заблокирован дубликат: ${anime.title} (${anime.id})`);
        }
    });

    return unique;
}

// ===== ГЛОБАЛЬНОЕ ХРАНИЛИЩЕ ВСЕХ ID ДЛЯ УДАЛЕНИЯ ДУБЛИКАТОВ ПРИ ПОДГРУЗКЕ =====
let allLoadedIds = new Set();

// ===== DOM =====
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
const logoLink = document.getElementById('logo-link');
const categoryBtns = document.querySelectorAll('.category-btn');
const loadMoreBtn = document.getElementById('load-more-btn');

// ===== ГАМБУРГЕР-МЕНЮ =====
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');
const menuDeveloper = document.getElementById('menu-developer');
const menuUpdates = document.getElementById('menu-updates');

// ===== МОДАЛЬНОЕ ОКНО =====
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalBody = document.getElementById('modal-body');

// ===== УВЕЛИЧЕНИЕ ИЗОБРАЖЕНИЙ =====
const modalImageOverlay = document.getElementById('modal-image-overlay');
const modalImage = document.getElementById('modal-image');
const modalImageClose = document.getElementById('modal-image-close');

let currentAnimeId = null;
let currentCategory = 'series';
let nextPageUrl = null;
let isLoading = false;
let isFetchingMore = false;
let currentQuery = '';
let timeoutId = null;

// =========================================
// ГАМБУРГЕР
// =========================================
if (hamburger) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('open');
        }
    });
}

// =========================================
// МОДАЛЬНОЕ ОКНО (информация)
// =========================================
function openModal(content) {
    modalBody.innerHTML = content;
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
}

if (modalClose) {
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
}

// =========================================
// УВЕЛИЧЕНИЕ ИЗОБРАЖЕНИЙ
// =========================================
function openImageModal(src) {
    if (!modalImageOverlay || !modalImage) return;
    modalImage.src = src;
    modalImageOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    if (!modalImageOverlay) return;
    modalImageOverlay.classList.remove('open');
    document.body.style.overflow = '';
}

if (modalImageClose) {
    modalImageClose.addEventListener('click', closeImageModal);
}

if (modalImageOverlay) {
    modalImageOverlay.addEventListener('click', (e) => {
        if (e.target === modalImageOverlay) closeImageModal();
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeImageModal();
        closeModal();
    }
});

// =========================================
// ПУНКТЫ МЕНЮ
// =========================================
if (menuDeveloper) {
    menuDeveloper.addEventListener('click', (e) => {
        e.preventDefault();
        if (hamburger) hamburger.classList.remove('active');
        if (navMenu) navMenu.classList.remove('open');
        
        openModal(`
            <h2>👨‍💻 Разработчик</h2>
            <div class="info-item">
                <span>Название</span>
                <span>Quarwatch</span>
            </div>
            <div class="info-item">
                <span>Создатель</span>
                <span>quartess</span>
            </div>
            <div class="info-item">
                <span>Версия</span>
                <span>2.0</span>
            </div>
            <div class="info-item">
                <span>Технологии</span>
                <span>HTML, CSS, JS, Kodik API</span>
            </div>
            <div class="info-item">
                <span>Сайт</span>
                <span><a href="#" style="color:#b8a0d0; text-decoration:none;">quarwatch.ck6.ru</a></span>
            </div>
            <p style="margin-top:15px; text-align:center; color:#7a8aaa; font-size:0.8rem;">
                🌙 Сделано с любовью к аниме
            </p>
        `);
    });
}

if (menuUpdates) {
    menuUpdates.addEventListener('click', (e) => {
        e.preventDefault();
        if (hamburger) hamburger.classList.remove('active');
        if (navMenu) navMenu.classList.remove('open');
        
        const lastUpdate = new Date().toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        openModal(`
            <h2>🔄 Обновления</h2>
            <div class="info-item">
                <span>Последнее обновление</span>
                <span>${lastUpdate}</span>
            </div>
        `);
    });
}

// =========================================
// КАТЕГОРИИ
// =========================================
function setCategory(type) {
    if (type === 'important') {
        categoryBtns.forEach(btn => {
            btn.classList.remove('active');
        });
        
        openModal(`
            <h2>❓ Важно</h2>
            <div style="margin: 15px 0; padding: 15px; background: rgba(255, 70, 70, 0.1); border-radius: 12px; border-left: 3px solid #ff7a7a;">
                <p style="color: #ff7a7a; font-size: 0.9rem; line-height: 1.6;">
                    ⚠️ Если аниме не появляется и вы видите только бесконечную загрузку:
                </p>
            </div>
            <div style="margin: 15px 0; padding: 15px; background: rgba(184, 160, 208, 0.1); border-radius: 12px;">
                <p style="color: #b0b8d0; line-height: 1.8;">
                    1️⃣ Нажмите кнопку <strong style="color: #e0e5ff;">«Сериалы»</strong> или <strong style="color: #e0e5ff;">«Фильмы»</strong> в меню выше.
                </p>
                <p style="color: #b0b8d0; line-height: 1.8; margin-top: 8px;">
                    2️⃣ Это обновит страницу и перезагрузит список аниме.
                </p>
                <p style="color: #b0b8d0; line-height: 1.8; margin-top: 8px;">
                    3️⃣ Если проблема осталась — попробуйте обновить страницу (F5).
                </p>
            </div>
            <div style="margin-top: 15px; padding: 12px; background: rgba(100, 80, 160, 0.1); border-radius: 12px; text-align: center;">
                <p style="color: #7a8aaa; font-size: 0.8rem;">
                    🕐 Если ничего не помогает — подождите 5-10 минут и попробуйте снова.
                </p>
            </div>
        `);
        return;
    }

    allLoadedIds.clear();

    currentCategory = type;
    nextPageUrl = null;
    currentQuery = '';
    if (searchInput) searchInput.value = '';

    categoryBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        }
    });

    if (window.location.hash) {
        window.location.hash = '';
    }

    fetchAnimeList();
}

categoryBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        setCategory(btn.dataset.type);
    });
});

// =========================================
// ЛОГОТИП → ГЛАВНАЯ
// =========================================
if (logoLink) {
    logoLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.location.hash) {
            window.location.hash = '';
        } else {
            fetchAnimeList();
        }
    });
}

function showSection(section) {
    document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
    section.classList.add('active');
}

// ===== ЗАГРУЗКА КАТАЛОГА (С ЖЁСТКОЙ ФИЛЬТРАЦИЕЙ) =====
async function fetchAnimeList(query = '', loadMore = false) {
    if (isLoading) return;
    isLoading = true;
    isFetchingMore = loadMore;

    if (!loadMore) {
        if (catalogEl) catalogEl.innerHTML = '';
        nextPageUrl = null;
        currentQuery = query;
        allLoadedIds.clear();
    }

    if (loaderEl) loaderEl.style.display = 'block';
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
        if (isLoading) {
            isLoading = false;
            if (loaderEl) loaderEl.style.display = 'none';
            if (catalogEl && !loadMore) {
                catalogEl.innerHTML = '<p style="text-align:center;color:#ff7a7a;">⏱️ Превышено время ожидания. Попробуйте обновить страницу или нажать «Сериалы»/«Фильмы».</p>';
            }
        }
    }, 10000);

    try {
        let url;

        if (loadMore && nextPageUrl) {
            url = nextPageUrl;
        } else {
            let endpoint = '/list';
            let params = {
                token: KODIK_API_KEY,
                limit: 30,
                with_material_data: 'true',
                types: 'anime-serial,anime'
            };

            if (currentCategory === 'series') {
                params.types = 'anime-serial';
            } else if (currentCategory === 'movie') {
                params.types = 'anime';
            }

            params.sort = 'updated_at';
            params.order = 'desc';

            if (query.trim()) {
                endpoint = '/search';
                params.title = query.trim();
                params.types = 'anime-serial,anime';
                delete params.sort;
                delete params.order;
            }

            url = `${KODIK_API_URL}${endpoint}?${new URLSearchParams(params)}`;
        }

        console.log('📡 Запрос каталога:', url);

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;

        // --- ЖЁСТКАЯ ФИЛЬТРАЦИЯ ---
        // 1. Оставляем только аниме
        let filteredResults = filterAnimeOnly(data.results);

        // 2. Удаляем дубликаты внутри текущей страницы (по ID и названию)
        let uniqueResults = removeDuplicates(filteredResults);

        // 3. Удаляем дубликаты с уже загруженными (глобально)
        const newUniqueResults = [];
        uniqueResults.forEach(anime => {
            if (!allLoadedIds.has(anime.id)) {
                allLoadedIds.add(anime.id);
                newUniqueResults.push(anime);
            } else {
                console.warn(`⛔ Заблокирован глобальный дубликат: ${anime.title} (${anime.id})`);
            }
        });

        nextPageUrl = (newUniqueResults.length > 0) ? data.next_page || null : null;

        if (!newUniqueResults || newUniqueResults.length === 0) {
            if (!loadMore && catalogEl) {
                catalogEl.innerHTML = '<p style="text-align:center;color:#7a8aaa;">Аниме не найдено</p>';
            }
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        renderAnimeList(newUniqueResults, loadMore);

        if (loadMoreBtn) {
            if (nextPageUrl) {
                loadMoreBtn.style.display = 'block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
    } catch (err) {
        console.error('❌ Ошибка загрузки каталога:', err);
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;
        
        if (!loadMore && catalogEl) {
            catalogEl.innerHTML = `
                <p style="text-align:center;color:#ff7a7a;">❌ Ошибка загрузки: ${err.message}</p>
                <p style="text-align:center;color:#9aa3c0; margin-top:10px; font-size:0.85rem;">
                    Попробуйте нажать кнопку <strong>«Сериалы»</strong> или <strong>«Фильмы»</strong> для обновления.
                </p>
            `;
        }
    } finally {
        if (loaderEl) loaderEl.style.display = 'none';
        isLoading = false;
        isFetchingMore = false;
    }
}

// ===== ОТРИСОВКА КАРТОЧЕК =====
function renderAnimeList(animes, append = false) {
    if (!catalogEl) return;
    
    if (!append) {
        catalogEl.innerHTML = '';
    }

    const uniqueAnimes = [];
    const seenIds = new Set();
    
    animes.forEach(anime => {
        if (!seenIds.has(anime.id)) {
            seenIds.add(anime.id);
            uniqueAnimes.push(anime);
        }
    });

    uniqueAnimes.forEach(anime => {
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
        
        card.dataset.animeId = id;
        
        card.addEventListener('click', function() {
            const animeId = this.dataset.animeId;
            if (currentAnimeId === animeId) {
                console.log('⏭️ Это аниме уже открыто');
                return;
            }
            window.location.hash = `anime/${animeId}`;
        });
        
        catalogEl.appendChild(card);
    });
}

// ===== БЕСКОНЕЧНЫЙ СКРОЛЛ =====
function setupInfiniteScroll() {
    window.addEventListener('scroll', () => {
        if (isLoading || isFetchingMore || !nextPageUrl) return;
        
        const scrollPosition = window.innerHeight + window.scrollY;
        const pageHeight = document.documentElement.scrollHeight;
        
        if (scrollPosition >= pageHeight - 200) {
            console.log('📦 Автоматическая подгрузка...');
            fetchAnimeList(currentQuery, true);
        }
    });
}

// ===== КОПИРОВАНИЕ ССЫЛКИ =====
function copyPageLink() {
    const url = window.location.href;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
            .then(() => showCopyNotification('✅ Ссылка скопирована!'))
            .catch(() => fallbackCopy(url));
    } else {
        fallbackCopy(url);
    }
}

function fallbackCopy(text) {
    const input = document.createElement('input');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    try {
        document.execCommand('copy');
        showCopyNotification('✅ Ссылка скопирована!');
    } catch (err) {
        showCopyNotification('❌ Не удалось скопировать ссылку');
    }
    document.body.removeChild(input);
}

function showCopyNotification(message) {
    const oldNotification = document.querySelector('.copy-notification');
    if (oldNotification) oldNotification.remove();

    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(20, 26, 50, 0.95);
        color: #e0e5ff;
        padding: 12px 24px;
        border-radius: 30px;
        border: 1px solid #5a6a8a;
        backdrop-filter: blur(10px);
        font-family: 'Orbitron', sans-serif;
        font-size: 0.9rem;
        z-index: 9999;
        animation: slideUp 0.3s ease-out;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== ЗАГРУЗКА СТРАНИЦЫ ТАЙТЛА =====
async function loadAnimeById(animeId) {
    if (currentAnimeId === animeId) {
        console.log('⏭️ Аниме уже открыто, пропускаем загрузку');
        return;
    }

    currentAnimeId = animeId;
    showSection(playerSection);
    if (animeInfoEl) animeInfoEl.innerHTML = '<div class="loader">Загрузка...</div>';
    if (playerIframe) playerIframe.src = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
        const params = new URLSearchParams({
            token: KODIK_API_KEY,
            id: animeId,
            with_material_data: 'true',
        });
        const url = `${KODIK_API_URL}/search?${params}`;
        console.log('📡 Запрос деталей:', url);
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!data.results || data.results.length === 0) throw new Error('Тайтл не найден');

        const anime = data.results[0];

        if (!isAnime(anime)) {
            console.warn('⛔ БЛОКИРОВКА! Не аниме:', anime.type, anime.title);
            if (animeInfoEl) {
                animeInfoEl.innerHTML = `
                    <div class="anime-detail" id="anime-detail">
                        <div class="info" style="text-align:center; padding:40px 20px;">
                            <h2 style="color:#ff7a7a;">⛔ ДОСТУП ЗАПРЕЩЁН</h2>
                            <p style="color:#9aa3c0; margin:20px 0;">
                                Этот тайтл (${anime.type}) не является аниме и заблокирован.<br>
                                Сайт предназначен только для просмотра АНИМЕ.
                            </p>
                            <button class="back-btn" onclick="window.location.hash=''">← На главную</button>
                        </div>
                    </div>
                `;
            }
            if (playerIframe) playerIframe.src = 'about:blank';
            return;
        }

        let playerSrc = null;
        if (anime.link) {
            playerSrc = anime.link.startsWith('//') ? `https:${anime.link}` : anime.link;
            console.log('🎬 Ссылка на плеер из API:', playerSrc);
        } else {
            playerSrc = 'about:blank';
        }

        if (playerSrc && playerSrc !== 'about:blank') {
            try {
                const urlObj = new URL(playerSrc);
                if (!urlObj.searchParams.has('autoplay')) {
                    urlObj.searchParams.set('autoplay', '1');
                }
                playerSrc = urlObj.toString();
            } catch (e) {}
        }

        if (playerIframe) playerIframe.src = playerSrc || 'about:blank';

        const title = anime.title || 'Без названия';
        const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/300x450?text=No+Image';
        const description = anime.description || anime.material_data?.description || 'Описание отсутствует.';
        const year = anime.year || anime.material_data?.year || '—';
        const rating = anime.rating?.imdb || anime.material_data?.rating || '—';
        const genres = anime.genres ? anime.genres.join(', ') : (anime.material_data?.genres?.join(', ') || '—');

        // ===== ВНЕШНИЕ ССЫЛКИ =====
        let externalLinksHtml = '';

        const shikimoriId = anime.shikimori_id || anime.material_data?.shikimori_id || null;
        if (shikimoriId) {
            externalLinksHtml += `
                <a href="https://shikimori.one/animes/${shikimoriId}" target="_blank" class="external-link shikimori-link" title="Открыть на Shikimori">
                    <img src="https://shikimori.one/favicon.ico" alt="Shikimori" width="16" height="16" style="vertical-align:middle; border-radius:4px;" />
                    Shikimori
                </a>
            `;
        }

        const worldartLink = anime.worldart_link || anime.material_data?.worldart_link || null;
        if (worldartLink) {
            externalLinksHtml += `
                <a href="${worldartLink}" target="_blank" class="external-link worldart-link" title="Открыть на World-Art">
                    <img src="https://www.world-art.ru/favicon.ico" alt="World-Art" width="16" height="16" style="vertical-align:middle; border-radius:4px;" />
                    World-Art
                </a>
            `;
        }

        const kinopoiskId = anime.kinopoisk_id || anime.material_data?.kinopoisk_id || null;
        if (kinopoiskId) {
            externalLinksHtml += `
                <a href="https://www.kinopoisk.ru/film/${kinopoiskId}/" target="_blank" class="external-link kinopoisk-link" title="Открыть на Кинопоиске">
                    <img src="https://st.kp.yandex.net/images/favicon.ico" alt="Kinopoisk" width="16" height="16" style="vertical-align:middle; border-radius:4px;" />
                    Кинопоиск
                </a>
            `;
        }

        const imdbId = anime.imdb_id || anime.material_data?.imdb_id || null;
        if (imdbId) {
            externalLinksHtml += `
                <a href="https://www.imdb.com/title/${imdbId}/" target="_blank" class="external-link imdb-link" title="Открыть на IMDb">
                    <img src="https://www.imdb.com/favicon.ico" alt="IMDb" width="16" height="16" style="vertical-align:middle; border-radius:4px;" />
                    IMDb
                </a>
            `;
        }

        const mdlId = anime.mdl_id || anime.material_data?.mdl_id || null;
        if (mdlId) {
            externalLinksHtml += `
                <a href="https://mydramalist.com/${mdlId}" target="_blank" class="external-link mdl-link" title="Открыть на MyDramaList">
                    <img src="https://mydramalist.com/favicon.ico" alt="MDL" width="16" height="16" style="vertical-align:middle; border-radius:4px;" />
                    MDL
                </a>
            `;
        }

        if (!externalLinksHtml) {
            externalLinksHtml = `<span style="color:#5a6a8a; font-size:0.8rem;">Нет внешних ссылок</span>`;
        }

        const externalLinksBlock = `
            <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.05);">
                <span style="color: #7a8aaa; font-size: 0.75rem; letter-spacing: 1px; margin-right: 5px;">🔗 Ссылки:</span>
                ${externalLinksHtml}
            </div>
        `;

        // ===== СКРИНШОТЫ =====
        let screenshotsHtml = '';
        if (anime.screenshots && anime.screenshots.length > 0) {
            screenshotsHtml = `
                <div style="margin-top: 15px;">
                    <p style="color: #9aa3c0; font-size: 0.8rem; margin-bottom: 10px;">📸 Кадры из серии:</p>
                    <div class="screenshots-grid">
                        ${anime.screenshots.map(url => `
                            <a class="screenshot-item" data-image="${url}">
                                <img src="${url}" alt="Скриншот" loading="lazy" />
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // ===== ДАТА ОБНОВЛЕНИЯ =====
        let updateDateHtml = '';
        if (anime.updated_at) {
            const updateDate = new Date(anime.updated_at);
            const formattedDate = updateDate.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            updateDateHtml = `
                <div style="margin-top: 10px; font-size: 0.75rem; color: #5a6a8a;">
                    🕐 Обновлено: ${formattedDate}
                </div>
            `;
        }

        // ===== СБОРКА СТРАНИЦЫ =====
        if (animeInfoEl) {
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
                        ${externalLinksBlock}
                        ${updateDateHtml}
                        ${screenshotsHtml}
                    </div>
                </div>
            `;
        }
        document.title = `${title} — Quarwatch`;

        // ===== ДОБАВЛЯЕМ ОБРАБОТЧИКИ ДЛЯ УВЕЛИЧЕНИЯ =====
        const posterImg = document.querySelector('.anime-detail .poster img');
        if (posterImg) {
            posterImg.style.cursor = 'pointer';
            posterImg.addEventListener('click', () => {
                openImageModal(posterImg.src);
            });
        }
        
        document.querySelectorAll('.screenshot-item').forEach(item => {
            item.addEventListener('click', () => {
                const img = item.querySelector('img');
                if (img) openImageModal(img.src);
            });
        });
    } catch (err) {
        console.error('❌ Ошибка загрузки тайтла:', err);
        if (animeInfoEl) {
            animeInfoEl.innerHTML = `<p style="color:#ff7a7a;">Ошибка: ${err.message}</p>`;
        }
    }
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
    currentAnimeId = null;
    showSection(listSection);
}

// ===== НАЗАД =====
function goBack() {
    if (playerIframe) {
        playerIframe.src = '';
    }
    currentAnimeId = null;
    if (window.location.hash) {
        window.location.hash = '';
    } else {
        showSection(listSection);
    }
}

// ===== ОБРАБОТЧИКИ =====
window.addEventListener('hashchange', handleHashChange);

if (searchBtn && searchInput) {
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
        if (e.key === 'Enter' && searchBtn) searchBtn.click();
    });
}

if (backBtn) {
    backBtn.addEventListener('click', goBack);
}

if (shareBtn) {
    shareBtn.addEventListener('click', copyPageLink);
}

if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
        fetchAnimeList(currentQuery, true);
    });
}

// ===== АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ ГОДА =====
(function updateFooterYear() {
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
})();

// ===== НАСТРАИВАЕМ БЕСКОНЕЧНЫЙ СКРОЛЛ =====
setupInfiniteScroll();

// ===== СТАРТ =====
console.log('🚀 Запуск Quarwatch...');
if (window.location.hash) {
    handleHashChange();
} else {
    showSection(listSection);
    fetchAnimeList();
                }
