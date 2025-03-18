
/**
 * 视频站点通用工具库
 * 提供API请求、认证、UI组件等通用功能
 */
/**
 * 常量和配置
 */
// API域名配置
const DOMAIN = (() => {
    // 本地开发环境使用完整域名，生产环境使用相对路径
    if (window.location.href.indexOf("localhost") === -1 && window.location.href.indexOf("127.0.0.1") === -1) {
        return "";
    }
    return "http://localhost:8085";
})();

// 存储键名常量
const STORAGE_KEYS = {
    TOKEN: 'login_token',
    USERNAME: 'username',
    SITE: 'site',
    HISTORY: 'history',
    TITLE: 'title',
    PAGE_URL: 'page_url'
};

// 页面路径常量
const ROUTES = {
    LOGIN: '/login.html',
    PLAY: '/play.html'
};

/**
 * 工具函数
 */
// 本地存储操作封装
const storage = {
    get: (key) => {
        const value = localStorage.getItem(key);
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    },
    set: (key, value) => {
        if (typeof value === 'object') {
            localStorage.setItem(key, JSON.stringify(value));
        } else {
            localStorage.setItem(key, value);
        }
    },
    remove: (key) => {
        localStorage.removeItem(key);
    }
};

// API请求封装
const api = {
    /**
     * 发送GET请求
     * @param {string} endpoint - API端点
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>} 响应数据
     */
    get: async (endpoint, params = {}) => {
        const queryString = Object.entries(params)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
        
        const url = `${DOMAIN}${endpoint}${queryString ? '?' + queryString : ''}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': storage.get(STORAGE_KEYS.TOKEN) || ''
            }
        });
        
        const data = await response.json();
        
        // 检查登录状态
        if (data.code === 2) {
            redirectToLogin();
            return null;
        }
        
        return data;
    },
    
    /**
     * 发送POST请求
     * @param {string} endpoint - API端点
     * @param {Object|FormData} body - 请求体
     * @param {boolean} useAuth - 是否使用认证头
     * @returns {Promise<Object>} 响应数据
     */
    post: async (endpoint, body, useAuth = true) => {
        const headers = {};
        let processedBody = body;
        
        if (useAuth) {
            headers['Authorization'] = storage.get(STORAGE_KEYS.TOKEN) || '';
        }
        
        if (!(body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            processedBody = JSON.stringify(body);
        }
        
        const response = await fetch(`${DOMAIN}${endpoint}`, {
            method: 'POST',
            headers,
            body: processedBody
        });
        
        return await response.json();
    }
};

/**
 * 认证相关函数
 */
// 检查登录状态
const checkAuth = () => {
    // 登录页面不需要检查
    if (window.location.pathname.includes(ROUTES.LOGIN)) {
        return;
    }
    
    // 检查登录令牌
    const token = storage.get(STORAGE_KEYS.TOKEN);
    if (!token) {
        redirectToLogin();
    }
};

// 重定向到登录页
const redirectToLogin = () => {
    window.location.pathname = ROUTES.LOGIN;
};

/**
 * 用户认证函数
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise<Object>} 登录响应
 */
const login = async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    return await api.post('/api/login', formData, false);
};

/**
 * 用户登出函数
 */
const logout = async () => {
    await api.post('/api/logout', {});
    storage.remove(STORAGE_KEYS.TOKEN);
    storage.remove(STORAGE_KEYS.USERNAME);
    redirectToLogin();
};

/**
 * UI组件和DOM操作
 */
// 获取站点选择下拉框
let siteSelectionDom = null;
const getSiteSelectionDom = () => {
    if (!siteSelectionDom) {
        siteSelectionDom = document.getElementById("site");
    }
    return siteSelectionDom;
};

/**
 * 初始化站点列表
 * 从API获取可用站点并填充下拉框
 */
const initSiteList = async () => {
    try {
        const response = await api.get('/api/site/list');
        if (!response) return;
        
        const siteSelection = getSiteSelectionDom();
        if (!siteSelection) return;
        
        // 清空并添加默认选项
        siteSelection.innerHTML = "";
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.innerHTML = "选择站点";
        siteSelection.appendChild(defaultOption);
        
        // 添加站点选项
        response.data.forEach(site => {
            const option = document.createElement("option");
            option.value = site;
            option.innerHTML = site;
            siteSelection.appendChild(option);
        });
        
        // 恢复上次选择
        const lastSite = storage.get(STORAGE_KEYS.SITE);
        if (lastSite && response.data.includes(lastSite)) {
            siteSelection.value = lastSite;
        }
    } catch (error) {
        console.error('加载站点列表失败:', error);
    }
};

/**
 * 搜索视频
 * @param {string} site - 站点名称
 * @param {string} query - 搜索关键词
 * @returns {Promise<Array>} 搜索结果
 */
const searchVideo = async (site, query) => {
    const response = await api.get('/api/site/search', { site_name: site, query });
    return response ? response.data : [];
};

/**
 * 获取视频详情
 * @param {string} site - 站点名称
 * @param {string} url - 视频页面URL
 * @returns {Promise<Object>} 视频详情
 */
const getVideoDetail = async (site, url) => {
    const response = await api.get('/api/site/detail', { site_name: site, page_url: url });
    return response ? response.data : null;
};

/**
 * 处理视频卡片点击
 * @param {Object} videoInfo - 视频信息对象
 * @param {Array} detail - 可选的视频详情
 */
const clickVideoCard = async (element) => {
    // 保存基本信息
    storage.set(STORAGE_KEYS.TITLE, element.title);
    storage.set(STORAGE_KEYS.PAGE_URL, element.page_url);
    
    // 处理详情并跳转
    const dump2Play = (detailRes) => {
        // 更新历史记录
        let history = storage.get(STORAGE_KEYS.HISTORY) || [];
        
        // 检查是否已存在
        const index = history.findIndex((item) => item.page_url === element.page_url);
        if (index > -1) {
            // 更新并移至末尾
            const [removed] = history.splice(index, 1);
            removed.detail = detailRes;
            history.push(removed);
        } else {
            element.detail = detailRes
            // 添加新记录
            history.push(element);
        }
        
        storage.set(STORAGE_KEYS.HISTORY, history);
        
        // 跳转到播放页
        window.location.href = ROUTES.PLAY;
    };
    
    // 如果已有详情，直接处理
    if (element.detail) {
        dump2Play(element.detail);
        return;
    }
    
    // 否则获取详情
    try {
        showLoading();
        let chooseSite = getSiteSelectionDom()?.value ?? element.site;
        const detailData = await getVideoDetail(chooseSite, element.page_url);
        dump2Play(detailData);
    } catch (error) {
        console.error('获取视频详情失败:', error);
        alert('获取视频详情失败，请稍后重试');
    } finally {
        hideLoading();
    }
};

/**
 * 创建视频卡片
 * @param {Object} element - 视频信息
 * @returns {HTMLElement} 视频卡片DOM元素
 */
const createVideoCard = (element) => {
    // 创建卡片容器
    const card = document.createElement('div');
    card.className = 'video-card';
    card.onclick = () => clickVideoCard(element);

    // 创建封面容器
    const coverContainer = document.createElement('div');
    coverContainer.className = 'video-cover';
    
    // 创建封面图片
    const img = document.createElement('img');
    img.src = element.cover;
    img.alt = element.title;
    img.onclick = (e) => {
        e.stopPropagation();
        showImagePreview(element.cover, element.title);
    };
    coverContainer.appendChild(img);

    // 创建信息容器
    const infoContainer = document.createElement('div');
    infoContainer.className = 'video-info';

    // 添加标题
    const title = document.createElement('h3');
    title.className = 'video-title';
    title.textContent = element.title;
    infoContainer.appendChild(title);

    // 添加详情列表
    const details = document.createElement('div');
    details.className = 'video-details';
    
    // 添加各项详情
    addDetailItem(details, '主演', element.actor);
    addDetailItem(details, '类型', element.type);
    addDetailItem(details, '导演', element.director);
    infoContainer.appendChild(details);

    // 添加简介
    if (element.desc) {
        const description = createDescriptionSection(element.desc);
        infoContainer.appendChild(description);
    }

    // 组装卡片
    card.appendChild(coverContainer);
    card.appendChild(infoContainer);

    return card;
};

/**
 * 创建详情项
 * @param {HTMLElement} container - 父容器
 * @param {string} label - 标签
 * @param {string} value - 值
 */
const addDetailItem = (container, label, value) => {
    if (!value) return;
    
    const detail = document.createElement('div');
    detail.className = 'detail-item';
    detail.innerHTML = `<span class="label">${label}:</span> ${value}`;
    container.appendChild(detail);
};

/**
 * 创建可展开的描述部分
 * @param {string} desc - 描述文本
 * @returns {HTMLElement} 描述部分DOM元素
 */
const createDescriptionSection = (desc) => {
    const description = document.createElement('div');
    description.className = 'video-description';
    
    // 描述内容
    const descContent = document.createElement('div');
    descContent.className = 'desc-content';
    descContent.innerHTML = `<span class="label">简介:</span> ${desc}`;
    
    // 展开/收起按钮
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-desc';
    toggleBtn.textContent = '展开';
    toggleBtn.onclick = (e) => {
        e.stopPropagation();
        descContent.classList.toggle('expanded');
        toggleBtn.textContent = descContent.classList.contains('expanded') ? '收起' : '展开';
    };
    
    description.appendChild(descContent);
    description.appendChild(toggleBtn);
    
    return description;
};

/**
 * 显示图片预览
 * @param {string} src - 图片URL
 * @param {string} alt - 图片描述
 */
const showImagePreview = (src, alt) => {
    const previewContainer = document.querySelector('.image-preview-container');
    if (previewContainer) {
        previewContainer.innerHTML = `<img src="${src}" alt="${alt || ''}">`;
        previewContainer.classList.add('active');
    }
};

/**
 * 显示加载遮罩
 */
const showLoading = () => {
    document.getElementById('loadingOverlay')?.classList.add('active');
};

/**
 * 隐藏加载遮罩
 */
const hideLoading = () => {
    document.getElementById('loadingOverlay')?.classList.remove('active');
};

/**
 * 页面初始化
 */
window.addEventListener('load', () => {
    
    // 检查登录状态
    checkAuth();
    
    // 显示用户名
    const usernameElement = document.getElementById('username');
    if (usernameElement && usernameElement.tagName === 'SPAN') {
        usernameElement.innerHTML = storage.get(STORAGE_KEYS.USERNAME) || '';
    }
    
    // 绑定登出按钮
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (!confirm("确定要退出登录吗？")) {
                return;
            }
            logout();
        });
    }
    
    // 初始化图片预览容器
    if (!document.querySelector('.image-preview-container')) {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image-preview-container';
        previewContainer.onclick = () => previewContainer.classList.remove('active');
        document.body.appendChild(previewContainer);
    }
});

// 添加以下代码到 common.js 文件中

// 重写 XMLHttpRequest 以便触发自定义事件
(function() {
    const originalXHR = window.XMLHttpRequest;
    
    function newXHR() {
        const xhr = new originalXHR();
        
        xhr.addEventListener('loadstart', function() {
            document.dispatchEvent(new Event('ajaxStart'));
        });
        
        xhr.addEventListener('loadend', function() {
            document.dispatchEvent(new Event('ajaxEnd'));
        });
        
        return xhr;
    }
    
    window.XMLHttpRequest = newXHR;
})();

// 添加页面加载完成后的处理
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否存在加载遮罩
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        // 如果页面内容已经缓存，立即隐藏加载遮罩
        if (document.readyState === 'complete') {
            loadingOverlay.classList.remove('active');
        }
    }
});