import type { Spread } from "lexical";

import {
	DOMConversionMap,
	DOMConversionOutput,
	DOMExportOutput,
	EditorConfig,
	LexicalNode,
	NodeKey,
	SerializedTextNode,
	TextNode,
} from "lexical";

export type SerializedSubstitutionTagNode = Spread<
	{
		type: "substitution-tag";
		version: 1;
	},
	SerializedTextNode
>;

function convertSubstitutionTagElement(
	domNode: HTMLElement
): DOMConversionOutput | null {
	const textContent = domNode.textContent;

	if (textContent) {
		const node = $createSubstitutionTagNode(textContent);
		return {
			node,
		};
	}

	return null;
}

const substitutionTagStyle = "background-color: rgba(24, 119, 232, 0.2)";

export class SubstitutionTagNode extends TextNode {
	static getType(): string {
		return "substitution-tag";
	}

	static clone(node: SubstitutionTagNode): SubstitutionTagNode {
		return new SubstitutionTagNode(node.__text, node.__key);
	}

	static importJSON(
		serializedNode: SerializedSubstitutionTagNode
	): SubstitutionTagNode {
		const node = $createSubstitutionTagNode(serializedNode.text);
		node.setTextContent(serializedNode.text);
		node.setFormat(serializedNode.format);
		node.setDetail(serializedNode.detail);
		node.setMode(serializedNode.mode);
		node.setStyle(serializedNode.style);
		return node;
	}

	constructor(text?: string, key?: NodeKey) {
		super(text, key);
	}

	exportJSON(): SerializedSubstitutionTagNode {
		return {
			...super.exportJSON(),
			type: "substitution-tag",
			version: 1,
		};
	}

	createDOM(config: EditorConfig): HTMLElement {
		const dom = super.createDOM(config);
		dom.style.cssText = substitutionTagStyle;
		dom.className = "substitution-tag";
		return dom;
	}

	exportDOM(): DOMExportOutput {
		const element = document.createElement("span");
		element.setAttribute("data-lexical-substitution-tag", "true");
		element.textContent = this.__text;
		return { element };
	}

	static importDOM(): DOMConversionMap | null {
		return {
			span: (domNode: HTMLElement) => {
				if (!domNode.hasAttribute("data-lexical-substitution-tag")) {
					return null;
				}
				return {
					conversion: convertSubstitutionTagElement,
					priority: 1,
				};
			},
		};
	}

	isSegmented(): false {
		return false;
	}

	isTextEntity(): true {
		return true;
	}

	isToken(): false {
		return false;
	}
}

export function $createSubstitutionTagNode(text: string): SubstitutionTagNode {
	const node = new SubstitutionTagNode(text);
	node.setMode("segmented").toggleDirectionless();
	return node;
}

export function $isSubstitutionTagNode(
	node: LexicalNode | null | undefined
): node is SubstitutionTagNode {
	return node instanceof SubstitutionTagNode;
}
