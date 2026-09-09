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

function filterAnimeOnly(results) {
    if (!results || !Array.isArray(results)) return [];
    return results.filter(item => isAnime(item));
}

// ===== УДАЛЕНИЕ ДУБЛИКАТОВ =====
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
        }
    });

    return unique;
}

// ===== ГЛОБАЛЬНОЕ ХРАНИЛИЩЕ =====
let allLoadedIds = new Set();

// ===== DOM =====
const listSection = document.getElementById('anime-list');
const playerSection = document.getElementById('player-section');
const updatesSection = document.getElementById('updates-section');
const catalogEl = document.getElementById('catalog');
const loaderEl = document.getElementById('loader');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const backBtn = document.getElementById('back-btn');
const shareBtn = document.getElementById('share-btn');
const playerIframe = document.getElementById('player-iframe');
const animeInfoEl = document.getElementById('anime-info');
const updatesContent = document.getElementById('updates-content');
const updatesBackBtn = document.getElementById('updates-back-btn');
const logoLink = document.getElementById('logo-link');
const categoryBtns = document.querySelectorAll('.category-btn');
const loadMoreBtn = document.getElementById('load-more-btn');

// ===== ГАМБУРГЕР-МЕНЮ =====
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');
const menuDeveloper = document.getElementById('menu-developer');
const menuUpdates = document.getElementById('menu-updates');
const menuImportant = document.getElementById('menu-important');

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
// ПУНКТ МЕНЮ "ВАЖНО"
// =========================================
if (menuImportant) {
    menuImportant.addEventListener('click', (e) => {
        e.preventDefault();
        if (hamburger) hamburger.classList.remove('active');
        if (navMenu) navMenu.classList.remove('open');
        
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
    });
}

// =========================================
// МОДАЛЬНОЕ ОКНО
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
// ПУНКТ МЕНЮ "РАЗРАБОТЧИК"
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

// =========================================
// ПУНКТ МЕНЮ "ОБНОВЛЕНИЯ" → СТРАНИЦА
// =========================================
if (menuUpdates) {
    menuUpdates.addEventListener('click', (e) => {
        e.preventDefault();
        if (hamburger) hamburger.classList.remove('active');
        if (navMenu) navMenu.classList.remove('open');
        showSection(updatesSection);
    });
}

// =========================================
// КАТЕГОРИИ
// =========================================
function setCategory(type) {
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
    if (section.id === 'updates-section') {
        loadUpdates();
    }
}

// =========================================
// КНОПКА НАЗАД НА СТРАНИЦЕ ОБНОВЛЕНИЙ
// =========================================
if (updatesBackBtn) {
    updatesBackBtn.addEventListener('click', () => {
        showSection(listSection);
    });
}

// ===== ЗАГРУЗКА ОБНОВЛЕНИЙ =====
async function loadUpdates() {
    if (!updatesContent) return;
    
    updatesContent.innerHTML = '<div class="loader">Загрузка обновлений...</div>';
    
    try {
        const response = await fetch('updates.json');
        if (!response.ok) throw new Error('Не удалось загрузить обновления');
        const data = await response.json();
        
        if (!data.updates || data.updates.length === 0) {
            updatesContent.innerHTML = '<div class="no-updates">Нет записей об обновлениях</div>';
            return;
        }
        
        data.updates.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        let html = '';
        data.updates.forEach(update => {
            const date = new Date(update.date).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
            
            html += `
                <div class="update-item">
                    <div class="update-header">
                        <span class="update-version">${update.version || 'v1.0'}</span>
                        <span class="update-date">${date}</span>
                    </div>
                    <div class="update-title">${update.title || 'Обновление'}</div>
                    <ul class="update-changes">
                        ${update.changes.map(change => `<li>${change}</li>`).join('')}
                    </ul>
                </div>
            `;
        });
        
        updatesContent.innerHTML = html;
    } catch (err) {
        console.error('Ошибка загрузки обновлений:', err);
        updatesContent.innerHTML = `
            <div class="no-updates">
                ⚠️ Не удалось загрузить обновления<br>
                <span style="font-size:0.8rem;color:#444;">Проверьте файл updates.json</span>
            </div>
        `;
    }
}

