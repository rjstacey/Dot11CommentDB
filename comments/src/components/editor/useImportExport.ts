import * as React from "react";
import {
	$getRoot,
	$isElementNode,
	$addUpdateTag,
	SKIP_DOM_SELECTION_TAG,
	type LexicalNode,
	HISTORY_MERGE_TAG,
} from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $isLinkNode, $createAutoLinkNode } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useDebounce } from "@common";

function $recursivelyReplaceLinkWithAutoLink(node: LexicalNode) {
	if (!$isElementNode(node)) return;
	if (node.getChildren)
		node.getChildren().forEach($recursivelyReplaceLinkWithAutoLink);
	if ($isLinkNode(node)) {
		const url = node.getURL();
		const text = node.getTextContent();
		if (url === text || url === "mailto:" + text) {
			node.replace($createAutoLinkNode(url), true);
		}
	}
}

export function useImportExport({
	value,
	onChange,
	readOnly,
}: {
	value: string | null;
	onChange: (value: string | null) => void;
	readOnly?: boolean;
}) {
	const [editor] = useLexicalComposerContext();
	const [output, setOutput] = React.useState<string | null>(null);

	React.useEffect(() => {
		// If the value in is different from what was sent out, then update the editor state
		if (output === value) return;
		editor.update(() => {
			let s = value || "";
			s = s.replace(/<p><br><\/p>/g, "");
			s = s.replace(/[\r\n]+/g, "");
			const parser = new DOMParser();
			// Convert string to DOM. But if the first body node is a text, then assume input is just text and not HTML.
			let dom = parser.parseFromString(s, "text/html");
			if (
				dom.body.firstChild === null ||
				dom.body.firstChild.nodeType === Node.TEXT_NODE
			) {
				const asHtml = s
					.split("\n")
					.map((t) => `<p>${t}</p>`)
					.join("");
				dom = parser.parseFromString(asHtml, "text/html");
			}
			const nodes = $generateNodesFromDOM(editor, dom);
			$getRoot().clear().select().insertNodes(nodes);

			$recursivelyReplaceLinkWithAutoLink($getRoot());

			$addUpdateTag(SKIP_DOM_SELECTION_TAG); // Don't take focus

			setOutput(value);
		});
	}, [value]);

	const debouncedOnChange = useDebounce(() => {
		if (readOnly) return;
		editor.read(() => {
			const newValue = $getRoot().getTextContent()
				? $generateHtmlFromNodes(editor)
				: "";
			if (newValue != value) {
				onChange(newValue);
				setOutput(newValue);
			}
		});
	});

	React.useEffect(() => {
		return editor.registerUpdateListener(
			({ dirtyElements, dirtyLeaves, prevEditorState, tags }) => {
				if (
					(dirtyElements.size === 0 && dirtyLeaves.size === 0) ||
					tags.has(HISTORY_MERGE_TAG) ||
					prevEditorState.isEmpty()
				) {
					return;
				}

				debouncedOnChange();
			},
		);
	}, [editor, debouncedOnChange]);

	React.useEffect(() => {
		editor.setEditable(!readOnly);
	}, [editor, readOnly]);
}
