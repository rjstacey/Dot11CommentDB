import * as React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { FOCUS_COMMAND, BLUR_COMMAND, COMMAND_PRIORITY_LOW } from "lexical";
import { mergeRegister } from "@lexical/utils";

import { UndoRedo } from "./UndoRedo";
import { SelectTextBlockType } from "./SelectTextBlobkType";
import { SelectFontFamily } from "./SelectFontFamily";
import { SelectFontSize } from "./SelectFontSize";
import { FormatTextButtons } from "./FormatTextButtons";
import { SelectAlignment } from "./SelectAlignment";
import { SelectSubstituteTag } from "./SelectSubstituteTag";

import css from "../editor.module.css";

const Divider = () => <div className={css.divider} />;

export function ToolbarPlugin({ tags }: { tags: string[] }) {
	const [editor] = useLexicalComposerContext();
	const [hasFocus, setHasFocus] = React.useState(false);
	const [isEditable, setIsEditable] = React.useState(true);

	React.useEffect(() => {
		return mergeRegister(
			editor.registerEditableListener(setIsEditable),
			editor.registerCommand(
				FOCUS_COMMAND,
				() => {
					setHasFocus(true);
					return false;
				},
				COMMAND_PRIORITY_LOW
			),
			editor.registerCommand(
				BLUR_COMMAND,
				() => {
					setHasFocus(false);
					return false;
				},
				COMMAND_PRIORITY_LOW
			)
		);
	}, [editor]);

	const disabled = !isEditable || !hasFocus;

	return (
		<div
			className={css.toolbar}
			onMouseDown={(event) => event.preventDefault()}
		>
			<UndoRedo disabled={disabled} />
			<Divider />
			<SelectTextBlockType disabled={disabled} />
			<Divider />
			<SelectFontFamily disabled={disabled} />
			<SelectFontSize disabled={disabled} />
			<Divider />
			<FormatTextButtons disabled={disabled} />
			<Divider />
			<SelectAlignment disabled={disabled} />
			<Divider />
			<SelectSubstituteTag tags={tags} disabled={disabled} />
		</div>
	);
}
