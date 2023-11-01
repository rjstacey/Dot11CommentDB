import React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	CAN_REDO_COMMAND,
	CAN_UNDO_COMMAND,
	REDO_COMMAND,
	UNDO_COMMAND,
	SELECTION_CHANGE_COMMAND,
	FORMAT_TEXT_COMMAND,
	FORMAT_ELEMENT_COMMAND,
	$getSelection,
	$isRangeSelection,
	$createParagraphNode,
	RangeSelection,
	LexicalEditor,
	ElementFormatType,
	ElementNode,
} from "lexical";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
	$setBlocksType,
	$isAtNodeEnd,
	$patchStyleText,
	$getSelectionStyleValueForProperty,
} from "@lexical/selection";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
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

import { Select, SelectItemRendererProps } from "dot11-components";

import styles from "./ToolbarPlugin.module.css";

const LowPriority = 1;

const supportedBlockTypes = new Set([
	"paragraph",
	"quote",
	"code",
	"h1",
	"h2",
	"ul",
	"ol",
]);

const blockTypeToBlockName = {
	code: "Code Block",
	h1: "Large Heading",
	h2: "Small Heading",
	h3: "Heading",
	h4: "Heading",
	h5: "Heading",
	ol: "Numbered List",
	paragraph: "Normal",
	quote: "Quote",
	ul: "Bulleted List",
};

const Divider = () => <div className={styles["divider"]} />;

function getSelectedNode(selection: RangeSelection) {
	const anchor = selection.anchor;
	const focus = selection.focus;
	const anchorNode = selection.anchor.getNode();
	const focusNode = selection.focus.getNode();
	if (anchorNode === focusNode) {
		return anchorNode;
	}
	const isBackward = selection.isBackward();
	if (isBackward) {
		return $isAtNodeEnd(focus) ? anchorNode : focusNode;
	} else {
		return $isAtNodeEnd(anchor) ? focusNode : anchorNode;
	}
}

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

const renderBlockTypeOption = ({ item }: SelectItemRendererProps) => (
	<>
		<i className={item.icon} />
		<span>{item.label}</span>
	</>
);

function SelectTextBlockType({
	editor,
	value,
}: {
	editor: LexicalEditor;
	value: string;
}) {
	const values = blockTypeOptions.filter((o) => o.value === value);

	function onChange(values: typeof blockTypeOptions) {
		const newValue = values.length > 0 ? values[0].value : null;
		if (newValue === "ul") {
			editor.dispatchCommand(
				value !== "ul"
					? INSERT_UNORDERED_LIST_COMMAND
					: REMOVE_LIST_COMMAND,
				undefined
			);
			return;
		}
		if (newValue === "ol") {
			editor.dispatchCommand(
				value !== "ol"
					? INSERT_ORDERED_LIST_COMMAND
					: REMOVE_LIST_COMMAND,
				undefined
			);
			return;
		}
		if (newValue !== value) {
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

	return (
		<Select
			aria-label="Text Block Type Options"
			options={blockTypeOptions}
			values={values}
			onChange={onChange}
			itemRenderer={renderBlockTypeOption}
			dropdownWidth={200}
			className={styles["select"]}
			dropdownClassName={styles["select-dropdown"]}
		/>
	);
}

function FormatTextButtons({ editor }: { editor: LexicalEditor }) {
	const [isBold, setIsBold] = React.useState(false);
	const [isItalic, setIsItalic] = React.useState(false);
	const [isUnderline, setIsUnderline] = React.useState(false);
	const [isStrikethrough, setIsStrikethrough] = React.useState(false);
	const [isCode, setIsCode] = React.useState(false);
	const [isLink, setIsLink] = React.useState(false);

	React.useEffect(() => {
		function updateFormatState() {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				// Update text format
				setIsBold(selection.hasFormat("bold"));
				setIsItalic(selection.hasFormat("italic"));
				setIsUnderline(selection.hasFormat("underline"));
				setIsStrikethrough(selection.hasFormat("strikethrough"));
				setIsCode(selection.hasFormat("code"));

				// Update links
				const node = getSelectedNode(selection);
				const parent = node.getParent();
				setIsLink($isLinkNode(parent) || $isLinkNode(node));
			}
		}
		return mergeRegister(
			editor.registerUpdateListener(({ editorState }) => {
				editorState.read(() => {
					updateFormatState();
				});
			}),
			editor.registerCommand(
				SELECTION_CHANGE_COMMAND,
				(_payload, newEditor) => {
					updateFormatState();
					return false;
				},
				LowPriority
			)
		);
	}, [editor]);

	const insertLink = React.useCallback(() => {
		editor.dispatchCommand(TOGGLE_LINK_COMMAND, isLink? null: "https://");
	}, [editor, isLink]);

	return (
		<>
			<button
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
				}}
				className={isBold ? "active" : ""}
				aria-label="Format Bold"
			>
				<i className="bi-type-bold" />
			</button>
			<button
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
				}}
				className={isItalic ? "active" : ""}
				aria-label="Format Italics"
			>
				<i className="bi-type-italic" />
			</button>
			<button
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
				}}
				className={isUnderline ? "active" : ""}
				aria-label="Format Underline"
			>
				<i className="bi-type-underline" />
			</button>
			<button
				onClick={() => {
					editor.dispatchCommand(
						FORMAT_TEXT_COMMAND,
						"strikethrough"
					);
				}}
				className={isStrikethrough ? "active" : ""}
				aria-label="Format Strikethrough"
			>
				<i className="bi-type-strikethrough" />
			</button>
			<button
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
				}}
				className={isCode ? "active" : ""}
				aria-label="Insert Code"
			>
				<i className="bi-code" />
			</button>
			<button
				onClick={insertLink}
				className={isLink ? "active" : ""}
				aria-label="Insert Link"
			>
				<i className="bi-link" />
			</button>
		</>
	);
}