// ===== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ =====
function buildAnimeUrl(query = '', loadMore = false) {
    if (loadMore && nextPageUrl) {
        return nextPageUrl;
    }

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

    if (query.trim()) {
        endpoint = '/search';
        params.title = query.trim();
        params.types = 'anime-serial,anime';
        delete params.sort;
        delete params.order;
    }

    return `${KODIK_API_URL}${endpoint}?${new URLSearchParams(params)}`;
}

// ===== ОТРИСОВКА КАРТОЧЕК (БЕЗ ЖАНРОВ) =====
function renderAnimeList(animes, append = false) {
    if (!catalogEl) return;
    
    if (!append) {
        catalogEl.innerHTML = '';
    }

    const uniqueAnimes = [];
    const seenIds = new Set();
    const seenTitles = new Set();
    
    animes.forEach(anime => {
        const titleKey = anime.title?.toLowerCase().trim() || '';
        if (!seenIds.has(anime.id) && !seenTitles.has(titleKey)) {
            seenIds.add(anime.id);
            seenTitles.add(titleKey);
            uniqueAnimes.push(anime);
        }
    });

    if (uniqueAnimes.length === 0) {
        catalogEl.innerHTML = '<p style="text-align:center;color:#7a8aaa;">Аниме не найдено</p>';
        return;
    }

    uniqueAnimes.forEach(anime => {
        const card = document.createElement('div');
        card.className = 'anime-card';

        const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/200x280?text=No+Image';
        const title = anime.title || anime.material_data?.title || 'Без названия';
        const year = anime.year || anime.material_data?.year || '';
        const id = anime.id;
        
        const episodes = anime.episodes_count || anime.material_data?.episodes_count || '';
        const episodesText = episodes ? `📺 ${episodes} серий` : '';

        card.innerHTML = `
            <img src="${poster}" alt="${title}" loading="lazy" />
            <div class="info">
                <div class="title">${title}</div>
                <div class="year">${year}</div>
                ${episodesText ? `<div class="episodes">${episodesText}</div>` : ''}
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

// ===== СВЯЗАННЫЕ АНИМЕ =====
async function findRelatedAnime(title, animeId) {
    try {
        const cleanTitle = title
            .replace(/\[ТВ-\d+\]|\(ТВ-\d+\)|\[ТВ\]|\(ТВ\)|\[Фильм\]|\(Фильм\)|\s*\(?\d+\s*сезон\)?/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        const params = new URLSearchParams({
            token: KODIK_API_KEY,
            title: cleanTitle,
            limit: 50,
            with_material_data: 'true',
            types: 'anime-serial,anime'
        });
        const url = `${KODIK_API_URL}/search?${params}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) return [];
        
        const related = data.results
            .filter(item => item.id !== animeId && isAnime(item))
            .filter(item => {
                const itemTitle = item.title?.toLowerCase() || '';
                const mainTitle = cleanTitle.toLowerCase();
                return itemTitle.includes(mainTitle) || mainTitle.includes(itemTitle);
            });
        
        related.sort((a, b) => {
            const yearA = parseInt(a.year) || 0;
            const yearB = parseInt(b.year) || 0;
            return yearA - yearB;
        });
        
        const yearMap = new Map();
        
        related.forEach(item => {
            const year = parseInt(item.year) || 0;
            if (year === 0) return;
            
            if (!yearMap.has(year)) {
                yearMap.set(year, item);
            } else {
                const existing = yearMap.get(year);
                const existingRating = existing.rating?.imdb || existing.material_data?.rating || 0;
                const itemRating = item.rating?.imdb || item.material_data?.rating || 0;
                if (itemRating > existingRating) {
                    yearMap.set(year, item);
                }
            }
        });
        
        return Array.from(yearMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([year, anime]) => anime);
    } catch (err) {
        console.warn('⚠️ Ошибка поиска связанных:', err);
        return [];
    }
}

