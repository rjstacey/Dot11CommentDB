import {
	DOMConversionMap,
	DOMConversionOutput,
	DOMExportOutput,
	TextNode,
	$isTextNode,
	SerializedTextNode,
	LexicalEditor,
	LexicalNode,
	$createTextNode,
	TextFormatType,
} from "lexical";

function wrapElementWith(
	element: HTMLElement | Text,
	tag: string,
): HTMLElement {
	const el = document.createElement(tag);
	el.appendChild(element);
	return el;
}

function convertTextDOMNode(domNode: Node): DOMConversionOutput {
	let textContent = domNode.textContent || "";
	textContent = textContent.replace(/\r/g, "").replace(/[ \t\n]+/g, " ");
	if (textContent === "") {
		return { node: null };
	}
	return { node: $createTextNode(textContent) };
}

const nodeNameToTextFormat: Record<string, TextFormatType> = {
	code: "code",
	em: "italic",
	i: "italic",
	s: "strikethrough",
	del: "strikethrough",
	strong: "bold",
	b: "bold",
	sub: "subscript",
	sup: "superscript",
	u: "underline",
	ins: "underline",
	mark: "highlight",
};

function convertTextFormatElement(domNode: Node): DOMConversionOutput {
	let format: TextFormatType | undefined =
		nodeNameToTextFormat[domNode.nodeName.toLowerCase()];

	// Google Docs wraps all copied HTML in a <b> with font-weight normal
	if (domNode.nodeName.toLowerCase() === "b") {
		const b = domNode as HTMLElement;
		if (b.style.fontWeight === "normal") format = undefined;
	}

	if (format === undefined) {
		return { node: null };
	}
	return {
		forChild: (lexicalNode) => {
			if ($isTextNode(lexicalNode) && !lexicalNode.hasFormat(format!)) {
				lexicalNode.toggleFormat(format!);
			}

			return lexicalNode;
		},
		node: null,
	};
}

function convertSpanElement(domNode: Node): DOMConversionOutput {
	// domNode is a <span> since we matched it by nodeName
	const span = domNode as HTMLSpanElement;
	// Google Docs uses span tags + font-weight for bold text
	const hasBoldFontWeight = span.style.fontWeight === "700";
	// Google Docs uses span tags + text-decoration: line-through for strikethrough text
	const hasLinethroughTextDecoration =
		span.style.textDecoration === "line-through";
	// Google Docs uses span tags + font-style for italic text
	const hasItalicFontStyle = span.style.fontStyle === "italic";
	// Google Docs uses span tags + text-decoration: underline for underline text
	const hasUnderlineTextDecoration =
		span.style.textDecoration === "underline";
	// Google Docs uses span tags + vertical-align to specify subscript and superscript
	const verticalAlign = span.style.verticalAlign;

	return {
		forChild: (lexicalNode) => {
			if (!$isTextNode(lexicalNode)) {
				return lexicalNode;
			}
			if (hasBoldFontWeight) {
				lexicalNode.toggleFormat("bold");
			}
			if (hasLinethroughTextDecoration) {
				lexicalNode.toggleFormat("strikethrough");
			}
			if (hasItalicFontStyle) {
				lexicalNode.toggleFormat("italic");
			}
			if (hasUnderlineTextDecoration) {
				lexicalNode.toggleFormat("underline");
			}
			if (verticalAlign === "sub") {
				lexicalNode.toggleFormat("subscript");
			}
			if (verticalAlign === "super") {
				lexicalNode.toggleFormat("superscript");
			}

			return lexicalNode;
		},
		node: null,
	};
}

export class RichTextNode extends TextNode {
	static getType() {
		return "rich-text";
	}

	static clone(node: RichTextNode): RichTextNode {
		return new RichTextNode(node.__text, node.__key);
	}

	isSimpleText() {
		return (
			(this.__type === "text" || this.__type === "rich-text") &&
			this.__mode === 0
		);
	}

	static importJSON(serializedNode: SerializedTextNode): RichTextNode {
		return TextNode.importJSON(serializedNode);
	}

	exportJSON(): SerializedTextNode {
		return {
			...super.exportJSON(),
			type: "rich-text",
			version: 1,
		};
	}

	static importDOM(): DOMConversionMap | null {
		const priority = 1;
		return {
			"#text": () => ({
				conversion: convertTextDOMNode,
				priority,
			}),
			span: () => ({
				conversion: convertSpanElement,
				priority,
			}),
			b: () => ({
				conversion: convertTextFormatElement,
				priority,
			}),
			code: () => ({
				conversion: convertTextFormatElement,
				priority,
			}),
			em: () => ({
				conversion: convertTextFormatElement,
				priority,
			}),
			i: () => ({
				conversion: convertTextFormatElement,
				priority,
			}),
			s: () => ({
				conversion: convertTextFormatElement,
				priority,
			}),
			del: () => ({
				conversion: convertTextFormatElement,
				priority,
			}),
			strong: () => ({
				conversion: convertTextFormatElement,
				priority,
			}),
			sub: () => ({
				conversion: convertTextFormatElement,
				priority,
			}),
			sup: () => ({
				conversion: convertTextFormatElement,
				priority,
			}),
			u: () => ({
				conversion: convertTextFormatElement,
				priority,
			}),
			ins: () => ({
				conversion: convertTextFormatElement,
				priority,
			}),
			mark: () => ({
				conversion: convertTextFormatElement,
				priority,
			}),
		};
	}

	exportDOM(editor: LexicalEditor): DOMExportOutput;
	exportDOM() {
		let element: HTMLElement | Text = document.createTextNode(this.__text);
		if (this.hasFormat("bold")) element = wrapElementWith(element, "b");
		if (this.hasFormat("italic")) element = wrapElementWith(element, "i");
		if (this.hasFormat("underline"))
			element = wrapElementWith(element, "u");
		if (this.hasFormat("strikethrough"))
			element = wrapElementWith(element, "s");
		if (this.hasFormat("highlight"))
			element = wrapElementWith(element, "mark");
		if (this.hasFormat("code")) {
			element = wrapElementWith(element, "code");
			element.setAttribute("spellcheck", "false");
		}

		return { element };
	}
}

export function $createRichTextNode(text: string): RichTextNode {
	return new RichTextNode(text);
}

export function $isRichTextNode(
	node: LexicalNode | null | undefined,
): node is RichTextNode {
	return node instanceof RichTextNode;
}

export default RichTextNode;
