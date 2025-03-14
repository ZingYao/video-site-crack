
let domain = "http://localhost:8085"
if (window.location.href.indexOf("localhost") === -1 && window.location.href.indexOf("127.0.0.1") === -1) {
    domain = "";
}
if (!window.location.pathname.includes("/login.html")) {
    // 不在登录页面 判断是否包含登录态，不包含登录态需要跳转登录页面
    let token = localStorage.getItem('login_token');
    if (!token) {
        window.location.pathname = '/login.html'
    }

}
let siteSelectionDom = document.getElementById("site");


window.addEventListener('load', () => {
    const username = document.getElementById('username');
    if (username && username.tagName === 'SPAN') {
        username.innerHTML = localStorage.getItem('username');
    }

    const logoutBtn = document.getElementById("logout")
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (!confirm("确定要退出登录吗？")) {
                return
            }
            logout();
        })
    }
    // 添加图片预览容器
    const previewContainer = document.createElement('div');
    previewContainer.className = 'image-preview-container';
    previewContainer.onclick = () => previewContainer.classList.remove('active');
    document.body.appendChild(previewContainer);

});

function getSiteSelectionDom() {
    if (!siteSelectionDom) {
        siteSelectionDom = document.getElementById("site");
    }
    return siteSelectionDom;
}
const initSiteList = async () => {
    const site = await fetch(`${domain}/api/site/list`, {
        headers: {
            'Authorization': localStorage.getItem('login_token')
        }
    })
    const body = await site.json();
    if (body.code == 2) {
        // 没有登录态
        window.location.pathname = '/login.html'
        return
    }
    // 将body中的数据覆盖到siteSelection中
    const siteSelection = getSiteSelectionDom();
    siteSelection.innerHTML = "";
    // 给data的第一位插入选择站点的选项
    const option = document.createElement("option");
    option.value = "";
    option.innerHTML = "选择站点";
    siteSelection.appendChild(option);
    for (let i = 0; i < body.data.length; i++) {
        const option = document.createElement("option");
        option.value = body.data[i];
        option.innerHTML = body.data[i];
        siteSelection.appendChild(option);
    }
    // 查询是否选择过，有选择过的话，将选择过的站点设置为选中
    const chooseSite = localStorage.getItem("site");
    if (chooseSite && body.data.indexOf(chooseSite) > -1) {
        siteSelection.value = chooseSite;
    }
}

const searchVideo = (site, search) => {
    return new Promise(async (resolve, reject) => {
        const video = await fetch(`${domain}/api/site/search?site_name=${site}&query=${search}`, {
            headers: {
                'Authorization': localStorage.getItem('login_token')
            }
        })
        const body = await video.json();
        if (body.code == 2) {
            // 没有登录态
            window.location.pathname = '/login.html'
            return
        }
        resolve(body.data);
    })
}

const getVideoDetail = (site, url) => {
    return new Promise(async (resolve, reject) => {
        const video = await fetch(`${domain}/api/site/detail?site_name=${site}&page_url=${url}`, {
            headers: {
                'Authorization': localStorage.getItem('login_token')
            }
        })
        const body = await video.json();
        if (body.code == 2) {
            // 没有登录态
            window.location.pathname = '/login.html'
            return
        }
        resolve(body.data);
    })
}

const login = (account, password) => {
    return new Promise(async (resolve, reject) => {
        const formData = new FormData();
        formData.append('username', account);
        formData.append('password', password);

        const video = await fetch(`${domain}/api/login`, {
            method: 'POST',
            body: formData
        })
        const body = await video.json();
        resolve(body);
    })
}

const logout = () => {
    return new Promise(async (resolve, reject) => {
        await fetch(`${domain}/api/logout`, {
            headers: {
                'Authorization': localStorage.getItem('login_token')
            },
            method: 'POST'
        })

        localStorage.removeItem('login_token');
        localStorage.removeItem('username');
        window.location.pathname = '/login.html'
    })
}


// 点击搜索结果
const clickVideoCard = (cover, actor, type, director, desc, title, url, detail) => {
    // 设置信息到localStorage
    localStorage.setItem('title', title);
    localStorage.setItem('page_url', url);
    const dump2Play = (detailRes) => {
        // 信息存入localStorage
        let history = JSON.parse(localStorage.getItem('history')) ?? [];
        // 判断url 是否存在于history
        const index = history.findIndex((item) => item.url === url);
        if (index > -1) {
            // 将匹配到的元素移动到数组的最后一位
            const [removed] = history.splice(index, 1);
            removed.detail = detailRes;
            history.push(removed);
        } else {
            history.push({
                cover, actor, type, director, desc, title, url, detail: detailRes
            });
        }
        localStorage.setItem('history', JSON.stringify(history));
        // 跳转到视频播放页面
        window.location.href = '/play.html';
    }
    if (!detail) {
        // 获取视频详情
        const site = document.getElementById('site').value;
        showLoading();
        getVideoDetail(site, url).then((res) => {
            dump2Play(res);
        }).finally(() => {
            hideLoading();
        })
    } else {
        dump2Play(detail);
    }
}

// 创建视频卡片
const createVideoCard = (element) => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.onclick = () => clickVideoCard(element.cover, element.actor, element.type, element.director, element.desc, element.title, element.page_url);

    // 创建封面容器
    const coverContainer = document.createElement('div');
    coverContainer.className = 'video-cover';
    const img = document.createElement('img');
    img.src = element.cover;
    img.alt = element.title;
    img.onclick = (e) => {
        e.stopPropagation();
        const previewContainer = document.createElement('div');
        previewContainer.innerHTML = `<img src="${element.cover}" alt="${element.title}">`;
        previewContainer.classList.add('active');
    };
    coverContainer.appendChild(img);

    // 创建信息容器
    const infoContainer = document.createElement('div');
    infoContainer.className = 'video-info';

    // 标题
    const title = document.createElement('h3');
    title.className = 'video-title';
    title.textContent = element.title;

    // 创建详情列表
    const details = document.createElement('div');
    details.className = 'video-details';

    const detailItems = [
        { label: '主演', value: element.actor },
        { label: '类型', value: element.type },
        { label: '导演', value: element.director }
    ];

    detailItems.forEach(item => {
        if (item.value) {
            const detail = document.createElement('div');
            detail.className = 'detail-item';
            detail.innerHTML = `<span class="label">${item.label}:</span> ${item.value}`;
            details.appendChild(detail);
        }
    });

    // 简介
    const description = document.createElement('div');
    description.className = 'video-description';
    const descContent = document.createElement('div');
    descContent.className = 'desc-content';
    descContent.innerHTML = `<span class="label">简介:</span> ${element.desc}`;

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

    // 组装卡片
    infoContainer.appendChild(title);
    infoContainer.appendChild(details);
    infoContainer.appendChild(description);
    card.appendChild(coverContainer);
    card.appendChild(infoContainer);

    return card;
};


// 显示loading遮罩
const showLoading = () => {
    document.getElementById('loadingOverlay').classList.add('active');
}

// 隐藏loading遮罩
const hideLoading = () => {
    document.getElementById('loadingOverlay').classList.remove('active');
}