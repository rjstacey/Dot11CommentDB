const createProxyMiddleware = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api|/auth|/login|/logout',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      //target: 'https://802tools.org',
      changeOrigin: true,
    })
  );
};