import * as React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$getSelection,
	$isRangeSelection,
	$createParagraphNode,
	ElementNode,
	SELECTION_CHANGE_COMMAND,
	COMMAND_PRIORITY_LOW,
} from "lexical";
import { $setBlocksType } from "@lexical/selection";
import {
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
	REMOVE_LIST_COMMAND,
	$isListNode,
	ListNode,
} from "@lexical/list";
import {
	$createHeadingNode,
	$createQuoteNode,
	$isHeadingNode,
} from "@lexical/rich-text";
import { $createCodeNode } from "@lexical/code";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";

import { Select } from "@common";

import css from "../editor.module.css";

const blockTypeOptions = [
	{ value: "paragraph", label: "Normal", icon: "bi-text-paragraph" },
	{ value: "h1", label: "Heading 1", icon: "bi-type-h1" },
	{ value: "h2", label: "Heading 2", icon: "bi-type-h2" },
	{ value: "h3", label: "Heading 3", icon: "bi-type-h3" },
	{ value: "ul", label: "Bullet List", icon: "bi-list-ul" },
	{ value: "ol", label: "Numbered List", icon: "bi-list-ol" },
	{ value: "quote", label: "Quote", icon: "bi-blockquote-left" },
	{ value: "code", label: "Code", icon: "bi-code" },
];

const renderBlockTypeOption = ({
	item,
}: {
	item: (typeof blockTypeOptions)[number];
}) => (
	<>
		<i className={item.icon} />
		<span>{item.label}</span>
	</>
);

export function SelectTextBlockType({ disabled }: { disabled: boolean }) {
	const [editor] = useLexicalComposerContext();
	const [blockType, setBlockType] = React.useState("paragraph");
	const values = blockTypeOptions.filter((o) => o.value === blockType);

	function onChange(values: typeof blockTypeOptions) {
		const newValue = values.length > 0 ? values[0].value : null;
		if (newValue === "ul") {
			editor.dispatchCommand(
				blockType !== "ul"
					? INSERT_UNORDERED_LIST_COMMAND
					: REMOVE_LIST_COMMAND,
				undefined
			);
			return;
		}
		if (newValue === "ol") {
			editor.dispatchCommand(
				blockType !== "ol"
					? INSERT_ORDERED_LIST_COMMAND
					: REMOVE_LIST_COMMAND,
				undefined
			);
			return;
		}
		if (newValue !== blockType) {
			editor.update(() => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) return;
				let node: ElementNode;
				if (newValue === "quote") node = $createQuoteNode();
				else if (newValue === "code") node = $createCodeNode();
				else if (
					newValue === "h1" ||
					newValue === "h2" ||
					newValue === "h3"
				)
					node = $createHeadingNode(newValue!);
				else node = $createParagraphNode();
				$setBlocksType(selection, () => node);
			});
		}
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
				let type: string;
				if ($isListNode(element)) {
					const parentList = $getNearestNodeOfType(
						anchorNode,
						ListNode
					);
					type = parentList ? parentList.getTag() : element.getTag();
					setBlockType(type);
				} else {
					type = $isHeadingNode(element)
						? element.getTag()
						: element.getType();
				}
				//if (!blockTypeOptions.find((o) => o.value === type)) type = "";
				setBlockType(type);
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
			style={{ width: 170 }}
			aria-label="Text Block Type Options"
			options={blockTypeOptions}
			values={values}
			onChange={onChange}
			itemRenderer={renderBlockTypeOption}
			dropdownWidth={200}
			className={css.select + (disabled ? " disabled" : "")}
			dropdownClassName={css["select-dropdown"]}
			disabled={disabled}
			dropdownPosition="top"
			dropdownAlign="right"
		/>
	);
}
