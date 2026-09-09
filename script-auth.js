// =========================================
// 🔐 SCRIPT-AUTH.JS — Регистрация, вход, комментарии
// =========================================

console.log('🔐 Quarwatch Auth загружен!');

// =========================================
// ⚙️ КОНФИГУРАЦИЯ GITHUB
// =========================================

const GITHUB_CONFIG = {
    token: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // 🔥 ВСТАВЬ СВОЙ ТОКЕН
    owner: 'YOUR_USERNAME',                            // 🔥 ТВОЙ НИК
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
    closeAllModals();
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
                            <button class="reply-submit-btn" data-comment="${comment.id}">💬 Ответить</button>
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
                openModal('login-modal');
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
                openModal('login-modal');
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
                openModal('login-modal');
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
    
    // Проверяем, есть ли уже блок комментариев
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
    
    // Загружаем комментарии
    const container = document.getElementById(`comments-container-${animeId}`);
    renderComments(animeId, container);
    
    // Обработчик отправки комментария
    const submitBtn = document.getElementById(`comment-submit-${animeId}`);
    const input = document.getElementById(`comment-input-${animeId}`);
    
    submitBtn?.addEventListener('click', async () => {
        const user = isUserLoggedIn();
        if (!user) {
            showNotification('❌ Войдите, чтобы комментировать');
            openModal('login-modal');
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

document.getElementById('auth-btn')?.addEventListener('click', () => {
    const user = isUserLoggedIn();
    if (user) {
        showUserMenu(user);
    } else {
        openModal('login-modal');
    }
});

document.getElementById('switch-to-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal('login-modal');
    openModal('register-modal');
});

document.getElementById('switch-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal('register-modal');
    openModal('login-modal');
});

document.getElementById('register-modal-close')?.addEventListener('click', () => {
    closeModal('register-modal');
});

document.getElementById('login-modal-close')?.addEventListener('click', () => {
    closeModal('login-modal');
});

// Регистрация
document.getElementById('register-btn')?.addEventListener('click', async () => {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    await registerUser(username, password);
});

document.getElementById('reg-username')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('reg-password').focus();
});

document.getElementById('reg-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('register-btn').click();
});

// Вход
document.getElementById('login-btn')?.addEventListener('click', async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    await loginUserByCredentials(username, password);
});

document.getElementById('login-username')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-password').focus();
});

document.getElementById('login-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
});

// =========================================
// 🚀 ИНИЦИАЛИЗАЦИЯ
// =========================================

// Проверяем авторизацию
const user = isUserLoggedIn();
if (user) {
    updateAuthUI(user);
}

// Экспортируем глобальные функции
window.registerUser = registerUser;
window.loginUserByCredentials = loginUserByCredentials;
window.logoutUser = logoutUser;
window.isUserLoggedIn = isUserLoggedIn;
window.updateAuthUI = updateAuthUI;
window.showProfile = showProfile;
window.showUserMenu = showUserMenu;
window.uploadAvatar = uploadAvatar;
window.updateUserProfile = updateUserProfile;
window.addCommentsSection = addCommentsSection;
window.renderComments = renderComments;
window.addComment = addComment;
window.addReply = addReply;
window.toggleLike = toggleLike;
window.deleteComment = deleteComment;
window.deleteReply = deleteReply;

console.log('🔐 Quarwatch Auth готов!');
