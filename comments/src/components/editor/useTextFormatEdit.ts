import { useState, useEffect, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	SELECTION_CHANGE_COMMAND,
	$getSelection,
	$isRangeSelection,
	RangeSelection,
	COMMAND_PRIORITY_LOW,
	FORMAT_TEXT_COMMAND,
	type TextFormatType,
} from "lexical";
import {
	$isLinkNode,
	$isAutoLinkNode,
	$createLinkNode,
	TOGGLE_LINK_COMMAND,
} from "@lexical/link";
import { $isAtNodeEnd } from "@lexical/selection";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";

export type { TextFormatType };

function getSelectedNode(selection: RangeSelection) {
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
		return $isAtNodeEnd(anchor) ? focusNode : anchorNode;
	}
}

export function useTextFormatEdit() {
	const [editor] = useLexicalComposerContext();
	const [isLink, setIsLink] = useState(false);
	const [isAutoLink, setIsAutoLink] = useState(false);
	const [formats, setFormats] = useState<TextFormatType[]>([]);

	useEffect(() => {
		function updateFormatState() {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				// Update text format
				const formats: TextFormatType[] = [];
				if (selection.hasFormat("bold")) formats.push("bold");
				if (selection.hasFormat("italic")) formats.push("italic");
				if (selection.hasFormat("underline")) formats.push("underline");
				if (selection.hasFormat("strikethrough"))
					formats.push("strikethrough");
				if (selection.hasFormat("code")) formats.push("code");
				setFormats(formats);

				// Update links
				const node = getSelectedNode(selection);
				setIsAutoLink(!!$findMatchingParent(node, $isAutoLinkNode));
				setIsLink(!!$findMatchingParent(node, $isLinkNode));
			}
			return false;
		}
		return mergeRegister(
			editor.registerUpdateListener(({ editorState }) => {
				editorState.read(updateFormatState);
			}),
			editor.registerCommand(
				SELECTION_CHANGE_COMMAND,
				updateFormatState,
				COMMAND_PRIORITY_LOW,
			),
		);
	}, [editor]);

	const insertLink = useCallback(() => {
		if (isAutoLink) {
			// Change to link node
			editor.update(() => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) return;
				const node = $findMatchingParent(
					getSelectedNode(selection),
					$isAutoLinkNode,
				);
				node?.replace($createLinkNode(node.getURL()), true);
			});
		} else {
			// Toggle link
			editor.dispatchCommand(
				TOGGLE_LINK_COMMAND,
				isLink ? null : "https://",
			);
		}
	}, [editor, isLink, isAutoLink]);

	const toggleFormat = useCallback(
		(format: TextFormatType) => {
			editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
		},
		[editor],
	);

	return {
		isLink,
		insertLink,
		toggleFormat,
		formats,
	};
}
