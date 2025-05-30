import * as React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$createTextNode,
	$isTextNode,
	TextNode,
	$getSelection,
	$isRangeSelection,
	$getNodeByKey,
	HISTORY_MERGE_TAG,
} from "lexical";
import { mergeRegister } from "@lexical/utils";

import {
	$createSubstitutionTagNode,
	$isSubstitutionTagNode,
	SubstitutionTagNode,
	SUBSTITUTION_TAG_PATTERN,
} from "./SubstitutionTagNode";

function handleSubsitutionTagEdit(
	node: SubstitutionTagNode,
	tags: string[]
): void {
	const textContent = node.getTextContent();
	const match = RegExp(SUBSTITUTION_TAG_PATTERN).exec(textContent);

	if (match === null) {
		node.replace($createTextNode(textContent));
	} else {
		const selection = $getSelection();
		let offset = -1;
		if (
			selection &&
			selection.getNodes().find($isSubstitutionTagNode) === node &&
			$isRangeSelection(selection)
		) {
			offset = selection.anchor.offset;
		}

		const beforeText = textContent.substring(0, match.index);
		const afterText = textContent.substring(match.index + match[0].length);

		if (beforeText) {
			let prevSibling = node.getPreviousSibling();
			if (prevSibling && $isTextNode(prevSibling)) {
				prevSibling = prevSibling.spliceText(-1, 0, beforeText);
			} else {
				prevSibling = $createTextNode(beforeText);
				node.insertBefore(prevSibling, true);
			}
			if (offset >= 0 && offset <= beforeText.length) {
				const offset = prevSibling.getTextContent().length;
				(prevSibling as TextNode).select(offset, offset);
			}
			offset -= beforeText.length;
		}

		const actualTag = match[1];
		const matchingTag = tags.find(
			(tag) => tag.toLowerCase() === actualTag.toLowerCase()
		);
		const text = `{{${matchingTag || actualTag}}}`;
		const valid = Boolean(matchingTag);
		if (node.getTextContent() !== text || node.getValid() !== valid) {
			node.setTextContent(text).setValid(valid);
		}
		offset -= match[0].length;

		if (afterText) {
			let nextSibling = node.getNextSibling();
			if (nextSibling && $isTextNode(nextSibling)) {
				nextSibling = nextSibling.spliceText(0, 0, afterText);
			} else {
				nextSibling = $createTextNode(afterText);
				node.insertAfter(nextSibling, true);
			}
			if (offset >= 0) {
				(nextSibling as TextNode).select(offset, offset);
			}
		}
	}
}

function handleTextEdit(node: TextNode, tags: string[]): void {
	const textContent = node.getTextContent();
	let match: RegExpExecArray | null = null;
	while (
		(match = RegExp(SUBSTITUTION_TAG_PATTERN, "g").exec(textContent)) !==
		null
	) {
		const selection = $getSelection();
		let offset = -1;
		if (
			selection &&
			selection.getNodes().find($isTextNode) === node &&
			$isRangeSelection(selection)
		) {
			offset = selection.anchor.offset;
		}

		const beforeText = textContent.substring(0, match.index);
		const afterText = textContent.substring(match.index + match[0].length);

		const actualTag = match[1];
		const matchingTag = tags.find(
			(tag) => tag.toLowerCase() === actualTag.toLowerCase()
		);
		const substitutionTagNode = $createSubstitutionTagNode(
			`{{${matchingTag || actualTag}}}`,
			Boolean(matchingTag)
		);

		if (beforeText) {
			node.setTextContent(beforeText);
			node.insertAfter(substitutionTagNode);
			if (offset >= 0 && offset < beforeText.length) {
				node.select(offset, offset);
			}
			offset -= beforeText.length;
		} else {
			node.replace(substitutionTagNode);
		}
		if (offset >= 0 && offset < match[0].length) {
			substitutionTagNode.select(offset, offset);
		}
		offset -= match[0].length;

		if (afterText) {
			const nextSibling = $createTextNode(afterText);
			substitutionTagNode.insertAfter(nextSibling);
			if (offset >= 0) {
				nextSibling.select(offset, offset);
			}
		}
	}
}

export default function SubstitutionTagPlugin({ tags }: { tags: string[] }) {
	const [editor] = useLexicalComposerContext();

	React.useEffect(() => {
		if (!editor.hasNodes([SubstitutionTagNode])) {
			throw new Error(
				"SubstitutionTagPlugin: SubstitutionTagNode not registered"
			);
		}

		return mergeRegister(
			editor.registerNodeTransform(
				SubstitutionTagNode,
				(node: SubstitutionTagNode) => {
					handleSubsitutionTagEdit(node, tags);
				}
			),
			editor.registerNodeTransform(TextNode, (node: TextNode) => {
				handleTextEdit(node, tags);
			}),
			/* When a SubstitutionTagNode is created, set the tag validity */
			editor.registerMutationListener(
				SubstitutionTagNode,
				(mutatedNodes) => {
					for (const [nodeKey, mutation] of mutatedNodes) {
						if (mutation === "created") {
							editor.update(
								() => {
									const node = $getNodeByKey(
										nodeKey
									) as SubstitutionTagNode;
									const tag = node.getTag();
									console.log(nodeKey, tag);
									const valid = tags.includes(tag);
									if (node.getValid() !== valid)
										node.setValid(valid);
								},
								{ tag: HISTORY_MERGE_TAG }
							);
						}
					}
				},
				{ skipInitialization: false }
			)
		);
	}, [editor]);

	return null;
}
