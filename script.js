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

// =========================================
// 🔐 СИСТЕМА РЕГИСТРАЦИИ И АВТОРИЗАЦИИ
// =========================================

// ===== КОНФИГУРАЦИЯ GITHUB =====
const GITHUB_CONFIG = {
    token: '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', // 🔥 ВСТАВЬ СВОЙ ТОКЕН
    owner: 'akrifisofficial-a11y',                            // 🔥 ТВОЙ НИК
    repo: 'quarwatch-data',
    branch: 'main'
};

const DATA_URL = `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}`;

console.log('📡 GitHub Config:', GITHUB_CONFIG);

// =========================================
// 📡 РАБОТА С GITHUB API
// =========================================

async function githubRequest(method, path, data = null) {
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`;
    
    const options = {
        method: method,
        headers: {
            'Authorization': `token ${GITHUB_CONFIG.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        }
    };

    if (method === 'PUT' && data) {
        try {
            const getResp = await fetch(url, { headers: options.headers });
            if (getResp.ok) {
                const existing = await getResp.json();
                data.sha = existing.sha;
            }
        } catch(e) {}
        
        options.body = JSON.stringify({
            message: data.message || `Update ${path}`,
            content: typeof data.content === 'string' ? data.content : btoa(unescape(encodeURIComponent(JSON.stringify(data.content, null, 2)))),
            branch: GITHUB_CONFIG.branch,
            ...(data.sha && { sha: data.sha })
        });
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        console.warn('⚠️ GitHub API ошибка:', err);
        throw err;
    }
}

async function getGitHubData(path) {
    try {
        const data = await githubRequest('GET', path);
        if (data.content) {
            const decoded = decodeURIComponent(escape(atob(data.content)));
            return JSON.parse(decoded);
        }
        return null;
    } catch (err) {
        return null;
    }
}

async function saveGitHubData(path, content, message = 'Update data') {
    try {
        return await githubRequest('PUT', path, {
            content: content,
            message: message
        });
    } catch (err) {
        console.warn('⚠️ Ошибка сохранения:', err);
        return null;
    }
}

// =========================================
// 👤 РЕГИСТРАЦИЯ И ВХОД
// =========================================

async function registerUser(username, password) {
    if (!username || username.length < 3) {
        showNotification('❌ Никнейм должен быть минимум 3 символа');
        return false;
    }
    
    if (!password || password.length < 4) {
        showNotification('❌ Пароль должен быть минимум 4 символа');
        return false;
    }
    
    const usersList = await getGitHubData('users/users_list.json') || [];
    
    if (usersList.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        showNotification('❌ Пользователь с таким именем уже существует');
        return false;
    }
    
    const hashedPassword = btoa(password + 'quarwatch_salt');
    
    const userData = {
        id: Date.now().toString(),
        username: username,
        password: hashedPassword,
        avatar: '',
        bio: 'Любитель аниме 🎌',
        joined_at: new Date().toISOString(),
        comments_count: 0
    };
    
    await saveGitHubData(`users/${userData.id}.json`, userData, `Register user ${username}`);
    
    usersList.push({
        id: userData.id,
        username: username,
        joined_at: userData.joined_at
    });
    await saveGitHubData('users/users_list.json', usersList, 'Update users list');
    
    loginUser(userData);
    showNotification('✅ Регистрация успешна! Добро пожаловать!');
    return true;
}

async function loginUserByCredentials(username, password) {
    if (!username || !password) {
        showNotification('❌ Заполните все поля');
        return false;
    }
    
    const usersList = await getGitHubData('users/users_list.json') || [];
    const userEntry = usersList.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (!userEntry) {
        showNotification('❌ Пользователь не найден');
        return false;
    }
    
    const userData = await getGitHubData(`users/${userEntry.id}.json`);
    if (!userData) {
        showNotification('❌ Ошибка загрузки данных');
        return false;
    }
    
    const hashedPassword = btoa(password + 'quarwatch_salt');
    if (userData.password !== hashedPassword) {
        showNotification('❌ Неверный пароль');
        return false;
    }
    
    loginUser(userData);
    showNotification(`👋 Добро пожаловать, ${userData.username}!`);
    return true;
}

