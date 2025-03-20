window.onload = () => {
    /**
     * 常量和配置
     */
    const STORAGE_KEYS = {
        HISTORY: 'history',
        PLAYBACK_RATE: 'playbackRate',
        CURRENT_EPISODE: 'currentEpisode',
        SITE: 'site',
        PROGRESS_MAP: 'videoProgressMap' // 新增进度Map的存储键
    };

    const HLS_CONFIG = {
        maxLoadingRetry: 10,           // 最大重试次数
        manifestLoadingTimeOut: 10000,  // manifest加载超时时间
        manifestLoadingMaxRetry: 5,     // manifest加载最大重试次数
        levelLoadingTimeOut: 10000,     // level加载超时时间
        levelLoadingMaxRetry: 5,        // level加载最大重试次数
        fragLoadingTimeOut: 20000,      // 分片加载超时时间
        fragLoadingMaxRetry: 6,         // 分片加载最大重试次数
        enableWorker: true              // 启用Web Worker
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
     * 视频播放器模块
     */
    class VideoPlayerManager {
        constructor(playerElement) {
            this.player = playerElement;
            this.progressTimer = null;
            this.hlsInstance = null;
            this.currentVideoUrl = null;
            this.currentEpisodeUrl = null;
            this.progressMap = this.loadProgressMap();
            this.initEventListeners();
        }

        // 加载进度Map
        loadProgressMap() {
            return storage.get(STORAGE_KEYS.PROGRESS_MAP) || {};
        }

        // 保存进度Map
        saveProgressMap() {
            storage.set(STORAGE_KEYS.PROGRESS_MAP, this.progressMap);
        }

        // 设置当前播放的视频和剧集URL
        setCurrentMedia(videoUrl, episodeUrl) {
            this.currentVideoUrl = videoUrl;
            this.currentEpisodeUrl = episodeUrl;
        }

        // 获取当前剧集的播放进度
        getCurrentProgress() {
            if (!this.currentVideoUrl || !this.currentEpisodeUrl) return null;
            
            const videoMap = this.progressMap[this.currentVideoUrl];
            if (!videoMap) return null;
            
            return videoMap[this.currentEpisodeUrl];
        }

        // 修改 VideoPlayerManager 类中的相关方法
        // 在 saveCurrentProgress 方法中添加更多信息
        
        // 保存当前剧集的播放进度
        saveCurrentProgress(progress, episodeInfo = null) {
            if (!this.currentVideoUrl || !this.currentEpisodeUrl) return;
            
            // 确保视频的Map存在
            if (!this.progressMap[this.currentVideoUrl]) {
                this.progressMap[this.currentVideoUrl] = {};
            }
            if (!progress) return;
            
            // 如果提供了剧集信息，保存更多详细信息
            if (episodeInfo) {
                this.progressMap[this.currentVideoUrl][this.currentEpisodeUrl] = {
                    progress: progress,
                    title: episodeInfo.title,
                    episodeTitle: episodeInfo.episodeTitle,
                    lastPlayed: new Date().toISOString()
                };
            } else {
                // 保持原有的简单进度记录
                this.progressMap[this.currentVideoUrl][this.currentEpisodeUrl] = progress;
            }
            
            this.saveProgressMap();
        }

        // 初始化事件监听
        initEventListeners() {
            // 播放速率变化监听
            this.player.addEventListener('ratechange', () => {
                storage.set(STORAGE_KEYS.PLAYBACK_RATE, this.player.playbackRate);
            });

            // 播放状态监听
            this.player.addEventListener('play', () => this.startProgressRecord());
            this.player.addEventListener('pause', () => this.stopProgressRecord());
            this.player.addEventListener('ended', () => this.stopProgressRecord());

            // 恢复上次的播放速率
            const savedRate = parseFloat(storage.get(STORAGE_KEYS.PLAYBACK_RATE));
            if (savedRate) {
                this.player.playbackRate = savedRate;
            }
        }

        // 开始记录播放进度
        startProgressRecord(episodeInfo = null) {
            this.stopProgressRecord(); // 确保不会创建多个计时器
            
            // 保存当前剧集信息
            if (episodeInfo) {
                this.currentEpisodeInfo = episodeInfo;
            }
            
            this.progressTimer = setInterval(() => {
                this.saveCurrentProgress(this.player.currentTime, this.currentEpisodeInfo);
            }, 1000);
        }

        // 停止记录进度
        stopProgressRecord() {
            if (this.progressTimer) {
                clearInterval(this.progressTimer);
                this.progressTimer = null;
            }
            // 停止时也保存一次进度
            if (this.player.currentTime > 0) {
                this.saveCurrentProgress(this.player.currentTime,this.currentEpisodeInfo);
            }
        }

        // 恢复播放状态
        restorePlaybackState() {
            // 恢复播放进度
            const savedProgress = this.getCurrentProgress();
            if (savedProgress) {
                this.player.currentTime = savedProgress?.progress ?? 0;
            }
            
            // 恢复播放速率
            const savedRate = parseFloat(storage.get(STORAGE_KEYS.PLAYBACK_RATE));
            if (savedRate) {
                this.player.playbackRate = savedRate;
            }
        }

        // 初始化HLS播放器
        initPlayer(url, videoUrl, autoPlay = true) {
            // 清理之前的实例
            if (this.hlsInstance) {
                this.hlsInstance.destroy();
                this.hlsInstance = null;
            }
        
            // 设置当前媒体信息，如果没有传入videoUrl则保持当前值
            this.setCurrentMedia(videoUrl || this.currentVideoUrl, url);

            if (Hls.isSupported()) {
                const hls = new Hls(HLS_CONFIG);
                this.hlsInstance = hls;

                // 错误处理
                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.log('网络错误，尝试恢复...');
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.log('媒体错误，尝试恢复...');
                                hls.recoverMediaError();
                                break;
                            default:
                                console.log('无法恢复的错误，重新初始化播放器...');
                                hls.destroy();
                                this.hlsInstance = null;
                                setTimeout(() => this.initPlayer(url,videoUrl,autoPlay), 1000);
                                break;
                        }
                    }
                });

                hls.loadSource(url);
                hls.attachMedia(this.player);
                
                // 加载完成后恢复播放状态
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    this.restorePlaybackState();
                    if (autoPlay) this.player.play();
                });
                
                return hls;
            } else if (this.player.canPlayType('application/vnd.apple.mpegurl')) {
                // 原生HLS支持（iOS Safari）
                this.player.src = url;
                this.player.addEventListener('loadedmetadata', () => {
                    this.restorePlaybackState();
                    if (autoPlay) this.player.play();
                });
            }
        }
    }

    /**
     * 剧集管理模块
     */
    class EpisodeManager {
        constructor(videoPlayer) {
            this.videoPlayer = videoPlayer;
            this.currentVideo = null;
            this.episodeList = document.getElementById('episodeList');
            this.sourceSelector = document.getElementById('sourceSelector') || this.createSourceSelector();
            this.currentSource = null; // 当前选中的视频源
            // 先加载视频信息，确保currentVideo已初始化
            if (this.loadCurrentVideo()) {
                // 初始化时设置当前视频URL到播放器，使用page_url属性
                this.videoPlayer.currentVideoUrl = this.currentVideo.page_url || this.currentVideo.url;
            }
        }
    
        // 创建视频源选择器
        createSourceSelector() {
            const selector = document.createElement('select');
            selector.id = 'sourceSelector';
            selector.className = 'source-selector';
            selector.addEventListener('change', () => this.onSourceChange());
            
            // 创建源站选择器容器
            const container = document.createElement('div');
            container.className = 'source-selector-container';
            container.innerHTML = '<span>视频源: </span>';
            container.appendChild(selector);
            
            // 将选择器插入到剧集列表前面
            const episodeContainer = this.episodeList.parentElement;
            episodeContainer.insertBefore(container, this.episodeList);
            
            return selector;
        }
    
        // 加载当前视频信息
        loadCurrentVideo() {
            const history = storage.get(STORAGE_KEYS.HISTORY) || [];
            this.currentVideo = history[history.length - 1];
    
            if (!this.currentVideo) {
                window.location.href = '/index.html';
                return false;
            }
    
            // 设置视频标题
            document.getElementById('videoTitle').textContent = this.currentVideo.title;
            
            // 检查detail是否为map结构，如果不是则触发刷新
            if (this.currentVideo.detail && !this.isDetailMap()) {
                console.log('检测到旧版数据结构，正在刷新...');
                this.refreshEpisodeList();
                return true;
            }
            
            // 初始化视频源选择器
            this.initSourceSelector();
            
            return true;
        }
    
        // 检查detail是否为map结构
        isDetailMap() {
            if (!this.currentVideo.detail) return false;
            
            // 检查是否为数组（旧结构）
            if (Array.isArray(this.currentVideo.detail)) return false;
            
            // 检查是否为对象（新结构）
            return typeof this.currentVideo.detail === 'object' && 
                   Object.keys(this.currentVideo.detail).length > 0;
        }
    
        // 初始化视频源选择器
        initSourceSelector() {
            if (!this.currentVideo || !this.currentVideo.detail || !this.isDetailMap()) return;
            
            // 清空选择器
            this.sourceSelector.innerHTML = '';
            
            // 获取所有可用的视频源
            const sources = Object.keys(this.currentVideo.detail);
            
            if (sources.length === 0) return;
            
            // 添加视频源选项
            sources.forEach(source => {
                const option = document.createElement('option');
                option.value = source;
                option.textContent = source;
                this.sourceSelector.appendChild(option);
            });
            
            // 设置默认选中的视频源
            const lastSource = storage.get('lastSource');
            if (lastSource && sources.includes(lastSource)) {
                this.sourceSelector.value = lastSource;
            }
            
            // 更新当前视频源
            this.currentSource = this.sourceSelector.value;
            storage.set('lastSource', this.currentSource);
        }
    
        // 视频源变更处理
        onSourceChange() {
            this.currentSource = this.sourceSelector.value;
            storage.set('lastSource', this.currentSource);
            
            // 重新渲染剧集列表
            this.renderEpisodeList();
            
            // 默认播放第一集
            const episodes = this.getCurrentSourceEpisodes();
            if (episodes && episodes.length > 0) {
                this.playEpisode(episodes[0]);
            }
        }
    
        // 获取当前源的剧集列表
        getCurrentSourceEpisodes() {
            if (!this.currentVideo || !this.currentSource || !this.isDetailMap()) return [];
            return this.currentVideo.detail[this.currentSource] || [];
        }
    
        // 播放指定剧集
        // 修改 playEpisode 方法
        playEpisode(episode) {
            storage.set(STORAGE_KEYS.CURRENT_EPISODE, episode.title);
            
            // 传递视频URL和剧集URL
            this.videoPlayer.initPlayer(
                episode.player_media, 
                this.currentVideo.page_url || this.currentVideo.url
            );
            
            // 保存剧集信息到进度记录
            const episodeInfo = {
                title: this.currentVideo.title,
                episodeTitle: episode.title
            };
            // 将剧集信息传递给VideoPlayerManager
            this.videoPlayer.currentEpisodeInfo = episodeInfo;
            
            // 调用扩展的保存进度方法，传入剧集信息
            this.videoPlayer.saveCurrentProgress(0, episodeInfo);
            
            // 更新按钮状态
            document.querySelectorAll('.episode-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`.episode-btn[data-title="${episode.title}"]`)?.classList.add('active');
        }
    
        // 渲染剧集列表
        renderEpisodeList() {
            if (!this.currentVideo) return;
            
            this.episodeList.innerHTML = '';
            const currentEpisode = storage.get(STORAGE_KEYS.CURRENT_EPISODE);
            
            // 处理旧版数据结构
            if (!this.isDetailMap()) {
                if (Array.isArray(this.currentVideo.detail)) {
                    this.currentVideo.detail.forEach((episode) => {
                        const episodeBtn = document.createElement('button');
                        episodeBtn.className = 'episode-btn' + (episode.title === currentEpisode ? ' active' : '');
                        episodeBtn.textContent = episode.title;
                        episodeBtn.dataset.title = episode.title;
                        episodeBtn.onclick = () => this.playEpisode(episode);
                        this.episodeList.appendChild(episodeBtn);
                    });
                    
                    // 默认播放第一集或上次播放的剧集
                    if (this.currentVideo.detail.length > 0) {
                        const targetEpisode = currentEpisode
                            ? this.currentVideo.detail.find(ep => ep.title === currentEpisode)
                            : this.currentVideo.detail[0];
                        
                        if (targetEpisode) {
                            this.playEpisode(targetEpisode);
                        }
                    }
                }
                return;
            }
            
            // 处理新版数据结构
            if (!this.currentSource) return;
            
            const episodes = this.getCurrentSourceEpisodes();
            episodes.forEach((episode) => {
                const episodeBtn = document.createElement('button');
                episodeBtn.className = 'episode-btn' + (episode.title === currentEpisode ? ' active' : '');
                episodeBtn.textContent = episode.title;
                episodeBtn.dataset.title = episode.title;
                episodeBtn.onclick = () => this.playEpisode(episode);
                this.episodeList.appendChild(episodeBtn);
            });
    
            // 默认播放第一集或上次播放的剧集
            if (episodes.length > 0) {
                const targetEpisode = currentEpisode
                    ? episodes.find(ep => ep.title === currentEpisode)
                    : episodes[0];
                
                if (targetEpisode) {
                    this.playEpisode(targetEpisode);
                }
            }
        }
    
        // 刷新剧集列表
        async refreshEpisodeList() {
            if (!this.currentVideo) return;
            
            const site = storage.get(STORAGE_KEYS.SITE);
            const url = this.currentVideo.page_url;
    
            try {
                showLoading();
                const newDetail = await getVideoDetail(site, url);
                
                // 更新历史记录中的剧集列表
                this.currentVideo.detail = newDetail;
                const updatedHistory = storage.get(STORAGE_KEYS.HISTORY) || [];
                const index = updatedHistory.findIndex(item => item.page_url === url);
                if (index !== -1) {
                    updatedHistory[index].detail = newDetail;
                    storage.set(STORAGE_KEYS.HISTORY, updatedHistory);
                }
                
                // 重新初始化视频源选择器
                this.initSourceSelector();
                this.renderEpisodeList();
            } catch (error) {
                alert('刷新失败，请稍后重试');
                console.error('刷新剧集失败:', error);
            } finally {
                hideLoading();
            }
        }
    
        // 下载当前视频
        downloadCurrentVideo() {
            if (!this.currentVideo) return;
            
            const currentEpisode = storage.get(STORAGE_KEYS.CURRENT_EPISODE);
            let episode;
            
            // 处理不同的数据结构
            if (this.isDetailMap() && this.currentSource) {
                const episodes = this.getCurrentSourceEpisodes();
                episode = episodes.find(ep => ep.title === currentEpisode);
            } else if (Array.isArray(this.currentVideo.detail)) {
                episode = this.currentVideo.detail.find(ep => ep.title === currentEpisode);
            }
    
            if (episode) {
                // 使用迅雷下载协议
                window.location.href = `thunder://${btoa('AA' + episode.player_media + 'ZZ')}`;
            }
        }
    }

    /**
     * 应用初始化
     */
    const init = () => {
        // 初始化视频播放器
        const playerElement = document.getElementById('player');
        const videoPlayer = new VideoPlayerManager(playerElement);
        
        // 初始化剧集管理
        const episodeManager = new EpisodeManager(videoPlayer);
        episodeManager.renderEpisodeList();
        
        // 绑定按钮事件
        document.getElementById('refreshBtn').onclick = () => episodeManager.refreshEpisodeList();
        document.getElementById('downloadBtn').onclick = () => episodeManager.downloadCurrentVideo();
    };

    // 启动应用
    init();
};