import { $isAtNodeEnd } from "@lexical/selection";
import { RangeSelection, ElementNode, TextNode } from "lexical";

export const emailStylesObj: Record<string, string> = {
	paragraph: "font-size: 14px; line-height: 24px; margin: 16px 0",
	link: "color: #067df7; text-decoration: none;",
	quote: "font-family: 'TimesNewRoman', serif; margin: 10px 20px; padding: 0 0;",
	code: 'background-color: #f3f3f3; font-family: "Inconsolata", "Menlo", "Consolas", monospace; font-size: 16px; margin: 14px 0;',
	h1: "font-size: 24px; color: rgb(5, 5, 5); font-weight: 400; margin: 0; margin-bottom: 12px; padding: 0;",
	h2: "font-size: 15px; color: rgb(101, 103, 107); font-weight: 700; margin: 0; margin-top: 10px; padding: 0; text-transform: uppercase;",
	ul: "font-family: 'TimesNewRoman', serif; list-style-type: '— '",
	strikethrough: "text-decoration: line-through;",
	underline: "text-decoration: underline;",
	bold: "font-weight: bold;",
	italic: "font-style: italic;",
};

function substituteStyleForClass(n: HTMLElement) {
	let styles = [n.style.cssText];
	n.classList.forEach((cn) => {
		if (Object.keys(emailStylesObj).includes(cn)) {
			styles.push(emailStylesObj[cn]);
			n.classList.remove(cn);
		}
	});
	styles = styles.filter((s) => Boolean(s));
	if (styles.length > 0) n.style.cssText = styles.join("; ");
}

function recurseHtmlElements(n: Node) {
	if (n instanceof HTMLElement) {
		substituteStyleForClass(n);
	}
	n.childNodes.forEach(recurseHtmlElements);
}

export function replaceClassWithInlineStyle(body: string) {
	const parser = new DOMParser();
	const dom = parser.parseFromString(body, "text/html");
	dom.childNodes.forEach(recurseHtmlElements);
	return dom.documentElement.innerHTML;
}

const SUPPORTED_URL_PROTOCOLS = new Set([
	"http:",
	"https:",
	"mailto:",
	"sms:",
	"tel:",
]);

export function sanitizeUrl(url: string): string {
	try {
		const parsedUrl = new URL(url);
		if (!SUPPORTED_URL_PROTOCOLS.has(parsedUrl.protocol)) {
			return "about:blank";
		}
	} catch {
		return url;
	}
	return url;
}

export function getSelectedNode(
	selection: RangeSelection
): TextNode | ElementNode {
	const anchor = selection.anchor;
	const focus = selection.focus;
	const anchorNode = selection.anchor.getNode();
	const focusNode = selection.focus.getNode();
	if (anchorNode === focusNode) {
		return anchorNode;
	}
	const isBackward = selection.isBackward();
	if (isBackward) {
		return $isAtNodeEnd(focus) ? anchorNode : focusNode;
	} else {
		return $isAtNodeEnd(anchor) ? anchorNode : focusNode;
	}
}
