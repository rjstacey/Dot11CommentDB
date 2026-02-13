import * as React from "react";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { HistoryExtension } from "@lexical/history";
import { ListExtension } from "@lexical/list";
import { LinkExtension, AutoLinkNode } from "@lexical/link";
import { RichTextExtension } from "@lexical/rich-text";
import { defineExtension, ParagraphNode, TextNode } from "lexical";

import AutoLink from "./AutoLink";
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
	paragraph: "lineHeight: 24px; margin: 16px 0",
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

const nodes = [
	AutoLinkNode,
	RichParagraphNode,
	{
		replace: ParagraphNode,
		with: () => new RichParagraphNode(),
		withKlass: RichParagraphNode,
	},
	RichTextNode,
	{
		replace: TextNode,
		with: (node: TextNode) => new RichTextNode(node.__text),
		withKlass: RichTextNode,
	},
];

const editorExtension = defineExtension({
	name: "[root]",
	namespace: "@802tools/comments",
	nodes,
	dependencies: [
		HistoryExtension,
		RichTextExtension,
		ListExtension,
		LinkExtension,
	],
	theme,
});

function Editor({
	id,
	className,
	style,
	value,
	onChange,
	submission,
	readOnly,
	placeholder = "Enter text here...",
}: {
	id?: string;
	className?: string;
	style?: React.CSSProperties;
	value: string | null;
	onChange: (value: string | null) => void;
	submission?: string | null;
	readOnly?: boolean;
	placeholder?: string;
}) {
	useEditorStylesheet(styles.container);

	return (
		<LexicalExtensionComposer
			extension={editorExtension}
			contentEditable={null}
		>
			<RichTextPlugin
				id={id}
				className={className}
				style={style}
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				readOnly={readOnly}
			/>
			<AutoLink submission={submission} />
		</LexicalExtensionComposer>
	);
}

export default Editor;
