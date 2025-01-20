import * as React from "react";
import { RichTextPlugin as LexicalRichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
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
	className,
	...props
}: {
	placeholder?: string;
	readOnly?: boolean;
} & React.ComponentProps<"div">) {
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
		<>
			<ToolbarPlugin shown={showToolbar} />
			<div
				className={
					styles.container +
					(readOnly ? ` readonly` : "") +
					(className ? ` ${className}` : "")
				}
				{...props}
			>
				<div style={{ width: "100%" }}>
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
				</div>

				{!readOnly && (
					<i className={styles.clear} onMouseDown={handleClear} />
				)}
			</div>
		</>
	);
}

export default RichTextPlugin;
