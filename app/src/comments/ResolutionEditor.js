import React from 'react'
import {Editor, EditorState, RichUtils, getDefaultKeyBinding, KeyBindingUtil,
	Modifier, ContentState, convertFromHTML} from 'draft-js'
import 'draft-js/dist/Draft.css'
import Immutable from 'immutable'
import {stateToHTML} from 'draft-js-export-html'
import {debounce} from '../lib/utils'
import {ActionButton} from '../general/Icons'
import {css} from '@emotion/core'
import styled from '@emotion/styled'

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

const blockStyleFn = (contentBlock) => contentBlock.getType()

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

	ul,
	ul > .unordered-list-item {
		font-family: 'TimesNewRoman', serif;
		list-style-type: "— "
	}

	ol,
	ol > .ordered-list-item {
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
	}
`;

export const editorCss = css`
	${css(blockStyleCss)}
	b {${css(styleMap['BOLD'])}}
	i {${css(styleMap['ITALIC'])}}
	u {${css(styleMap['UNDERLINE'])}}
	del {${css(styleMap['STRIKETHROUGH'])}}
	mark {${css(styleMap['HIGHLIGHT'])}}
`;

const ButtonGroup = styled.div`
	display: inline-block;
	margin: 0 5px 0 0;
	padding: 3px 8px;
	height: 30px;
	line-height: 22px;
	box-sizing: border-box;
`;

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


function Toolbar({style, className, editorState, onChange}) {

	return (
		<div
			style={style}
			className={className}
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
		'unstyled': (block) => '<p>' + block.getText() + '</p>',
		'paragraph': (block) => '<p>' + block.getText() + '</p>',
		'code-block': (block) => '<code>' + block.getText() + '</code>',
		'blockquote': (block) => '<blockquote>' + block.getText() + '</blockquote>',
	},
	defaultBlockTag: 'p'*/
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

export class ResolutionEditor extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			showToolbar: false,
			value: props.value,
			editorState: this.initEditorState(props.value)
		}
		this.editorRef = null;
		this.debouncedSave = debounce(this.save, 500);
	}

	componentWillUnmount() {
		this.debouncedSave.flush();
	}

	componentDidUpdate() {
		if (!this.state.editorState.getSelection().hasFocus &&
			this.state.value !== this.props.value) {
			//console.log(this.state.resolution, this.props.resolution)

			// flush edits (if any)
			this.debouncedSave.flush();

			// Reinitialize state from props
			console.log('reinit from ', this.props.value)
			this.setState({
				value: this.props.value,
				editorState: this.initEditorState(this.props.value)
			});
		}
	}

	initEditorState = (value) => {
		const html = value? value.split('\n').map(t => `<p>${t}</p>`).join(''): '';
		const blocksFromHTML = convertFromHTML(html)
		const contentState = ContentState.createFromBlockArray(
			blocksFromHTML.contentBlocks,
			blocksFromHTML.entityMap,
		)
		return EditorState.createWithContent(contentState);
	}

	save = () => {
		this.setState((state, props) => {
			const content = state.editorState.getCurrentContent();
			const value = content.hasText()? stateToHTML(content, htmlConversionOptions): '';
			if (value !== state.value) {
				props.onChange(value)
				return {...state, value}
			}
			return state;
		})
	}

	onChange = (editorState) => {
		this.setState({editorState});
		this.debouncedSave();
	}

	handleKeyCommand  = (command, state) => {
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
			this.onChange(newState);
			return 'handled';
		}
		return 'not-handled';
	}

	handlePastedText = (text, html, editorState) => {
		const newContent = ContentState.createFromText(text);
		const content = Modifier.replaceWithFragment(
			editorState.getCurrentContent(),
			editorState.getSelection(),
			newContent.getBlockMap()
		);
		const newEditorState = EditorState.push(editorState, content, 'insert-fragment');
		this.onChange(newEditorState);
		return true;
	}

	render() {
		return (
			<div
				style={{position: 'relative'}}
				className={this.props.className}
				onClick={e => this.editorRef.focus()}	// a click inside the container places focus on the editor
			>
				<StyledToolbar
					style={{visibility: this.state.showToolbar? 'visible': 'hidden'}}
					editorState={this.state.editorState}
					onChange={this.onChange}
				/>
				<EditorContainer>
					<Editor
						ref={ref => this.editorRef = ref}
						editorState={this.state.editorState}
						onChange={this.onChange}
						customStyleMap={styleMap}
						blockRenderMap={blockRenderMap}
						blockStyleFn={blockStyleFn}
						keyBindingFn={mapKeyToEditorCommand}
						handleKeyCommand={this.handleKeyCommand}
						handlePastedText={this.handlePastedText}
						placeholder={this.props.placeholder || 'Enter some text...'}
						onBlur={() => this.setState({showToolbar: false})}
						onFocus={() => this.setState({showToolbar: true})}
						spellCheck
					/>
				</EditorContainer>
			</div>
		)
	}
}

const StyledToolbar = styled(Toolbar)`
	position: absolute;
	top: -34px;
	right: 0;
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-content: bottom;
`;

const EditorContainer = styled.div`

	.DraftEditor-root {
		cursor: text;
		font-size: 16px;
		padding: 5px;
	}

	.public-DraftEditor-content {
		overflow: auto;
		padding: 5px;
	}

	.public-DraftEditorPlaceholder-root {
		font-style: italic;
		color: GrayText;
		width: unset;
	}

	${css(blockStyleCss)}
`;