async function showRelatedAnime(title, animeId) {
    const related = await findRelatedAnime(title, animeId);
    const container = document.querySelector('.anime-detail .info');
    
    if (!container || related.length === 0) return;
    
    let html = `
        <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05);">
            <h3 style="color: #e0e0e0; font-size: 1rem; margin-bottom: 12px;">🔗 Связанные аниме (${related.length})</h3>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: flex-start;">
    `;
    
    related.forEach((anime, index) => {
        const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/120x170?text=No+Image';
        const title = anime.title || 'Без названия';
        const year = anime.year || '';
        const episodes = anime.episodes_count || '';
        const seasonNumber = index + 1;
        const type = anime.type === 'anime-serial' ? 'Сериал' : 'Фильм';
        
        html += `
            <div class="related-card" data-id="${anime.id}">
                <div style="position: relative;">
                    <img src="${poster}" alt="${title}" loading="lazy" />
                    <div style="position: absolute; top: 8px; right: 8px; background: rgba(108, 92, 231, 0.85); color: #fff; font-size: 0.6rem; padding: 2px 10px; border-radius: 12px; font-weight: 600; backdrop-filter: blur(4px);">
                        ${type} ${seasonNumber}
                    </div>
                    ${year ? `<div style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.6); color: #fff; font-size: 0.6rem; padding: 2px 10px; border-radius: 12px; backdrop-filter: blur(4px);">${year}</div>` : ''}
                </div>
                <div class="related-info">
                    <div class="related-title">${title}</div>
                    <div class="related-meta">${episodes ? `📺 ${episodes} серий` : ''}</div>
                </div>
            </div>
        `;
    });
    
    html += `</div></div>`;
    container.insertAdjacentHTML('beforeend', html);
    
    container.querySelectorAll('.related-card').forEach(card => {
        card.addEventListener('click', function() {
            const id = this.dataset.id;
            if (id) window.location.hash = `anime/${id}`;
        });
    });
}

// ===== ЗАГРУЗКА КАТАЛОГА =====
async function fetchAnimeList(query = '', loadMore = false) {
    if (isLoading) return;
    isLoading = true;
    isFetchingMore = loadMore;

    if (!loadMore) {
        if (catalogEl) catalogEl.innerHTML = '';
        nextPageUrl = null;
        currentQuery = query;
        allLoadedIds.clear();
        if (loaderEl) loaderEl.style.display = 'block';
        setTimeout(() => {
            if (loaderEl) loaderEl.style.display = 'none';
        }, 500);
    }

    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    try {
        const url = buildAnimeUrl(query, loadMore);
        console.log('📡 Запрос каталога:', url);

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        let filteredResults = filterAnimeOnly(data.results);
        let uniqueResults = removeDuplicates(filteredResults);

        const newUniqueResults = [];
        uniqueResults.forEach(anime => {
            if (!allLoadedIds.has(anime.id)) {
                allLoadedIds.add(anime.id);
                newUniqueResults.push(anime);
            }
        });

        nextPageUrl = (newUniqueResults.length > 0) ? data.next_page || null : null;

        if (newUniqueResults.length === 0) {
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
        console.warn('⚠️ Ошибка загрузки:', err.message);
        if (!loadMore && catalogEl) {
            catalogEl.innerHTML = `
                <p style="text-align:center;color:#7a8aaa; margin-top:20px;">
                    ⚠️ Не удалось загрузить данные
                </p>
                <p style="text-align:center;color:#5a6a8a; font-size:0.85rem; margin-top:10px;">
                    Проверьте подключение или нажмите
                    <strong style="color:#9aa3c0;">«Сериалы»</strong> или
                    <strong style="color:#9aa3c0;">«Фильмы»</strong>.
                </p>
            `;
        }
    } finally {
        if (loaderEl) loaderEl.style.display = 'none';
        isLoading = false;
        isFetchingMore = false;
    }
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

// ===== ЗАГРУЗКА СТРАНИЦЫ ТАЙТЛА (С ЖАНРАМИ) =====
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
                                Этот тайтл (${anime.type}) не является аниме и заблокирован.
                            </p>
                            <button class="back-btn" onclick="window.location.hash=''">← На главную</button>
                        </div>
                    </div>
                `;
            }
            if (playerIframe) playerIframe.src = 'about:blank';
            return;
        }

        // ===== ПЛЕЕР =====
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

        // ===== ЖАНРЫ (только на странице аниме) =====
        let genresList = anime.genres || anime.material_data?.genres || [];
        if (typeof genresList === 'string') {
            genresList = genresList.split(',').map(g => g.trim());
        }
        const genresText = genresList.length > 0 ? genresList.join(', ') : '—';

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

        // ===== СБОРКА СТРАНИЦЫ (С ЖАНРАМИ) =====
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
                            <span>🎭 ${genresText}</span>
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

        // ===== ПОКАЗЫВАЕМ СВЯЗАННЫЕ АНИМЕ =====
        showRelatedAnime(title, animeId);

        // ===== ОБРАБОТЧИКИ ДЛЯ УВЕЛИЧЕНИЯ =====
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
            animeInfoEl.innerHTML = `
                <div class="anime-detail" id="anime-detail">
                    <div class="info" style="text-align:center; padding:40px 20px;">
                        <h2 style="color:#ff7a7a;">⛔ ОШИБКА ЗАГРУЗКИ</h2>
                        <p style="color:#9aa3c0; margin:20px 0;">
                            Не удалось загрузить данные об аниме.<br>
                            Попробуйте вернуться на главную и открыть снова.
                        </p>
                        <button class="back-btn" onclick="window.location.hash=''">← На главную</button>
                    </div>
                </div>
            `;
        }
        if (playerIframe) playerIframe.src = 'about:blank';
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

