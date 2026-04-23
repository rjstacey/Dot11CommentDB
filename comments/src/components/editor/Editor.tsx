import { useCallback } from "react";
import cx from "clsx";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $createParagraphNode } from "lexical";

import { ResnStatusType } from "@/store/comments";

import { Toolbar } from "./toolbar";
import { LinkEditor } from "./LinkEditor";
import { AutoLink } from "./AutoLink";
import { useImportExport } from "./useImportExport";
import { usePaste } from "./usePaste";

import "./editor.css";
import "./editor-style.css";

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
	onChangeResnStatus,
	placeholder = "Enter text here...",
	readOnly,
	className,
	style,
	id,
	submission,
}: {
	value: string | null;
	onChange: (value: string | null) => void;
	onChangeResnStatus?: (value: ResnStatusType | null) => void;
	submission?: string | null;
	id?: string;
	className?: string;
	style?: React.CSSProperties;
	placeholder?: string;
	readOnly?: boolean;
}) {
	const [editor] = useLexicalComposerContext();

	useImportExport(value, onChange, readOnly);
	usePaste(onChangeResnStatus);

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
			<AutoLink submission={submission} />
		</div>
	);
}
