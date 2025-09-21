const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// プロキシミドルウェアの設定
const proxyMiddleware = (targetUrl) => {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    followRedirects: true,
    secure: false,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      // リクエストヘッダーを調整
      proxyReq.setHeader('X-Forwarded-For', req.ip);
      proxyReq.setHeader('X-Proxy', 'SecureProxy');
      
      // Discordなどの特定サイト用のヘッダー
      if (targetUrl.includes('discord.com')) {
        proxyReq.setHeader('Origin', 'https://discord.com');
        proxyReq.setHeader('Referer', 'https://discord.com/');
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // CORSヘッダーを追加
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
      proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
      
      // セキュリティ関連ヘッダーを削除
      delete proxyRes.headers['content-security-policy'];
      delete proxyRes.headers['x-frame-options'];
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).json({ error: 'Proxy error occurred' });
    }
  });
};

// メインのプロキシエンドポイント
app.use('/proxy', (req, res, next) => {
  const targetUrl = req.query.url || req.body.url;
  
  if (!targetUrl) {
    return res.status(400).send('URL parameter is required');
  }
  
  try {
    // ターゲットURLの検証
    const url = new URL(targetUrl);
    
    // 許可されていないサイトをブロック
    const blockedDomains = [
      'localhost',
      '127.0.0.1',
      '192.168.',
      '10.',
      '172.16.',
      'mailto:',
      'file:',
      'data:'
    ];
    
    if (blockedDomains.some(domain => targetUrl.includes(domain))) {
      return res.status(403).send('Access to this domain is not allowed');
    }
    
    // プロキシミドルウェアを実行
    const middleware = proxyMiddleware(targetUrl);
    middleware(req, res, next);
  } catch (error) {
    console.error('Error creating proxy:', error);
    res.status(500).send('Invalid URL');
  }
});

// HTMLコンテンツを書き換えるプロキシエンドポイント
app.get('/rewrite', async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).send('URL parameter is required');
  }
  
  try {
    // ターゲットURLの検証
    const url = new URL(targetUrl);
    
    // 許可されていないサイトをブロック
    const blockedDomains = [
      'localhost',
      '127.0.0.1',
      '192.168.',
      '10.',
      '172.16.',
      'mailto:',
      'file:',
      'data:'
    ];
    
    if (blockedDomains.some(domain => targetUrl.includes(domain))) {
      return res.status(403).send('Access to this domain is not allowed');
    }
    
    // ターゲットサイトからHTMLを取得
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    // HTMLを解析
    const $ = cheerio.load(response.data);
    
    // すべてのリンクをプロキシ経由にする
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('#')) {
        try {
          const absoluteUrl = new URL(href, targetUrl).toString();
          $(el).attr('href', `/rewrite?url=${encodeURIComponent(absoluteUrl)}`);
        } catch (e) {
          // 無効なURLはスキップ
        }
      }
    });
    
    // すべてのフォームのactionをプロキシ経由にする
    $('form[action]').each((i, el) => {
      const action = $(el).attr('action');
      if (action) {
        try {
          const absoluteUrl = new URL(action, targetUrl).toString();
          $(el).attr('action', `/proxy?url=${encodeURIComponent(absoluteUrl)}`);
        } catch (e) {
          // 無効なURLはスキップ
        }
      }
    });
    
    // すべてのスクリプトをプロキシ経由にする
    $('script[src]').each((i, el) => {
      const src = $(el).attr('src');
      if (src) {
        try {
          const absoluteUrl = new URL(src, targetUrl).toString();
          $(el).attr('src', `/proxy?url=${encodeURIComponent(absoluteUrl)}`);
        } catch (e) {
          // 無効なURLはスキップ
        }
      }
    });
    
    // CSSや画像などのリソースもプロキシ経由にする
    $('link[href], img[src], iframe[src]').each((i, el) => {
      const attr = $(el).attr('href') ? 'href' : 'src';
      const resourceUrl = $(el).attr(attr);
      if (resourceUrl) {
        try {
          const absoluteUrl = new URL(resourceUrl, targetUrl).toString();
          $(el).attr(attr, `/proxy?url=${encodeURIComponent(absoluteUrl)}`);
        } catch (e) {
          // 無効なURLはスキップ
        }
      }
    });
    
    // 修正したHTMLを送信
    res.set('Content-Type', 'text/html');
    res.send($.html());
  } catch (error) {
    console.error('Error fetching URL:', error);
    res.status(500).send('Error fetching the URL');
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
