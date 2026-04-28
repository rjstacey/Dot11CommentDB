import { defineConfig, loadEnv, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
//import { analyzer } from "vite-bundle-analyzer";
import path from "node:path";
//import { ProxyAgent } from "proxy-agent";
import type { Agent } from "node:https";
import { HttpsProxyAgent } from "https-proxy-agent";

export default defineConfig(({ command, mode }) => {
	const __dirname = process.cwd();
	const env = { ...loadEnv(mode, __dirname, "") };
	if (command === "build" && !env.BUILD_PATH)
		throw Error("BUILD_PATH not set");
	let target = "http://localhost:8080";
	let agent: Agent | undefined = undefined;
	if (mode === "remote") {
		console.log("Using remote server");
		if (!env.REMOTE_SERVER) throw Error("REMOTE_SERVER not set");
		target = env.REMOTE_SERVER;
		//agent = new ProxyAgent();
		agent = new HttpsProxyAgent("http://proxy-dmz.intel.com:912/");
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
						socket: ["socket.io-client"],
						luxon: ["luxon"],
					},
				},
			},
		},
		plugins: [react() /*, analyzer()*/],
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
