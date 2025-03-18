/**
 * 历史记录管理模块
 * 提供历史记录展示、删除等功能
 */
window.onload = () => {
    /**
     * 常量和配置
     */
    const STORAGE_KEYS = {
        HISTORY: 'history'
    };

    const CONTEXT_MENU_CONFIG = {
        LONG_PRESS_DELAY: 800, // 长按触发时间(毫秒)
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
        }
    };

    /**
     * 上下文菜单管理
     */
    class ContextMenuManager {
        constructor() {
            this.menu = null;
            this.activeCard = null;
            this.pressTimer = null;
            this.initMenu();
            this.bindEvents();
        }

        // 初始化上下文菜单
        initMenu() {
            this.menu = document.createElement('div');
            this.menu.className = 'context-menu';
            this.menu.innerHTML = '<div class="menu-item delete">删除</div>';
            document.body.appendChild(this.menu);
        }

        // 绑定事件
        bindEvents() {
            // 点击删除按钮
            this.menu.querySelector('.delete').addEventListener('click', () => {
                if (this.activeCard) {
                    this.deleteHistoryItem(this.activeCard);
                    this.hideMenu();
                }
            });

            // 点击其他地方关闭菜单
            document.addEventListener('click', () => {
                this.hideMenu();
            });
        }

        // 显示上下文菜单
        showMenu(event, card) {
            event.preventDefault();
            this.menu.style.left = `${event.pageX}px`;
            this.menu.style.top = `${event.pageY}px`;
            this.menu.classList.add('active');
            this.activeCard = card;
        }

        // 隐藏上下文菜单
        hideMenu() {
            this.menu.classList.remove('active');
            this.activeCard = null;
        }

        // 开始长按计时
        startPressTimer(event, card) {
            this.clearPressTimer();
            this.pressTimer = setTimeout(() => {
                this.showMenu(event, card);
            }, CONTEXT_MENU_CONFIG.LONG_PRESS_DELAY);
        }

        // 清除长按计时器
        clearPressTimer() {
            if (this.pressTimer) {
                clearTimeout(this.pressTimer);
                this.pressTimer = null;
            }
        }

        // 删除历史记录项
        deleteHistoryItem(card) {
            const historyManager = HistoryManager.getInstance();
            historyManager.deleteHistoryItem(card);
        }
    }

    /**
     * 历史记录管理
     */
    class HistoryManager {
        constructor() {
            this.historyList = document.getElementById('historyList');
            this.historyData = [];
            this.contextMenu = new ContextMenuManager();
            this.loadHistory();
        }

        // 单例模式获取实例
        static getInstance() {
            if (!this.instance) {
                this.instance = new HistoryManager();
            }
            return this.instance;
        }

        // 加载历史记录
        loadHistory() {
            this.historyData = storage.get(STORAGE_KEYS.HISTORY) || [];
            this.historyData.reverse(); // 最新的记录显示在前面
            this.renderHistory();
        }

        // 渲染历史记录
        renderHistory() {
            this.historyList.innerHTML = '';
            
            if (this.historyData.length === 0) {
                this.showEmptyState();
                return;
            }
            
            this.historyData.forEach(item => {
                const card = this.createHistoryCard(item);
                this.historyList.appendChild(card);
            });
        }

        // 显示空状态
        showEmptyState() {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div class="empty-icon">📺</div>
                <h3>暂无观看历史</h3>
                <p>您的观看历史将显示在这里</p>
            `;
            this.historyList.appendChild(emptyState);
        }

        // 创建历史记录卡片
        createHistoryCard(historyItem) {
            // 使用通用的视频卡片创建函数
            const card = createVideoCard(historyItem);
            
            // 添加长按事件（移动设备）
            card.addEventListener('touchstart', (e) => {
                this.contextMenu.startPressTimer(e, card);
            });

            card.addEventListener('touchend', () => {
                this.contextMenu.clearPressTimer();
            });

            // 添加右键菜单（桌面设备）
            card.addEventListener('contextmenu', (e) => {
                this.contextMenu.showMenu(e, card);
            });
            
            return card;
        }

        // 删除历史记录项
        deleteHistoryItem(card) {
            const index = Array.from(this.historyList.children).indexOf(card);
            
            // 从数据中删除
            this.historyData.splice(index, 1);
            
            // 更新存储
            const originalOrder = [...this.historyData].reverse();
            storage.set(STORAGE_KEYS.HISTORY, originalOrder);
            
            // 从DOM中删除
            card.remove();
            
            // 如果没有历史记录了，显示空状态
            if (this.historyData.length === 0) {
                this.showEmptyState();
            }
        }
    }

    // 初始化历史记录管理器
    HistoryManager.getInstance();
};