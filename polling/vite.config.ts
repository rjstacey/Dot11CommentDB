import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const target = "http://localhost:8080";

export default defineConfig(() => {
	return {
		base: "/polling",
		build: {
			outDir: "../build/polling",
		},
		plugins: [react()],
		resolve: {
			alias: {
				"@": "/src",
				"@schemas": path.resolve("../schemas"),
			},
		},
		server: {
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
	};
});
