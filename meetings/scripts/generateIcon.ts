import fs from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { renderIcon } from "../src/icon";

const svgString = renderToStaticMarkup(renderIcon("802", "MTG"));
fs.writeFileSync("public/favicon.svg", svgString);
