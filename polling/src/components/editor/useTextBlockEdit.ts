import { useEffect, useCallback, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$getSelection,
	$isRangeSelection,
	$createParagraphNode,
	ElementNode,
	SELECTION_CHANGE_COMMAND,
	COMMAND_PRIORITY_LOW,
} from "lexical";
import { $setBlocksType } from "@lexical/selection";
import {
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
	REMOVE_LIST_COMMAND,
	$isListNode,
	ListNode,
	ListNodeTagType,
} from "@lexical/list";
import {
	$createHeadingNode,
	$createQuoteNode,
	$isHeadingNode,
	$isQuoteNode,
	HeadingTagType,
} from "@lexical/rich-text";
import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";

export type TextBlockType =
	| "paragraph"
	| HeadingTagType // h1, h2, h3, etc.
	| ListNodeTagType // ul, ol
	| "quote"
	| "code";

export function useTextBlockSelect() {
	const [editor] = useLexicalComposerContext();
	const [blockType, setBlockType] = useState<TextBlockType>("paragraph");

	const onChange = useCallback(
		(value: TextBlockType) => {
			if (value === "ul") {
				editor.dispatchCommand(
					blockType !== "ul"
						? INSERT_UNORDERED_LIST_COMMAND
						: REMOVE_LIST_COMMAND,
					undefined,
				);
				return;
			}
			if (value === "ol") {
				editor.dispatchCommand(
					blockType !== "ol"
						? INSERT_ORDERED_LIST_COMMAND
						: REMOVE_LIST_COMMAND,
					undefined,
				);
				return;
			}
			if (value === blockType) value = "paragraph";
			editor.update(() => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) return;
				let node: ElementNode;
				if (value === "quote") node = $createQuoteNode();
				else if (value === "code") node = $createCodeNode();
				else if (value === "h1" || value === "h2" || value === "h3")
					node = $createHeadingNode(value);
				else node = $createParagraphNode();
				$setBlocksType(selection, () => node);
			});
		},
		[editor, blockType],
	);

	useEffect(() => {
		function updateValues() {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) return false;
			const anchorNode = selection.anchor.getNode();
			const element =
				anchorNode.getKey() === "root"
					? anchorNode
					: anchorNode.getTopLevelElementOrThrow();
			const elementKey = element.getKey();
			const elementDOM = editor.getElementByKey(elementKey);
			if (elementDOM !== null) {
				let type: TextBlockType;
				if ($isListNode(element)) {
					const parentList = $getNearestNodeOfType(
						anchorNode,
						ListNode,
					);
					type = parentList ? parentList.getTag() : element.getTag();
				} else if ($isHeadingNode(element)) {
					type = element.getTag();
				} else if ($isQuoteNode(element)) {
					type = "quote";
				} else if ($isCodeNode(element)) {
					type = "code";
				} else {
					type = "paragraph";
				}
				setBlockType(type);
			}
			return false;
		}
		return mergeRegister(
			editor.registerCommand(
				SELECTION_CHANGE_COMMAND,
				updateValues,
				COMMAND_PRIORITY_LOW,
			),
			editor.registerUpdateListener(({ editorState }) => {
				editorState.read(updateValues);
			}),
		);
	}, [editor]);

	return { value: blockType, onChange };
}
