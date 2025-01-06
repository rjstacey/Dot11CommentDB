import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

const target = "http://localhost:8080";

export default defineConfig(() => {
	return {
		base: "/comments",
		build: {
			outDir: "../build/comments",
		},
		plugins: [
			react(),
			VitePWA({
				registerType: "autoUpdate",
				devOptions: {
					enabled: true,
				},
				manifest: {
					name: "802 tools | Comment Resolution",
					short_name: "802|CR",
					description: "Manaage comment resolution",
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
