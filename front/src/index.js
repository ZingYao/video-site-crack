window.onload = async () => {
    /**
     * 常量和配置
     */
    const STORAGE_KEYS = {
        SITE: 'site',
        TITLE: 'title',
        TITLE2: 'title2',
        PAGE_URL: 'page_url',
        HISTORY: 'history'
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

    /**
     * 搜索结果管理
     */
    class SearchManager {
        constructor() {
            this.searchResult = document.getElementById('searchResult');
            this.searchForm = document.getElementById('searchForm');
            this.siteSelect = document.getElementById('site');
            this.searchInput = document.getElementById('search');
            
            this.initEventListeners();
        }

        // 初始化事件监听
        initEventListeners() {
            // 注册搜索表单提交事件
            this.searchForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.performSearch();
            });
            
            // 注册站点选择事件
            this.siteSelect.addEventListener('change', (event) => {
                storage.set(STORAGE_KEYS.SITE, event.target.value);
            });
        }

        // 执行搜索
        async performSearch() {
            const site = this.siteSelect.value;
            const searchTerm = this.searchInput.value;
            
            // 验证输入
            if (!site) {
                alert('请选择站点');
                return;
            }
            
            if (!searchTerm) {
                alert('请输入搜索内容');
                return;
            }
            
            try {
                showLoading();
                const results = await searchVideo(site, searchTerm);
                this.renderSearchResults(results);
            } catch (error) {
                console.error('搜索失败:', error);
                alert('搜索失败，请稍后重试');
            } finally {
                hideLoading();
            }
        }

        // 渲染搜索结果
        renderSearchResults(results) {
            // 清空搜索结果和历史记录
            this.searchResult.innerHTML = '';
            storage.remove(STORAGE_KEYS.TITLE);
            storage.remove(STORAGE_KEYS.TITLE2);
            storage.remove(STORAGE_KEYS.PAGE_URL);

            // 创建搜索结果网格容器
            const gridContainer = document.createElement('div');
            gridContainer.className = 'video-grid';

            // 添加视频卡片
            results.forEach(item => {
                item.site = storage.get(STORAGE_KEYS.SITE);
                const card = createVideoCard(item);
                gridContainer.appendChild(card);
            });

            this.searchResult.appendChild(gridContainer);
            this.searchResult.className = 'search-results-container';
        }

        // 添加元数据信息
        addMetaInfo(container, label, content, className = '') {
            const element = document.createElement('p');
            element.className = `video-meta ${className}`;
            element.innerHTML = `<span class="meta-label">${label}：</span>${content}`;
            container.appendChild(element);
        }

        // 处理视频卡片点击
        async handleVideoCardClick(videoInfo) {
            try {
                // 保存视频信息
                storage.set(STORAGE_KEYS.TITLE, videoInfo.title);
                storage.set(STORAGE_KEYS.PAGE_URL, videoInfo.page_url);
                
                // 添加到历史记录
                this.addToHistory(videoInfo);
                
                // 跳转到播放页面
                window.location.href = 'play.html';
            } catch (error) {
                console.error('处理视频点击失败:', error);
                alert('加载视频信息失败，请稍后重试');
            }
        }

        // 添加到历史记录
        addToHistory(videoInfo) {
            const history = storage.get(STORAGE_KEYS.HISTORY) || [];
            
            // 检查是否已存在相同URL的记录
            const existingIndex = history.findIndex(item => item.url === videoInfo.page_url);
            
            // 如果存在，先移除旧记录
            if (existingIndex !== -1) {
                history.splice(existingIndex, 1);
            }
            
            // 添加新记录
            history.push({
                title: videoInfo.title,
                url: videoInfo.page_url,
                cover: videoInfo.cover,
                site: storage.get(STORAGE_KEYS.SITE),
                timestamp: Date.now()
            });
            
            // 限制历史记录数量
            if (history.length > 50) {
                history.shift();
            }
            
            storage.set(STORAGE_KEYS.HISTORY, history);
        }
    }

    /**
     * 应用初始化
     */
    const init = () => {
        // 初始化站点列表
        initSiteList();
        
        // 初始化搜索管理器
        const searchManager = new SearchManager();
        
        // 恢复上次搜索内容
        const lastSearch = storage.get(STORAGE_KEYS.TITLE);
        if (lastSearch) {
            document.getElementById('search').value = lastSearch;
        }
    };

    // 启动应用
    init();
};