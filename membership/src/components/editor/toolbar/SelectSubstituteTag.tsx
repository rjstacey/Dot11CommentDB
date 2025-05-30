import * as React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$getSelection,
	$isRangeSelection,
	SELECTION_CHANGE_COMMAND,
	COMMAND_PRIORITY_LOW,
} from "lexical";
import { mergeRegister } from "@lexical/utils";

import { Select } from "dot11-components";

import css from "../editor.module.css";
import {
	$createSubstitutionTagNode,
	$isSubstitutionTagNode,
} from "../SubstitutionTagNode";

export function SelectSubstituteTag({
	tags,
	disabled,
}: {
	tags: string[];
	disabled?: boolean;
}) {
	const [editor] = useLexicalComposerContext();

	const options = React.useMemo(
		() =>
			tags.map((tag) => ({
				value: `{{${tag}}}`,
				label: tag,
			})),
		[tags]
	);

	const [values, setValues] = React.useState<typeof options>([]);

	function onChange(newOptions: typeof options) {
		const [newOption] = newOptions;
		const [option] = values;

		if (newOption !== option) {
			editor.update(() => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) return false;
				const anchorNode = selection.anchor.getNode();
				if ($isSubstitutionTagNode(anchorNode)) {
					if (newOption) {
						if (
							selection.anchor.offset ===
							anchorNode.getTextContent().length
						) {
							const newNode = $createSubstitutionTagNode(
								newOption.value,
								true
							);
							anchorNode.insertAfter(newNode);
							newNode.select(0, newOption.value.length);
						} else {
							anchorNode.setTextContent(newOption.value);
							anchorNode.setValid(true);
							anchorNode.select(0, newOption.value.length);
						}
					} else {
						anchorNode.remove();
					}
				} else if (newOption) {
					selection.insertNodes([
						$createSubstitutionTagNode(newOption.value, true),
					]);
				}
			});
		}
	}

	React.useEffect(() => {
		function updateValues() {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) return false;
			const anchorNode = selection.anchor.getNode();
			if ($isSubstitutionTagNode(anchorNode)) {
				const tag = anchorNode.getTag();
				const newValues = options.filter((o) => o.label === tag);
				setValues(newValues);
			} else {
				setValues([]);
			}
			return false;
		}
		return mergeRegister(
			editor.registerCommand(
				SELECTION_CHANGE_COMMAND,
				updateValues,
				COMMAND_PRIORITY_LOW
			),
			editor.registerUpdateListener(({ editorState }) => {
				editorState.read(updateValues);
			})
		);
	}, [editor]);

	return (
		<Select
			aria-label="Substitution tag options"
			placeholder="Insert tag..."
			options={options}
			values={values}
			onChange={onChange}
			dropdownWidth={250}
			className={css.select + (disabled ? " disabled" : "")}
			dropdownClassName={css["select-dropdown"]}
			disabled={disabled}
			dropdownPosition="top"
			dropdownAlign="right"
		/>
	);
}
