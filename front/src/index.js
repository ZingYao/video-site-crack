window.onload = async () => {

    // 设置站点信息
    initSiteList();

    // 重绘视频搜索结果列表
    const renderSearchResult = (res) => {
        // 清空搜索结果和历史记录
        searchResult.innerHTML = '';
        localStorage.removeItem('title');
        localStorage.removeItem('title2');
        localStorage.removeItem('page_url');

        // 创建搜索结果网格容器
        const gridContainer = document.createElement('div');
        gridContainer.className = 'video-grid';

        res.forEach(element => {
            const card = createVideoCard(element);
            gridContainer.appendChild(card);
        });

        searchResult.appendChild(gridContainer);
        searchResult.className = 'search-results-container';
    }

    // 注册搜索事件
    document.getElementById('searchForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const site = document.getElementById('site').value;
        const search = document.getElementById('search').value;
        if (!site) {
            alert('请选择站点');
            return;
        }
        if (!search) {
            alert('请输入搜索内容');
            return;
        }
        showLoading();
        searchVideo(site, search).then((res) => {
            // 渲染搜索结果
            renderSearchResult(res);
        }).finally(() => {
            hideLoading();
        });
    })
    // const player = document.getElementById('player');
    // const searchResult = document.getElementById('searchResult');
    // const videoDetail = document.getElementById('videoDetail');
    // const overlay = document.getElementById('overlay');
    // let progressIntId = 0;
    // player.addEventListener('play', function () {
    //     // 视频播放 注册记录播放进度信息
    //     if (!progressIntId) {
    //         progressIntId = setInterval(() => {
    //             localStorage.setItem('progress', player.currentTime);
    //         }, 1500);
    //     }
    // });
    // player.addEventListener('pause', function () {
    //     clearInterval(progressIntId);
    //     progressIntId = 0;
    // })

    // player.addEventListener('error', (e) => {
    //     console.log(e)
    // })

    // // 视频搜索
    // const search = () => {
    //     // 发起视频搜索
    //     const site = document.getElementById('site').value;
    //     const search = document.getElementById('search').value;
    //     if (!site) {
    //         alert('请选择站点');
    //         return;
    //     }
    //     if (!search) {
    //         alert('请输入搜索内容');
    //         return;
    //     }
    //     overlay.className = '';
    //     searchVideo(site, search).then((res) => {
    //         // 渲染搜索结果
    //         renderSearchResult(res);
    //     }).finally(() => {
    //         overlay.className = 'layui-hide';
    //     });
    // }

    // // 重绘视频搜索详情页面
    // const renderVideoDetail = (res) => {
    //     // 隐藏搜索结果
    //     searchResult.className = 'layui-hide';
    //     // 绘制视频剧集信息
    //     videoDetail.innerHTML = '';
    //     // const videoJsPlayer = videojs('player')
    //     // videoJsPlayer.playlist.autoadvance(true);
    //     res.forEach((element) => {
    //         // videoJsPlayer.playlist.push({
    //         //     title: element.title,
    //         //     src: element.player_media,
    //         //     type:'application/x-mpegURL' 
    //         // })
    //         let btnDom = document.createElement('button');
    //         btnDom.innerText = element.title;
    //         btnDom.style.marginTop = '3px';
    //         btnDom.style.marginLeft = '10px';
    //         btnDom.className = 'layui-btn layui-btn-xs layui-btn-normal videoBtn';
    //         btnDom.onclick = (event) => {
    //             // 设置播放剧集
    //             localStorage.setItem("title2", element.title);
    //             playSelf(element.player_media);
    //             player.play();
    //             window.location.title = localStorage.getItem("title") + " - " + element.title;
    //             // 设置当前按钮为选中状态
    //             event.target.className = 'layui-btn layui-btn-xs layui-btn-warm videoBtn';
    //             // 设置其他按钮为非选中状态
    //             let btns = document.getElementsByClassName('videoBtn');
    //             for (let i = 0; i < btns.length; i++) {
    //                 if (btns[i] != event.target) {
    //                     btns[i].className = 'layui-btn layui-btn-xs layui-btn-normal videoBtn';
    //                 }
    //             }
    //         }
    //         videoDetail.appendChild(btnDom);
    //     })
    //     title2 = localStorage.getItem("title2");
    //     let btns = document.getElementsByClassName('videoBtn');
    //     if (title2) {
    //         // 存在播放过的视频，点击播放
    //         for (let i = 0; i < btns.length; i++) {
    //             if (btns[i].innerText == title2) {
    //                 btns[i].click();
    //                 break;
    //             }
    //         }
    //         let progress = localStorage.getItem("progress");
    //         if (progress) {
    //             player.currentTime = progress;
    //         }
    //     } else {
    //         // 播放第一个视频
    //         btns[0]?.click();
    //     }
    //     // 显示视频播放
    //     player.className = '';
    //     // 显示视频剧集信息
    //     videoDetail.className = '';
    // }

    // // 点击搜索结果
    // const liOnClick = (title, url) => {
    //     // 设置信息到localStorage
    //     localStorage.setItem('title', title);
    //     localStorage.setItem('page_url', url);
    //     // 获取视频详情
    //     const site = document.getElementById('site').value;
    //     overlay.className = '';
    //     getVideoDetail(site, url).then((res) => {
    //         // 信息存入localStorage
    //         localStorage.setItem('videoDetail', JSON.stringify(res));
    //         // 渲染视频信息
    //         renderVideoDetail(res);
    //     }).finally(() => {
    //         overlay.className = 'layui-hide';
    //     })
    // }

    // // 重绘视频搜索结果列表
    // const renderSearchResult = (res) => {
    //     // 隐藏视频播放
    //     player.className = 'layui-hide';
    //     player.pause();
    //     videoDetail.className = 'layui-hide';
    //     // 清空搜索结果
    //     searchResult.innerHTML = '';
    //     // 清空历史播放记录
    //     localStorage.removeItem('title');
    //     localStorage.removeItem('title2');
    //     localStorage.removeItem('page_url');
    //     localStorage.removeItem('videoDetail');
    //     // 渲染搜索结果
    //     let ulDom = document.createElement('ul');
    //     res.forEach((element, index) => {
    //         let liDom = document.createElement('li');
    //         liDom.onclick = () => {
    //             liOnClick(element.title, element.page_url);
    //         };
    //         let divDom = document.createElement('div');
    //         liDom.className = 'layui-row';
    //         liDom.style.cursor = 'pointer';
    //         divDom.className = 'layui-col-xs3 layui-col-sm3 layui-col-md3';
    //         let imgDom = document.createElement('img');
    //         imgDom.src = element.cover;
    //         imgDom.style.width = '100%';
    //         imgDom.style.height = '100%';
    //         divDom.appendChild(imgDom);
    //         liDom.appendChild(divDom);
    //         divDom = document.createElement('div');
    //         divDom.className = 'layui-col-xs-offset1 layui-col-xs8 layui-col-sm-offset1 layui-col-sm8 layui-col-md-offset1 layui-col-md8';
    //         let hDom = document.createElement('h2');
    //         hDom.innerHTML = element.title;
    //         divDom.appendChild(hDom);
    //         let pDom = document.createElement('p');
    //         pDom.innerHTML = `主演：${element.actor}`;
    //         divDom.appendChild(pDom);
    //         liDom.appendChild(divDom);
    //         pDom = document.createElement('p');
    //         pDom.innerHTML = `类型：${element.type}`;
    //         divDom.appendChild(pDom);
    //         liDom.appendChild(divDom);
    //         pDom = document.createElement('p');
    //         pDom.innerHTML = `导演：${element.director}`;
    //         divDom.appendChild(pDom);
    //         liDom.appendChild(divDom);
    //         pDom = document.createElement('p');
    //         pDom.innerHTML = `简介：${element.desc}`;
    //         divDom.appendChild(pDom);
    //         liDom.appendChild(divDom);
    //         ulDom.appendChild(liDom);
    //         if (index != res.length - 1) {
    //             let hrDom = document.createElement('hr');
    //             ulDom.appendChild(hrDom);
    //         }
    //     });
    //     searchResult.appendChild(ulDom);
    //     searchResult.className = '';
    // }

    // function playSelf(playerUrl) {
    //     player.className = '';

    //     if (Hls.isSupported()) {
    //         const hls = new Hls();
    //         hls.loadSource(playerUrl);
    //         hls.attachMedia(player);
    //     }
    //     // 对于原生支持HLS的浏览器（如Safari）
    //     else if (player.canPlayType('application/vnd.apple.mpegurl')) {
    //         player.src = playerUrl;
    //     }
    //     setTimeout(() => {
    //         // 滚动页面到底部
    //         window.scrollTo({
    //             top: document.body.scrollHeight,
    //             behavior: 'smooth'
    //         });
    //     }, 200)
    // }
    // // 注册站点选择事件
    // document.getElementById('site').onchange = (event) => {
    //     // 设置选项到localStorage
    //     localStorage.setItem('site', event.target.value);
    // }
    // // 注册搜索事件
    // document.getElementById('searchBtn').onclick = search
    // document.getElementById('search').addEventListener('keypress', (event) => {
    //     if (event.keyCode == 13) {
    //         search();
    //     }
    // })

    // // 页面历史数据初始化
    // // 如果有搜索结果，显示上次播放内容
    // searchResultData = localStorage.getItem('videoDetail');
    // if (searchResultData) {
    //     // 渲染视频信息
    //     renderVideoDetail(JSON.parse(searchResultData));
    // }
    // let content = localStorage.getItem('title')
    // const searchInput = document.getElementById('search');
    // searchInput.value = content;
}