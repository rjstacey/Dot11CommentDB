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
import { Select, SelectItemRendererProps } from "@components/select";

import css from "../editor.module.css";

const alignmentOptions: {
	value: ElementFormatType | "outdent" | "indent" | null;
	label: string;
	icon: string;
	disabled?: boolean;
}[] = [
	{ value: "left", label: "Left Align", icon: "bi-text-left" },
	{ value: "center", label: "Center Align", icon: "bi-text-center" },
	{ value: "right", label: "Right Align", icon: "bi-text-right" },
	{ value: "justify", label: "Justify Align", icon: "bi-justify" },
	{ value: null, label: "", icon: "", disabled: true },
	{ value: "indent", label: "Indent", icon: "bi-text-indent-left" },
	{ value: "outdent", label: "Outdent", icon: "bi-text-indent-right" },
];

const renderSelectedAlignmentOption = ({
	item,
}: SelectItemRendererProps<(typeof alignmentOptions)[number]>) => (
	<i className={item.icon} />
);

const renderAlignmentOption = ({
	item,
}: SelectItemRendererProps<(typeof alignmentOptions)[number]>) =>
	item.value ? (
		<>
			<i className={item.icon} />
			<span>{item.label}</span>
		</>
	) : (
		<hr style={{ width: "100%" }} />
	);

export function SelectAlignment({ disabled }: { disabled: boolean }) {
	const [editor] = useLexicalComposerContext();
	const [formatType, setFormatType] =
		React.useState<ElementFormatType>("left");
	const values = [
		alignmentOptions.find((o) => o.value === formatType) ||
			alignmentOptions[0],
	];

	function onChange(values: typeof alignmentOptions) {
		const value = values.length > 0 ? values[0].value : "left";
		if (value === "outdent")
			editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
		else if (value === "indent")
			editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
		else editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, value!);
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
				COMMAND_PRIORITY_LOW
			),
			editor.registerUpdateListener(({ editorState }) => {
				editorState.read(updateValues);
			})
		);
	}, [editor]);

	return (
		<Select
			style={{ width: 60 }}
			aria-label="Alignment Options"
			options={alignmentOptions}
			values={values}
			onChange={onChange}
			searchable={false}
			placeholder=""
			className={css.select + (disabled ? " disabled" : "")}
			dropdownClassName={css["select-dropdown"]}
			itemRenderer={renderAlignmentOption}
			selectItemRenderer={renderSelectedAlignmentOption}
			dropdownWidth={150}
			disabled={disabled}
			dropdownPosition="top"
			dropdownAlign="right"
		/>
	);
}
