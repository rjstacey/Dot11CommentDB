const { legacyCreateProxyMiddleware: proxy } = require("http-proxy-middleware");

module.exports = function (app) {
	app.use(
		"/api|/auth|/oauth2|/login|/logout|/comments|/membership|/meetings",
		proxy({
			target: "http://localhost:8080",
			//target: "https://test.802tools.org",
			changeOrigin: true,
		})
	);
};
