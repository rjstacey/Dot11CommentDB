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
	$getSelection,
	$isRangeSelection,
	$createParagraphNode,
	RangeSelection,
	LexicalEditor,
	ElementFormatType,
	TextFormatType,
	ElementNode,
	$isParagraphNode,
} from "lexical";
import {
	$isLinkNode,
	$isAutoLinkNode,
	$createLinkNode,
	TOGGLE_LINK_COMMAND,
} from "@lexical/link";
import { $setBlocksType, $isAtNodeEnd } from "@lexical/selection";
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
	$isQuoteNode,
} from "@lexical/rich-text";
import { $createCodeNode, $isCodeNode } from "@lexical/code";

import { Dropdown, DropdownRendererProps } from "dot11-components";

import styles from "./editor.module.css";

const LowPriority = 1;

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
	{ value: "paragraph", label: "Clear formatting", icon: "bi-eraser" },
	{ value: "h1", label: "Heading 1", icon: "bi-type-h1" },
	{ value: "h2", label: "Heading 2", icon: "bi-type-h2" },
	{ value: "h3", label: "Heading 3", icon: "bi-type-h3" },
	{ value: "quote", label: "Quote", icon: "bi-blockquote-left" },
	{ value: "ul", label: "Bullet List", icon: "bi-list-ul" },
	{ value: "ol", label: "Numbered List", icon: "bi-list-ol" },
	{ value: "code", label: "Code", icon: "bi-code" },
];

function BlockStyleButtons({
	editor,
	disabled,
	size,
}: {
	editor: LexicalEditor;
	disabled?: boolean;
	size: Size;
}) {
	const [blockType, setBlockType] = React.useState("paragraph");
	const [formatType, setFormatType] =
		React.useState<ElementFormatType>("left");

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
				let type: string = "";
				if ($isListNode(element)) {
					const parentList = $getNearestNodeOfType(
						anchorNode,
						ListNode
					);
					type = parentList ? parentList.getTag() : element.getTag();
				} else if ($isHeadingNode(element)) {
					type = element.getTag();
				} else if ($isQuoteNode(element)) {
					type = "quote";
				} else if ($isCodeNode(element)) {
					type = "code";
				} else if ($isParagraphNode(element)) {
					type = "paragraph";
				}
				setBlockType(type);
				if (element instanceof ElementNode)
					setFormatType(element.getFormatType());
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

	function onChange(newBlockType: string) {
		if (newBlockType === "ul") {
			editor.dispatchCommand(
				blockType !== "ul"
					? INSERT_UNORDERED_LIST_COMMAND
					: REMOVE_LIST_COMMAND,
				undefined
			);
			return;
		}
		if (newBlockType === "ol") {
			editor.dispatchCommand(
				blockType !== "ol"
					? INSERT_ORDERED_LIST_COMMAND
					: REMOVE_LIST_COMMAND,
				undefined
			);
			return;
		}
		if (newBlockType !== blockType) {
			editor.update(() => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) return;
				let createNode: () => ElementNode;
				if (newBlockType === "quote") {
					createNode = $createQuoteNode;
				} else if (newBlockType === "code") {
					createNode = $createCodeNode;
				} else if (
					newBlockType === "h1" ||
					newBlockType === "h2" ||
					newBlockType === "h3"
				) {
					createNode = () => $createHeadingNode(newBlockType);
				} else {
					createNode = $createParagraphNode;
				}
				$setBlocksType(selection, createNode);
			});
		}
		if (newBlockType === "paragraph") {
			/* Remove indent */
			editor.update(() => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) return;
				selection.getNodes().forEach((node) => {
					const blockNode = $findMatchingParent(
						node,
						$isParagraphNode
					);
					if (blockNode) blockNode.setIndent(0);
				});
			});
		}
	}

	let buttons = blockTypeOptions
		.map((o) => (
			<button
				key={o.value}
				className={
					blockType !== "paragraph" && blockType === o.value
						? "active"
						: ""
				}
				disabled={disabled}
				onClick={() => onChange(o.value)}
				arial-label={o.label}
				title={o.label}
			>
				<i className={o.icon} />
			</button>
		))
		.concat(
			<SelectAlignment
				key="alignment"
				editor={editor}
				value={formatType}
				disabled={disabled}
			/>
		);
	let moreButtons: JSX.Element[] = [];

	if (size === "medium") {
		moreButtons = buttons.splice(1, 3);
		moreButtons.push(buttons.pop()!);
		moreButtons.push(buttons.pop()!);
	} else if (size === "small") {
		moreButtons = buttons.splice(1, 3);
		moreButtons.concat(buttons.splice(-1, 1));
		moreButtons.push(<div className="divider" />);
		moreButtons.push(buttons.pop()!);
	}

	return (
		<div className="button-group">
			{buttons}
			{moreButtons.length > 0 && (
				<Dropdown
					selectRenderer={() => (
						<button disabled={disabled}>
							<i className="bi-three-dots-vertical" />
						</button>
					)}
					dropdownRenderer={() => (
						<div className="button-group">{moreButtons}</div>
					)}
					disabled={disabled}
					dropdownAlign="right"
				/>
			)}
		</div>
	);
}

const inlineFormatOptions: {
	value: TextFormatType;
	label: string;
	icon: string;
}[] = [
	{ value: "bold", label: "Bold (Ctrl-b)", icon: "bi-type-bold" },
	{ value: "italic", label: "Italics (Ctrl-i)", icon: "bi-type-italic" },
	{
		value: "underline",
		label: "Underline (Ctrl-u)",
		icon: "bi-type-underline",
	},
	{
		value: "strikethrough",
		label: "Strikethrough (Ctrl-/)",
		icon: "bi-type-strikethrough",
	},
	{ value: "highlight", label: "Highlight", icon: "bi-highlighter" },
	{ value: "code", label: "Insert code", icon: "bi-code" },
];

