import React, {useState, useEffect, useRef} from 'react'
import cx from 'classnames'
import {Editor, EditorState, RichUtils, getDefaultKeyBinding, KeyBindingUtil,
	ContentBlock, genKey, SelectionState, Modifier, ContentState, convertFromHTML} from 'draft-js'
import Immutable from 'immutable'
import {ActionButton} from './Icons'
import 'draft-js/dist/Draft.css'
import {stateToHTML} from 'draft-js-export-html'
import {stateFromHTML} from 'draft-js-import-html'
import debounce from 'lodash/debounce'
import styles from './ResolutionEditor.css'


const BLOCK_TYPES = [
	{label: 'quote', style: 'blockquote'},
	{label: 'unordered-list-item', style: 'unordered-list-item'},
	{label: 'ordered-list-item', style: 'ordered-list-item'},
	{label: 'code', style: 'code-block'},
]

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
					onMouseDown={() => onChange(RichUtils.toggleBlockType(editorState, type.style))}
				/>
			)}
		</div>
	)
}

var INLINE_STYLES = [
	{label: 'bold', style: 'BOLD', title: 'Ctrl-b'},
	{label: 'italic', style: 'ITALIC', title: 'Ctrl-i'},
	{label: 'underline', style: 'UNDERLINE', title: 'Ctrl-u'},
	{label: 'strikethrough', style: 'STRIKETHROUGH', title: 'Ctrl-/'},
	{label: 'highlight', style: 'HIGHLIGHT'},
]
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
					onMouseDown={() => onChange(RichUtils.toggleInlineStyle(editorState, type.style))}
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
				disabled={!canUndo}
				name='undo'
				onMouseDown={() => onChange(EditorState.undo(editorState))}
				title='Ctrl-z'
			/>
			<ActionButton
				disabled={!canRedo}
				name='redo'
				onMouseDown={() => onChange(EditorState.redo(editorState))}
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

const styleMap = {
	'BOLD': {
		'fontWeight': 'bold'
	},
	'ITALIC': {
		'fontStyle': 'italic'
	},
	'UNDERLINE': {
		'color': 'blue',
		'textDecoration': 'underline'
	},
	'STRIKETHROUGH': {
		'color': 'red',
		'textDecoration': 'line-through'
	},
	'HIGHLIGHT': {
		'backgroundColor': '#faed27',
	}
}

const htmlConversionOptions = {
	inlineStyles: {
		BOLD: {element: 'b'},
		ITALIC: {element: 'i'},
		UNDERLINE: {element: 'u'},
		STRIKETHROUGH: {element: 'del'},
		HIGHLIGHT: {element: 'mark'},
	},
	/*blockRenderers: {
		'code-block': (block) => {
			return '<code>' + block.getText() + '</code>'
		},
		'blockquote': (block) => {
			return '<blockquote>' + block.getText() + '</blockquote>'
		},
	},*/
	//defaultBlockTag: ' '
}

function blockStyleFn(block) {
	switch (block.getType()) {
	case 'unstyled':
		return cx(styles.block, styles.paragraph)
	case 'blockquote':
		return cx(styles.block, styles.blockquote)
	case 'code-block':
		return cx(styles.block, styles.codeBlock)
	default:
		return styles.block;
	}
}

function mapKeyToEditorCommand(e) {
	if (KeyBindingUtil.hasCommandModifier(e) && e.key === '/') {
		return 'strikethrough';
	}
	if (KeyBindingUtil.hasCommandModifier(e) && e.key === 'h') {
		return 'highlight';
	}
	if ((KeyBindingUtil.hasCommandModifier(e) || e.shiftKey) && e.keyCode === 13) {
		return 'soft-newline';
	}
	return getDefaultKeyBinding(e);
}
	

function shouldHidePlaceholder(state) {
	// If the user changes block type before entering any text, we can
	// either style the placeholder or hide it. Let's just hide it now.
	const content = state.getCurrentContent();
	return !content.hasText() && content.getBlockMap().first().getType() !== 'unstyled'
}

function getResnStatus(editorState) {
	const blockText = editorState.getCurrentContent().getFirstBlock().getText()
	if (blockText.search(/ACCEPT/i) !== -1) {
		return 'ACCEPTED'
	}
	if (blockText.search(/REVISE/i) !== -1) {
		return 'REVISED'
	}
	if (blockText.search(/REJECT/i) !== -1) {
		return 'REJECTED'
	}
	return ''
}

function updateResnStatus(editorState, resnStatus) {
	let newState;
	let content = editorState.getCurrentContent()
	const block = content.getFirstBlock()
	const m = block.getText().match(/(ACCEPTED|REVISED|REJECTED|ACCEPT|REVISE|REJECT)/i)
	if (m) {
		const start = m.index
		const end = m.index + m[1].length
		if (block.getText() === m[1] && resnStatus === '' && content.getKeyAfter(block.key)) {
			// The first block is resolution status (no additional text) and it is being removed
			const selection = SelectionState.createEmpty(block.key)
				.merge({
					'anchorOffset': start,
					'focusKey': content.getKeyAfter(block.key),
					'focusOffset': 0,
					'hasFocus': true
				})
			content = Modifier.removeRange(content, selection, 'backward')
			return EditorState.push(editorState, content, 'remove-range')
		}
		else {
			console.log('replace')
			const selection = SelectionState.createEmpty(block.key)
				.merge({
					'anchorOffset': start,
					'focusOffset': end,
					'hasFocus': true
				})
			content = Modifier.replaceText(content, selection, resnStatus)
				.set('selectionAfter', editorState.getSelection())
			newState = EditorState.push(editorState, content, 'change-block-data')

		}	
	}
	else if (resnStatus) {
		const newBlock = new ContentBlock({
			key: genKey(),
			type: 'unstyled',
			text: resnStatus,
		})

		const blockMap =
			Immutable.OrderedMap([[newBlock.key, newBlock]])
			.concat(content.getBlockMap())

		content = content.set('blockMap', blockMap)

		newState = EditorState.push(editorState, content, 'insert-fragment')
	}

	if (newState) {
		return EditorState.forceSelection(newState, editorState.getSelection())
	}

	return editorState
}

