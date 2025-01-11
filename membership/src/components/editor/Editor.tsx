import * as React from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";

import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ParagraphNode } from "lexical";

import ListMaxIndentLevelPlugin from "./ListMaxIndentLevelPlugin";
import ToolbarPlugin from "./ToolbarPlugin";
import AutoLinkPlugin from "./AutoLinkPlugin";
import LinkEditorPlugin from "./LinkEditorPlugin";
import InportExportPlugin from "./ImportExportPlugin";

import css from "./editor.module.css";

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

const emailStylesObj: Record<string, string> = {
	paragraph: "font-size: 14px; line-height: 24px; margin: 16px 0",
	link: "color: #067df7; text-decoration: none;",
	quote: "font-family: 'TimesNewRoman', serif; margin: 10px 20px; padding: 0 0;",
	code: 'background-color: #f3f3f3; font-family: "Inconsolata", "Menlo", "Consolas", monospace; font-size: 16px; margin: 14px 0;',
	h1: "font-size: 24px; color: rgb(5, 5, 5); font-weight: 400; margin: 0; margin-bottom: 12px; padding: 0;",
	h2: "font-size: 15px; color: rgb(101, 103, 107); font-weight: 700; margin: 0; margin-top: 10px; padding: 0; text-transform: uppercase;",
	ul: "font-family: 'TimesNewRoman', serif; list-style-type: '— '",
	strikethrough: "text-decoration: line-through;",
	underline: "text-decoration: underline;",
	bold: "font-weight: bold;",
	italic: "font-style: italic;",
};

const emailStylesText = Object.entries(emailStylesObj)
	.map(([key, value]) => `.${css.body} .${key} {${value}}`)
	.join("\n");
const emailStyles = new CSSStyleSheet();
emailStyles.replaceSync(emailStylesText);

function substituteStyleForClass(n: HTMLElement) {
	let styles = [n.style.cssText];
	n.classList.forEach((cn) => {
		if (Object.keys(emailStylesObj).includes(cn)) {
			styles.push(emailStylesObj[cn]);
			n.classList.remove(cn);
		}
	});
	styles = styles.filter((s) => Boolean(s));
	if (styles.length > 0) n.style.cssText = styles.join("; ");
}

function recurseHtmlElements(n: Node) {
	if (n instanceof HTMLElement) {
		substituteStyleForClass(n);
	}
	n.childNodes.forEach(recurseHtmlElements);
}

export function replaceClassWithInlineStyle(body: string) {
	const parser = new DOMParser();
	let dom = parser.parseFromString(body, "text/html");
	dom.childNodes.forEach(recurseHtmlElements);
	return dom.documentElement.innerHTML;
}

const editorConfig = {
	namespace: "email",
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
		ParagraphNode,
	],
};

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
	readOnly,
}: {
	body: string;
	onChangeBody: (value: string) => void;
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
		body = replaceClassWithInlineStyle(body);
		//console.log(body);
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
			<ToolbarPlugin />
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
		</LexicalComposer>
	);
}

export default Editor;
