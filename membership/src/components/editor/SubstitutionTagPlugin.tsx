import * as React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import {
	$createSubstitutionTagNode,
	$isSubstitutionTagNode,
	SubstitutionTagNode,
} from "./SubstitutionTagNode";

import {
	$createTextNode,
	$isTextNode,
	TextNode,
	$getSelection,
	$isRangeSelection,
	$isNodeSelection,
	LexicalNode,
} from "lexical";

function handleSubsitutionTagEdit(node: SubstitutionTagNode): void {
	// Check text content fully matches
	console.log("SubstitutionTag edit", node);
	const text = node.getTextContent();
	const match = /(.*)({{[A-Za-z_]+}})(.*)/.exec(text);
	if (match === null) {
		const newNode = $createTextNode(text);
		node.replace(newNode);
	} else {
		if (match[1]) {
			console.log("match[1]", match[1]);
			const prevSibling = node.getPreviousSibling();
			if (prevSibling && $isTextNode(prevSibling)) {
				prevSibling.spliceText(-1, 0, match[1]);
			} else {
				node.insertBefore($createTextNode(match[1]));
			}
		}

		if (match[3]) {
			console.log("match[3]", match[3]);
			const nextSibling = node.getNextSibling();
			if (nextSibling && $isTextNode(nextSibling)) {
				nextSibling.spliceText(0, 0, match[3]);
			} else {
				node.insertAfter($createTextNode(match[2]));
			}
		}

		if (match[2] !== text) {
			console.log("match[2]", match[2]);
			node.setTextContent(match[2]);
		}
	}
}

function handleTextEdit(node: TextNode): void {
	// Check text content fully matches
	console.log("TextNode edit", node, node.getTextContent());
	//const parent = node.getParent();
	//console.log("TextNodeEdit parent", parent, parent?.getChildren());
	const text = node.getTextContent();
	const match = /(.*)({{[A-Za-z_]+}})(.*)/.exec(text);
	if (match) {
		const selection = $getSelection();
		const selectedTextNode = selection
			? selection.getNodes().find($isTextNode)
			: undefined;

		const substitutionTagNode = $createSubstitutionTagNode(match[2]);
		let firstNode: TextNode;
		let lastNode: TextNode;

		if (match[1]) {
			firstNode = node;
			node.setTextContent(match[1]);
			node.insertAfter(substitutionTagNode);
			lastNode = substitutionTagNode;
		} else {
			firstNode = node.replace(substitutionTagNode);
			lastNode = firstNode;
		}
		if (match[3]) {
			lastNode = lastNode.insertAfter(
				$createTextNode(match[3])
			) as TextNode;
		}

		if (selectedTextNode && selectedTextNode === node) {
			if ($isRangeSelection(selection)) {
				let offset = selection.anchor.offset;
				let n: LexicalNode | null = firstNode;
				while (n && $isTextNode(n)) {
					if (offset > n.getTextContent().length) {
						offset -= n.getTextContent().length;
					} else {
						n.select(offset, offset);
						break;
					}
					n = n.getNextSibling();
				}
			} else if ($isNodeSelection(selection)) {
				lastNode.select(0, lastNode.getTextContent().length);
			}
		}
		const selection2 = $getSelection();
		console.log(selection2);
	}
}

export default function SubstitutionTagPlugin() {
	const [editor] = useLexicalComposerContext();

	React.useEffect(() => {
		if (!editor.hasNodes([SubstitutionTagNode])) {
			throw new Error(
				"SubstitutionTagPlugin: SubstitutionTagNode not registered on editor"
			);
		}

		return editor.registerNodeTransform(TextNode, (node: TextNode) => {
			if ($isSubstitutionTagNode(node)) {
				handleSubsitutionTagEdit(node);
			} else {
				handleTextEdit(node);
			}
		});
	}, [editor]);

	return null;
}
