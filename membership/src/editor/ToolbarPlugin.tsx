import * as React from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	CAN_REDO_COMMAND,
	CAN_UNDO_COMMAND,
	REDO_COMMAND,
	UNDO_COMMAND,
	SELECTION_CHANGE_COMMAND,
	FORMAT_TEXT_COMMAND,
	FORMAT_ELEMENT_COMMAND,
	OUTDENT_CONTENT_COMMAND,
	INDENT_CONTENT_COMMAND,
	FOCUS_COMMAND,
	BLUR_COMMAND,
	$getSelection,
	$isRangeSelection,
	$createParagraphNode,
	RangeSelection,
	LexicalEditor,
	ElementFormatType,
	ElementNode,
} from "lexical";
import {
	$isLinkNode,
	$isAutoLinkNode,
	$createLinkNode,
	TOGGLE_LINK_COMMAND,
} from "@lexical/link";
import {
	$setBlocksType,
	$isAtNodeEnd,
	$patchStyleText,
	$getSelectionStyleValueForProperty,
} from "@lexical/selection";
import {
	$getNearestNodeOfType,
	$findMatchingParent,
	mergeRegister,
} from "@lexical/utils";
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

import css from "./editor.module.css";

const LowPriority = 1;

const Divider = () => <div className={css.divider} />;

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
	disabled,
}: {
	editor: LexicalEditor;
	value: string;
	disabled: boolean;
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
			style={{ width: 200 }}
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

function FormatTextButtons({
	editor,
	disabled,
}: {
	editor: LexicalEditor;
	disabled: boolean;
}) {
	const [isBold, setIsBold] = React.useState(false);
	const [isItalic, setIsItalic] = React.useState(false);
	const [isUnderline, setIsUnderline] = React.useState(false);
	const [isStrikethrough, setIsStrikethrough] = React.useState(false);
	const [isCode, setIsCode] = React.useState(false);
	const [isLink, setIsLink] = React.useState(false);
	const [isAutoLink, setIsAutoLink] = React.useState(false);

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
				setIsAutoLink(!!$findMatchingParent(node, $isAutoLinkNode));
				setIsLink(!!$findMatchingParent(node, $isLinkNode));
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
		if (isAutoLink) {
			// Change to link node
			editor.update(() => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) return;
				const node = $findMatchingParent(
					getSelectedNode(selection),
					$isAutoLinkNode
				);
				node?.replace($createLinkNode(node.getURL()), true);
			});
		} else {
			// Toggle link
			editor.dispatchCommand(
				TOGGLE_LINK_COMMAND,
				isLink ? null : "https://"
			);
		}
	}, [editor, isLink, isAutoLink]);

	return (
		<>
			<button
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
				}}
				className={isBold ? "active" : ""}
				aria-label="Format Bold"
				disabled={disabled}
			>
				<i className="bi-type-bold" />
			</button>
			<button
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
				}}
				className={isItalic ? "active" : ""}
				aria-label="Format Italics"
				disabled={disabled}
			>
				<i className="bi-type-italic" />
			</button>
			<button
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
				}}
				className={isUnderline ? "active" : ""}
				aria-label="Format Underline"
				disabled={disabled}
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
				disabled={disabled}
			>
				<i className="bi-type-strikethrough" />
			</button>
			<button
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
				}}
				className={isCode ? "active" : ""}
				aria-label="Insert Code"
				disabled={disabled}
			>
				<i className="bi-code" />
			</button>
			<button
				onClick={insertLink}
				className={isLink ? "active" : ""}
				aria-label="Insert Link"
				disabled={disabled}
			>
				<i className="bi-link" />
			</button>
		</>
	);
}

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

const renderSelectedAlignmentOption = ({ item }: SelectItemRendererProps) => (
	<i className={item.icon} />
);

const renderAlignmentOption = ({ item }: SelectItemRendererProps) =>
	item.value ? (
		<>
			<i className={item.icon} />
			<span>{item.label}</span>
		</>
	) : (
		<hr style={{ width: "100%" }} />
	);

function SelectAlignment({
	editor,
	value,
	disabled,
}: {
	editor: LexicalEditor;
	value: ElementFormatType;
	disabled: boolean;
}) {
	const values = [
		alignmentOptions.find((o) => o.value === value) || alignmentOptions[0],
	];

	function onChange(values: typeof alignmentOptions) {
		const value = values.length > 0 ? values[0].value : "left";
		if (value === "outdent")
			editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
		else if (value === "indent")
			editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
		else editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, value!);
	}

	return (
		<Select
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

const fontFamilyOptions: { value: string | null; label: string }[] = [
	{ value: null, label: "Default" },
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
	disabled,
}: {
	editor: LexicalEditor;
	value: string | null;
	disabled: boolean;
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
			className={css.select + (disabled ? " disabled" : "")}
			dropdownClassName={css["select-dropdown"]}
			disabled={disabled}
			dropdownPosition="top"
			dropdownAlign="right"
		/>
	);
}

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

function SelectFontSize({
	editor,
	value,
	disabled,
}: {
	editor: LexicalEditor;
	value: string | null;
	disabled: boolean;
}) {
	const values = [
		fontSizeOptions.find((o) => o.value === value) || fontSizeOptions[0],
	];

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

function UndoRedo({
	editor,
	disabled,
}: {
	editor: LexicalEditor;
	disabled: boolean;
}) {
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
				disabled={!canUndo || disabled}
				onClick={() => {
					editor.dispatchCommand(UNDO_COMMAND, undefined);
				}}
				aria-label="Undo"
			>
				<i className="bi-arrow-counterclockwise" />
			</button>
			<button
				disabled={!canRedo || disabled}
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
	const [hasFocus, setHasFocus] = React.useState(false);

	const [blockType, setBlockType] = React.useState("paragraph");
	const [formatType, setFormatType] =
		React.useState<ElementFormatType>("left");
	const [fontFamily, setFontFamily] = React.useState<string>("");
	const [fontSize, setFontSize] = React.useState<string>("");
	const [isEditable, setIsEditable] = React.useState(true);

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
				if (!blockTypeOptions.find((o) => o.value === type)) type = "";
				setBlockType(type);
				setFormatType(element.getFormatType());
				setFontFamily(
					$getSelectionStyleValueForProperty(selection, "font-family")
				);
				setFontSize(
					$getSelectionStyleValueForProperty(selection, "font-size")
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
			),
			editor.registerEditableListener(setIsEditable),
			editor.registerCommand(
				FOCUS_COMMAND,
				() => {
					setHasFocus(true);
					return false;
				},
				LowPriority
			),
			editor.registerCommand(
				BLUR_COMMAND,
				() => {
					setHasFocus(false);
					return false;
				},
				LowPriority
			)
		);
	}, [editor]);

	const disabled = !isEditable || !hasFocus;

	return (
		<div
			className={css.toolbar}
			onMouseDown={(event) => event.preventDefault()}
		>
			<UndoRedo editor={editor} disabled={disabled} />
			<Divider />
			<SelectTextBlockType
				editor={editor}
				value={blockType}
				disabled={disabled}
			/>
			<Divider />
			<SelectFontFamily
				editor={editor}
				value={fontFamily || null}
				disabled={disabled}
			/>
			<SelectFontSize
				editor={editor}
				value={fontSize || null}
				disabled={disabled}
			/>
			<Divider />
			<FormatTextButtons editor={editor} disabled={disabled} />
			<Divider />
			<SelectAlignment
				editor={editor}
				value={formatType}
				disabled={disabled}
			/>
		</div>
	);
}