function ResnStatus(props) {
	const {editorState} = props
	const value = getResnStatus(editorState)

	function onChange(e) {
		const value = e.target.checked? e.target.value: ''
		props.onChange(updateResnStatus(editorState, value))
		e.stopPropagation()
	}

	return (
		<div className={styles.ResolutionStatus}>
			<label>
				<input
					className='checkbox'
					type='checkbox'
					name='ResnStatus'
					value='ACCEPTED'
					checked={value === 'ACCEPTED'}
					onChange={onChange}
				/>Accepted
			</label>
			<label>
				<input
					className='checkbox'
					type='checkbox'
					name='ResnStatus'
					value='REVISED'
					checked={value === 'REVISED'}
					onChange={onChange}
				/>Revised
			</label>
			<label>
				<input
					className='checkbox'
					type='checkbox'
					name='ResnStatus'
					value='REJECTED'
					checked={value === 'REJECTED'}
					onChange={onChange}
				/>Rejected
			</label>
		</div>
	)
}

const mapResnStatus = {
	ACCEPTED: 'A',
	REVISED: 'R',
	REJECTED: 'J'
}

export function ResolutionEditor(props) {
	const [editorState, setEditorState] = useState(EditorState.createEmpty())
	const [showToolbar, setShowToolbar] = useState(false)
	const editorRef = props.editorRef || useRef()
	const changeResolution = useRef()

	useEffect(() => {
		changeResolution.current = debounce((currentResolution, editorState, onChange) => {
			const newResolution = stateToHTML(editorState.getCurrentContent(), htmlConversionOptions)
			const newResnStatus = mapResnStatus[getResnStatus(editorState)] || ''
			if (currentResolution !== newResolution) {
				//console.log('save state', newResolution)
				onChange(newResnStatus, newResolution)
			}
		}, 500)
		return () => {
			changeResolution.current.flush()
		}
	}, [])

	useEffect(() => {

		const html = stateToHTML(editorState.getCurrentContent(), htmlConversionOptions)
		if (props.value !== html) {
			const blocksFromHTML = convertFromHTML(props.value || '')
			const contentState = ContentState.createFromBlockArray(
				blocksFromHTML.contentBlocks,
				blocksFromHTML.entityMap,
			)
			/*let contentState = stateFromHTML(props.value || '', htmlConversionOptions)*/
			setEditorState(EditorState.createWithContent(contentState))
		}
	}, [props.value])

	function onChange(state) {
		setEditorState(state)
		changeResolution.current(props.value, state, props.onChange)
	}

	function handleKeyCommand(command, state) {
		let newState = RichUtils.handleKeyCommand(state, command)
		if (!newState && command === 'strikethrough') {
			newState = RichUtils.toggleInlineStyle(state, 'STRIKETHROUGH')
		}
		if (!newState && command === 'highlight') {
			newState = RichUtils.toggleInlineStyle(state, 'HIGHLIGHT')
		}
		if (!newState && command === 'soft-newline') {
			newState = RichUtils.insertSoftNewline(state)
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
				<ResnStatus
					editorState={editorState}
					onChange={onChange}
				/>
				<Toolbar
					show={showToolbar}
					editorState={editorState}
					onChange={onChange}
				/>
			</div>
			<div className={styles.editor}>
				<Editor
					className={className}
					ref={editorRef}
					customStyleMap={styleMap}
					//blockRenderMap={blockRenderMap}
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


export function BasicEditor(props) {
	const [editorState, setEditorState] = useState(EditorState.createEmpty())
	const [showToolbar, setShowToolbar] = useState(false)
	const editorRef = props.editorRef || useRef()
	const changeResolution = useRef()

	useEffect(() => {
		changeResolution.current = debounce((resolutionHtml, editorState, onChange) => {
			const html = stateToHTML(editorState.getCurrentContent(), htmlConversionOptions)
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
		const html = stateToHTML(editorState.getCurrentContent(), htmlConversionOptions)
		console.log('html:', html)
		if (props.value !== html) {
			console.log('props.value:', props.value)
			let contentState = stateFromHTML(props.value || '', htmlConversionOptions)
			setEditorState(EditorState.createWithContent(contentState))
		}
	}, [props.value])

	function onChange(state) {
		console.log('onChange', stateToHTML(state.getCurrentContent(), htmlConversionOptions))
		setEditorState(state)
		changeResolution.current(props.value, state, props.onChange)
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
		<div className={styles.root} onClick={e => {console.log('focus'); editorRef.current.focus()}}>
			<div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignContent: 'bottom', padding: 5}}>
				{props.children}
				<Toolbar
					show={showToolbar}
					editorState={editorState}
					onChange={onChange}
				/>
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

