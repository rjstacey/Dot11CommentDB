import * as React from "react";
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
import { Select } from "@common";

import css from "../editor.module.css";

const fontFamilyOptions: { value: string | null; label: string }[] = [
	{ value: null, label: "Default" },
	{ value: "Arial", label: "Arial" },
	{ value: "Courier New", label: "Courier New" },
	{ value: "Georgia", label: "Georgia" },
	{ value: "Times New Roman", label: "Times New Roman" },
	{ value: "Trebuchet MS", label: "Trebuchet MS" },
	{ value: "Verdana", label: "Verdana" },
];

const renderSelectedFontOption = ({
	item,
}: {
	item: (typeof fontFamilyOptions)[number];
}) => (
	<>
		<i className="bi-fonts" />
		<span className="selected-font-label">{item.label}</span>
	</>
);

const renderFontOption = ({
	item,
}: {
	item: (typeof fontFamilyOptions)[number];
}) => <span style={{ fontFamily: item.value || undefined }}>{item.label}</span>;

export function SelectFontFamily({ disabled }: { disabled: boolean }) {
	const [editor] = useLexicalComposerContext();
	const [values, setValues] = React.useState([fontFamilyOptions[0]]);

	const onChange = React.useCallback(
		(values: typeof fontFamilyOptions) => {
			const value = values.length > 0 ? values[0].value : null;
			editor.update(() => {
				const selection = $getSelection();
				if ($isRangeSelection(selection))
					$patchStyleText(selection, { "font-family": value });
			});
		},
		[editor]
	);

	React.useEffect(() => {
		function updateValues() {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) return false;
			const fontFamily = $getSelectionStyleValueForProperty(
				selection,
				"font-family"
			);
			const value =
				fontFamilyOptions.find((o) => o.value === fontFamily) ||
				fontFamilyOptions[0];
			setValues([value]);
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
			id="font-family-selector"
			style={{ width: 180 }}
			aria-label="Font Options"
			options={fontFamilyOptions}
			values={values}
			onChange={onChange}
			searchable={false}
			placeholder=""
			selectItemRenderer={renderSelectedFontOption}
			itemRenderer={renderFontOption}
			dropdownWidth={150}
			className={css.select + (disabled ? " disabled" : "")}
			dropdownClassName={css["select-dropdown"]}
			disabled={disabled}
			dropdownPosition="top"
			dropdownAlign="right"
		/>
	);
}
