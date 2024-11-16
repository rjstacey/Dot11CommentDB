const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
	app.use(
		createProxyMiddleware({
			pathFilter: ["/api", "/auth", "/login", "/logout"],
			target: "http://localhost:8080",
			//target: "https://test.802tools.org",
			changeOrigin: true,
		})
	);
};
