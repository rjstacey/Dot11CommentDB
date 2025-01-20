import * as React from "react";
import { createPortal } from "react-dom";
import styles from "./LinkEditorPlugin.module.css";

import {
	$isAutoLinkNode,
	$isLinkNode,
	TOGGLE_LINK_COMMAND,
} from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import { $isAtNodeEnd } from "@lexical/selection";
import {
	$getSelection,
	$isRangeSelection,
	CLICK_COMMAND,
	COMMAND_PRIORITY_CRITICAL,
	COMMAND_PRIORITY_HIGH,
	COMMAND_PRIORITY_LOW,
	KEY_ESCAPE_COMMAND,
	SELECTION_CHANGE_COMMAND,
	BaseSelection,
	LexicalEditor,
	RangeSelection,
	ElementNode,
	TextNode,
} from "lexical";

export function getSelectedNode(
	selection: RangeSelection
): TextNode | ElementNode {
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
		return $isAtNodeEnd(anchor) ? anchorNode : focusNode;
	}
}
const SUPPORTED_URL_PROTOCOLS = new Set([
	"http:",
	"https:",
	"mailto:",
	"sms:",
	"tel:",
]);

export function sanitizeUrl(url: string): string {
	try {
		const parsedUrl = new URL(url);
		if (!SUPPORTED_URL_PROTOCOLS.has(parsedUrl.protocol)) {
			return "about:blank";
		}
	} catch {
		return url;
	}
	return url;
}

const VERTICAL_GAP = 10;
const HORIZONTAL_OFFSET = 5;

export function setFloatingElemPositionForLinkEditor(
	targetRect: DOMRect | null,
	floatingElem: HTMLElement,
	anchorElem: HTMLElement,
	verticalGap: number = VERTICAL_GAP,
	horizontalOffset: number = HORIZONTAL_OFFSET
): void {
	const scrollerElem = anchorElem.parentElement;

	if (targetRect === null || !scrollerElem) {
		floatingElem.style.opacity = "0";
		floatingElem.style.transform = "translate(-10000px, -10000px)";
		return;
	}

	const floatingElemRect = floatingElem.getBoundingClientRect();
	const anchorElementRect = anchorElem.getBoundingClientRect();
	const editorScrollerRect = scrollerElem.getBoundingClientRect();

	let top = targetRect.top - verticalGap;
	let left = targetRect.left - horizontalOffset;

	if (top < editorScrollerRect.top) {
		top += floatingElemRect.height + targetRect.height + verticalGap * 2;
	}

	if (left + floatingElemRect.width > editorScrollerRect.right) {
		left =
			editorScrollerRect.right -
			floatingElemRect.width -
			horizontalOffset;
	}

	top -= anchorElementRect.top;
	left -= anchorElementRect.left;

	floatingElem.style.opacity = "1";
	floatingElem.style.transform = `translate(${left}px, ${top}px)`;
}

