
let domain = "http://localhost:8085"
if (window.location.href.indexOf("localhost") === -1 && window.location.href.indexOf("127.0.0.1") === -1) {
    domain = "";
}
let siteSelectionDom = document.getElementById("site");

function getSiteSelectionDom() {
    if (!siteSelectionDom) {
        siteSelectionDom = document.getElementById("site");
    }
    return siteSelectionDom;
}
const initSiteList = async()=> {
    const site = await fetch(`${domain}/api/site/list`)
    const body = await site.json();
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

const searchVideo = (site,search) => {
    return new Promise( async(resolve,reject) => {
        const video = await fetch(`${domain}/api/site/search?site_name=${site}&query=${search}`)
        const body = await video.json();
        resolve(body.data);
    })
}

const getVideoDetail = (site,url) => {
    return new Promise( async(resolve,reject) => {
        const video = await fetch(`${domain}/api/site/detail?site_name=${site}&page_url=${url}`)
        const body = await video.json();
        resolve(body.data);
    })
}