import { defineConfig, loadEnv, type UserConfig } from "vite";
//import { analyzer } from "vite-bundle-analyzer";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { ProxyAgent } from "proxy-agent";

export default defineConfig(({ command, mode }) => {
	const __dirname = process.cwd();
	const env = { ...loadEnv(mode, __dirname, "") };
	if (command === "build" && !env.BUILD_PATH)
		throw Error("BUILD_PATH not set");
	let target = "http://localhost:8080";
	let agent: ProxyAgent | undefined = undefined;
	if (mode === "remote") {
		if (!env.REMOTE_SERVER) throw Error("REMOTE_SERVER not set");
		target = env.REMOTE_SERVER;
		agent = new ProxyAgent();
	}
	if (!env.BASE_URL) throw Error("BASE_URL not set");
	return {
		base: env.BASE_URL,
		build: {
			outDir: env.BUILD_PATH,
			rollupOptions: {
				output: {
					manualChunks(id) {
						if (id.includes("react-dom/client")) return "react-dom";
						if (id.includes("bootstrap")) return "boostrap";
						if (id.includes("react-router")) return "router";
						if (id.includes("redux")) return "redux";
						if (id.includes("lexical")) return "lexical";
						if (id.includes("zod")) return "zod";
						if (id.includes("socket.io-client")) return "socket";
						if (id.includes("luxon")) return "luxon";
						if (id.includes("zod")) return "zod";
						if (id.includes("react-window")) return "utils";
						if (id.includes("clsx")) return "utils";
						if (id.includes("file-saver")) return "utils";
						if (id.includes("lodash.isequal")) return "utils";
						if (id.includes("lodash.debounce")) return "utils";
					},
				},
			},
		},
		plugins: [
			react(),
			//analyzer(),
			VitePWA({
				devOptions: {
					enabled: true,
				},
				registerType: "autoUpdate",
				workbox: {
					globPatterns: [
						"**/*.{js,css,html,ico,png,svg,.woff,.woff2}",
					],
				},
				includeAssets: ["*.ico", "*.svg", "*.png"],
				manifest: {
					name: "802 tools | Comment Resolution",
					short_name: "802|CR",
					description: "Manage comment resolution",
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
				"@schemas": path.resolve(__dirname, "../schemas"),
				"@common": path.resolve(__dirname, "../common/src"),
			},
		},
		server: {
			host: true,
			port: Number(env.PORT),
			strictPort: true,
			proxy: {
				"^(/api|/auth|/login|/logout)": {
					target,
					changeOrigin: true,
					agent,
				},
				"/socket.io": {
					target,
					changeOrigin: true,
					ws: true,
					agent,
				},
			},
		},
	} satisfies UserConfig;
});
