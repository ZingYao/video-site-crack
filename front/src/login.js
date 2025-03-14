window.onload = () => {
    document.getElementById('loginForm').addEventListener('submit', function (event) {
        event.preventDefault();
        var username = document.getElementById('username').value;
        var password = document.getElementById('password').value;
        login(username, password).then(res => {
            if (res.code == 0) {
                localStorage.setItem('login_token', res.data.token);
                localStorage.setItem('username', username);
                window.location.href = '/index.html';
            } else {
                alert(res.msg);
            }
        });
    });
}