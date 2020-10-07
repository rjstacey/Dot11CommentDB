import React from 'react'
import {Editor, EditorState, RichUtils, getDefaultKeyBinding, KeyBindingUtil,
	ContentBlock, genKey, SelectionState, Modifier, ContentState, convertFromHTML} from 'draft-js'
import 'draft-js/dist/Draft.css'
import Immutable from 'immutable'
import {stateToHTML} from 'draft-js-export-html'
import {stateFromHTML} from 'draft-js-import-html'
import debounce from 'lodash/debounce'
import {ButtonGroup, ActionButton, Checkbox} from '../general/Icons'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'


/* Inline styles */
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

const blockStyleCss = css`
	p {
		margin: 14px 0;
	}

	pre {
		background-color: #f3f3f3;
		font-family: "Inconsolata", "Menlo", "Consolas", monospace;
		font-size: 16px;
		margin: 14px 0;
		padding: 20px;
	}

	blockquote {
		font-family: 'TimesNewRoman', serif;
		margin: 10px 20px;
		padding: 0 0;
	}

	ul {
		font-family: 'TimesNewRoman', serif;
		list-style-type: "— "
	}

	ol {
		font-family: 'TimesNewRoman', serif;
		list-style-type: numeric
	}

	/* There shouldn't be margin outside the first/last blocks */
	p:first-of-type,
	blockquote:first-of-type,
	pre:first-of-type,
	ul:first-of-type,
	ol:first-of-type {
		margin-top: 0;
	}

	p:last-child,
	blockquote:last-child,
	pre:last-child,
	ul:last-child,
	ol:last-child {
		margin-bottom: 0;
	}`

const resolutionEditorCss = css`
	.DraftEditor-root {
		cursor: text;
		font-size: 16px;
		padding: 5px;
	}

	.public-DraftEditor-content {
		border: 1px solid #999;
		border-radius: 2px;
		overflow: auto;
		padding: 5px;
	}

	.public-DraftEditorPlaceholder-root {
		font-style: italic;
		color: GrayText;
	}

	${css(blockStyleCss)}`

export const editorCss = css`
	${resolutionEditorCss}
	b {${css(styleMap['BOLD'])}}
	i {${css(styleMap['ITALIC'])}}
	u {${css(styleMap['UNDERLINE'])}}
	del {${css(styleMap['STRIKETHROUGH'])}}
	mark {${css(styleMap['HIGHLIGHT'])}}`

const BLOCK_TYPES = [
	{label: 'Quote', 			name: 'quote', 					style: 'blockquote'},
	{label: 'Bulleted List', 	name: 'unordered-list-item', 	style: 'unordered-list-item'},
	{label: 'Numbered List', 	name: 'ordered-list-item',		style: 'ordered-list-item'},
	{label: 'Code', 			name: 'code', 					style: 'code-block'},
]

function BlockStyleControls(props) {
	const {editorState, onChange} = props;
	const selection = editorState.getSelection();
	const blockType = editorState
		.getCurrentContent()
		.getBlockForKey(selection.getStartKey())
		.getType();
	return (
		<ButtonGroup>
			{BLOCK_TYPES.map((type) =>
				<ActionButton
					key={type.name}
					isActive={type.style === blockType}
					name={type.name}
					title={type.label}
					onMouseDown={() => onChange(RichUtils.toggleBlockType(editorState, type.style))}
				/>
			)}
		</ButtonGroup>
	)
}

const INLINE_STYLES = [
	{label: 'Bold (Ctrl-b)',		name: 'bold', 				style: 'BOLD'},
	{label: 'Italic (Ctrl-i)',		name: 'italic', 			style: 'ITALIC'},
	{label: 'Underline (Ctrl-u)',	name: 'underline', 			style: 'UNDERLINE'},
	{label: 'Strikethrough (Ctrl-/)', name: 'strikethrough', 	style: 'STRIKETHROUGH'},
	{label: 'Highlight',			name: 'highlight', 			style: 'HIGHLIGHT'},
]

function InlineStyleControls(props) {
	const {editorState, onChange} = props;
	const currentStyle = editorState.getCurrentInlineStyle();
	return (
		<ButtonGroup>
			{INLINE_STYLES.map((type) =>
				<ActionButton
					key={type.name}
					isActive={currentStyle.has(type.style)}
					name={type.name}
					title={type.label}
					onMouseDown={() => onChange(RichUtils.toggleInlineStyle(editorState, type.style))}
				/>
			)}
		</ButtonGroup>
	)
}

