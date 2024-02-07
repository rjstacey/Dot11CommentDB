import * as React from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";

import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ParagraphNode, TextNode } from "lexical";

import ListMaxIndentLevelPlugin from "./ListMaxIndentLevelPlugin";
import AutoLinkPlugin from "./AutoLinkPlugin";
import LinkEditorPlugin from "./LinkEditorPlugin";
import InportExportPlugin from "./ImportExportPlugin";
import RichTextPlugin from "./RichTextPlugin";
import RichTextNode from "./RichTextNode";
import RichParagraphNode from "./RichParagraphNode";

import styles from "./editor.module.css";

const theme = {
	ltr: "ltr",
	rtl: "rtl",
	paragraph: "paragraph",
	quote: "quote",
	heading: {
		h1: "h1",
		h2: "h2",
	},
	list: {
		nested: {
			listitem: "nested-listitem",
		},
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

const editorStyles: Record<string, string> = {
	paragraph: "font-size: 14px; lineHeight: 24px; margin: 16px 0",
	link: "color: #067df7; text-decoration: none;",
	quote: "font-family: 'TimesNewRoman', serif; margin: 10px 20px; padding: 0 0;",
	code: 'background-color: #f3f3f3; font-family: "Inconsolata", "Menlo", "Consolas", monospace; font-size: 16px; margin: 14px 0;',
	h1: "font-size: 24px; color: rgb(5, 5, 5); font-weight: 400; margin: 0; margin-bottom: 12px; padding: 0;",
	h2: "font-size: 15px; color: rgb(101, 103, 107); font-weight: 700; margin: 0; margin-top: 10px; padding: 0; text-transform: uppercase;",
	ul: "font-family: 'TimesNewRoman', serif; list-style-type: '— '",
	ol: "font-family: 'TimesNewRoman', serif;",
	strikethrough: "text-decoration: line-through;",
	underline: "text-decoration: underline;",
	bold: "font-weight: bold;",
	italic: "font-style: italic;",
	mark: "background-color: yellow;",
};

export function useEditorStylesheet(className: string) {
	React.useEffect(() => {
		const text = Object.entries(editorStyles)
			.map(([key, value]) => `.${className} .${key} {${value}}`)
			.join("\n");
		const stylesheet = new CSSStyleSheet();
		stylesheet.replaceSync(text);

		// Add theme stylesheet on mount and remove on unmount
		document.adoptedStyleSheets.push(stylesheet);
		return () => {
			document.adoptedStyleSheets.pop();
		};
	}, [className]);
}

const editorConfig = {
	namespace: "editor",
	// The editor theme
	theme,
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
		AutoLinkNode,
		ParagraphNode,
		RichParagraphNode,
		{
			replace: ParagraphNode,
			with: (node: ParagraphNode) => new RichParagraphNode(),
		},
		RichTextNode,
		{
			replace: TextNode,
			with: (node: TextNode) => new RichTextNode(node.__text),
		},
		TextNode,
	],
};

function Editor({
	className,
	style,
	value,
	onChange,
	readOnly,
	placeholder = "Enter text here...",
}: {
	className?: string;
	style?: React.CSSProperties;
	value: string | null;
	onChange: (value: string | null) => void;
	readOnly?: boolean;
	placeholder?: string;
}) {
	useEditorStylesheet(styles.container);

	return (
		<LexicalComposer initialConfig={editorConfig}>
			<RichTextPlugin
				className={className}
				style={style}
				placeholder={placeholder}
				readOnly={readOnly}
			/>
			<LinkEditorPlugin />
			<InportExportPlugin
				value={value}
				onChange={onChange}
				readOnly={readOnly}
			/>
			<HistoryPlugin />
			<ListPlugin />
			<LinkPlugin />
			<AutoLinkPlugin />
			<ListMaxIndentLevelPlugin maxDepth={4} />
		</LexicalComposer>
	);
}

export default Editor;
