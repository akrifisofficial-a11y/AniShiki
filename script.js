// ===== КОНФИГУРАЦИЯ =====
const KODIK_API_KEY = 'd99ff2ab48b0d9c42ace4901bee833ff';
const KODIK_API_URL = 'https://kodik-api.com';

// ===== ТОЛЬКО ЭТИ ТИПЫ РАЗРЕШЕНЫ =====
const ALLOWED_TYPES = ['anime-serial', 'anime'];

function isAnime(item) {
    if (!item) return false;
    return ALLOWED_TYPES.includes(item.type);
}

function filterAnimeOnly(results) {
    if (!results || !Array.isArray(results)) return [];
    return results.filter(item => isAnime(item));
}

// ===== ОСНОВНАЯ ФУНКЦИЯ УДАЛЕНИЯ ДУБЛИКАТОВ =====
function removeDuplicates(animes) {
    const seen = new Map();
    
    animes.forEach(anime => {
        const key = anime.title.toLowerCase().trim();
        
        if (!seen.has(key)) {
            seen.set(key, anime);
        } else {
            const existing = seen.get(key);
            if (anime.year && !existing.year) {
                seen.set(key, anime);
            } else if (anime.quality && existing.quality) {
                const qualityOrder = ['720p', '1080p', 'BDRip', 'WEB-DL'];
                const newQualityIndex = qualityOrder.findIndex(q => anime.quality.includes(q));
                const oldQualityIndex = qualityOrder.findIndex(q => existing.quality.includes(q));
                if (newQualityIndex > oldQualityIndex) {
                    seen.set(key, anime);
                }
            }
        }
    });
    
    return Array.from(seen.values());
}

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

let currentAnimeId = null;
let currentSeason = 1;
let currentEpisode = 1;
let currentCategory = 'series';
let nextPageUrl = null;
let isLoading = false;
let currentQuery = '';

// =========================================
// КАТЕГОРИИ
// =========================================
function setCategory(type) {
    currentCategory = type;
    nextPageUrl = null;
    currentQuery = '';
    searchInput.value = '';

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
    btn.addEventListener('click', () => {
        setCategory(btn.dataset.type);
    });
});

// =========================================
// ЛОГОТИП → ГЛАВНАЯ
// =========================================
logoLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.location.hash) {
        window.location.hash = '';
    } else {
        fetchAnimeList();
    }
});

function showSection(section) {
    document.querySelectorAll('main section').forEach(s => s.classList.remove('active'));
    section.classList.add('active');
}

// ===== ЗАГРУЗКА КАТАЛОГА (С УДАЛЕНИЕМ ДУБЛИКАТОВ) =====
async function fetchAnimeList(query = '', loadMore = false) {
    if (isLoading) return;
    isLoading = true;

    if (!loadMore) {
        catalogEl.innerHTML = '';
        nextPageUrl = null;
        currentQuery = query;
    }

    loaderEl.style.display = 'block';

    try {
        let url;

        if (loadMore && nextPageUrl) {
            url = nextPageUrl;
        } else {
            let endpoint = '/list';
            let params = {
                token: KODIK_API_KEY,
                limit: 50,
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
            }

            url = `${KODIK_API_URL}${endpoint}?${new URLSearchParams(params)}`;
        }

        console.log('📡 Запрос каталога:', url);

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        // 1. Фильтруем только аниме
        let filteredResults = filterAnimeOnly(data.results);
        
        // 2. Удаляем дубликаты по названию (для всех категорий!)
        const uniqueResults = removeDuplicates(filteredResults);
        
        nextPageUrl = (uniqueResults.length > 0) ? data.next_page || null : null;

        if (!uniqueResults || uniqueResults.length === 0) {
            if (!loadMore) {
                catalogEl.innerHTML = '<p style="text-align:center;color:#7a8aaa;">Аниме не найдено</p>';
            }
            loadMoreBtn.style.display = 'none';
            return;
        }

        renderAnimeList(uniqueResults, loadMore);

        if (nextPageUrl) {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    } catch (err) {
        console.error('❌ Ошибка загрузки каталога:', err);
        if (!loadMore) {
            catalogEl.innerHTML = `<p style="text-align:center;color:#ff7a7a;">Ошибка: ${err.message}</p>`;
        }
    } finally {
        loaderEl.style.display = 'none';
        isLoading = false;
    }
}

// ===== ОТРИСОВКА КАРТОЧЕК (дополнительная проверка) =====
function renderAnimeList(animes, append = false) {
    if (!append) {
        catalogEl.innerHTML = '';
    }

    const uniqueAnimes = [];
    const seenIds = new Set();
    const seenTitles = new Set();
    
    animes.forEach(anime => {
        const titleKey = anime.title.toLowerCase().trim();
        if (!seenIds.has(anime.id) && !seenTitles.has(titleKey)) {
            seenIds.add(anime.id);
            seenTitles.add(titleKey);
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
    animeInfoEl.innerHTML = '<div class="loader">Загрузка...</div>';
    playerIframe.src = '';

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
            playerIframe.src = 'about:blank';
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

        playerIframe.src = playerSrc || 'about:blank';

        currentSeason = anime.last_season || 1;
        currentEpisode = anime.last_episode || 1;

        const title = anime.title || 'Без названия';
        const poster = anime.material_data?.poster_url || anime.poster_url || 'https://via.placeholder.com/300x450?text=No+Image';
        const description = anime.description || anime.material_data?.description || 'Описание отсутствует.';
        const year = anime.year || anime.material_data?.year || '—';
        const rating = anime.rating?.imdb || anime.material_data?.rating || '—';
        const genres = anime.genres ? anime.genres.join(', ') : (anime.material_data?.genres?.join(', ') || '—');

        const episodeInfo = `
            <div style="margin-top: 12px; padding: 10px 16px; background: rgba(20, 26, 50, 0.5); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                <span style="color: #9aa3c0; font-size: 0.9rem;">
                    ▶ Сезон ${currentSeason}, серия ${currentEpisode}
                </span>
            </div>
        `;

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
                    ${episodeInfo}
                </div>
            </div>
        `;
        document.title = `${title} — Quarwatch`;
    } catch (err) {
        console.error('❌ Ошибка загрузки тайтла:', err);
        animeInfoEl.innerHTML = `<p style="color:#ff7a7a;">Ошибка: ${err.message}</p>`;
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
    playerIframe.src = '';
    currentAnimeId = null;
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
shareBtn.addEventListener('click', copyPageLink);

loadMoreBtn.addEventListener('click', () => {
    fetchAnimeList(currentQuery, true);
});

// ===== АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ ГОДА =====
(function updateFooterYear() {
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
})();

// ===== СТАРТ =====
if (window.location.hash) {
    handleHashChange();
} else {
    showSection(listSection);
    fetchAnimeList();
        }
