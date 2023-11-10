import * as React from "react";
import styled from '@emotion/styled';

import { $getRoot, LexicalNode } from "lexical"

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";

import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { TRANSFORMERS } from "@lexical/markdown";
import { $isLinkNode, $createAutoLinkNode } from "@lexical/link";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';

import ListMaxIndentLevelPlugin from "./ListMaxIndentLevelPlugin";
import ToolbarPlugin from "./ToolbarPlugin";
import AutoLinkPlugin from "./AutoLinkPlugin";
import LinkEditorPlugin from "./LinkEditorPlugin";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import ExampleTheme, { editorCss } from "./EditorTheme";
import styles from "./Editor.module.css";

import { useDebounce } from "../components/useDebounce";

const placeholderEl = <div className={styles.placeholder}>Enter some rich text...</div>;

const editorConfig = {
    namespace: "MyEditor",
	// The editor theme
	theme: ExampleTheme,
	// Handling of errors during update
	onError(error: any) {
		throw error;
	},
	// Any custom nodes go here
	nodes: [
		HeadingNode,
		ListNode,
		ListItemNode,
		QuoteNode,
		CodeNode,
		TableNode,
		TableCellNode,
		TableRowNode,
		AutoLinkNode,
		LinkNode,
	],
};

function recursivelyReplaceLinkWithAutoLink(node: LexicalNode) {
	if (!node)
		return;
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
	defaultValue,
	onChange,
	readOnly
}: {
	defaultValue: string;
	onChange: (value: string) => void;
	readOnly: boolean;
}) {
	const [editor] = useLexicalComposerContext();
	const doneRef = React.useRef(false);

	const debouncedOnChange = useDebounce(() => {
		if (readOnly)
			return;
		editor.update(() => {
			const value = $generateHtmlFromNodes(editor, null);
			onChange(value);
		});
	});

	React.useEffect(() => {
		if (doneRef.current || !defaultValue) return;
		doneRef.current = true;

		editor.update(() => {
			const parser = new DOMParser();
			// Convert string to DOM. But if the first body node is a text, then assume input is just text and not HTML.
			let dom = parser.parseFromString(defaultValue, "text/html");
			if (dom.body.firstChild?.nodeType === Node.TEXT_NODE) {
				const value = defaultValue.split('\n').map(t => `<p>${t}</p>`).join('');
				dom = parser.parseFromString(value, "text/html");
			}
			const nodes = $generateNodesFromDOM(editor, dom);
			$getRoot().getChildren().forEach(c => c.remove());
			$getRoot().append(...nodes);

			recursivelyReplaceLinkWithAutoLink($getRoot());
		});
	}, []);	// eslint-disable-line react-hooks/exhaustive-deps

	React.useEffect(() => {
		editor.setEditable(!readOnly)
	}, [editor, readOnly])

	return (
		<OnChangePlugin
			onChange={debouncedOnChange}
			ignoreHistoryMergeTagChange
			ignoreSelectionChange
		/>
	)
};

const InnerContainer = styled.div`
	position: relative;
	border: #eee solid 2px;
	border-top: none;
	border-bottom-left-radius: 10px;
	border-bottom-right-radius: 10px;

	${editorCss}
`;

function Editor({
	subject,
	defaultBody,
	onChangeSubject,
	onChangeBody,
	readOnly
}: {
	subject: string;
	defaultBody: string;
	onChangeSubject: (value: string) => void;
	onChangeBody: (value: string) => void;
	readOnly: boolean;
}) {

	return (
		<LexicalComposer
			initialConfig={editorConfig}
		>
			<div>
				<ToolbarPlugin />
				<HistoryPlugin />
				<InnerContainer>
					<div className={styles.subjectContainer}>
						<label>Subject:</label>
						{readOnly?
						<span>{subject}</span>:
						<input
							type="text"
							value={subject}
							onChange={(e) => {onChangeSubject(e.target.value)}}
						/>}
					</div>
					<RichTextPlugin
						contentEditable={<ContentEditable className={styles.bodyContainer} />}
						placeholder={placeholderEl}
						ErrorBoundary={LexicalErrorBoundary}
					/>
					<InportExportPlugin
						defaultValue={defaultBody}
						onChange={onChangeBody}
						readOnly={readOnly}
					/>
					<AutoFocusPlugin />
					<ListPlugin />
					<LinkPlugin />
					<AutoLinkPlugin />
					<LinkEditorPlugin />
					<ListMaxIndentLevelPlugin maxDepth={7} />
					<MarkdownShortcutPlugin transformers={TRANSFORMERS} />
				</InnerContainer>
			</div>
		</LexicalComposer>
	);
}

export default Editor;