function ActionControls(props) {
	const {editorState, onChange} = props;
	const canUndo = editorState.getUndoStack().size !== 0;
    const canRedo = editorState.getRedoStack().size !== 0;
	return (
		<ButtonGroup>
			<ActionButton
				disabled={!canUndo}
				name='undo'
				onMouseDown={() => onChange(EditorState.undo(editorState))}
				title='Undo (Ctrl-z)'
			/>
			<ActionButton
				disabled={!canRedo}
				name='redo'
				onMouseDown={() => onChange(EditorState.redo(editorState))}
				title='Redo (Ctrl-r)'
			/>
		</ButtonGroup>
	)
}

function Toolbar(props) {
	const {editorState, onChange, show} = props;
	const toolbarCss = css`
		visibility: hidden;
		margin-top: auto`

	return (
		<div
			css={[toolbarCss, show && css`visibility: visible`]}
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

const blockRenderMap = Immutable.Map({
	'unstyled': {
		element: 'div'
	},
	'blockquote': {
		element: 'blockquote'
	},
	'code-block': {
		element: 'code',
		wrapper: <pre />
	},
	'unordered-list-item': {
		element: 'li',
		wrapper: <ul />
	},
	'ordered-list-item': {
		element: 'li',
		wrapper: <ol />
	}
});

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
/*
function shouldHidePlaceholder(state) {
	// If the user changes block type before entering any text, we can
	// either style the placeholder or hide it. Let's just hide it now.
	const content = state.getCurrentContent();
	return !content.hasText() && content.getBlockMap().first().getType() !== 'unstyled'
}
*/
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
		<div>
			<label>
				<Checkbox
					name='ResnStatus'
					value='ACCEPTED'
					checked={value === 'ACCEPTED'}
					onChange={onChange}
				/>Accepted
			</label>
			<label>
				<Checkbox
					name='ResnStatus'
					value='REVISED'
					checked={value === 'REVISED'}
					onChange={onChange}
				/>Revised
			</label>
			<label>
				<Checkbox
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
	REVISED: 'V',
	REJECTED: 'J'
}

export function ResolutionEditor(props) {
	const [editorState, setEditorState] = React.useState(EditorState.createEmpty())
	const [showToolbar, setShowToolbar] = React.useState(false)
	const editorRef = props.editorRef || React.useRef()
	const changeResolution = React.useRef()

	React.useEffect(() => {
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

	React.useEffect(() => {

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

	return (
		<div css={resolutionEditorCss} onClick={e => editorRef.current.focus()}>
			<div css={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignContent: 'bottom', padding: 5}}>
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
			<Editor
				ref={editorRef}
				customStyleMap={styleMap}
				blockRenderMap={blockRenderMap}
				//blockStyleFn={blockStyleFn}
				editorState={editorState}
				handleKeyCommand={handleKeyCommand}
				keyBindingFn={mapKeyToEditorCommand}
				handlePastedText={handlePastedText}
				placeholder={props.placeholder || 'Enter some text...'}
				onChange={onChange}
				onBlur={() => setShowToolbar(false)}
				onFocus={() => setShowToolbar(true)}
				spellCheck={true}
			/>
		</div>
	)
}


export function BasicEditor(props) {
	const [editorState, setEditorState] = React.useState(EditorState.createEmpty())
	const [showToolbar, setShowToolbar] = React.useState(false)
	const editorRef = props.editorRef || React.useRef()
	const changeResolution = React.useRef()

	React.useEffect(() => {
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

	React.useEffect(() => {
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

	return (
		<div css={resolutionEditorCss} onClick={e => {console.log('focus'); editorRef.current.focus()}}>
			<div css={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignContent: 'bottom', padding: 5}}>
				{props.children}
				<Toolbar
					show={showToolbar}
					editorState={editorState}
					onChange={onChange}
				/>
			</div>
			<Editor
				ref={editorRef}
				customStyleMap={styleMap}
				editorState={editorState}
				handleKeyCommand={handleKeyCommand}
				keyBindingFn={mapKeyToEditorCommand}
				handlePastedText={handlePastedText}
				blockRenderMap={blockRenderMap}
				placeholder={props.placeholder || 'Enter some text...'}
				onChange={onChange}
				onBlur={() => setShowToolbar(false)}
				onFocus={() => setShowToolbar(true)}
				spellCheck={true}
			/>
		</div>
	);	
}

