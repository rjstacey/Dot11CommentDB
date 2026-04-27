import { useCallback } from "react";
import cx from "clsx";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $createParagraphNode } from "lexical";

import { Toolbar } from "./toolbar";
import { LinkEditor } from "./LinkEditor";
import { useImportExport } from "./useImportExport";

import "./editor.css";

const Placeholder = (props: React.ComponentProps<"i">) => (
	<div className={cx("placeholder", "innerContainer", "editor-style")}>
		<p>
			<i {...props} />
		</p>
	</div>
);

export function Editor({
	value,
	onChange,
	placeholder = "Enter text here...",
	readOnly,
	className,
	style,
	id,
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

	useImportExport(value, onChange, readOnly);

	const onClear = useCallback(
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
		<>
			<div
				id={id}
				className={cx("editor", readOnly && "readonly", className)}
				style={style}
			>
				<Toolbar />
				<div className="outerContainer">
					<ContentEditable
						className={cx("innerContainer", "editor-style")}
						aria-placeholder={placeholder || ""}
						placeholder={<Placeholder>{placeholder}</Placeholder>}
					/>
				</div>

				{!readOnly && <i className="clear" onMouseDown={onClear} />}
				<LinkEditor />
			</div>
		</>
	);
}
