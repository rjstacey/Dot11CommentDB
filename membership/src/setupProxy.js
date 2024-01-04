const createProxyMiddleware = require("http-proxy-middleware");

module.exports = function (app) {
	app.use(
		"/api|/auth|/login|/logout",
		createProxyMiddleware({
			//target: "http://localhost:8080",
			target: 'https://test.802tools.org',
			//target: 'http://802tools-env.eba-6y72hp55.us-west-2.elasticbeanstalk.com/',
			changeOrigin: true,
		})
	);
};
