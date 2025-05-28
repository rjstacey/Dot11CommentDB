import * as React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	CAN_REDO_COMMAND,
	CAN_UNDO_COMMAND,
	REDO_COMMAND,
	UNDO_COMMAND,
	COMMAND_PRIORITY_LOW,
} from "lexical";
import { mergeRegister } from "@lexical/utils";

export function UndoRedo({ disabled }: { disabled: boolean }) {
	const [editor] = useLexicalComposerContext();
	const [canUndo, setCanUndo] = React.useState(false);
	const [canRedo, setCanRedo] = React.useState(false);

	React.useEffect(
		() =>
			mergeRegister(
				editor.registerCommand(
					CAN_UNDO_COMMAND,
					(payload) => {
						setCanUndo(payload);
						return false;
					},
					COMMAND_PRIORITY_LOW
				),
				editor.registerCommand(
					CAN_REDO_COMMAND,
					(payload) => {
						setCanRedo(payload);
						return false;
					},
					COMMAND_PRIORITY_LOW
				)
			),
		[editor]
	);

	return (
		<>
			<button
				disabled={!canUndo || disabled}
				onClick={() => {
					editor.dispatchCommand(UNDO_COMMAND, undefined);
				}}
				aria-label="Undo"
			>
				<i className="bi-arrow-counterclockwise" />
			</button>
			<button
				disabled={!canRedo || disabled}
				onClick={() => {
					editor.dispatchCommand(REDO_COMMAND, undefined);
				}}
				aria-label="Redo"
			>
				<i className="bi-arrow-clockwise" />
			</button>
		</>
	);
}
