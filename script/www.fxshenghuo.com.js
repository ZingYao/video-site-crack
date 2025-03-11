// site: http://www.fxshenghuo.com/

const copyCode = () => {
    const m3u8VideoUrl = document.getElementById('cciframe').contentDocument.getElementById('player').childNodes[0].src.split(',')[1];
    const videoName = document.querySelector(".playon").childNodes[0].innerText;

    return copyToClicpboard(`<div>
        <span>${videoName}：</span>
        <a href="thunder://${btoa(m3u8VideoUrl)}"> 点我下载</a >
        <a onclick="playSelf(this)" href="javascript:void(0)" value="${m3u8VideoUrl}">点我在线播放</a >
    </div>`);
}

const copyToClicpboard = (str) => {
    
    const textInput = document.createElement('textarea');
    textInput.value = str;

    document.body.appendChild(textInput);

    textInput.select();
    textInput.setSelectionRange(0, 999999);
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            return 'suc';
        } else {
            return 'fail';
        }
    } catch (e) {
        return `fail:${e}`
    } finally {
        document.body.removeChild(textInput);
    }
}

copyCode();
