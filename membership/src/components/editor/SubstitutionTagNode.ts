import type { Spread } from "lexical";

import {
	$createTextNode,
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
		valid: boolean;
		version: 1;
	},
	SerializedTextNode
>;

export const SUBSTITUTION_TAG_PATTERN = "{{([A-Za-z_-]+)}}";

function convertSubstitutionTagElement(
	domNode: HTMLElement
): DOMConversionOutput | null {
	const textContent = domNode.textContent;
	if (textContent) {
		const match = RegExp(SUBSTITUTION_TAG_PATTERN).exec(textContent);
		if (match) {
			const beforeText = textContent.slice(0, match.index);
			const afterText = textContent.slice(
				match.index + match[0].length,
				textContent.length
			);
			const node: LexicalNode[] = [];
			if (beforeText) node.push($createTextNode(beforeText));
			node.push($createSubstitutionTagNode(match[0]));
			if (afterText) node.push($createTextNode(afterText));
			return {
				node,
			};
		} else {
			return {
				node: $createTextNode(textContent),
			};
		}
	}

	return null;
}

const substitutionTagValidStyle = "background-color: rgba(24, 119, 232, 0.3)";
const substitutionTagInvalidStyle =
	"background-color: rgba(255, 0, 0, 0.3); text-decoration: red wavy underline";

export class SubstitutionTagNode extends TextNode {
	__valid = false;

	setTag(tag: string) {
		const self = this.getWritable();
		self.setTextContent(`{{${tag}}}`);
		return self;
	}

	getTag(): string {
		const self = this.getLatest();
		const match = RegExp(SUBSTITUTION_TAG_PATTERN).exec(
			self.getTextContent()
		);
		console.log("getTag", match, self.getTextContent());
		return match ? match[1] : "";
	}

	setValid(valid: boolean) {
		const self = this.getWritable();
		self.__valid = valid;
		return self;
	}

	getValid(): boolean {
		const self = this.getLatest();
		return self.__valid;
	}

	static getType(): string {
		return "substitution-tag";
	}

	static clone(node: SubstitutionTagNode): SubstitutionTagNode {
		return new SubstitutionTagNode(node.__text, node.__valid, node.__key);
	}

	static importJSON(
		serializedNode: SerializedSubstitutionTagNode
	): SubstitutionTagNode {
		const node = $createSubstitutionTagNode(serializedNode.text);
		node.setTextContent(serializedNode.text);
		node.setValid(serializedNode.valid);
		node.setFormat(serializedNode.format);
		node.setDetail(serializedNode.detail);
		node.setMode(serializedNode.mode);
		node.setStyle(serializedNode.style);
		return node;
	}

	constructor(text?: string, valid: boolean = false, key?: NodeKey) {
		super(text, key);
		this.__valid = valid;
	}

	exportJSON(): SerializedSubstitutionTagNode {
		return {
			...super.exportJSON(),
			valid: this.__valid,
			type: "substitution-tag",
			version: 1,
		};
	}

	createDOM(config: EditorConfig): HTMLElement {
		const dom = super.createDOM(config);
		dom.spellcheck = false;
		dom.style.cssText = this.__valid
			? substitutionTagValidStyle
			: substitutionTagInvalidStyle;
		dom.className = "substitution-tag";
		return dom;
	}

	updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
		super.updateDOM(prevNode, dom, config);
		if (prevNode.__valid !== this.__valid) {
			dom.style.cssText = this.__valid
				? substitutionTagValidStyle
				: substitutionTagInvalidStyle;
		}
		return false;
	}

	exportDOM(): DOMExportOutput {
		// Export as raw text
		const element = document.createTextNode(this.__text);
		return { element };
	}

	static importDOM(): DOMConversionMap | null {
		return {
			"#text": () => ({
				conversion: convertSubstitutionTagElement,
				priority: 0,
			}),
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

export function $createSubstitutionTagNode(
	text: string = "",
	valid: boolean = false
): SubstitutionTagNode {
	const node = new SubstitutionTagNode(text, valid);
	return node;
}

export function $isSubstitutionTagNode(
	node: LexicalNode | null | undefined
): node is SubstitutionTagNode {
	return node instanceof SubstitutionTagNode;
}
