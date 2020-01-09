import React, {useState, useEffect, useRef} from 'react'
import cx from 'classnames'
import {Editor, EditorState, RichUtils, getDefaultKeyBinding, KeyBindingUtil} from 'draft-js';
import {EditorToolIcon} from './Icons';
import 'draft-js/dist/Draft.css'
import {stateToHTML} from 'draft-js-export-html';
import {stateFromHTML} from 'draft-js-import-html';
import styles from './ResolutionEditor.css'


const styleMap = {
	'HIGHLIGHT': {
		'backgroundColor': '#faed27',
	}
};

const StyleButton = (props) => {
	let {className, label, isActive, isDisabled} = props;
	className = cx(className, {
		[styles.button]: true,
		[styles.isActive]: isActive,
	});
	let onClick = (e) => {
			e.preventDefault();
			props.onClick(e);
	}
	return (
		<button
			className={className}
			onMouseDown={onClick}
			disabled={isDisabled}
		>
			<EditorToolIcon className={styles.icon} icon={label} />
		</button>
	);
}

const BLOCK_TYPES = [
	{label: 'quote', style: 'blockquote'},
	{label: 'unordered-list-item', style: 'unordered-list-item'},
	{label: 'ordered-list-item', style: 'ordered-list-item'},
	{label: 'code', style: 'code-block'},
];
const BlockStyleControls = (props) => {
	const {editorState} = props;
	const selection = editorState.getSelection();
	const blockType = editorState
		.getCurrentContent()
		.getBlockForKey(selection.getStartKey())
		.getType();
	return (
		<div className={styles.buttonGroup}>
			{BLOCK_TYPES.map((type) =>
				<StyleButton
					key={type.label}
					isActive={type.style === blockType}
					label={type.label}
					onClick={() => props.onChange(RichUtils.toggleBlockType(editorState, type.style))}
				/>
			)}
		</div>
	);
};

var INLINE_STYLES = [
	{label: 'bold', style: 'BOLD', title: 'Ctrl-b'},
	{label: 'italic', style: 'ITALIC', title: 'Ctrl-i'},
	{label: 'underline', style: 'UNDERLINE', title: 'Ctrl-u'},
	{label: 'strikethrough', style: 'STRIKETHROUGH', title: 'Ctrl-/'},
	{label: 'highlight', style: 'HIGHLIGHT'},
];
const InlineStyleControls = (props) => {
	const {editorState} = props;
	const currentStyle = editorState.getCurrentInlineStyle();
	return (
		<div className={styles.buttonGroup}>
			{INLINE_STYLES.map((type) =>
				<StyleButton
					key={type.label}
					isActive={currentStyle.has(type.style)}
					label={type.label}
					onClick={() => props.onChange(RichUtils.toggleInlineStyle(editorState, type.style))}
					title={type.title}
				/>
			)}
		</div>
	);
};

const ActionControls = (props) => {
	let editorState = props.editorState;
	let canUndo = editorState.getUndoStack().size !== 0;
    let canRedo = editorState.getRedoStack().size !== 0;
	return (
		<div className={styles.buttonGroup}>
			<StyleButton
				isDisabled={!canUndo}
				label='undo'
				onClick={() => props.onChange(EditorState.undo(editorState))}
				title='Ctrl-z'
			/>
			<StyleButton
				isDisabled={!canRedo}
				label='redo'
				onClick={() => props.onChange(EditorState.redo(editorState))}
				title='Ctrl-r'
			/>
		</div>
	);
};

const options = {
	inlineStyles: {
		BOLD: {element: 'b'},
		ITALIC: {element: 'i'},
		UNDERLINE: {element: 'ins'},
		STRIKETHROUGH: {element: 'del'},
		HIGHLIGHT: {element: 'mark'},
	},
	//defaultBlockTag: ' '
}

function blockStyleFn(block) {
	let result = styles.block;
	switch (block.getType()) {
	case 'unstyled':
		return cx(result, styles.paragraph);
	case 'blockquote':
		return cx(result, styles.blockquote);
	case 'code-block':
		return cx(result, styles.codeBlock);
	default:
		return result;
	}
}

