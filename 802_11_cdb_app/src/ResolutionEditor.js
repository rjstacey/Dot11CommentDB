import React, {useState, useEffect, useRef} from 'react'
import cx from 'classnames'
import {Editor, EditorState, RichUtils, getDefaultKeyBinding, KeyBindingUtil, ContentBlock, genKey} from 'draft-js'
import {List, OrderedMap, Map} from 'immutable'
import {ActionButton} from './Icons'
import 'draft-js/dist/Draft.css'
import {stateToHTML} from 'draft-js-export-html'
import {stateFromHTML} from 'draft-js-import-html'
import debounce from 'lodash/debounce'
import styles from './ResolutionEditor.css'


const styleMap = {
	'HIGHLIGHT': {
		'backgroundColor': '#faed27',
	}
};

const BLOCK_TYPES = [
	{label: 'quote', style: 'blockquote'},
	{label: 'unordered-list-item', style: 'unordered-list-item'},
	{label: 'ordered-list-item', style: 'ordered-list-item'},
	{label: 'code', style: 'code-block'},
];
function BlockStyleControls(props) {
	const {editorState, onChange} = props;
	const selection = editorState.getSelection();
	const blockType = editorState
		.getCurrentContent()
		.getBlockForKey(selection.getStartKey())
		.getType();
	return (
		<div className={styles.buttonGroup}>
			{BLOCK_TYPES.map((type) =>
				<ActionButton
					key={type.label}
					isActive={type.style === blockType}
					name={type.label}
					onClick={() => onChange(RichUtils.toggleBlockType(editorState, type.style))}
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
function InlineStyleControls(props) {
	const {editorState, onChange} = props;
	const currentStyle = editorState.getCurrentInlineStyle();
	return (
		<div className={styles.buttonGroup}>
			{INLINE_STYLES.map((type) =>
				<ActionButton
					key={type.label}
					isActive={currentStyle.has(type.style)}
					name={type.label}
					onClick={() => onChange(RichUtils.toggleInlineStyle(editorState, type.style))}
					title={type.title}
				/>
			)}
		</div>
	);
};

function ActionControls(props) {
	const {editorState, onChange} = props;
	const canUndo = editorState.getUndoStack().size !== 0;
    const canRedo = editorState.getRedoStack().size !== 0;
	return (
		<div className={styles.buttonGroup}>
			<ActionButton
				isDisabled={!canUndo}
				name='undo'
				onClick={() => onChange(EditorState.undo(editorState))}
				title='Ctrl-z'
			/>
			<ActionButton
				isDisabled={!canRedo}
				name='redo'
				onClick={() => onChange(EditorState.redo(editorState))}
				title='Ctrl-r'
			/>
		</div>
	);
};

function Toolbar(props) {
	const {editorState, onChange, show} = props;

	return (
		<div
			className={cx({[styles.toolbar]: true, [styles.visible]: show})}
			//style={{visibility: show? 'visible': 'hidden', marginTop: 'auto'}}
			onMouseDown={e => e.preventDefault()}	// don't take focus from editor
		>
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
	)
}

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

function mapKeyToEditorCommand(e) {
	if (KeyBindingUtil.hasCommandModifier(e) && e.key === '/') {
		return 'strikethrough';
	}
	if (KeyBindingUtil.hasCommandModifier(e) && e.key === 'h') {
		return 'highlight';
	}
	return getDefaultKeyBinding(e);
}
	

function shouldHidePlaceholder(state) {
	// If the user changes block type before entering any text, we can
	// either style the placeholder or hide it. Let's just hide it now.
	const contentState = state.getCurrentContent();
	if (!contentState.hasText()) {
		if (contentState.getBlockMap().first().getType() !== 'unstyled') {
			return true;
		}
	}
	return false;
}

function insertNewBlock(editorState, text) {
	const content = editorState.getCurrentContent();
	const blockMap = content.getBlockMap();

	const newBlockKey = genKey();

	const newBlock = new ContentBlock({
		key: newBlockKey,
		type: 'unstyled',
		text: text,
		characterList: new List(),
		depth: 0,
		data: new Map({}),
	});

	const newBlockMap = OrderedMap([[newBlockKey, newBlock]]).concat(blockMap)

	const selection = editorState.getSelection();

	const newContent = content.merge({
		blockMap: newBlockMap,
		selectionBefore: selection,
		selectionAfter: selection.merge({
			anchorKey: newBlockKey,
			anchorOffset: 0,
			focusKey: newBlockKey,
			focusOffset: 0,
			isBackward: false,
		}),
	});

	return EditorState.push(editorState, newContent, 'split-block');
}

export function BasicEditor(props) {
	const {value, header} = props
	const [editorState, setEditorState] = useState(EditorState.createEmpty())
	const [showToolbar, setShowToolbar] = useState(false)
	const editorRef = useRef()
	const changeResolution = useRef()

	useEffect(() => {
		changeResolution.current = debounce((resolutionHtml, editorState, onChange) => {
			const html = stateToHTML(editorState.getCurrentContent(), options)
			console.log(html)
			if (resolutionHtml !== html) {
				onChange(html)
			}
		}, 500)
		return () => {
			changeResolution.current.flush()
		}
	}, [])

	useEffect(() => {
		if (props.header) {
			setEditorState(insertNewBlock(editorState, props.header))
		}
	}, [props.header])

	useEffect(() => {
		const html = stateToHTML(editorState.getCurrentContent(), options)
		if (value !== html) {
			let contentState = stateFromHTML(value, options)
			setEditorState(EditorState.createWithContent(contentState))
		}
	}, [props.value])

	function onChange(state) {
		setEditorState(state)
		changeResolution.current(value, state, props.onChange)
	}

	function handleKeyCommand(command, state) {
		let newState = RichUtils.handleKeyCommand(state, command);
		if (!newState && command === 'strikethrough') {
			newState = RichUtils.toggleInlineStyle(state, 'STRIKETHROUGH');
		}
		if (!newState && command === 'highlight') {
			newState = RichUtils.toggleInlineStyle(state, 'HIGHLIGHT');
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

	let className = cx({
		[styles.editor]: true,
		[styles.hidePlaceholder]: shouldHidePlaceholder(editorState),
	});

	return (
		<div className={styles.root} onClick={e => editorRef.current.focus()}>
			<div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignContent: 'bottom', padding: 5}}>
				{props.children? props.children: <div />}
				<Toolbar
					show={showToolbar}
					editorState={editorState}
					onChange={onChange}
				/>
			</div>
			<div className={styles.editor}>
				{header && <p>{header}</p>}
				<Editor
					className={className}
					ref={editorRef}
					customStyleMap={styleMap}
					editorState={editorState}
					handleKeyCommand={handleKeyCommand}
					keyBindingFn={mapKeyToEditorCommand}
					handlePastedText={handlePastedText}
					blockStyleFn={blockStyleFn}
					placeholder={props.placeholder || 'Enter some text...'}
					onChange={onChange}
					onBlur={() => setShowToolbar(false)}
					onFocus={() => setShowToolbar(true)}
					spellCheck={true}
				/>
			</div>
		</div>
	);	
}

