import * as React from "react";

import { $getRoot, $isElementNode, type LexicalNode } from "lexical";
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
	value: string | null;
	onChange: (value: string | null) => void;
	readOnly?: boolean;
}) {
	const [editor] = useLexicalComposerContext();
	const doneRef = React.useRef(false);

	const debouncedOnChange = useDebounce(() => {
		if (readOnly) return;
		editor.update(() => {
			let newValue = $getRoot().getTextContent()
				? $generateHtmlFromNodes(editor)
				: "";
			if (newValue !== value) {
				onChange(newValue);
			}
		});
	});

	React.useEffect(() => {
		if (doneRef.current) return;
		doneRef.current = true;

		editor.update(
			() => {
				$getRoot().clear();
				//if (value) {
					let s = value || "";
					s = s.replace(/<p><br><\/p>/g, '')
					s = s.replace(/[\r\n]+/g, '');
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
					$getRoot().select().insertNodes(nodes);
				//}
				//console.log(nodes);

				recursivelyReplaceLinkWithAutoLink($getRoot());
			},
			{
				onUpdate: () => {
					editor.blur();
				},
			}
		);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

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