function loginUser(userData) {
    localStorage.setItem('quarwatch_user', JSON.stringify(userData));
    updateAuthUI(userData);
    closeModal();
    if (window.location.hash) {
        const hash = window.location.hash.slice(1);
        if (hash.startsWith('anime/')) {
            const animeId = hash.split('/')[1];
            setTimeout(() => {
                const container = document.getElementById(`comments-container-${animeId}`);
                if (container) {
                    renderComments(animeId, container);
                }
            }, 500);
        }
    }
}

function logoutUser() {
    localStorage.removeItem('quarwatch_user');
    updateAuthUI(null);
    showNotification('👋 До свидания!');
    if (window.location.hash) {
        const hash = window.location.hash.slice(1);
        if (hash.startsWith('anime/')) {
            const animeId = hash.split('/')[1];
            setTimeout(() => {
                const container = document.getElementById(`comments-container-${animeId}`);
                if (container) {
                    renderComments(animeId, container);
                }
            }, 500);
        }
    }
}

function isUserLoggedIn() {
    const saved = localStorage.getItem('quarwatch_user');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch(e) {
            return null;
        }
    }
    return null;
}

function updateAuthUI(user) {
    const authBtn = document.getElementById('auth-btn');
    if (!authBtn) return;
    
    if (user) {
        if (user.avatar) {
            authBtn.innerHTML = `<img src="${user.avatar}" style="width:24px;height:24px;border-radius:50%;vertical-align:middle;margin-right:8px;object-fit:cover;"> ${user.username}`;
        } else {
            authBtn.innerHTML = `👤 ${user.username}`;
        }
        authBtn.style.background = 'rgba(108,92,231,0.15)';
        authBtn.style.borderColor = 'rgba(108,92,231,0.3)';
        authBtn.style.color = '#a29bfe';
    } else {
        authBtn.innerHTML = '👤 Войти';
        authBtn.style.background = '';
        authBtn.style.borderColor = 'rgba(255,255,255,0.06)';
        authBtn.style.color = '#e0e0e0';
    }
}

// =========================================
// 📷 ЗАГРУЗКА АВАТАРКИ
// =========================================

async function uploadAvatar(userId, file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const base64 = e.target.result.split(',')[1];
                const path = `uploads/${userId}/avatar.jpg`;
                
                await githubRequest('PUT', path, {
                    content: base64,
                    message: `Upload avatar for ${userId}`
                });
                
                const avatarUrl = `${DATA_URL}/uploads/${userId}/avatar.jpg`;
                
                const userData = await getGitHubData(`users/${userId}.json`);
                if (userData) {
                    userData.avatar = avatarUrl;
                    await saveGitHubData(`users/${userId}.json`, userData, `Update avatar for ${userId}`);
                    
                    const localUser = JSON.parse(localStorage.getItem('quarwatch_user'));
                    if (localUser) {
                        localUser.avatar = avatarUrl;
                        localStorage.setItem('quarwatch_user', JSON.stringify(localUser));
                        updateAuthUI(localUser);
                    }
                }
                
                resolve(avatarUrl);
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsDataURL(file);
    });
}

// =========================================
// ✏️ ОБНОВЛЕНИЕ ПРОФИЛЯ
// =========================================

async function updateUserProfile(userId, updates) {
    try {
        const userData = await getGitHubData(`users/${userId}.json`);
        if (!userData) return null;
        
        const updatedUser = { ...userData, ...updates };
        await saveGitHubData(`users/${userId}.json`, updatedUser, `Update profile for ${userId}`);
        
        const localUser = JSON.parse(localStorage.getItem('quarwatch_user'));
        if (localUser) {
            Object.assign(localUser, updates);
            localStorage.setItem('quarwatch_user', JSON.stringify(localUser));
            updateAuthUI(localUser);
        }
        
        showNotification('✅ Профиль обновлён!');
        return updatedUser;
    } catch (err) {
        showNotification('❌ Ошибка обновления');
        return null;
    }
}

// =========================================
// 💬 КОММЕНТАРИИ
// =========================================

async function getComments(animeId) {
    try {
        const data = await getGitHubData(`comments/${animeId}.json`);
        return data || { comments: [] };
    } catch (err) {
        return { comments: [] };
    }
}

