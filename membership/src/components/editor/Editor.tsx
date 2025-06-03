import * as React from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { TreeView } from "@lexical/react/LexicalTreeView";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ParagraphNode } from "lexical";

import ListMaxIndentLevelPlugin from "./ListMaxIndentLevelPlugin";
import { ToolbarPlugin } from "./toolbar";
import AutoLinkPlugin from "./AutoLinkPlugin";
import LinkEditorPlugin from "./LinkEditorPlugin";
import InportExportPlugin from "./ImportExportPlugin";
import SubstitutionTagPlugin from "./SubstitutionTagPlugin";
import { SubstitutionTagNode } from "./SubstitutionTagNode";
import { emailStylesObj, htmlWithInlineStyle } from "./utils";

import css from "./editor.module.css";

const theme = {
	ltr: "ltr",
	rtl: "rtl",
	paragraph: "paragraph",
	quote: "quote",
	heading: { h1: "h1", h2: "h2" },
	list: {
		nested: { listitem: "nested-listitem" },
		ol: "ol",
		ul: "ul",
		listitem: "list-item",
	},
	image: "editor-image",
	link: "link",
	text: {
		bold: "bold",
		italic: "italic",
		underline: "underline",
		strikethrough: "strikethrough",
		code: "code",
	},
	code: "code",
};

const emailStylesText = Object.entries(emailStylesObj)
	.map(([key, value]) => `.${css.body} .${key} {${value}}`)
	.join("\n");
const emailStyles = new CSSStyleSheet();
emailStyles.replaceSync(emailStylesText);

const editorConfig = {
	namespace: "email",
	// The editor theme
	theme,
	// Handling of errors during update
	onError(error: unknown) {
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
		ParagraphNode,
		SubstitutionTagNode,
	],
};

function TreeViewPlugin() {
	const [editor] = useLexicalComposerContext();
	//return null;
	return <TreeView editor={editor} />;
}

const PLACEHOLDER_TEXT = "Email body here...";

function Placeholder() {
	return (
		<div className={css.body + " " + css.placeholder}>
			<p className="paragraph">{PLACEHOLDER_TEXT}</p>
		</div>
	);
}

function Editor({
	body,
	onChangeBody,
	tags,
	readOnly,
}: {
	body: string;
	onChangeBody: (value: string) => void;
	tags: string[];
	readOnly: boolean;
}) {
	React.useEffect(() => {
		// Add theme stylesheet on mount and remove on unmount
		document.adoptedStyleSheets.push(emailStyles);
		return () => {
			document.adoptedStyleSheets.pop();
		};
	}, []);

	if (readOnly) {
		body = htmlWithInlineStyle(body);
	}

	return (
		<LexicalComposer initialConfig={editorConfig}>
			<div className={css.content}>
				{readOnly ? (
					<div
						className={css.body}
						dangerouslySetInnerHTML={{ __html: body }}
					/>
				) : (
					<RichTextPlugin
						contentEditable={
							<ContentEditable className={css.body} />
						}
						placeholder={<Placeholder />}
						ErrorBoundary={LexicalErrorBoundary}
					/>
				)}
			</div>
			<ToolbarPlugin tags={tags} />
			<div className={css.treeView}>
				<TreeViewPlugin />
			</div>
			<LinkEditorPlugin />
			<InportExportPlugin
				value={body}
				onChange={onChangeBody}
				readOnly={readOnly}
			/>
			<HistoryPlugin />
			<AutoFocusPlugin />
			<ListPlugin />
			<LinkPlugin />
			<AutoLinkPlugin />
			<ListMaxIndentLevelPlugin maxDepth={7} />
			<SubstitutionTagPlugin tags={tags} />
		</LexicalComposer>
	);
}

export default Editor;
