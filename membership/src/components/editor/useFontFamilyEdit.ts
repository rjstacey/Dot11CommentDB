import { useEffect, useCallback, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$getSelection,
	$isRangeSelection,
	SELECTION_CHANGE_COMMAND,
	COMMAND_PRIORITY_LOW,
} from "lexical";
import {
	$patchStyleText,
	$getSelectionStyleValueForProperty,
} from "@lexical/selection";
import { mergeRegister } from "@lexical/utils";

export function useFontFamilyEdit() {
	const [editor] = useLexicalComposerContext();
	const [value, setValue] = useState<string | null>(null);

	const onChange = useCallback(
		(value: string | null) => {
			editor.update(() => {
				const selection = $getSelection();
				if ($isRangeSelection(selection))
					$patchStyleText(selection, { "font-family": value });
			});
		},
		[editor],
	);

	useEffect(() => {
		function updateValues() {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) return false;
			const fontFamily = $getSelectionStyleValueForProperty(
				selection,
				"font-family",
			);
			setValue(fontFamily);
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

	return { value, onChange };
}
