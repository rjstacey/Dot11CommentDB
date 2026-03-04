import { useEffect } from "react";
import cx from "clsx";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
//import { TreeView } from "@lexical/react/LexicalTreeView";
//import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import { Toolbar } from "./toolbar";
import { LinkEditor } from "./LinkEditor";
import { emailStylesObj, htmlWithInlineStyle } from "./utils";

import css from "./editor.module.css";
import "./editor-style.css";

import { useImportExport } from "./useImportExport";

const emailStylesText = Object.entries(emailStylesObj)
	.map(([key, value]) => `.${css.body} .${key} {${value}}`)
	.join("\n");
const emailStyles = new CSSStyleSheet();
emailStyles.replaceSync(emailStylesText);

function TreeViewPlugin() {
	return null;
	/*const [editor] = useLexicalComposerContext();
	return (
		<div className={css.treeView}>
			<TreeView editor={editor} />
		</div>
	);*/
}

const PLACEHOLDER_TEXT = "Email body here...";
const PLACEHOLDER = (
	<div className={cx(css.body, css.placeholder)}>
		<p className="paragraph">{PLACEHOLDER_TEXT}</p>
	</div>
);

function ContentPreview({
	className,
	children,
}: {
	className?: string;
	children: string;
}) {
	const html = htmlWithInlineStyle(children);
	return (
		<div className={className} dangerouslySetInnerHTML={{ __html: html }} />
	);
}

export function Editor({
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
	useEffect(() => {
		// Add theme stylesheet on mount and remove on unmount
		document.adoptedStyleSheets.push(emailStyles);
		return () => {
			document.adoptedStyleSheets.pop();
		};
	}, []);

	useImportExport(body, onChangeBody, readOnly);

	return (
		<>
			<div className={css.content}>
				{readOnly ? (
					<ContentPreview className={css.body}>{body}</ContentPreview>
				) : (
					<ContentEditable
						className={cx(css.body, "editor-style")}
						aria-placeholder={PLACEHOLDER_TEXT}
						placeholder={PLACEHOLDER}
					/>
				)}
			</div>
			<LinkEditor />
			<Toolbar tags={tags} />
			<TreeViewPlugin />
		</>
	);
}
