window.onload = () => {
    let history = JSON.parse(localStorage.getItem('history')) ?? [];
    history.reverse();

    // 创建右键菜单
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = '<div class="menu-item delete">删除</div>';
    document.body.appendChild(contextMenu);

    // 处理右键菜单
    let activeCard = null;
    let pressTimer = null;

    const showContextMenu = (e, card) => {
        e.preventDefault();
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        contextMenu.classList.add('active');
        activeCard = card;
    };

    // 删除历史记录
    const deleteHistory = (card) => {
        const index = Array.from(document.getElementById('historyList').children).indexOf(card);
        history.splice(index, 1);
        localStorage.setItem('history', JSON.stringify(history));
        card.remove();
    };

    // 点击删除按钮
    contextMenu.querySelector('.delete').addEventListener('click', () => {
        if (activeCard) {
            deleteHistory(activeCard);
            contextMenu.classList.remove('active');
        }
    });

    // 点击其他地方关闭菜单
    document.addEventListener('click', () => {
        contextMenu.classList.remove('active');
    });

    history.forEach(element => {
        const card = createVideoCard(element);
        
        // 添加长按事件
        card.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                showContextMenu(e, card);
            }, 800);
        });

        card.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
        });

        // 添加右键菜单
        card.addEventListener('contextmenu', (e) => {
            showContextMenu(e, card);
        });

        document.getElementById('historyList').appendChild(card);
    });
}