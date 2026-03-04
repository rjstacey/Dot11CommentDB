import { useState, useCallback, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	SELECTION_CHANGE_COMMAND,
	$getSelection,
	$isRangeSelection,
	RangeSelection,
	COMMAND_PRIORITY_LOW,
	FORMAT_TEXT_COMMAND,
	TextFormatType,
} from "lexical";
import {
	$isLinkNode,
	$isAutoLinkNode,
	$createLinkNode,
	TOGGLE_LINK_COMMAND,
} from "@lexical/link";
import { $isAtNodeEnd } from "@lexical/selection";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";

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

export function useFormatText() {
	const [editor] = useLexicalComposerContext();
	const [isBold, setIsBold] = useState(false);
	const [isItalic, setIsItalic] = useState(false);
	const [isUnderline, setIsUnderline] = useState(false);
	const [isStrikethrough, setIsStrikethrough] = useState(false);
	const [isCode, setIsCode] = useState(false);
	const [isLink, setIsLink] = useState(false);
	const [isAutoLink, setIsAutoLink] = useState(false);

	useEffect(() => {
		function updateFormatState() {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				// Update text format
				setIsBold(selection.hasFormat("bold"));
				setIsItalic(selection.hasFormat("italic"));
				setIsUnderline(selection.hasFormat("underline"));
				setIsStrikethrough(selection.hasFormat("strikethrough"));
				setIsCode(selection.hasFormat("code"));

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

	const setFormat = useCallback(
		(format: TextFormatType) => {
			editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
		},
		[editor],
	);

	return {
		isBold,
		isItalic,
		isUnderline,
		isStrikethrough,
		isCode,
		isLink,
		insertLink,
		setFormat,
	};
}