async function addComment(animeId, userId, text) {
    if (!text.trim()) {
        showNotification('❌ Введите текст комментария');
        return null;
    }
    
    try {
        const userData = await getGitHubData(`users/${userId}.json`);
        if (!userData) {
            showNotification('❌ Пользователь не найден');
            return null;
        }
        
        const data = await getComments(animeId);
        
        const comment = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
            user_id: userId,
            username: userData.username,
            avatar: userData.avatar || '',
            text: text.trim(),
            date: new Date().toISOString(),
            likes: 0,
            liked_by: [],
            replies: []
        };
        
        data.comments.push(comment);
        await saveGitHubData(`comments/${animeId}.json`, data, `Add comment for ${animeId}`);
        
        userData.comments_count = (userData.comments_count || 0) + 1;
        await saveGitHubData(`users/${userId}.json`, userData, `Update comments count for ${userId}`);
        
        showNotification('✅ Комментарий добавлен!');
        return comment;
    } catch (err) {
        showNotification('❌ Ошибка добавления комментария');
        return null;
    }
}

async function addReply(animeId, commentId, userId, text) {
    if (!text.trim()) {
        showNotification('❌ Введите текст ответа');
        return null;
    }
    
    try {
        const userData = await getGitHubData(`users/${userId}.json`);
        if (!userData) {
            showNotification('❌ Пользователь не найден');
            return null;
        }
        
        const data = await getComments(animeId);
        const comment = data.comments.find(c => c.id === commentId);
        
        if (!comment) {
            showNotification('❌ Комментарий не найден');
            return null;
        }
        
        const reply = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
            user_id: userId,
            username: userData.username,
            avatar: userData.avatar || '',
            text: text.trim(),
            date: new Date().toISOString(),
            likes: 0,
            liked_by: []
        };
        
        comment.replies.push(reply);
        await saveGitHubData(`comments/${animeId}.json`, data, `Add reply for ${animeId}`);
        
        showNotification('✅ Ответ добавлен!');
        return reply;
    } catch (err) {
        showNotification('❌ Ошибка добавления ответа');
        return null;
    }
}

async function toggleLike(animeId, commentId, userId, isReply = false, replyId = null) {
    try {
        const data = await getComments(animeId);
        let target = null;
        
        if (isReply && replyId) {
            const parent = data.comments.find(c => c.id === commentId);
            if (parent) {
                target = parent.replies.find(r => r.id === replyId);
            }
        } else {
            target = data.comments.find(c => c.id === commentId);
        }
        
        if (!target) {
            showNotification('❌ Элемент не найден');
            return null;
        }
        
        const index = target.liked_by.indexOf(userId);
        let action = 'liked';
        
        if (index >= 0) {
            target.liked_by.splice(index, 1);
            target.likes--;
            action = 'unliked';
        } else {
            target.liked_by.push(userId);
            target.likes++;
            action = 'liked';
        }
        
        await saveGitHubData(`comments/${animeId}.json`, data, `Update likes for ${animeId}`);
        
        return { likes: target.likes, action };
    } catch (err) {
        showNotification('❌ Ошибка обновления лайка');
        return null;
    }
}

async function deleteComment(animeId, commentId, userId) {
    try {
        const data = await getComments(animeId);
        const index = data.comments.findIndex(c => c.id === commentId);
        
        if (index === -1) {
            showNotification('❌ Комментарий не найден');
            return false;
        }
        
        if (data.comments[index].user_id !== userId) {
            showNotification('❌ Вы не можете удалить чужой комментарий');
            return false;
        }
        
        data.comments.splice(index, 1);
        await saveGitHubData(`comments/${animeId}.json`, data, `Delete comment for ${animeId}`);
        
        showNotification('🗑️ Комментарий удалён');
        return true;
    } catch (err) {
        showNotification('❌ Ошибка удаления');
        return false;
    }
}

async function deleteReply(animeId, commentId, replyId, userId) {
    try {
        const data = await getComments(animeId);
        const comment = data.comments.find(c => c.id === commentId);
        
        if (!comment) {
            showNotification('❌ Комментарий не найден');
            return false;
        }
        
        const replyIndex = comment.replies.findIndex(r => r.id === replyId);
        if (replyIndex === -1) {
            showNotification('❌ Ответ не найден');
            return false;
        }
        
        if (comment.replies[replyIndex].user_id !== userId) {
            showNotification('❌ Вы не можете удалить чужой ответ');
            return false;
        }
        
        comment.replies.splice(replyIndex, 1);
        await saveGitHubData(`comments/${animeId}.json`, data, `Delete reply for ${animeId}`);
        
        showNotification('🗑️ Ответ удалён');
        return true;
    } catch (err) {
        showNotification('❌ Ошибка удаления');
        return false;
    }
}

