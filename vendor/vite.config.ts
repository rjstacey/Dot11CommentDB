import { defineConfig, loadEnv, type UserConfig } from "vite";
import { VENDOR_SPECIFIERS, vendorEntryName } from "./specifiers.js";

// Builds every shared vendor package as its own ES module entry, plus a
// manifest.json that maps each package specifier to its built, hashed file.
// Apps read that manifest (see ../build-tools/vendorPlugin.ts) to build an
// import map and mark these specifiers as external in their own build.
export default defineConfig(({ mode }) => {
	const __dirname = process.cwd();
	const env = { ...loadEnv(mode, __dirname, "") };
	const buildPath = env.BUILD_PATH || "../build/vendor";

	const input: Record<string, string> = {};
	for (const specifier of VENDOR_SPECIFIERS) {
		input[vendorEntryName(specifier)] = specifier;
	}

	return {
		base: "/vendor/",
		build: {
			outDir: buildPath,
			manifest: true,
			target: "esnext",
			rollupOptions: {
				input,
				output: {
					entryFileNames: "[name]-[hash].js",
					chunkFileNames: "chunks/[name]-[hash].js",
					assetFileNames: "assets/[name]-[hash][extname]",
				},
			},
		},
	} satisfies UserConfig;
});
