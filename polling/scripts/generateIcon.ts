import fs from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { renderIcon } from "../src/icon";

const svgString = renderToStaticMarkup(renderIcon("802", "Poll"));
fs.writeFileSync("public/icon.svg", svgString);