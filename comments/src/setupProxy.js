const { createProxyMiddleware } = require("http-proxy-middleware");

//const target = 'https://test.802tools.org';
const target = "http://localhost:8080";

module.exports = function (app) {
	app.use(
		createProxyMiddleware({
			pathFilter: ["/api", "/auth", "/login", "/logout"],
			target,
			changeOrigin: true,
			secure: true,
		})
	);
};
