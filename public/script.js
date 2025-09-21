document.addEventListener('DOMContentLoaded', function() {
    const targetUrl = document.getElementById('target-url');
    const goButton = document.getElementById('go-button');
    const proxyFrame = document.getElementById('proxy-frame');
    const quickButtons = document.querySelectorAll('.quick-btn');
    const proxyUrlDisplay = document.querySelector('.proxy-url');
    
    // メインのアクションボタン
    goButton.addEventListener('click', function() {
        if (targetUrl.value) {
            // 実際の実装ではサーバーサイドのプロキシエンドポイントを呼び出す
            // ここではデモ用に直接URLを設定
            const url = targetUrl.value;
            proxyFrame.src = `/proxy?url=${encodeURIComponent(url)}`;
            proxyUrlDisplay.textContent = url;
        }
    });
    
    // クイックアクセスボタン
    quickButtons.forEach(button => {
        button.addEventListener('click', function() {
            const url = this.getAttribute('data-url');
            targetUrl.value = url;
            
            // 実際の実装ではサーバーサイドのプロキシエンドポイントを呼び出す
            proxyFrame.src = `/proxy?url=${encodeURIComponent(url)}`;
            proxyUrlDisplay.textContent = url;
        });
    });
    
    // タブ切り替え機能（デモ用）
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // プロキシアクションボタン
    const proxyActionButtons = document.querySelectorAll('.proxy-action-btn');
    proxyActionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const icon = this.querySelector('i').className;
            
            if (icon.includes('sync-alt')) {
                // 更新ボタン
                proxyFrame.src = proxyFrame.src;
            } else if (icon.includes('home')) {
                // ホームボタン
                proxyFrame.src = 'about:blank';
                proxyUrlDisplay.textContent = 'https://secureproxy.example';
                targetUrl.value = '';
            } else if (icon.includes('shield-alt')) {
                // セキュリティボタン
                alert('セキュリティ保護が有効です');
            }
        });
    });
    
    // サーバーとの通信を処理する関数
    async function sendProxyRequest(url) {
        try {
            const response = await fetch('/browse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: url })
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('Proxy request successful:', data);
            } else {
                console.error('Proxy request failed:', data.error);
            }
        } catch (error) {
            console.error('Error sending proxy request:', error);
        }
    }
});
