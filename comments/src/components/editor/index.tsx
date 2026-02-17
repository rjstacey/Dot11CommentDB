import * as React from "react";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { HistoryExtension } from "@lexical/history";
import { ListExtension } from "@lexical/list";
import { LinkExtension, AutoLinkNode } from "@lexical/link";
import { RichTextExtension } from "@lexical/rich-text";
import { CodeExtension } from "@lexical/code";
import {
	defineExtension,
	EditorThemeClasses,
	ParagraphNode,
	TextNode,
} from "lexical";

import { Editor } from "./Editor";
import RichTextNode from "./RichTextNode";
import RichParagraphNode from "./RichParagraphNode";

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

function EditorComposer(props: React.ComponentProps<typeof Editor>) {
	return (
		<LexicalExtensionComposer
			extension={editorExtension}
			contentEditable={null}
		>
			<Editor {...props} />
		</LexicalExtensionComposer>
	);
}

export default EditorComposer;
