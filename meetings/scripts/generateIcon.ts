import fs from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
// @ts-ignore
import { convert } from "convert-svg-to-png";
import { renderIcon } from "../src/icon";

const svgString = renderToStaticMarkup(renderIcon("802", "MTG"));
fs.writeFileSync("public/favicon.svg", svgString);

const png96x96 = await convert(svgString, {
	width: 96,
	height: 96,
});
fs.writeFileSync("public/favicon-96x96.png", png96x96);

const png192x192 = await convert(svgString, {
	width: 192,
	height: 192,
});
fs.writeFileSync("public/icon-192x192.png", png192x192);
fs.writeFileSync("public/apple-touch-icon.png", png192x192);

const png512x512 = await convert(svgString, {
	width: 512,
	height: 512,
});
fs.writeFileSync("public/icon-512x512.png", png512x512);