// =========================================
// 🎨 ОТРИСОВКА КОММЕНТАРИЕВ
// =========================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function renderComments(animeId, container) {
    const data = await getComments(animeId);
    const comments = data.comments || [];
    const user = isUserLoggedIn();
    
    if (comments.length === 0) {
        container.innerHTML = `
            <div class="no-comments">
                <p style="color:#666; text-align:center; padding:20px;">
                    💬 Пока нет комментариев. Будьте первым!
                </p>
            </div>
        `;
        return;
    }
    
    comments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let html = `<div class="comments-header">💬 Комментарии (${comments.length})</div>`;
    
    comments.forEach(comment => {
        const date = new Date(comment.date).toLocaleString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const canDelete = user && user.id === comment.user_id;
        const isLiked = user && comment.liked_by && comment.liked_by.includes(user.id);
        
        html += `
            <div class="comment-item" data-comment="${comment.id}">
                <div class="comment-avatar">
                    <img src="${comment.avatar || 'https://via.placeholder.com/40x40?text=👤'}" alt="${comment.username}">
                </div>
                <div class="comment-body">
                    <div class="comment-header">
                        <span class="comment-username">${escapeHtml(comment.username)}</span>
                        <span class="comment-date">${date}</span>
                        ${canDelete ? `<button class="comment-delete-btn" data-comment="${comment.id}">✕</button>` : ''}
                    </div>
                    <div class="comment-text">${escapeHtml(comment.text)}</div>
                    <div class="comment-actions">
                        <button class="comment-like-btn ${isLiked ? 'liked' : ''}" data-comment="${comment.id}">
                            ${isLiked ? '❤️' : '🤍'} ${comment.likes || 0}
                        </button>
                        <button class="comment-reply-btn" data-comment="${comment.id}">💬 Ответить</button>
                    </div>
                    
                    <div class="reply-form" id="reply-form-${comment.id}" style="display:none; margin-top:10px;">
                        <textarea class="reply-input form-input" rows="2" placeholder="Напишите ответ..." style="resize:vertical; min-height:60px;"></textarea>
                        <div style="display:flex; gap:8px; margin-top:6px;">
                            <button class="reply-submit-btn" data-comment="${comment.id}">💬 Отправить</button>
                            <button class="reply-cancel-btn" data-comment="${comment.id}">Отмена</button>
                        </div>
                    </div>
                    
                    ${comment.replies && comment.replies.length > 0 ? `
                        <div class="replies-container">
                            ${comment.replies.map(reply => {
                                const replyDate = new Date(reply.date).toLocaleString('ru-RU', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                                const canDeleteReply = user && user.id === reply.user_id;
                                const isReplyLiked = user && reply.liked_by && reply.liked_by.includes(user.id);
                                
                                return `
                                    <div class="reply-item" data-reply="${reply.id}">
                                        <div class="reply-avatar">
                                            <img src="${reply.avatar || 'https://via.placeholder.com/32x32?text=👤'}" alt="${reply.username}">
                                        </div>
                                        <div class="reply-body">
                                            <div class="reply-header">
                                                <span class="reply-username">${escapeHtml(reply.username)}</span>
                                                <span class="reply-date">${replyDate}</span>
                                                ${canDeleteReply ? `<button class="reply-delete-btn" data-comment="${comment.id}" data-reply="${reply.id}">✕</button>` : ''}
                                            </div>
                                            <div class="reply-text">${escapeHtml(reply.text)}</div>
                                            <div class="reply-actions">
                                                <button class="reply-like-btn ${isReplyLiked ? 'liked' : ''}" data-comment="${comment.id}" data-reply="${reply.id}">
                                                    ${isReplyLiked ? '❤️' : '🤍'} ${reply.likes || 0}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    setupCommentHandlers(animeId, container);
}

function setupCommentHandlers(animeId, container) {
    // Лайк комментария
    container.querySelectorAll('.comment-like-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const user = isUserLoggedIn();
            if (!user) {
                showNotification('❌ Войдите, чтобы ставить лайки');
                openModalLogin();
                return;
            }
            const commentId = btn.dataset.comment;
            await toggleLike(animeId, commentId, user.id);
            await renderComments(animeId, container);
        });
    });
    
    // Лайк ответа
    container.querySelectorAll('.reply-like-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const user = isUserLoggedIn();
            if (!user) {
                showNotification('❌ Войдите, чтобы ставить лайки');
                openModalLogin();
                return;
            }
            const commentId = btn.dataset.comment;
            const replyId = btn.dataset.reply;
            await toggleLike(animeId, commentId, user.id, true, replyId);
            await renderComments(animeId, container);
        });
    });
    
    // Показать/скрыть форму ответа
    container.querySelectorAll('.comment-reply-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const commentId = btn.dataset.comment;
            const form = document.getElementById(`reply-form-${commentId}`);
            if (form) {
                form.style.display = form.style.display === 'none' ? 'block' : 'none';
                const input = form.querySelector('.reply-input');
                if (input) input.focus();
            }
        });
    });
    
    // Отправить ответ
    container.querySelectorAll('.reply-submit-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const user = isUserLoggedIn();
            if (!user) {
                showNotification('❌ Войдите, чтобы отвечать');
                openModalLogin();
                return;
            }
            const commentId = btn.dataset.comment;
            const form = document.getElementById(`reply-form-${commentId}`);
            const input = form.querySelector('.reply-input');
            const text = input.value.trim();
            if (!text) {
                showNotification('❌ Введите текст ответа');
                return;
            }
            await addReply(animeId, commentId, user.id, text);
            input.value = '';
            form.style.display = 'none';
            await renderComments(animeId, container);
        });
    });
    
    // Отмена ответа
    container.querySelectorAll('.reply-cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const commentId = btn.dataset.comment;
            const form = document.getElementById(`reply-form-${commentId}`);
            if (form) {
                form.style.display = 'none';
                const input = form.querySelector('.reply-input');
                if (input) input.value = '';
            }
        });
    });
    
    // Удаление комментария
    container.querySelectorAll('.comment-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const user = isUserLoggedIn();
            if (!user) return;
            const commentId = btn.dataset.comment;
            if (confirm('Удалить комментарий и все ответы?')) {
                await deleteComment(animeId, commentId, user.id);
                await renderComments(animeId, container);
            }
        });
    });
    
    // Удаление ответа
    container.querySelectorAll('.reply-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const user = isUserLoggedIn();
            if (!user) return;
            const commentId = btn.dataset.comment;
            const replyId = btn.dataset.reply;
            if (confirm('Удалить ответ?')) {
                await deleteReply(animeId, commentId, replyId, user.id);
                await renderComments(animeId, container);
            }
        });
    });
}

// =========================================
// ➕ ДОБАВЛЕНИЕ БЛОКА КОММЕНТАРИЕВ
// =========================================

function addCommentsSection(animeId) {
    const playerContainer = document.getElementById('player-container');
    if (!playerContainer) return;
    
    if (document.getElementById(`comments-section-${animeId}`)) return;
    
    const commentsSection = document.createElement('div');
    commentsSection.id = `comments-section-${animeId}`;
    commentsSection.style.cssText = `
        margin-top: 30px;
        padding: 20px;
        background: rgba(255,255,255,0.02);
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.04);
    `;
    
    commentsSection.innerHTML = `
        <div id="comments-container-${animeId}">
            <div class="loader">Загрузка комментариев...</div>
        </div>
        
        <div class="comment-form" style="margin-top:20px;">
            <textarea id="comment-input-${animeId}" class="form-input" rows="3" placeholder="Напишите комментарий..." style="resize:vertical; min-height:80px;"></textarea>
            <button id="comment-submit-${animeId}" class="save-profile-btn" style="width:auto; padding:10px 30px; margin-top:10px;">💬 Отправить</button>
        </div>
    `;
    
    playerContainer.after(commentsSection);
    
    const container = document.getElementById(`comments-container-${animeId}`);
    renderComments(animeId, container);
    
    const submitBtn = document.getElementById(`comment-submit-${animeId}`);
    const input = document.getElementById(`comment-input-${animeId}`);
    
    submitBtn?.addEventListener('click', async () => {
        const user = isUserLoggedIn();
        if (!user) {
            showNotification('❌ Войдите, чтобы комментировать');
            openModalLogin();
            return;
        }
        
        const text = input.value.trim();
        if (!text) {
            showNotification('❌ Введите текст комментария');
            return;
        }
        
        await addComment(animeId, user.id, text);
        input.value = '';
        await renderComments(animeId, container);
    });
    
    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            submitBtn?.click();
        }
    });
}

// =========================================
// 👤 ПРОФИЛЬ
// =========================================

async function showProfile() {
    const user = isUserLoggedIn();
    if (!user) {
        showNotification('❌ Войдите, чтобы открыть профиль');
        return;
    }
    
    const userData = await getGitHubData(`users/${user.id}.json`) || user;
    
    const modalContent = `
        <div class="profile-container">
            <div class="profile-header">
                <div class="profile-avatar">
                    <img src="${userData.avatar || 'https://via.placeholder.com/120x120?text=👤'}" alt="Avatar" id="profile-avatar-img">
                    <button class="avatar-upload-btn" id="avatar-upload-btn">📷</button>
                    <input type="file" id="avatar-input" accept="image/*" style="display:none;">
                </div>
                <div class="profile-info">
                    <h2>${escapeHtml(userData.username)}</h2>
                    <p class="profile-bio">${escapeHtml(userData.bio || 'Любитель аниме 🎌')}</p>
                    <div class="profile-stats">
                        <span>📝 ${userData.comments_count || 0} комментариев</span>
                        <span>📅 ${new Date(userData.joined_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                </div>
            </div>
            
            <div class="profile-actions">
                <button class="profile-btn" id="profile-edit-btn">✏️ Редактировать</button>
            </div>
            
            <div id="profile-content" style="margin-top:20px;">
                <div class="edit-profile">
                    <div class="form-group">
                        <label>Никнейм</label>
                        <input type="text" id="edit-username" value="${escapeHtml(userData.username)}" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>О себе</label>
                        <textarea id="edit-bio" class="form-input" rows="3">${escapeHtml(userData.bio || '')}</textarea>
                    </div>
                    <button class="save-profile-btn" id="save-profile-btn">💾 Сохранить</button>
                </div>
            </div>
        </div>
    `;

    const profileModal = document.createElement('div');
    profileModal.className = 'modal-overlay open';
    profileModal.id = 'profile-modal-temp';
    profileModal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; max-height: 90vh; overflow-y: auto;">
            <button class="modal-close" id="profile-modal-close-temp">✕</button>
            ${modalContent}
        </div>
    `;
    
    document.body.appendChild(profileModal);
    document.body.style.overflow = 'hidden';
    
    document.getElementById('profile-modal-close-temp')?.addEventListener('click', () => {
        profileModal.remove();
        document.body.style.overflow = '';
    });
    
    profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) {
            profileModal.remove();
            document.body.style.overflow = '';
        }
    });
    
    // Загрузка аватарки
    const uploadBtn = document.getElementById('avatar-upload-btn');
    const fileInput = document.getElementById('avatar-input');
    const avatarImg = document.getElementById('profile-avatar-img');
    
    uploadBtn?.addEventListener('click', () => fileInput?.click());
    
    fileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        showNotification('⏳ Загрузка аватарки...');
        try {
            const url = await uploadAvatar(user.id, file);
            if (avatarImg) avatarImg.src = url;
            showNotification('✅ Аватарка обновлена!');
        } catch (err) {
            showNotification('❌ Ошибка загрузки аватарки');
        }
    });
    
    // Сохранение профиля
    document.getElementById('save-profile-btn')?.addEventListener('click', async () => {
        const updates = {
            username: document.getElementById('edit-username').value.trim(),
            bio: document.getElementById('edit-bio').value.trim()
        };
        
        if (!updates.username || updates.username.length < 3) {
            showNotification('❌ Никнейм должен быть минимум 3 символа');
            return;
        }
        
        await updateUserProfile(user.id, updates);
        profileModal.remove();
        document.body.style.overflow = '';
    });
}

// =========================================
// 📱 МЕНЮ ПОЛЬЗОВАТЕЛЯ
// =========================================

function showUserMenu(user) {
    document.querySelector('.user-menu')?.remove();
    
    const menu = document.createElement('div');
    menu.className = 'user-menu';
    menu.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        background: #14161a;
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 12px;
        padding: 12px 0;
        min-width: 220px;
        z-index: 9999;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        animation: slideDown 0.2s ease;
    `;

    menu.innerHTML = `
        <div style="padding: 8px 20px; border-bottom: 1px solid rgba(255,255,255,0.04); display:flex; align-items:center; gap:12px;">
            <img src="${user.avatar || 'https://via.placeholder.com/40x40?text=👤'}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
            <div>
                <div style="font-weight:600; color:#e0e0e0;">${escapeHtml(user.username)}</div>
                <div style="font-size:0.75rem; color:#666;">${escapeHtml(user.bio || 'Любитель аниме 🎌')}</div>
            </div>
        </div>
        <div style="padding: 6px 0;">
            <div class="menu-item" data-action="profile">👤 Профиль</div>
            <div class="menu-item" data-action="logout" style="color:#ff6b6b;">🚪 Выйти</div>
        </div>
    `;

    document.body.appendChild(menu);

    menu.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            menu.remove();
            if (action === 'logout') {
                logoutUser();
            } else if (action === 'profile') {
                showProfile();
            }
        });
    });

    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            const authBtn = document.getElementById('auth-btn');
            if (!menu.contains(e.target) && e.target !== authBtn) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 10);
}

// =========================================
// 🎯 ОБРАБОТЧИКИ СОБЫТИЙ
// =========================================

function openModalLogin() {
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
        loginModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeModalLogin() {
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
        loginModal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

function openModalRegister() {
    const registerModal = document.getElementById('register-modal');
    if (registerModal) {
        registerModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeModalRegister() {
    const registerModal = document.getElementById('register-modal');
    if (registerModal) {
        registerModal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

// Переопределяем showNotification для совместимости
const originalShowNotification = showNotification;
function showNotification(message) {
    if (typeof originalShowNotification === 'function') {
        originalShowNotification(message);
    } else {
        // Создаём уведомление если функция не определена
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(20, 26, 50, 0.95);
            color: #e0e5ff;
            padding: 12px 28px;
            border-radius: 30px;
            border: 1px solid rgba(108,92,231,0.2);
            backdrop-filter: blur(10px);
            font-size: 0.95rem;
            z-index: 99999;
            animation: slideUp 0.3s ease-out;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            max-width: 90%;
            text-align: center;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// ===== КНОПКА ВХОДА =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Инициализация обработчиков...');
    
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
        authBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('👆 Клик по кнопке Войти');
            const user = isUserLoggedIn();
            if (user) {
                showUserMenu(user);
            } else {
                openModalLogin();
            }
        });
        console.log('✅ Кнопка "Войти" привязана');
    }

    // Переключение на регистрацию
    document.getElementById('switch-to-register')?.addEventListener('click', function(e) {
        e.preventDefault();
        closeModalLogin();
        openModalRegister();
    });

    // Переключение на вход
    document.getElementById('switch-to-login')?.addEventListener('click', function(e) {
        e.preventDefault();
        closeModalRegister();
        openModalLogin();
    });

    // Закрытие модалок
    document.getElementById('register-modal-close')?.addEventListener('click', closeModalRegister);
    document.getElementById('login-modal-close')?.addEventListener('click', closeModalLogin);

    // Закрытие по клику на overlay
    document.getElementById('register-modal')?.addEventListener('click', function(e) {
        if (e.target === this) closeModalRegister();
    });
    document.getElementById('login-modal')?.addEventListener('click', function(e) {
        if (e.target === this) closeModalLogin();
    });

    // Регистрация
    document.getElementById('register-btn')?.addEventListener('click', async function() {
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value;
        await registerUser(username, password);
    });

    // Вход
    document.getElementById('login-btn')?.addEventListener('click', async function() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        await loginUserByCredentials(username, password);
    });

    // Enter в полях
    document.getElementById('reg-username')?.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') document.getElementById('reg-password').focus();
    });
    document.getElementById('reg-password')?.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') document.getElementById('register-btn').click();
    });
    document.getElementById('login-username')?.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') document.getElementById('login-password').focus();
    });
    document.getElementById('login-password')?.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') document.getElementById('login-btn').click();
    });

    // Проверка авторизации
    const user = isUserLoggedIn();
    if (user) {
        updateAuthUI(user);
        console.log('👤 Пользователь авторизован:', user.username);
    }

    console.log('✅ Все обработчики привязаны!');
});

// =========================================
// 🔧 МОДИФИКАЦИЯ loadAnimeById ДЛЯ КОММЕНТАРИЕВ
// =========================================

// Сохраняем оригинальную функцию
const originalLoadAnime = loadAnimeById;

// Переопределяем
loadAnimeById = async function(animeId) {
    await originalLoadAnime(animeId);
    
    // Добавляем комментарии после загрузки
    setTimeout(() => {
        addCommentsSection(animeId);
    }, 800);
};

console.log('🔐 Система авторизации и комментариев загружена!');