function FloatingLinkEditor({
	editor,
	isLink,
	setIsLink,
	anchorElem,
	isLinkEditMode,
	setIsLinkEditMode,
}: {
	editor: LexicalEditor;
	isLink: boolean;
	setIsLink: React.Dispatch<boolean>;
	anchorElem: HTMLElement;
	isLinkEditMode: boolean;
	setIsLinkEditMode: React.Dispatch<boolean>;
}): JSX.Element {
	const editorRef = React.useRef<HTMLDivElement | null>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [linkUrl, setLinkUrl] = React.useState("");
	const [editedLinkUrl, setEditedLinkUrl] = React.useState("https://");
	const [lastSelection, setLastSelection] =
		React.useState<BaseSelection | null>(null);

	const updateLinkEditor = React.useCallback(() => {
		const selection = $getSelection();
		if ($isRangeSelection(selection)) {
			const linkNode = $findMatchingParent(
				getSelectedNode(selection),
				$isLinkNode
			);
			setLinkUrl(linkNode ? linkNode.getURL() : "");
		}
		const editorElem = editorRef.current;
		if (editorElem === null) return;

		const nativeSelection = window.getSelection();
		const activeElement = document.activeElement;
		const rootElement = editor.getRootElement();

		if (
			selection !== null &&
			nativeSelection !== null &&
			rootElement !== null &&
			rootElement.contains(nativeSelection.anchorNode) &&
			editor.isEditable()
		) {
			const domRect: DOMRect | undefined =
				nativeSelection.focusNode?.parentElement?.getBoundingClientRect();
			if (domRect) {
				domRect.y += 40;
				setFloatingElemPositionForLinkEditor(
					domRect,
					editorElem,
					anchorElem
				);
			}
			setLastSelection(selection);
		} else if (!activeElement || activeElement.className !== "link-input") {
			if (rootElement !== null) {
				setFloatingElemPositionForLinkEditor(
					null,
					editorElem,
					anchorElem
				);
			}
			setLastSelection(null);
			setIsLinkEditMode(false);
			setLinkUrl("");
		}
	}, [anchorElem, editor, setIsLinkEditMode]);

	React.useEffect(() => {
		const scrollerElem = anchorElem.parentElement;

		const update = () => {
			editor.getEditorState().read(() => {
				updateLinkEditor();
			});
		};

		window.addEventListener("resize", update);
		scrollerElem?.addEventListener("scroll", update);

		return () => {
			window.removeEventListener("resize", update);
			scrollerElem?.removeEventListener("scroll", update);
		};
	}, [anchorElem.parentElement, editor, updateLinkEditor]);

	React.useEffect(() => {
		return mergeRegister(
			editor.registerUpdateListener(({ editorState }) => {
				editorState.read(() => {
					updateLinkEditor();
				});
			}),

			editor.registerCommand(
				SELECTION_CHANGE_COMMAND,
				() => {
					updateLinkEditor();
					return true;
				},
				COMMAND_PRIORITY_LOW
			),
			editor.registerCommand(
				KEY_ESCAPE_COMMAND,
				() => {
					if (isLink) {
						setIsLink(false);
						return true;
					}
					return false;
				},
				COMMAND_PRIORITY_HIGH
			),
			editor.registerEditableListener((isEditable) => {
				setIsLink(isEditable && isLink);
			})
		);
	}, [editor, updateLinkEditor, setIsLink, isLink]);

	React.useEffect(() => {
		editor.getEditorState().read(() => {
			updateLinkEditor();
		});
	}, [editor, updateLinkEditor]);

	React.useEffect(() => {
		if (isLinkEditMode && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isLinkEditMode, isLink]);

	const monitorInputInteraction = (
		event: React.KeyboardEvent<HTMLInputElement>
	) => {
		if (event.key === "Enter") {
			event.preventDefault();
			handleLinkSubmission();
		} else if (event.key === "Escape") {
			event.preventDefault();
			setIsLinkEditMode(false);
		}
	};

	const handleLinkSubmission = () => {
		if (lastSelection !== null) {
			if (linkUrl !== "") {
				editor.dispatchCommand(
					TOGGLE_LINK_COMMAND,
					sanitizeUrl(editedLinkUrl)
				);
			}
			setEditedLinkUrl("https://");
			setIsLinkEditMode(false);
		}
	};

	return (
		<div ref={editorRef} className={styles["link-editor"]}>
			{!isLink ? null : isLinkEditMode ? (
				<>
					<input
						ref={inputRef}
						className="link-input"
						value={editedLinkUrl}
						onChange={(event) => {
							setEditedLinkUrl(event.target.value);
						}}
						onKeyDown={(event) => {
							monitorInputInteraction(event);
						}}
					/>
					<button
						tabIndex={0}
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => {
							setIsLinkEditMode(false);
						}}
					>
						<i className="bi-x-circle" />
					</button>
					<button
						tabIndex={0}
						onMouseDown={(event) => event.preventDefault()}
						onClick={handleLinkSubmission}
					>
						<i className="bi-check-circle" />
					</button>
				</>
			) : (
				<>
					<a
						href={sanitizeUrl(linkUrl)}
						target="_blank"
						rel="noopener noreferrer"
					>
						{linkUrl}
					</a>
					<button
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => {
							setEditedLinkUrl(linkUrl);
							setIsLinkEditMode(true);
						}}
					>
						<i className="bi-pencil" />
					</button>
					<button
						tabIndex={0}
						onMouseDown={(event) => event.preventDefault()}
						onClick={() => {
							editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
						}}
					>
						<i className="bi-trash" />
					</button>
				</>
			)}
		</div>
	);
}

function FloatingLinkEditorPlugin({
	anchorElem = document.body,
}: {
	anchorElem?: HTMLElement;
}) {
	const [editor] = useLexicalComposerContext();
	const [activeEditor, setActiveEditor] = React.useState(editor);
	const [isLink, setIsLink] = React.useState(false);
	const [isLinkEditMode, setIsLinkEditMode] = React.useState(false);

	React.useEffect(() => {
		function updateToolbar() {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				const linkNode = $findMatchingParent(
					getSelectedNode(selection),
					$isLinkNode
				);
				// We don't want this menu to open for auto links.
				setIsLink(linkNode !== null && !$isAutoLinkNode(linkNode));
			}
		}
		return mergeRegister(
			editor.registerUpdateListener(({ editorState }) => {
				editorState.read(() => {
					updateToolbar();
				});
			}),
			editor.registerCommand(
				SELECTION_CHANGE_COMMAND,
				(_payload, newEditor) => {
					updateToolbar();
					setActiveEditor(newEditor);
					return false;
				},
				COMMAND_PRIORITY_CRITICAL
			),
			editor.registerCommand(
				CLICK_COMMAND,
				(payload) => {
					const selection = $getSelection();
					if ($isRangeSelection(selection)) {
						const linkNode = $findMatchingParent(
							getSelectedNode(selection),
							$isLinkNode
						);
						if (linkNode && (payload.metaKey || payload.ctrlKey)) {
							window.open(linkNode.getURL(), "_blank");
							return true;
						}
					}
					return false;
				},
				COMMAND_PRIORITY_LOW
			)
		);
	}, [editor]);

	return createPortal(
		<FloatingLinkEditor
			editor={activeEditor}
			isLink={isLink}
			anchorElem={anchorElem}
			setIsLink={setIsLink}
			isLinkEditMode={isLinkEditMode}
			setIsLinkEditMode={setIsLinkEditMode}
		/>,
		anchorElem
	);
}

export default FloatingLinkEditorPlugin;
