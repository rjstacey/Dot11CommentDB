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
import { Select, SelectItemRendererProps } from "dot11-components";

import css from "../editor.module.css";

const fontSizeOptions: { value: string | null; label: string }[] = [
	{ value: null, label: "Default" },
	{ value: "10px", label: "10px" },
	{ value: "11px", label: "11px" },
	{ value: "12px", label: "12px" },
	{ value: "13px", label: "13px" },
	{ value: "14px", label: "14px" },
	{ value: "15px", label: "15px" },
	{ value: "16px", label: "16px" },
	{ value: "17px", label: "17px" },
	{ value: "18px", label: "18px" },
	{ value: "19px", label: "19px" },
	{ value: "20px", label: "20px" },
];

const FontSizeIcon = () => (
	<div style={{ position: "relative" }}>
		<i className="bi-fonts" />
		<i
			className="bi-fonts"
			style={{ position: "absolute", fontSize: 10, top: 8, left: 8 }}
		/>
	</div>
);

const renderSelectedFontSizeOption = ({ item }: SelectItemRendererProps) => (
	<>
		<FontSizeIcon />
		<span className="selected-font-label">{item.label}</span>
	</>
);

const renderFontSizeOption = ({ item }: SelectItemRendererProps) => (
	<span style={{ fontSize: item.value }}>{item.label}</span>
);

export function SelectFontSize({ disabled }: { disabled: boolean }) {
	const [editor] = useLexicalComposerContext();
	const [values, setValues] = React.useState([fontSizeOptions[0]]);

	const onChange = React.useCallback(
		(values: typeof fontSizeOptions) => {
			const value = values.length > 0 ? values[0].value : null;
			editor.update(() => {
				const selection = $getSelection();
				if ($isRangeSelection(selection))
					$patchStyleText(selection, { "font-size": value });
			});
		},
		[editor]
	);

	React.useEffect(() => {
		function updateValues() {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) return false;
			const fontSize = $getSelectionStyleValueForProperty(
				selection,
				"font-size"
			);
			const value =
				fontSizeOptions.find((o) => o.value === fontSize) ||
				fontSizeOptions[0];
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
			aria-label="Font Size Options"
			options={fontSizeOptions}
			values={values}
			onChange={onChange}
			searchable={false}
			placeholder=""
			selectItemRenderer={renderSelectedFontSizeOption}
			itemRenderer={renderFontSizeOption}
			dropdownWidth={90}
			dropdownHeight={400}
			className={css.select + (disabled ? " disabled" : "")}
			dropdownClassName={css["select-dropdown"]}
			disabled={disabled}
			dropdownPosition="top"
			dropdownAlign="right"
		/>
	);
}
