import { defineConfig, loadEnv, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig(({ command, mode }) => {
	const __dirname = process.cwd();
	const env = { ...loadEnv(mode, __dirname, "") };
	if (command === "build" && !env.BUILD_PATH)
		throw Error("BUILD_PATH not set");
	if (!env.SERVER) throw Error("SERVER not set");
	if (!env.BASE_URL) throw Error("BASE_URL not set");
	console.log(process.env.https_proxy);
	return {
		base: env.BASE_URL,
		build: {
			outDir: env.BUILD_PATH,
			rollupOptions: {
				output: {
					manualChunks: {
						react: ["react", "react-dom"],
						boostrap: ["react-bootstrap"],
						redux: [
							"@reduxjs/toolkit",
							"react-redux",
							"redux-persist",
						],
						d3: ["d3"],
						luxon: ["luxon"],
						//editor: ["lexical", "@lexical/code", "@lexical/react", "@lexical/rich-text"],
						common: ["@common"],
						store: ["./src/store"],
					},
				},
			},
		},
		plugins: [
			react(),
			VitePWA({
				registerType: "autoUpdate",
				devOptions: {
					enabled: false,
				},
				manifest: {
					name: "802 tools | Membeship",
					short_name: "802|MEM",
					description: "Managegroup membership",
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
					target: env.SERVER,
					changeOrigin: true,
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