// =========================================
// АВТООБНОВЛЕНИЕ КАЖДЫЕ 30 СЕКУНД
// =========================================
setInterval(() => {
    if (!window.location.hash && !isLoading) {
        console.log('🔄 Автообновление каталога...');
        fetchAnimeList(currentQuery);
    }
}, 30000);

// =========================================
// ОБНОВЛЕНИЕ ПРИ АКТИВАЦИИ ВКЛАДКИ
// =========================================
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !window.location.hash && !isLoading) {
        console.log('🔄 Обновление при возвращении...');
        fetchAnimeList(currentQuery);
    }
});

// =========================================
// СТАРТ
// =========================================
console.log('🚀 Запуск Quarwatch...');
if (window.location.hash) {
    handleHashChange();
} else {
    showSection(listSection);
    fetchAnimeList();
                                             }
}

// ===== ПОИСК ПО ID =====

// Обработчики для меню
const menuSearchId = document.getElementById('menu-search-id');
if (menuSearchId) {
    menuSearchId.addEventListener('click', (e) => {
        e.preventDefault();
        if (hamburger) hamburger.classList.remove('active');
        if (navMenu) navMenu.classList.remove('open');
        showSearchIdSection();
    });
}

// Показать страницу поиска
function showSearchIdSection() {
    const section = document.getElementById('search-id-section');
    if (!section) return;
    
    // Скрываем все секции
    document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
    section.classList.add('active');
    
    // Очищаем результаты
    const results = document.getElementById('search-id-results');
    if (results) {
        results.innerHTML = `
            <div class="search-id-empty">
                <span style="font-size:2rem;">🔎</span>
                <p>Введите ID для поиска аниме</p>
            </div>
        `;
    }
    
    // Очищаем поле ввода
    const input = document.getElementById('search-id-input');
    if (input) input.value = '';
    
    // Фокус на поле
    setTimeout(() => input?.focus(), 100);
}

// Кнопка "Назад" на странице поиска
const searchIdBackBtn = document.getElementById('search-id-back-btn');
if (searchIdBackBtn) {
    searchIdBackBtn.addEventListener('click', () => {
        document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
        const listSection = document.getElementById('anime-list');
        if (listSection) listSection.classList.add('active');
    });
}

// ===== ОСНОВНАЯ ЛОГИКА ПОИСКА =====

// Маппинг типов ID в параметры API
const ID_TYPES_MAP = {
    'shikimori': 'shikimori_id',
    'kinopoisk': 'kinopoisk_id',
    'imdb': 'imdb_id',
    'worldart': 'worldart_id',
    'anime': 'id',
    'mal': 'mal_id'
};

