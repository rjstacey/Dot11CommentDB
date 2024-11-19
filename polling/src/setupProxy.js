const { createProxyMiddleware } = require("http-proxy-middleware");

const target = "http://localhost:8080";

module.exports = function (app) {
	app.use(
		createProxyMiddleware({
			pathFilter: ["/api", "/auth", "/login", "/logout"],
			target,
			changeOrigin: true,
		})
	);
	app.use(
		createProxyMiddleware({
			pathFilter: ["/socket.io"],
			target,
			changeOrigin: true,
			ws: true,
		})
	);
};
