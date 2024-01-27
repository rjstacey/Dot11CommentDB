import {
	DOMConversionMap,
	DOMConversionOutput,
	DOMExportOutput,
	ParagraphNode,
	SerializedParagraphNode,
	LexicalEditor,
	$applyNodeReplacement,
	ElementFormatType,
} from "lexical";

function convertParagraphElement(element: HTMLElement): DOMConversionOutput {
	const node = $createParagraphNode();
	if (element.style) {
		node.setFormat(element.style.textAlign as ElementFormatType);
		const indent = parseInt(element.style.textIndent, 10) / 20;
		if (indent > 0) {
			node.setIndent(indent);
		}
	}
	return { node };
}

export function $createParagraphNode(): ParagraphNode {
	return $applyNodeReplacement(new ParagraphNode());
}

export class RichParagraphNode extends ParagraphNode {
	static getType() {
		return "rich-paragraph";
	}

	static clone(node: RichParagraphNode): RichParagraphNode {
		return new RichParagraphNode();
	}

	static importJSON(
		serializedNode: SerializedParagraphNode
	): RichParagraphNode {
		return ParagraphNode.importJSON(serializedNode);
	}

	exportJSON(): SerializedParagraphNode {
		return {
			...super.exportJSON(),
			type: "rich-paragraph",
			version: 1,
		};
	}

	static importDOM(): DOMConversionMap | null {
		return {
			p: () => ({
				conversion: convertParagraphElement,
				priority: 1,
			}),
		};
	}

	exportDOM(editor: LexicalEditor): DOMExportOutput {
		const { element } = super.exportDOM(editor);

		// Drop the class and dir attributes
		let el = element as HTMLElement;
		el.removeAttribute("class");
		el.removeAttribute("dir");

		return { element };
	}
}

export default RichParagraphNode;