// Функция поиска по ID
async function searchAnimeById(id, type) {
    const paramName = ID_TYPES_MAP[type] || 'id';
    
    // Специальная обработка для IMDb (формат tt1234567)
    if (type === 'imdb' && !id.startsWith('tt')) {
        id = `tt${id}`;
    }
    
    const params = new URLSearchParams({
        token: KODIK_API_KEY,
        [paramName]: id,
        with_material_data: 'true',
        limit: 1
    });
    
    const url = `${KODIK_API_URL}/search?${params}`;
    console.log(`🔍 Поиск по ${type} ID: ${id}`, url);
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.results || [];
}

// Отображение результатов поиска
function renderSearchResults(results, searchType, searchId) {
    const container = document.getElementById('search-id-results');
    if (!container) return;
    
    if (!results || results.length === 0) {
        container.innerHTML = `
            <div class="search-id-not-found">
                <span class="icon">😕</span>
                <p>Аниме не найдено</p>
                <p class="error-text">ID: ${searchId} (${searchType})</p>
                <p style="color:#444; font-size:0.8rem; margin-top:8px;">
                    Проверьте правильность ID или попробуйте другой тип
                </p>
            </div>
        `;
        return;
    }
    
    // Фильтруем только аниме
    const animeResults = results.filter(item => isAnime(item));
    
    if (animeResults.length === 0) {
        container.innerHTML = `
            <div class="search-id-not-found">
                <span class="icon">⛔</span>
                <p>Найденный тайтл не является аниме</p>
                <p class="error-text">Тип: ${results[0]?.type || 'неизвестен'}</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    animeResults.forEach(anime => {
        const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/80x112?text=No+Image';
        const title = anime.title || anime.material_data?.title || 'Без названия';
        const year = anime.year || anime.material_data?.year || '—';
        const rating = anime.rating?.imdb || anime.material_data?.rating || '—';
        const description = anime.description || anime.material_data?.description || 'Описание отсутствует';
        const episodes = anime.episodes_count || anime.material_data?.episodes_count || '—';
        const genres = anime.genres || anime.material_data?.genres || [];
        const type = anime.type === 'anime-serial' ? 'Сериал' : 'Фильм';
        
        // Собираем все внешние ID
        const externalIds = [];
        if (anime.shikimori_id) externalIds.push(`Shiki: ${anime.shikimori_id}`);
        if (anime.kinopoisk_id) externalIds.push(`КП: ${anime.kinopoisk_id}`);
        if (anime.imdb_id) externalIds.push(`IMDb: ${anime.imdb_id}`);
        if (anime.worldart_id) externalIds.push(`WA: ${anime.worldart_id}`);
        if (anime.mal_id) externalIds.push(`MAL: ${anime.mal_id}`);
        
        html += `
            <div class="search-id-result-item" data-id="${anime.id}">
                <img src="${poster}" alt="${title}" loading="lazy" />
                <div class="search-id-result-info">
                    <h3>${title}</h3>
                    <div class="meta">
                        <span>📅 ${year}</span>
                        <span>⭐ ${rating}</span>
                        <span>📺 ${episodes} серий</span>
                        <span>🎬 ${type}</span>
                        ${genres.length > 0 ? `<span>🎭 ${genres.slice(0, 3).join(', ')}</span>` : ''}
                    </div>
                    <div class="description">${description}</div>
                    ${externalIds.length > 0 ? `
                        <div class="external-ids">
                            ${externalIds.map(id => `<span>🔗 ${id}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Клик по результату → открываем аниме
    container.querySelectorAll('.search-id-result-item').forEach(item => {
        item.addEventListener('click', function() {
            const animeId = this.dataset.id;
            if (animeId) {
                window.location.hash = `anime/${animeId}`;
            }
        });
    });
}

// ===== ОБРАБОТЧИК ПОИСКА =====

const searchIdBtn = document.getElementById('search-id-btn');
const searchIdInput = document.getElementById('search-id-input');
const searchIdType = document.getElementById('search-id-type');
const searchIdLoader = document.getElementById('search-id-loader');

async function performSearchById() {
    if (!searchIdInput || !searchIdType) return;
    
    const id = searchIdInput.value.trim();
    if (!id) {
        showCopyNotification('⚠️ Введите ID для поиска');
        return;
    }
    
    const type = searchIdType.value;
    const typeLabel = searchIdType.options[searchIdType.selectedIndex]?.text || type;
    
    // Показываем загрузку
    if (searchIdLoader) searchIdLoader.style.display = 'block';
    if (searchIdBtn) searchIdBtn.disabled = true;
    searchIdBtn.textContent = '⏳ Поиск...';
    
    const container = document.getElementById('search-id-results');
    if (container) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#555;">🔍 Ищем...</div>';
    }
    
    try {
        const results = await searchAnimeById(id, type);
        renderSearchResults(results, typeLabel, id);
    } catch (err) {
        console.error('❌ Ошибка поиска:', err);
        if (container) {
            container.innerHTML = `
                <div class="search-id-not-found">
                    <span class="icon">⚠️</span>
                    <p>Ошибка при поиске</p>
                    <p class="error-text">${err.message}</p>
                </div>
            `;
        }
    } finally {
        if (searchIdLoader) searchIdLoader.style.display = 'none';
        if (searchIdBtn) {
            searchIdBtn.disabled = false;
            searchIdBtn.textContent = '🔍 Найти';
        }
    }
}

// Обработчики
if (searchIdBtn) {
    searchIdBtn.addEventListener('click', performSearchById);
}

if (searchIdInput) {
    searchIdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearchById();
        }
    });
}

