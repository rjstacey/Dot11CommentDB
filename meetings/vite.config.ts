import { defineConfig, loadEnv, type UserConfig } from "vite";
//import { analyzer } from "vite-bundle-analyzer";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import type { Agent } from "node:https";
import { HttpsProxyAgent } from "https-proxy-agent";
import { sharedVendorPlugin } from "../vendor/shared-plugin.js";

export default defineConfig(({ command, mode }) => {
	const __dirname = process.cwd();
	const env = { ...loadEnv(mode, __dirname, "") };
	if (command === "build" && !env.BUILD_PATH)
		throw Error("BUILD_PATH not set");
	let target = "http://localhost:8080";
	let agent: Agent | undefined = undefined;
	if (mode === "remote") {
		if (!env.REMOTE_SERVER) throw Error("REMOTE_SERVER not set");
		target = env.REMOTE_SERVER;
		if (env.https_proxy) agent = new HttpsProxyAgent(env.https_proxy);
	}
	if (!env.BASE_URL) throw Error("BASE_URL not set");
	return {
		base: env.BASE_URL,
		build: {
			outDir: env.BUILD_PATH,
			rollupOptions: {
				output: {
					manualChunks(id) {
						if (id.includes("lexical")) return "lexical";
					},
				},
			},
		},
		plugins: [
			react(),
			sharedVendorPlugin(),
			//analyzer(),
			VitePWA({
				registerType: "autoUpdate",
				devOptions: {
					enabled: false,
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
				"@": path.resolve(__dirname, "./src"),
				"@schemas": path.resolve(__dirname, "../schemas"),
				"@common": path.resolve(__dirname, "../common/src"),
			},
		},
		server: {
			host: true,
			port: Number(env.PORT),
			strictPort: true,
			proxy: {
				"^(/api|/auth|/oauth2|/login|/logout|/vendor)": {
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
