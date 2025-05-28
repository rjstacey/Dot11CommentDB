import * as React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	SELECTION_CHANGE_COMMAND,
	FORMAT_TEXT_COMMAND,
	$getSelection,
	$isRangeSelection,
	RangeSelection,
	COMMAND_PRIORITY_LOW,
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

export function FormatTextButtons({ disabled }: { disabled: boolean }) {
	const [editor] = useLexicalComposerContext();
	const [isBold, setIsBold] = React.useState(false);
	const [isItalic, setIsItalic] = React.useState(false);
	const [isUnderline, setIsUnderline] = React.useState(false);
	const [isStrikethrough, setIsStrikethrough] = React.useState(false);
	const [isCode, setIsCode] = React.useState(false);
	const [isLink, setIsLink] = React.useState(false);
	const [isAutoLink, setIsAutoLink] = React.useState(false);

	React.useEffect(() => {
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
				COMMAND_PRIORITY_LOW
			)
		);
	}, [editor]);

	const insertLink = React.useCallback(() => {
		if (isAutoLink) {
			// Change to link node
			editor.update(() => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) return;
				const node = $findMatchingParent(
					getSelectedNode(selection),
					$isAutoLinkNode
				);
				node?.replace($createLinkNode(node.getURL()), true);
			});
		} else {
			// Toggle link
			editor.dispatchCommand(
				TOGGLE_LINK_COMMAND,
				isLink ? null : "https://"
			);
		}
	}, [editor, isLink, isAutoLink]);

	return (
		<>
			<button
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
				}}
				className={isBold ? "active" : ""}
				aria-label="Format Bold"
				disabled={disabled}
			>
				<i className="bi-type-bold" />
			</button>
			<button
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
				}}
				className={isItalic ? "active" : ""}
				aria-label="Format Italics"
				disabled={disabled}
			>
				<i className="bi-type-italic" />
			</button>
			<button
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
				}}
				className={isUnderline ? "active" : ""}
				aria-label="Format Underline"
				disabled={disabled}
			>
				<i className="bi-type-underline" />
			</button>
			<button
				onClick={() => {
					editor.dispatchCommand(
						FORMAT_TEXT_COMMAND,
						"strikethrough"
					);
				}}
				className={isStrikethrough ? "active" : ""}
				aria-label="Format Strikethrough"
				disabled={disabled}
			>
				<i className="bi-type-strikethrough" />
			</button>
			<button
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
				}}
				className={isCode ? "active" : ""}
				aria-label="Insert Code"
				disabled={disabled}
			>
				<i className="bi-code" />
			</button>
			<button
				onClick={insertLink}
				className={isLink ? "active" : ""}
				aria-label="Insert Link"
				disabled={disabled}
			>
				<i className="bi-link" />
			</button>
		</>
	);
}
