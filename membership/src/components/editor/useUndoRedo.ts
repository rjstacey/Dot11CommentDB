import { useState, useCallback, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	CAN_REDO_COMMAND,
	CAN_UNDO_COMMAND,
	REDO_COMMAND,
	UNDO_COMMAND,
	COMMAND_PRIORITY_LOW,
} from "lexical";
import { mergeRegister } from "@lexical/utils";

export function useUndoRedo() {
	const [editor] = useLexicalComposerContext();
	const [canUndo, setCanUndo] = useState(false);
	const [canRedo, setCanRedo] = useState(false);

	const undo = useCallback(() => {
		editor.dispatchCommand(UNDO_COMMAND, undefined);
	}, [editor]);

	const redo = useCallback(() => {
		editor.dispatchCommand(REDO_COMMAND, undefined);
	}, [editor]);

	useEffect(
		() =>
			mergeRegister(
				editor.registerCommand(
					CAN_UNDO_COMMAND,
					(payload) => {
						setCanUndo(payload);
						return false;
					},
					COMMAND_PRIORITY_LOW,
				),
				editor.registerCommand(
					CAN_REDO_COMMAND,
					(payload) => {
						setCanRedo(payload);
						return false;
					},
					COMMAND_PRIORITY_LOW,
				),
			),
		[editor],
	);

	return { canUndo, canRedo, undo, redo };
}
