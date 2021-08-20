const createProxyMiddleware = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api|/login|/logout',
    createProxyMiddleware({
      target: 'https://802tools.org',
      changeOrigin: true,
    })
  );
  app.use(
    '/membership',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
    })
  );
};