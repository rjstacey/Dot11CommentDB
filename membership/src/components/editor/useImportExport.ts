import { useState, useEffect } from "react";
import {
	$getRoot,
	$isElementNode,
	$addUpdateTag,
	SKIP_DOM_SELECTION_TAG,
	HISTORY_MERGE_TAG,
	type LexicalNode,
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

export function useImportExport(
	value: string,
	onChange: (value: string) => void,
	readOnly?: boolean,
) {
	const [editor] = useLexicalComposerContext();
	const [output, setOutput] = useState<string | null>(null);

	useEffect(() => {
		// If the value in is different from what was sent out, then update the editor state
		//if (output === value) return;
		editor.update(() => {
			const parser = new DOMParser();
			// Convert string to DOM. But if the first body node is a text, then assume input is just text and not HTML.
			let dom = parser.parseFromString(value, "text/html");
			if (
				dom.body.firstChild === null ||
				dom.body.firstChild.nodeType === Node.TEXT_NODE
			) {
				const asHtml = value
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
	}, [value !== output]);

	const triggerSave = useDebounce(() => {
		editor.read(() => {
			const newValue = $getRoot().getTextContent()
				? $generateHtmlFromNodes(editor)
				: "";
			//if (newValue != value) {
			onChange(newValue);
			setOutput(newValue);
			//}
		});
	});

	useEffect(() => {
		return editor.registerUpdateListener(
			({ dirtyElements, dirtyLeaves, prevEditorState, tags }) => {
				if (readOnly) return;
				if (
					(dirtyElements.size === 0 && dirtyLeaves.size === 0) ||
					tags.has(HISTORY_MERGE_TAG) ||
					prevEditorState.isEmpty()
				) {
					return;
				}

				triggerSave();
			},
		);
	}, [editor, onChange, readOnly]);

	useEffect(() => {
		editor.setEditable(!readOnly);
	}, [editor, readOnly]);
}