// ===== ПРИМЕРЫ ID ДЛЯ ТЕСТА =====
const SEARCH_EXAMPLES = {
    'shikimori': '25537',    // Наруто
    'kinopoisk': '4433632',   // Атака титанов
    'imdb': 'tt0389860',      // Сейлор Мун
    'worldart': '12345',      // Пример
    'anime': '123456',        // Kodik ID
    'mal': '21'               // One Piece MAL
};

// Добавляем подсказки с примерами
document.addEventListener('DOMContentLoaded', () => {
    const hint = document.querySelector('.search-id-hint');
    if (hint) {
        hint.innerHTML = `
            💡 Примеры ID: 
            <span style="color:#6c5ce7; cursor:pointer;" data-example="shikimori:25537">Shikimori: 25537</span> | 
            <span style="color:#6c5ce7; cursor:pointer;" data-example="kinopoisk:4433632">Кинопоиск: 4433632</span> | 
            <span style="color:#6c5ce7; cursor:pointer;" data-example="imdb:tt0389860">IMDb: tt0389860</span>
        `;
        
        // Клик по примеру → автозаполнение
        hint.querySelectorAll('[data-example]').forEach(el => {
            el.addEventListener('click', function() {
                const [type, id] = this.dataset.example.split(':');
                const select = document.getElementById('search-id-type');
                const input = document.getElementById('search-id-input');
                if (select && input) {
                    const option = select.querySelector(`option[value="${type}"]`);
                    if (option) select.value = type;
                    input.value = id;
                    performSearchById();
                }
            });
        });
    }// ===== ПАРСИНГ URL ДЛЯ ПОИСКА =====
function parseSearchUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/search\/id\/(\w+)\/(.+)/);
    if (match) {
        const type = match[1];
        const id = match[2];
        
        // Открываем страницу поиска
        showSearchIdSection();
        
        // Заполняем поля
        const select = document.getElementById('search-id-type');
        const input = document.getElementById('search-id-input');
        if (select && input) {
            const option = select.querySelector(`option[value="${type}"]`);
            if (option) select.value = type;
            input.value = decodeURIComponent(id);
            
            // Автоматический поиск
            setTimeout(performSearchById, 300);
        }
    }
}

// Вызываем при загрузке
document.addEventListener('DOMContentLoaded', parseSearchUrl);
});
// ============================================
// 🕒 ФИЛЬТР "АНОНСЫ" (ДОБАВЛЕНО)
// ============================================

// Обновляем setCategory для поддержки анонсов
const originalSetCategory = setCategory;
setCategory = function(type) {
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
};

