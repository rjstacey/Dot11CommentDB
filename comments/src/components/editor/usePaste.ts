import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	PASTE_COMMAND,
	COMMAND_PRIORITY_NORMAL,
	LexicalEditor,
	BaseSelection,
	$createTabNode,
	$getSelection,
	$isRangeSelection,
	$isParagraphNode,
	$isTextNode,
} from "lexical";
import { $generateNodesFromDOM } from "@lexical/html";
import { ResnStatusType } from "@/store/comments";

const whitespaceOnlyRegex = /^[\s\u00A0]*$/;

const resnStatusRegex =
	/^\s*(accepted|accept)|(revised|revise)|(rejected|reject)\s*$/i;

function insertClipboardData(
	dataTransfer: DataTransfer,
	selection: BaseSelection,
	editor: LexicalEditor,
	onChangeResnStatus?: (value: ResnStatusType) => void, // present if editing resolution field
): void {
	const htmlString = dataTransfer.getData("text/html");
	const plainString = dataTransfer.getData("text/plain");

	// Skip HTML handling if it matches the plain text representation.
	// This avoids unnecessary processing for plain text strings created by
	// iOS Safari autocorrect, which incorrectly includes a `text/html` type.
	if (htmlString && plainString !== htmlString) {
		try {
			const parser = new DOMParser();
			const dom = parser.parseFromString(htmlString, "text/html");
			const nodes = $generateNodesFromDOM(editor, dom).filter(
				(node) =>
					!(
						($isParagraphNode(node) || $isTextNode(node)) &&
						whitespaceOnlyRegex.test(node.getTextContent())
					),
			); // Remove top-level text and paragraphs that contain only whitespace
			if (onChangeResnStatus) {
				// If the first paragraph looks like a resolution status, extract it and remove it from the pasted content
				const node = nodes[0];
				if (node && $isParagraphNode(node)) {
					const m = resnStatusRegex.exec(node.getTextContent());
					if (m) {
						const status = m[1] ? "A" : m[2] ? "V" : "J";
						onChangeResnStatus(status);
						nodes.splice(0, 1); // Remove the status node so it doesn't get pasted into the editor
					}
				}
			}
			selection.insertNodes(nodes);
			return;
		} catch (error) {
			console.error(error);
		}
	}

	// Multi-line plain text in rich text mode pasted as separate paragraphs
	// instead of single paragraph with linebreaks.
	// Webkit-specific: Supports read 'text/uri-list' in clipboard.
	const text = plainString || dataTransfer.getData("text/uri-list");
	if (text != null) {
		if ($isRangeSelection(selection)) {
			const parts = text.split(/(\r?\n|\t)/);
			if (parts[parts.length - 1] === "") {
				parts.pop();
			}
			for (let i = 0; i < parts.length; i++) {
				const currentSelection = $getSelection();
				if ($isRangeSelection(currentSelection)) {
					const part = parts[i];
					if (part === "\n" || part === "\r\n") {
						currentSelection.insertParagraph();
					} else if (part === "\t") {
						currentSelection.insertNodes([$createTabNode()]);
					} else {
						currentSelection.insertText(part);
					}
				}
			}
		} else {
			selection.insertRawText(text);
		}
	}
}

export function usePaste(onChangeResnStatus?: (value: ResnStatusType) => void) {
	const [editor] = useLexicalComposerContext();
	useEffect(() => {
		return editor.registerCommand<ClipboardEvent>(
			PASTE_COMMAND,
			(event) => {
				event.preventDefault();
				editor.update(() => {
					const selection = $getSelection();
					const clipboardData = event.clipboardData;
					if (clipboardData != null && $isRangeSelection(selection)) {
						insertClipboardData(
							clipboardData,
							selection,
							editor,
							onChangeResnStatus,
						);
					}
				});
				return true;
			},
			COMMAND_PRIORITY_NORMAL,
		);
	}, [editor, onChangeResnStatus]);
}
