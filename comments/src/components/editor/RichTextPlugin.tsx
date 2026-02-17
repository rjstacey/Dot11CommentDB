import * as React from "react";
import cx from "clsx";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $createParagraphNode } from "lexical";

import ToolbarPlugin from "./ToolbarPlugin";
import LinkEditorPlugin from "./LinkEditorPlugin";
import { useImportExport } from "./useImportExport";
import { usePaste } from "./usePaste";

import styles from "./editor.module.css";
import "./editor-style.css";

const Placeholder = (props: React.ComponentProps<"i">) => (
	<div className={styles.placeholder + " " + styles.innerContainer}>
		<p>
			<i {...props} />
		</p>
	</div>
);

function RichTextPlugin({
	value,
	onChange,
	placeholder,
	readOnly,
	className,
	id,
	style,
}: {
	value: string | null;
	onChange: (value: string | null) => void;
	id?: string;
	className?: string;
	style?: React.CSSProperties;
	placeholder?: string;
	readOnly?: boolean;
}) {
	const [editor] = useLexicalComposerContext();

	useImportExport({ value, onChange, readOnly });
	usePaste();

	const onClear = React.useCallback(
		(event: React.MouseEvent) => {
			event.preventDefault();
			editor.update(() => {
				const node = $createParagraphNode();
				$getRoot().clear().append(node).selectEnd();
			});
		},
		[editor],
	);

	return (
		<div
			id={id}
			className={cx(styles.container, readOnly && "readonly", className)}
			style={style}
		>
			<ToolbarPlugin />
			<div className={styles.outerContainer}>
				<ContentEditable
					className={cx(styles.innerContainer, "editor-style")}
					aria-placeholder={placeholder || ""}
					placeholder={<Placeholder>{placeholder}</Placeholder>}
				/>
			</div>

			{!readOnly && <i className={styles.clear} onMouseDown={onClear} />}
			<LinkEditorPlugin />
		</div>
	);
}

export default RichTextPlugin;
