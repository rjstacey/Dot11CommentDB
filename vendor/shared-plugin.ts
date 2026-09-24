import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { VENDOR_SPECIFIERS, vendorEntryName } from "./specifiers.js";

type ManifestEntry = { file: string; name?: string; isEntry?: boolean };
type Manifest = Record<string, ManifestEntry>;

/**
 * Vite plugin that, at build time only, marks every package in
 * VENDOR_SPECIFIERS as external and injects an import map pointing them at
 * the pre-built shared bundle in build/vendor (see ../vendor). This lets the
 * browser fetch React/Redux/Bootstrap/etc. once and reuse them across every
 * app, since all apps are served from the same origin.
 *
 * In dev (`vite`/`vite --mode remote`), this is a no-op: packages resolve
 * normally out of node_modules so HMR keeps working as before.
 *
 * `vendorManifestPath` is the path to the vendor build's manifest.json,
 * relative to the app's own root (defaults to "../build/vendor/.vite/manifest.json").
 */
export function sharedVendorPlugin(
	vendorManifestPath = "../build/vendor/.vite/manifest.json",
): Plugin {
	let importMapScript = "";
	let external: string[] = [];

	return {
		name: "shared-vendor",
		config(_config, { command }) {
			if (command !== "build") return;

			const manifestFile = path.resolve(process.cwd(), vendorManifestPath);
			if (!fs.existsSync(manifestFile)) {
				throw new Error(
					`Shared vendor manifest not found at ${manifestFile}. ` +
						`Run "npm run build -w vendor" before building this app.`,
				);
			}
			const manifest: Manifest = JSON.parse(
				fs.readFileSync(manifestFile, "utf-8"),
			);
			const byName = new Map(
				Object.values(manifest)
					.filter((entry) => entry.isEntry)
					.map((entry) => [entry.name, entry.file]),
			);

			const imports: Record<string, string> = {};
			for (const specifier of VENDOR_SPECIFIERS) {
				const file = byName.get(vendorEntryName(specifier));
				if (!file) {
					throw new Error(
						`Shared vendor manifest is missing an entry for "${specifier}"`,
					);
				}
				imports[specifier] = `/vendor/${file}`;
			}
			external = Object.keys(imports);
			importMapScript = `<script type="importmap">${JSON.stringify({ imports })}</script>`;

			return {
				build: {
					rollupOptions: {
						external,
					},
				},
			};
		},
		transformIndexHtml: {
			order: "pre",
			handler(html) {
				if (!importMapScript) return html;
				return html.replace(
					"<head>",
					`<head>\n\t${importMapScript}\n\t<link rel="stylesheet" href="/vendor/bootstrap-icons.css">`,
				);
			},
		},
	};
}
