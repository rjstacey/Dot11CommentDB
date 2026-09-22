/**
 * The list of npm packages that are pre-built once into `build/vendor` and
 * shared (via an import map) across every app, instead of being bundled
 * separately into each app's own build output.
 *
 * Every app is served from the same origin, so the browser fetches each of
 * these files only once no matter how many apps are visited.
 */
export const VENDOR_SPECIFIERS = [
	"react",
	"react-dom",
	"react-dom/client",
	"react-redux",
	"redux-persist",
	"redux-logger",
	"@reduxjs/toolkit",
	"@piotr-cz/redux-persist-idb-storage",
	// Note: lexical/@lexical/* are intentionally NOT vendored - they are
	// imported almost entirely via deep subpaths (e.g.
	// "@lexical/react/LexicalComposerContext") rather than package roots,
	// which doesn't fit a flat specifier -> single-file vendor mapping.
	// They stay bundled per-app as before.
	"react-router",
	"react-bootstrap",
	"bootstrap",
	"d3",
	"luxon",
	"zod",
	"uuid",
	"clsx",
	"react-window",
	"react-draggable",
	"react-expanding-textarea",
	"lodash.debounce",
	"lodash.isempty",
	"lodash.isequal",
	"lodash.throttle",
] as const;

export type VendorSpecifier = (typeof VENDOR_SPECIFIERS)[number];

/** Turn a package specifier into a filesystem/chunk-safe name, e.g. "@lexical/react" -> "@lexical_react" */
export function vendorEntryName(specifier: string): string {
	return specifier.replace(/\//g, "_");
}
