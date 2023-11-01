import * as React from "react";
import styled from '@emotion/styled';

import ExampleTheme, { editorCss } from "./EditorTheme";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
//import TreeViewPlugin from "./plugins/TreeViewPlugin";
import ToolbarPlugin from "./plugins/ToolbarPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";

import ListMaxIndentLevelPlugin from "./plugins/ListMaxIndentLevelPlugin";
import AutoLinkPlugin from "./plugins/AutoLinkPlugin";
import "./styles.css";
import { $getRoot } from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import LinkEditorPlugin from "./plugins/LinkEditorPlugin";

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

function InportExportPlugin({ defaultValue, onChange }: { defaultValue: string, onChange: (value: string) => void }) {
	const [editor] = useLexicalComposerContext();
	const doneRef = React.useRef(false);

	const debouncedOnChange = useDebounce(() => {
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
		});
	}, []);	// eslint-disable-line react-hooks/exhaustive-deps

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
	${editorCss}
`;

function Editor({
	defaultValue,
	onChange
}: {
	defaultValue: string;
	onChange: (value: string) => void}
) {
	return (
		<LexicalComposer initialConfig={editorConfig}>
			<div className={styles.container}>
				<ToolbarPlugin />
				<InnerContainer>
					<RichTextPlugin
						contentEditable={<ContentEditable className={styles.input} />}
						placeholder={placeholderEl}
						ErrorBoundary={LexicalErrorBoundary}
					/>
					<InportExportPlugin
						defaultValue={defaultValue}
						onChange={onChange}
					/>
					<HistoryPlugin />
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