// Обновляем buildAnimeUrl для поддержки анонсов
const originalBuildUrl = buildAnimeUrl;
buildAnimeUrl = function(query = '', loadMore = false) {
    if (loadMore && nextPageUrl) {
        return nextPageUrl;
    }

    let endpoint = '/list';
    let params = {
        token: KODIK_API_KEY,
        limit: 30,
        with_material_data: 'true',
        types: 'anime-serial,anime'
    };

    // АНОНСЫ
    if (currentCategory === 'anons') {
        params.anime_status = 'anons';
        params.types = 'anime-serial,anime';
    } else if (currentCategory === 'series') {
        params.types = 'anime-serial';
    } else if (currentCategory === 'movie') {
        params.types = 'anime';
    }

    if (query.trim()) {
        endpoint = '/search';
        params.title = query.trim();
        params.types = 'anime-serial,anime';
        delete params.sort;
        delete params.order;
        if (currentCategory === 'anons') {
            params.anime_status = 'anons';
        }
    }

    return `${KODIK_API_URL}${endpoint}?${new URLSearchParams(params)}`;
};

// Добавляем обработчик для кнопки "Анонсы" при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Находим кнопку "Анонсы"
    const anonsBtn = document.querySelector('.category-btn[data-type="anons"]');
    if (anonsBtn) {
        anonsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            setCategory('anons');
        });
    }
    
    // Добавляем стили для бейджа "Анонс" на карточках
    // (модифицируем renderAnimeList через переопределение)
    const originalRender = renderAnimeList;
    renderAnimeList = function(animes, append = false) {
        if (!catalogEl) return;
        
        if (!append) {
            catalogEl.innerHTML = '';
        }

        const uniqueAnimes = [];
        const seenIds = new Set();
        const seenTitles = new Set();
        
        animes.forEach(anime => {
            const titleKey = anime.title?.toLowerCase().trim() || '';
            if (!seenIds.has(anime.id) && !seenTitles.has(titleKey)) {
                seenIds.add(anime.id);
                seenTitles.add(titleKey);
                uniqueAnimes.push(anime);
            }
        });

        if (uniqueAnimes.length === 0) {
            if (!append) {
                catalogEl.innerHTML = '<p style="text-align:center;color:#7a8aaa;padding:40px 20px;">🎯 Аниме не найдено</p>';
            }
            return;
        }

        uniqueAnimes.forEach(anime => {
            const card = document.createElement('div');
            card.className = 'anime-card';

            const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/200x280?text=No+Image';
            const title = anime.title || anime.material_data?.title || 'Без названия';
            const year = anime.year || anime.material_data?.year || '';
            const id = anime.id;
            const episodes = anime.episodes_count || anime.material_data?.episodes_count || '';
            const animeStatus = anime.anime_status || anime.material_data?.anime_status || '';
            
            // Проверяем, анонс ли это
            const isAnons = animeStatus === 'anons';
            
            // Создаём HTML с бейджем
            let cardHTML = `
                <div style="position:relative;">
                    <img src="${poster}" alt="${title}" loading="lazy" style="display:block; width:100%; aspect-ratio:2/3; object-fit:cover; background:#1a1a1a;" />
            `;
            
            // Добавляем бейдж "Анонс" если нужно
            if (isAnons) {
                cardHTML += `
                    <div style="position:absolute; top:8px; left:8px; padding:2px 10px; border-radius:12px; font-size:0.6rem; font-weight:600; background:rgba(108,92,231,0.85); color:#fff; backdrop-filter:blur(4px); z-index:2;">
                        🕒 Анонс
                    </div>
                `;
            }
            
            cardHTML += `
                </div>
                <div class="info">
                    <div class="title">${title}</div>
                    <div class="year">${year}</div>
                    ${episodes ? `<div class="episodes">📺 ${episodes} серий</div>` : ''}
                </div>
            `;
            
            card.innerHTML = cardHTML;
            card.dataset.animeId = id;
            
            card.addEventListener('click', function() {
                const animeId = this.dataset.animeId;
                window.location.hash = `anime/${animeId}`;
            });
            
            catalogEl.appendChild(card);
        });
    };

    console.log('🕒 Фильтр "Анонсы" загружен!');
});

console.log('✅ Quarwatch с фильтром "Анонсы" готов!');
