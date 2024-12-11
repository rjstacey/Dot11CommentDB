const { createProxyMiddleware } = require("http-proxy-middleware");

const target = "http://localhost:8080";
// "https://test.802tools.org";

module.exports = function (app) {
	app.use(
		createProxyMiddleware({
			pathFilter: ["/api", "/auth", "/login", "/logout"],
			target,
			changeOrigin: true,
		})
	);
};
