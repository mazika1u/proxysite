document.addEventListener('DOMContentLoaded', function() {
    const targetUrl = document.getElementById('target-url');
    const goButton = document.getElementById('go-button');
    const proxyFrame = document.getElementById('proxy-frame');
    const quickButtons = document.querySelectorAll('.quick-btn');
    const proxyUrlDisplay = document.getElementById('current-url');
    const refreshBtn = document.getElementById('refresh-btn');
    const homeBtn = document.getElementById('home-btn');
    const securityBtn = document.getElementById('security-btn');
    const rewriteMode = document.getElementById('rewrite-mode');
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.proxy-frame-container, .settings-container, .history-container');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history');
    
    // 閲覧履歴の管理
    let browsingHistory = JSON.parse(localStorage.getItem('proxyHistory')) || [];
    
    // 履歴を表示
    function renderHistory() {
        historyList.innerHTML = '';
        browsingHistory.slice().reverse().forEach((item, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="history-url">${item.url}</span>
                <div class="history-actions">
                    <button class="history-btn visit-btn" data-url="${item.url}">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                    <button class="history-btn delete-btn" data-index="${browsingHistory.length - 1 - index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            historyList.appendChild(li);
        });
        
        // イベントリスナーを追加
        document.querySelectorAll('.visit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const url = this.getAttribute('data-url');
                targetUrl.value = url;
                navigateToUrl(url);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                browsingHistory.splice(index, 1);
                localStorage.setItem('proxyHistory', JSON.stringify(browsingHistory));
                renderHistory();
            });
        });
    }
    
    // 履歴に追加
    function addToHistory(url) {
        // 重複を避ける
        browsingHistory = browsingHistory.filter(item => item.url !== url);
        
        // 新しい履歴を追加
        browsingHistory.push({
            url: url,
            timestamp: new Date().toISOString()
        });
        
        // 履歴が多すぎる場合は古いものを削除
        if (browsingHistory.length > 50) {
            browsingHistory = browsingHistory.slice(-50);
        }
        
        // ローカルストレージに保存
        localStorage.setItem('proxyHistory', JSON.stringify(browsingHistory));
        
        // 履歴を再表示
        renderHistory();
    }
    
    // 履歴をクリア
    clearHistoryBtn.addEventListener('click', function() {
        if (confirm('閲覧履歴を完全に削除しますか？')) {
            browsingHistory = [];
            localStorage.removeItem('proxyHistory');
            renderHistory();
        }
    });
    
    // タブ切り替え
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // タブのアクティブ状態を更新
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // コンテンツの表示を更新
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });
            
            document.getElementById(`${tabName}-tab`).classList.remove('hidden');
        });
    });
    
    // URLに移動する関数
    function navigateToUrl(url) {
        if (!url) return;
        
        try {
            // URLを検証
            new URL(url);
            
            // プロキシURLを構築
            const proxyUrl = rewriteMode.checked ? 
                `/rewrite?url=${encodeURIComponent(url)}` : 
                `/proxy?url=${encodeURIComponent(url)}`;
            
            // iframeに設定
            proxyFrame.src = proxyUrl;
            proxyUrlDisplay.textContent = url;
            
            // 履歴に追加
            addToHistory(url);
        } catch (error) {
            alert('無効なURLです。正しいURLを入力してください。');
            console.error('Invalid URL:', error);
        }
    }
    
    // メインのアクションボタン
    goButton.addEventListener('click', function() {
        navigateToUrl(targetUrl.value);
    });
    
    // Enterキーで送信
    targetUrl.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            navigateToUrl(targetUrl.value);
        }
    });
    
    // クイックアクセスボタン
    quickButtons.forEach(button => {
        button.addEventListener('click', function() {
            const url = this.getAttribute('data-url');
            targetUrl.value = url;
            navigateToUrl(url);
        });
    });
    
    // プロキシアクションボタン
    refreshBtn.addEventListener('click', function() {
        if (proxyFrame.src && proxyFrame.src !== 'about:blank') {
            proxyFrame.src = proxyFrame.src;
        }
    });
    
    homeBtn.addEventListener('click', function() {
        proxyFrame.src = 'about:blank';
        proxyUrlDisplay.textContent = 'プロキシ接続待機中...';
        targetUrl.value = '';
    });
    
    securityBtn.addEventListener('click', function() {
        alert('セキュリティ保護が有効です。あなたの接続は暗号化され、追跡から保護されています。');
    });
    
    // iframeの読み込み状態を監視
    proxyFrame.addEventListener('load', function() {
        // 読み込み完了時の処理
        try {
            if (proxyFrame.src && proxyFrame.src !== 'about:blank') {
                const url = new URL(proxyFrame.src);
                const params = new URLSearchParams(url.search);
                const targetUrlValue = params.get('url');
                
                if (targetUrlValue) {
                    proxyUrlDisplay.textContent = decodeURIComponent(targetUrlValue);
                }
            }
        } catch (error) {
            console.error('Error parsing URL:', error);
        }
    });
    
    // iframeのエラーを処理
    proxyFrame.addEventListener('error', function() {
        proxyUrlDisplay.textContent = 'エラー: ページを読み込めませんでした';
    });
    
    // 初期化
    renderHistory();
});
