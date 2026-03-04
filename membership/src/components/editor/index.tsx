import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { HistoryExtension } from "@lexical/history";
import { ListExtension } from "@lexical/list";
import { AutoLinkNode, LinkExtension, LinkNode } from "@lexical/link";
import { RichTextExtension } from "@lexical/rich-text";
import { CodeExtension } from "@lexical/code";
import { AutoFocusExtension } from "@lexical/extension";
import { configExtension, defineExtension, EditorThemeClasses } from "lexical";

import { SubstitutionTagNode } from "./SubstitutionTagNode";
import { LocalAutoLinkExtension } from "./LocalAutoLinkExtension";
import { SubstitutionTagExtension } from "./SubstitutionTagExtension";
import { Editor } from "./Editor";

import { substitutionTags } from "@/hooks/emailSubstitutionTags";

const theme: EditorThemeClasses = {
	ltr: "ltr",
	rtl: "rtl",
	paragraph: "paragraph",
	quote: "quote",
	heading: { h1: "h1", h2: "h2", h3: "h3" },
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

const nodes = [AutoLinkNode, LinkNode, SubstitutionTagNode];

const editorExtension = defineExtension({
	name: "[root]",
	namespace: "Email Template Editor",
	nodes,
	dependencies: [
		HistoryExtension,
		AutoFocusExtension,
		RichTextExtension,
		ListExtension,
		CodeExtension,
		LinkExtension,
		LocalAutoLinkExtension,
		configExtension(SubstitutionTagExtension, { tags: substitutionTags }),
	],
	theme,
});

function EditorComposer(
	props: Omit<React.ComponentProps<typeof Editor>, "tags">,
) {
	return (
		<LexicalExtensionComposer
			extension={editorExtension}
			contentEditable={null}
		>
			<Editor {...props} tags={substitutionTags} />
		</LexicalExtensionComposer>
	);
}

export default EditorComposer;
