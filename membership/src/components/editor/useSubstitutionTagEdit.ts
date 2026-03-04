import { useState, useCallback, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$getSelection,
	$isRangeSelection,
	SELECTION_CHANGE_COMMAND,
	COMMAND_PRIORITY_LOW,
} from "lexical";
import { mergeRegister } from "@lexical/utils";
import { $isSubstitutionTagNode } from "./SubstitutionTagNode";
import { INSERT_SUBSTITUTION_TAG_COMMAND } from "./SubstitutionTagExtension";

export function useSubstitutionTagEdit() {
	const [editor] = useLexicalComposerContext();
	const [value, setValue] = useState<string | null>(null);

	useEffect(() => {
		function updateValues() {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) return false;
			const anchorNode = selection.anchor.getNode();
			if ($isSubstitutionTagNode(anchorNode)) {
				setValue(anchorNode.getTag());
			} else {
				setValue(null);
			}
			return false;
		}
		return mergeRegister(
			editor.registerCommand(
				SELECTION_CHANGE_COMMAND,
				updateValues,
				COMMAND_PRIORITY_LOW,
			),
			editor.registerUpdateListener(({ editorState }) => {
				editorState.read(updateValues);
			}),
		);
	}, [editor]);

	const onChange = useCallback(
		(newValue: string | null) => {
			if (newValue !== value) {
				editor.dispatchCommand(
					INSERT_SUBSTITUTION_TAG_COMMAND,
					newValue || null,
				);
			}
		},
		[editor, value],
	);

	return { value, onChange };
}