const alignmentOptions: {
	value: ElementFormatType;
	label: string;
	icon: string;
}[] = [
	{ value: "left", label: "Left Align", icon: "bi-text-left" },
	{ value: "center", label: "Center Align", icon: "bi-text-center" },
	{ value: "right", label: "Right Align", icon: "bi-text-right" },
	{ value: "justify", label: "Justify Align", icon: "bi-justify" },
];

const renderSelectedAlignmentOption = ({ item }: SelectItemRendererProps) => (
	<i className={item.icon} />
);

const renderAlignmentOption = ({ item }: SelectItemRendererProps) => (
	<>
		<i className={item.icon} />
		<span>{item.label}</span>
	</>
);

function SelectAlignment({
	editor,
	value,
}: {
	editor: LexicalEditor;
	value: ElementFormatType;
}) {
	const values = [
		alignmentOptions.find((o) => o.value === value) || alignmentOptions[0],
	];

	function onChange(values: typeof alignmentOptions) {
		editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, values[0].value);
	}

	return (
		<Select
			aria-label="Alignment Options"
			options={alignmentOptions}
			values={values}
			onChange={onChange}
			searchable={false}
			placeholder=""
			className={styles["select"]}
			dropdownClassName={styles["select-dropdown"]}
			itemRenderer={renderAlignmentOption}
			selectItemRenderer={renderSelectedAlignmentOption}
			dropdownWidth={150}
		/>
	);
}

const fontFamilyOptions: { value: string; label: string }[] = [
	{ value: "Arial", label: "Arial" },
	{ value: "Courier New", label: "Courier New" },
	{ value: "Georgia", label: "Georgia" },
	{ value: "Times New Roman", label: "Times New Roman" },
	{ value: "Trebuchet MS", label: "Trebuchet MS" },
	{ value: "Verdana", label: "Verdana" },
];

const renderSelectedFontOption = ({ item }: SelectItemRendererProps) => (
	<>
		<i className="bi-fonts" />
		<span className="selected-font-label">{item.label}</span>
	</>
);

const renderFontOption = ({ item }: SelectItemRendererProps) => (
	<span style={{ fontFamily: item.value }}>{item.label}</span>
);

function SelectFontFamily({
	editor,
	value,
}: {
	editor: LexicalEditor;
	value: string;
}) {
	const values = [
		fontFamilyOptions.find((o) => o.value === value) ||
			fontFamilyOptions[0],
	];

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

	return (
		<Select
			aria-label="Font Options"
			options={fontFamilyOptions}
			values={values}
			onChange={onChange}
			searchable={false}
			placeholder=""
			selectItemRenderer={renderSelectedFontOption}
			itemRenderer={renderFontOption}
			dropdownWidth={150}
			className={styles["select"]}
			dropdownClassName={styles["select-dropdown"]}
		/>
	);
}

function UndoRedo({ editor }: { editor: LexicalEditor }) {
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
					LowPriority
				),
				editor.registerCommand(
					CAN_REDO_COMMAND,
					(payload) => {
						setCanRedo(payload);
						return false;
					},
					LowPriority
				)
			),
		[editor]
	);

	return (
		<>
			<button
				disabled={!canUndo}
				onClick={() => {
					editor.dispatchCommand(UNDO_COMMAND, undefined);
				}}
				aria-label="Undo"
			>
				<i className="bi-arrow-counterclockwise" />
			</button>
			<button
				disabled={!canRedo}
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

export default function ToolbarPlugin() {
	const [editor] = useLexicalComposerContext();

	const [blockType, setBlockType] = React.useState("paragraph");
	const [formatType, setFormatType] = React.useState<ElementFormatType>("left");
	const [fontFamily, setFontFamily] = React.useState<string>("Arial");

	React.useEffect(() => {
		function updateState() {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) return;
			const anchorNode = selection.anchor.getNode();
			const element =
				anchorNode.getKey() === "root"
					? anchorNode
					: anchorNode.getTopLevelElementOrThrow();
			const elementKey = element.getKey();
			const elementDOM = editor.getElementByKey(elementKey);
			if (elementDOM !== null) {
				if ($isListNode(element)) {
					const parentList = $getNearestNodeOfType(
						anchorNode,
						ListNode
					);
					const type = parentList
						? parentList.getTag()
						: element.getTag();
					setBlockType(type);
				} else {
					const type = $isHeadingNode(element)
						? element.getTag()
						: element.getType();
					setBlockType(type);
				}
				setFormatType(element.getFormatType());
				setFontFamily(
					$getSelectionStyleValueForProperty(
						selection,
						"font-family",
						"Arial"
					)
				);
			}
		}
		return mergeRegister(
			editor.registerUpdateListener(({ editorState }) => {
				editorState.read(() => {
					updateState();
				});
			}),
			editor.registerCommand(
				SELECTION_CHANGE_COMMAND,
				(_payload, newEditor) => {
					updateState();
					return false;
				},
				LowPriority
			)
		);
	}, [editor]);

	return (
		<div
			className={styles.toolbar}
			onMouseDown={(event) => event.preventDefault()}
		>
			<UndoRedo editor={editor} />
			<Divider />
			<SelectTextBlockType editor={editor} value={blockType} />
			<Divider />
			<SelectFontFamily editor={editor} value={fontFamily} />
			<Divider />
			<FormatTextButtons editor={editor} />
			<Divider />
			<SelectAlignment editor={editor} value={formatType} />
		</div>
	);
}
