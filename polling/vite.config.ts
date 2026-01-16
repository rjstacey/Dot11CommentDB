import { defineConfig, loadEnv, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const target = "http://localhost:8080";

export default defineConfig(({ command, mode }) => {
	const __dirname = process.cwd();
	const env = { ...loadEnv(mode, __dirname, "") };
	if (command === "build" && !env.BUILD_PATH)
		throw Error("BUILD_PATH not set");
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
						common: ["@common"],
						store: ["./src/store"],
					},
				},
			},
		},
		plugins: [react()],
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
				},
				"/socket.io": {
					target,
					changeOrigin: true,
					ws: true,
				},
			},
		},
	} satisfies UserConfig;
});
