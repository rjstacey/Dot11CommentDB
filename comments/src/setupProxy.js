const createProxyMiddleware = require("http-proxy-middleware");

module.exports = function (app) {
	app.use(
		"/api|/auth|/login|/logout",
		createProxyMiddleware({
			//target: 'https://test.802tools.org',
			target: "http://localhost:8080",
			changeOrigin: true,
			secure: true,
		})
	);
};