function InlineStyleButtons({
	editor,
	disabled,
	size,
}: {
	editor: LexicalEditor;
	disabled?: boolean;
	size: Size;
}) {
	const [isLink, setIsLink] = React.useState(false);
	const [isAutoLink, setIsAutoLink] = React.useState(false);
	const [formats, setFormats] = React.useState<TextFormatType[]>([]);

	React.useEffect(() => {
		function updateFormatState() {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				const formats: TextFormatType[] = [];
				inlineFormatOptions.forEach((o) => {
					if (selection.hasFormat(o.value)) formats.push(o.value);
				});
				setFormats(formats);

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

	let buttons = inlineFormatOptions
		.map((o) => (
			<button
				key={o.value}
				className={formats.includes(o.value) ? "active" : ""}
				disabled={disabled}
				onClick={() => {
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, o.value);
				}}
				arial-label={o.label}
				title={o.label}
			>
				<i className={o.icon} />
			</button>
		))
		.concat(
			<button
				key="link"
				className={isLink ? "active" : ""}
				disabled={disabled}
				onClick={insertLink}
				aria-label="Insert Link"
				title={(isLink ? "Remove" : "Insert") + " link"}
			>
				<i className="bi-link" />
			</button>
		);
	let moreButtons: JSX.Element[] = [];

	if (size === "medium") {
		moreButtons = buttons.splice(buttons.length - 2, 2);
	} else if (size === "small") {
		moreButtons = buttons;
		buttons = [];
	}

	return (
		<div className="button-group">
			{buttons}
			{moreButtons.length > 0 && (
				<Dropdown
					selectRenderer={() => (
						<button disabled={disabled}>
							<i className="bi-three-dots-vertical" />
						</button>
					)}
					dropdownRenderer={() => (
						<div className="button-group">{moreButtons}</div>
					)}
					disabled={disabled}
					dropdownAlign={size === "small" ? "left" : "right"}
				/>
			)}
		</div>
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

function SelectAlignment({
	editor,
	value,
	disabled,
}: {
	editor: LexicalEditor;
	value: ElementFormatType;
	disabled?: boolean;
}) {
	function onChange(value: ElementFormatType | "outdent" | "indent") {
		if (value === "outdent")
			editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
		else if (value === "indent")
			editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
		else editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, value);
	}

	const selectRenderer = (props: DropdownRendererProps) => (
		<button disabled={disabled}>
			<i className="bi-text-left" />
			<i className="bi-chevron-down" style={{ fontSize: "0.5em" }} />
		</button>
	);

	const dropdownRenderer = (props: DropdownRendererProps) => (
		<>
			{alignmentOptions.map((o, i) =>
				o.value ? (
					<button
						key={i}
						className={value === o.value ? "active" : undefined}
						onClick={() => onChange(o.value!)}
					>
						<i className={o.icon} />
					</button>
				) : (
					<div key={i} className={styles.divider} />
				)
			)}
		</>
	);

	return (
		<Dropdown
			style={{ flexDirection: "row" }}
			selectRenderer={selectRenderer}
			dropdownRenderer={dropdownRenderer}
			dropdownAlign="right"
			dropdownClassName="dropdown-container"
			disabled={disabled}
		/>
	);
}

function UndoRedo({
	editor,
	disabled,
}: {
	editor: LexicalEditor;
	disabled?: boolean;
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
		<div className="button-group">
			<button
				disabled={!canUndo || disabled}
				onClick={() => {
					editor.dispatchCommand(UNDO_COMMAND, undefined);
				}}
				aria-label="Undo"
				title="Undo (Ctrl-z)"
			>
				<i className="bi-arrow-counterclockwise" />
			</button>
			<button
				disabled={!canRedo || disabled}
				onClick={() => {
					editor.dispatchCommand(REDO_COMMAND, undefined);
				}}
				aria-label="Redo"
				title="Redo (Ctrl-r)"
			>
				<i className="bi-arrow-clockwise" />
			</button>
		</div>
	);
}

type Size = "small" | "medium" | "large";
const breakpointSmall = 525;
const breakpointMedium = 625;

export default function ToolbarPlugin({ style }: React.ComponentProps<"div">) {
	const [editor] = useLexicalComposerContext();
	const containerRef = React.useRef<HTMLDivElement>(null);
	const [size, setSize] = React.useState<Size>("large");

	React.useEffect(() => {
		const el = containerRef.current?.parentElement;
		if (!el) return;
		const ro = new ResizeObserver((entries) => {
			let entry = entries[0];
			const contentBoxSize = entry.contentBoxSize[0];
			const { inlineSize } = contentBoxSize;
			let size: Size = "large";
			if (inlineSize <= breakpointSmall) size = "small";
			else if (inlineSize <= breakpointMedium) size = "medium";
			setSize(size);
		});
		ro.observe(el);
		return () => ro.unobserve(el);
	}, []);

	return (
		<div
			ref={containerRef}
			className={styles.toolbar}
			style={style}
			onMouseDown={(e) => {
				e.preventDefault();
			}}
		>
			<UndoRedo editor={editor} />
			<InlineStyleButtons editor={editor} size={size} />
			<BlockStyleButtons editor={editor} size={size} />
		</div>
	);
}
