const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// プロキシミドルウェアの設定
app.use('/proxy', createProxyMiddleware({
  target: 'https://www.example.com', // これは実際には動的に変更されます
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    // 必要に応じてリクエストを変更
    if (req.body && req.body.url) {
      proxyReq.setHeader('target-url', req.body.url);
    }
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error' });
  }
}));

// プロキシリクエストを処理するカスタムエンドポイント
app.post('/browse', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  try {
    // ここで実際のプロキシ処理を行う
    // この例では単純化しています
    res.json({ 
      success: true, 
      message: 'Proxy request processed',
      url: url 
    });
  } catch (error) {
    console.error('Error processing proxy request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 静的ファイルの提供
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// エラーハンドラー
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`SecureProxy server running on port ${PORT}`);
});
