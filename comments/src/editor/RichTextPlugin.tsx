import * as React from "react";
import { RichTextPlugin as LexicalRichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $createParagraphNode } from "lexical";

import ToolbarPlugin from "./ToolbarPlugin";

import styles from "./editor.module.css";

const Placeholder = (props: React.ComponentProps<"i">) => (
	<div className={styles.placeholder + " " + styles.innerContainer}>
		<p>
			<i {...props} />
		</p>
	</div>
);

function RichTextPlugin({
	placeholder,
	readOnly,
}: {
	placeholder?: string;
	readOnly?: boolean;
}) {
	const [editor] = useLexicalComposerContext();
	const [showToolbar, setShowToolbar] = React.useState(false);

	const handleClear: React.MouseEventHandler = React.useCallback(
		(event) => {
			event.preventDefault();
			editor.update(() => {
				const node = $createParagraphNode();
				$getRoot().clear().append(node).selectEnd();
			});
		},
		[editor]
	);

	return (
		<div className={styles.container}>
			<ToolbarPlugin
				style={{ visibility: showToolbar ? "visible" : "hidden" }}
			/>
			<LexicalRichTextPlugin
				contentEditable={
					<ContentEditable
						className={styles.innerContainer}
						onFocus={() => setShowToolbar(true)}
						onBlur={() => setShowToolbar(false)}
					/>
				}
				placeholder={<Placeholder>{placeholder}</Placeholder>}
				ErrorBoundary={LexicalErrorBoundary}
			/>

			{!readOnly && (
				<i className={styles.clear} onMouseDown={handleClear} />
			)}
		</div>
	);
}

export default RichTextPlugin;
