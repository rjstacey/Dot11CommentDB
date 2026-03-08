import { defineConfig, loadEnv, UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import https from "node:https";

export default defineConfig(({ command, mode }) => {
	const __dirname = process.cwd();
	const env = { ...loadEnv(mode, __dirname, "") };
	if (command === "build" && !env.BUILD_PATH)
		throw Error("BUILD_PATH not set");
	if (!env.SERVER) throw Error("SERVER not set");
	if (!env.BASE_URL) throw Error("BASE_URL not set");
	return {
		base: env.BASE_URL,
		build: {
			outDir: env.BUILD_PATH,
			rollupOptions: {
				output: {
					manualChunks: {
						react: ["react", "react-dom"],
						router: ["react-router"],
						boostrap: ["react-bootstrap"],
						redux: [
							"@reduxjs/toolkit",
							"react-redux",
							"redux-persist",
							"redux-logger",
						],
						d3: ["d3"],
						luxon: ["luxon"],
						store: ["./src/store"],
						app: ["./src/app"],
					},
				},
			},
		},
		plugins: [
			react(),
			VitePWA({
				registerType: "autoUpdate",
				devOptions: {
					enabled: true,
				},
				manifest: {
					name: "802 tools | Meetings",
					short_name: "802|MTG",
					description: "Manage session and telecon meetings",
					theme_color: "#ffffff",
					icons: [
						{
							src: "icon-192x192.png",
							sizes: "192x192",
							type: "image/png",
						},
						{
							src: "icon-512x512.png",
							sizes: "512x512",
							type: "image/png",
						},
					],
				},
			}),
		],
		resolve: {
			alias: {
				"@": "/src",
				"@schemas": path.resolve("../schemas"),
				"@common": path.resolve(__dirname, "../common/src"),
			},
		},
		server: {
			host: true,
			port: Number(env.PORT),
			strictPort: true,
			proxy: {
				"^(/api|/auth|/oauth2|/login|/logout)": {
					target: env.SERVER,
					changeOrigin: true,
					agent: new https.Agent({
						proxyEnv: {
							HTTPS_PROXY:
								process.env.HTTPS_PROXY ||
								process.env.https_proxy,
							HTTP_PROXY:
								process.env.HTTP_PROXY ||
								process.env.http_proxy,
							NO_PROXY:
								process.env.NO_PROXY || process.env.no_proxy,
						},
					}),
				},
				"/socket.io": {
					target: env.SERVER,
					changeOrigin: true,
					ws: true,
				},
			},
		},
	} satisfies UserConfig;
});
