const createProxyMiddleware = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  app.use(
    '/login|/logout',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
    })
  );
  app.use(
    '/comments',
    createProxyMiddleware({
      target: 'http://localhost:3002',
      changeOrigin: true,
    })
  );
};