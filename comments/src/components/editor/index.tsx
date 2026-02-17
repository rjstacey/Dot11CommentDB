import * as React from "react";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { HistoryExtension } from "@lexical/history";
import { ListExtension } from "@lexical/list";
import { LinkExtension, AutoLinkNode } from "@lexical/link";
import { RichTextExtension } from "@lexical/rich-text";
import {
	defineExtension,
	EditorThemeClasses,
	ParagraphNode,
	TextNode,
} from "lexical";

import AutoLink from "./AutoLink";
import RichTextPlugin from "./RichTextPlugin";
import RichTextNode from "./RichTextNode";
import RichParagraphNode from "./RichParagraphNode";
import { CodeExtension } from "@lexical/code";

const theme: EditorThemeClasses = {
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
		CodeExtension,
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
