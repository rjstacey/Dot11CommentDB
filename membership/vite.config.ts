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
	if (mode === "remote") {
		if (!env.REMOTE_SERVER) throw Error("REMOTE_SERVER not set");
		target = env.REMOTE_SERVER;
	}
	if (!env.BASE_URL) throw Error("BASE_URL not set");
	return {
		base: env.BASE_URL,
		build: {
			outDir: env.BUILD_PATH,
			rollupOptions: {
				output: {
					manualChunks: {
						"react-dom": ["react-dom/client"],
						boostrap: [
							"react-bootstrap",
							"bootstrap/dist/css/bootstrap.min.css",
							"bootstrap-icons/font/bootstrap-icons.css",
						],
						router: ["react-router"],
						redux: [
							"@reduxjs/toolkit",
							"react-redux",
							"redux-persist",
							"redux-logger",
							"@piotr-cz/redux-persist-idb-storage",
						],
						lexical: [
							"lexical",
							"@lexical/history",
							"@lexical/list",
							"@lexical/link",
							"@lexical/extension",
							"@lexical/rich-text",
							"@lexical/code",
							"@lexical/selection",
							"@lexical/utils",
							"@lexical/html",
							"@lexical/react/LexicalContentEditable",
							"@lexical/react/LexicalExtensionComposer",
							"@lexical/react/LexicalComposerContext",
						],
						utils: [
							"clsx",
							"react-window",
							//"react-draggable",
							"file-saver",
							"lodash.isequal",
							"lodash.debounce",
						],
						zod: ["zod"],
						luxon: ["luxon"],
						d3: ["d3"],
					},
				},
			},
		},
		plugins: [
			react(),
			//analyzer(),
			VitePWA({
				registerType: "autoUpdate",
				devOptions: {
					enabled: false,
				},
				manifest: {
					name: "802 tools | Membership",
					short_name: "802|MEM",
					description: "Manage group membership",
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
				"^(/api|/auth|/oauth2|/login|/logout)": {
					target,
					changeOrigin: true,
					agent: new ProxyAgent(),
				},
				"/socket.io": {
					target,
					changeOrigin: true,
					ws: true,
					agent: new ProxyAgent(),
				},
			},
		},
	} satisfies UserConfig;
});
