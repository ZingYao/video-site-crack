window.onload = () => {
    // 记录视频播放进度
    const videoDom = document.getElementById('player');
    let progressTimer = null;

    // 记录播放进度
    const startProgressRecord = () => {
        // 监听播放速率变化
        videoDom.addEventListener('ratechange', () => {
            localStorage.setItem('playbackRate', videoDom.playbackRate);
        });
        progressTimer = setInterval(() => {
            localStorage.setItem('videoProgress', videoDom.currentTime);
        }, 1000);
    };

    // 停止记录进度
    const stopProgressRecord = () => {
        if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
        }
    };

    // 监听播放和暂停事件
    videoDom.addEventListener('play', startProgressRecord);
    videoDom.addEventListener('pause', stopProgressRecord);
    videoDom.addEventListener('ended', stopProgressRecord);



    // 恢复上次的播放速率
    const savedRate = parseFloat(localStorage.getItem('playbackRate'));
    if (savedRate) {
        videoDom.playbackRate = savedRate;
    }


    // 获取最后一条历史记录
    const history = JSON.parse(localStorage.getItem('history')) ?? [];
    const currentVideo = history[history.length - 1];

    if (!currentVideo) {
        window.location.href = '/index.html';
        return;
    }

    // 设置视频标题
    document.getElementById('videoTitle').textContent = currentVideo.title;

    // 渲染剧集列表
    const renderEpisodeList = () => {
        const episodeList = document.getElementById('episodeList');
        let currentEpisode = localStorage.getItem('currentEpisode');

        currentVideo.detail.forEach((episode, index) => {
            const episodeBtn = document.createElement('button');
            episodeBtn.className = 'episode-btn' + (episode.title === currentEpisode ? ' active' : '');
            episodeBtn.textContent = episode.title;

            episodeBtn.onclick = () => {
                // 更新当前播放剧集
                localStorage.setItem('currentEpisode', episode.title);
                // 更新播放源
                const player = document.getElementById('player');
                if (Hls.isSupported()) {
                    const hls = new Hls({
                        // HLS 配置参数
                        maxLoadingRetry: 10,           // 最大重试次数
                        manifestLoadingTimeOut: 10000,  // manifest加载超时时间
                        manifestLoadingMaxRetry: 5,     // manifest加载最大重试次数
                        levelLoadingTimeOut: 10000,     // level加载超时时间
                        levelLoadingMaxRetry: 5,        // level加载最大重试次数
                        fragLoadingTimeOut: 20000,      // 分片加载超时时间
                        fragLoadingMaxRetry: 6,         // 分片加载最大重试次数
                        enableWorker: true              // 启用 Web Worker
                    });

                    // 错误处理
                    hls.on(Hls.Events.ERROR, (event, data) => {
                        if (data.fatal) {
                            switch (data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    console.log('致命网络错误，尝试恢复...');
                                    hls.startLoad();
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    console.log('致命媒体错误，尝试恢复...');
                                    hls.recoverMediaError();
                                    break;
                                default:
                                    console.log('无法恢复的错误，重新初始化播放器...');
                                    hls.destroy();
                                    initPlayer(episode.player_media);
                                    break;
                            }
                        }
                    });

                    hls.loadSource(episode.player_media);
                    hls.attachMedia(player);
                    // 加载完成后恢复进度和播放速率
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        const savedProgress = parseFloat(localStorage.getItem('videoProgress'));
                        if (savedProgress) {
                            player.currentTime = savedProgress;
                        }
                        const savedRate = parseFloat(localStorage.getItem('playbackRate'));
                        if (savedRate) {
                            player.playbackRate = savedRate;
                        }
                    });
                } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
                    player.src = episode.player_media;
                    // 加载完成后恢复进度和播放速率
                    player.addEventListener('loadedmetadata', () => {
                        const savedProgress = parseFloat(localStorage.getItem('videoProgress'));
                        if (savedProgress) {
                            player.currentTime = savedProgress;
                        }
                        const savedRate = parseFloat(localStorage.getItem('playbackRate'));
                        if (savedRate) {
                            player.playbackRate = savedRate;
                        }
                    });
                }
                // 更新按钮状态
                document.querySelectorAll('.episode-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                episodeBtn.classList.add('active');
                // 自动播放
                player.play();
            };

            episodeList.appendChild(episodeBtn);
        });

        // 默认播放第一集或上次播放的剧集
        if (currentVideo.detail.length > 0) {
            const targetEpisode = currentEpisode
                ? document.querySelector(`.episode-btn.active`)
                : episodeList.querySelector('.episode-btn');
            targetEpisode?.click();
        }
    };

    renderEpisodeList();

    // 添加下载按钮事件
    document.getElementById('downloadBtn').onclick = () => {
        const currentEpisode = localStorage.getItem('currentEpisode');
        const episode = currentVideo.detail.find(ep => ep.title === currentEpisode);

        if (episode) {
            // 使用迅雷下载协议
            window.location.href = `thunder://${btoa('AA' + episode.player_media + 'ZZ')}`;
        }
    };

    // 刷新剧集列表
    const refreshEpisodeList = async () => {
        const site = localStorage.getItem('site')
        const url = currentVideo.url;

        try {
            showLoading();
            const newDetail = await getVideoDetail(site, url);
            // 更新历史记录中的剧集列表
            currentVideo.detail = newDetail;
            const history = JSON.parse(localStorage.getItem('history'));
            const index = history.findIndex(item => item.url === url);
            if (index !== -1) {
                history[index].detail = newDetail;
                localStorage.setItem('history', JSON.stringify(history));
            }
            // 清空并重新渲染剧集列表
            document.getElementById('episodeList').innerHTML = '';
            renderEpisodeList();
        } catch (error) {
            alert('刷新失败，请稍后重试');
        } finally {
            hideLoading();
        }
    };


    // 初始化播放器
    const initPlayer = (url) => {
        if (Hls.isSupported()) {
            const player = document.getElementById('player');
            const hls = new Hls({
                maxLoadingRetry: 10,
                manifestLoadingTimeOut: 10000,
                manifestLoadingMaxRetry: 5,
                levelLoadingTimeOut: 10000,
                levelLoadingMaxRetry: 5,
                fragLoadingTimeOut: 20000,
                fragLoadingMaxRetry: 6,
                enableWorker: true
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;
                        default:
                            hls.destroy();
                            setTimeout(() => initPlayer(url), 1000);
                            break;
                    }
                }
            });
            hls.loadSource(url);
            hls.attachMedia(player);
            // 加载完成后恢复进度和播放速率
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                const savedProgress = parseFloat(localStorage.getItem('videoProgress'));
                if (savedProgress) {
                    player.currentTime = savedProgress;
                }
                const savedRate = parseFloat(localStorage.getItem('playbackRate'));
                if (savedRate) {
                    player.playbackRate = savedRate;
                }
                player.play();
            });
        }
    };

    // 添加刷新按钮事件
    document.getElementById('refreshBtn').onclick = refreshEpisodeList;
};