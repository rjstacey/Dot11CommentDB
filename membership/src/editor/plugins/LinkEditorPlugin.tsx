/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
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
	GridSelection,
	KEY_ESCAPE_COMMAND,
	LexicalEditor,
	NodeSelection,
	RangeSelection,
	SELECTION_CHANGE_COMMAND,
} from "lexical";
import { Dispatch, useCallback, useEffect, useRef, useState } from "react";
import * as React from "react";
import { createPortal } from "react-dom";

import { ElementNode, TextNode } from "lexical";

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
		// eslint-disable-next-line no-script-url
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
	setIsLink: Dispatch<boolean>;
	anchorElem: HTMLElement;
	isLinkEditMode: boolean;
	setIsLinkEditMode: Dispatch<boolean>;
}): JSX.Element {
	const editorRef = useRef<HTMLDivElement | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [linkUrl, setLinkUrl] = useState("");
	const [editedLinkUrl, setEditedLinkUrl] = useState("https://");
	const [lastSelection, setLastSelection] = useState<
		RangeSelection | GridSelection | NodeSelection | null
	>(null);

	const updateLinkEditor = useCallback(() => {
		const selection = $getSelection();
		if ($isRangeSelection(selection)) {
			const node = getSelectedNode(selection);
			const parent = node.getParent();
			if ($isLinkNode(parent)) {
				setLinkUrl(parent.getURL());
			} else if ($isLinkNode(node)) {
				setLinkUrl(node.getURL());
			} else {
				setLinkUrl("");
			}
		}
		const editorElem = editorRef.current;
		const nativeSelection = window.getSelection();
		const activeElement = document.activeElement;

		if (editorElem === null) {
			return;
		}

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

		return true;
	}, [anchorElem, editor, setIsLinkEditMode]);

	useEffect(() => {
		const scrollerElem = anchorElem.parentElement;

		const update = () => {
			editor.getEditorState().read(() => {
				updateLinkEditor();
			});
		};

		window.addEventListener("resize", update);

		if (scrollerElem) {
			scrollerElem.addEventListener("scroll", update);
		}

		return () => {
			window.removeEventListener("resize", update);

			if (scrollerElem) {
				scrollerElem.removeEventListener("scroll", update);
			}
		};
	}, [anchorElem.parentElement, editor, updateLinkEditor]);

	useEffect(() => {
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
			)
		);
	}, [editor, updateLinkEditor, setIsLink, isLink]);

	useEffect(() => {
		editor.getEditorState().read(() => {
			updateLinkEditor();
		});
	}, [editor, updateLinkEditor]);

	useEffect(() => {
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

function useFloatingLinkEditorToolbar(
	editor: LexicalEditor,
	anchorElem: HTMLElement,
	isLinkEditMode: boolean,
	setIsLinkEditMode: Dispatch<boolean>
): JSX.Element | null {
	const [activeEditor, setActiveEditor] = useState(editor);
	const [isLink, setIsLink] = useState(false);

	useEffect(() => {
		function updateToolbar() {
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				const node = getSelectedNode(selection);
				const linkParent = $findMatchingParent(node, $isLinkNode);
				const autoLinkParent = $findMatchingParent(
					node,
					$isAutoLinkNode
				);
				// We don't want this menu to open for auto links.
				if (linkParent !== null && autoLinkParent === null) {
					setIsLink(true);
				} else {
					setIsLink(false);
				}
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
						const node = getSelectedNode(selection);
						const linkNode = $findMatchingParent(node, $isLinkNode);
						if (
							$isLinkNode(linkNode) &&
							(payload.metaKey || payload.ctrlKey)
						) {
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

export default function FloatingLinkEditorPlugin({
	anchorElem = document.body,
}: {
	anchorElem?: HTMLElement;
}): JSX.Element | null {
	const [editor] = useLexicalComposerContext();
	const [isLinkEditMode, setIsLinkEditMode] = useState(false);
	return useFloatingLinkEditorToolbar(
		editor,
		anchorElem,
		isLinkEditMode,
		setIsLinkEditMode
	);
}