export function ResolutionEditor(props) {
	const [editorState, setEditorState] = useState(EditorState.createEmpty())
	const [resnStatus, setResnStatus] = useState('')
	const [showTools, setShowTools] = useState(false)
	const editorRef = useRef(null)

	useEffect(() => {
		const html = stateToHTML(editorState.getCurrentContent(), options)
		if (props.resolution !== html) {
			let contentState = stateFromHTML(props.resolution, options)
			setEditorState(EditorState.createWithContent(contentState))
		}
		if (props.resnStatus !== resnStatus) {
			setResnStatus(props.resnStatus)
		}
	}, [props.resolution, props.resnStatus])

	function changeResolutionCheckboxGroup(e) {
		e.preventDefault()
		setResnStatus(e.target.checked? '': e.target.value)
 	}

	function onChange(editorState) {
		setEditorState(editorState)
	}

	function emitChange(e) {
		const {changeResolution, changeResnStatus} = props
		if (changeResolution) {
			const html = stateToHTML(editorState.getCurrentContent(), options)
			console.log(html)
			changeResolution(html)
		}
		if (changeResnStatus) {
			changeResnStatus(resnStatus)
		}
	}

	function mapKeyToEditorCommand(e) {
		if (e.keyCode === 9 /* TAB */) {
			e.preventDefault();
			console.log('TAB')
			const newEditorState = RichUtils.onTab(
					e,
					editorState,
					4, /* maxDepth */
				);
			if (newEditorState !== editorState) {
				onChange(newEditorState);
			}
			return;
		}
		if (KeyBindingUtil.hasCommandModifier(e) && e.key === '/') {
			return 'strikethrough';
		}
		if (KeyBindingUtil.hasCommandModifier(e) && e.key === 'h') {
			return 'highlight';
		}
		return getDefaultKeyBinding(e);
	}

	function handleKeyCommand(command, state) {
		var newState = RichUtils.handleKeyCommand(editorState, command);
		if (!newState && command === 'strikethrough') {
			newState = RichUtils.toggleInlineStyle(editorState, 'STRIKETHROUGH');
		}
		if (!newState && command === 'highlight') {
			newState = RichUtils.toggleInlineStyle(editorState, 'HIGHLIGHT');
		}
		if (newState) {
			onChange(newState);
			return 'handled';
		}
		return 'not-handled';
	}

	function handlePastedText(text, html) {
		console.log(html)
		return false;
	}

	function shouldHidePlaceholder() {
		// If the user changes block type before entering any text, we can
		// either style the placeholder or hide it. Let's just hide it now.
		const contentState = editorState.getCurrentContent();
		if (!contentState.hasText()) {
			if (contentState.getBlockMap().first().getType() !== 'unstyled') {
				return true;
			}
		}
		return false;
	}

	let className = cx({
		[styles.editor]: true,
		[styles.hidePlaceholder]: shouldHidePlaceholder(),
	});

	return (
		<div className={styles.root} onClick={() => editorRef.current.focus()}>
			<div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', padding: 5}}>
				<div className={styles.ResolutionStatus}>
					<label>
						<input
							type='checkbox'
							name='ResnStatus'
							value='A'
							checked={resnStatus === 'A'}
							onMouseDown={changeResolutionCheckboxGroup}		// onMouseDown so that editor does not lose focus
							readOnly
						/>Accepted
					</label>
					<label>
						<input
							type='checkbox'
							name='ResnStatus'
							value='V'
							checked={resnStatus === 'V'}
							onMouseDown={changeResolutionCheckboxGroup}
							readOnly
						/>Revised
					</label>
					<label>
						<input
							type='checkbox'
							name='ResnStatus'
							value='J'
							checked={resnStatus === 'J'}
							onMouseDown={changeResolutionCheckboxGroup}
							readOnly
						/>Rejected
					</label>
				</div>
				<div style={{visibility: showTools? 'visible': 'hidden'}}>
					<BlockStyleControls
						editorState={editorState}
						onChange={onChange}
					/>
					<InlineStyleControls
						editorState={editorState}
						onChange={onChange}
					/>
					<ActionControls
						editorState={editorState}
						onChange={onChange}
					/>
				</div>
			</div>
			<div className={styles.editor}>
				<Editor
					className={className}
					ref={editorRef}
					customStyleMap={styleMap}
					editorState={editorState}
					handleKeyCommand={handleKeyCommand}
					keyBindingFn={mapKeyToEditorCommand}
					handlePastedText={handlePastedText}
					blockStyleFn={blockStyleFn}
					placeholder='Enter some text...'
					onChange={onChange}
					onBlur={(editorState) => {setShowTools(false); emitChange(editorState)}}
					spellCheck={true}
					onFocus={(e) => {setShowTools(true)}}
				/>
			</div>
		</div>
	);	
}
