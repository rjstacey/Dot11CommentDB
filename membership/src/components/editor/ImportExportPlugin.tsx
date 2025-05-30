import * as React from "react";

import { $getRoot, $isElementNode, LexicalNode } from "lexical";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $isLinkNode, $createAutoLinkNode } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import { useDebounce } from "dot11-components";

function recursivelyReplaceLinkWithAutoLink(node: LexicalNode) {
	if (!$isElementNode(node)) return;
	if (node.getChildren)
		node.getChildren().forEach(recursivelyReplaceLinkWithAutoLink);
	if ($isLinkNode(node)) {
		const url = node.getURL();
		const text = node.getTextContent();
		if (url === text || url === "mailto:" + text) {
			node.replace($createAutoLinkNode(url), true);
		}
	}
}

function InportExportPlugin({
	value,
	onChange,
	readOnly,
}: {
	value: string;
	onChange: (value: string) => void;
	readOnly: boolean;
}) {
	const [editor] = useLexicalComposerContext();
	const doneRef = React.useRef(false);

	const debouncedOnChange = useDebounce(() => {
		if (readOnly) return;
		editor.update(() => {
			const newValue = $generateHtmlFromNodes(editor, null);
			if (newValue !== value) {
				onChange(newValue);
			}
		});
	});

	React.useEffect(() => {
		if (doneRef.current || !value) return;
		doneRef.current = true;

		editor.update(() => {
			const parser = new DOMParser();
			// Convert string to DOM. But if the first body node is a text, then assume input is just text and not HTML.
			let dom = parser.parseFromString(value, "text/html");
			if (dom.body.firstChild?.nodeType === Node.TEXT_NODE) {
				const asHtml = value
					.split("\n")
					.map((t) => `<p>${t}</p>`)
					.join("");
				dom = parser.parseFromString(asHtml, "text/html");
			}
			const nodes = $generateNodesFromDOM(editor, dom);
			$getRoot().clear();
			$getRoot().append(...nodes);

			recursivelyReplaceLinkWithAutoLink($getRoot());
		});
	}, []);

	React.useEffect(() => {
		editor.setEditable(!readOnly);
	}, [editor, readOnly]);

	return (
		<OnChangePlugin
			onChange={debouncedOnChange}
			ignoreHistoryMergeTagChange
			ignoreSelectionChange
		/>
	);
}

export default InportExportPlugin;
