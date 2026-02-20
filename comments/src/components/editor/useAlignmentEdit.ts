import * as React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	FORMAT_ELEMENT_COMMAND,
	OUTDENT_CONTENT_COMMAND,
	INDENT_CONTENT_COMMAND,
	ElementFormatType,
	COMMAND_PRIORITY_LOW,
} from "lexical";
import {
	$getSelection,
	$isRangeSelection,
	ElementNode,
	SELECTION_CHANGE_COMMAND,
} from "lexical";
import { mergeRegister } from "@lexical/utils";

export type AlignmentFormat = ElementFormatType | "outdent" | "indent";

export function useAlignmentSelect() {
	const [editor] = useLexicalComposerContext();
	const [formatType, setFormatType] =
		React.useState<ElementFormatType>("left");

	function onChange(value: AlignmentFormat) {
		if (value === "outdent")
			editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
		else if (value === "indent")
			editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
		else editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, value);
	}

	React.useEffect(() => {
		function updateValues() {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) return false;
			const anchorNode = selection.anchor.getNode();
			const element =
				anchorNode.getKey() === "root"
					? anchorNode
					: anchorNode.getTopLevelElementOrThrow();
			const elementKey = element.getKey();
			const elementDOM = editor.getElementByKey(elementKey);
			if (elementDOM !== null) {
				if (element instanceof ElementNode)
					setFormatType(element.getFormatType());
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

	return { value: formatType, onChange };
}
