import React from 'react'
import cx from 'classnames'
import {Editor, EditorState, RichUtils, getDefaultKeyBinding, KeyBindingUtil} from 'draft-js';
import 'draft-js/dist/Draft.css'
import {stateToHTML} from 'draft-js-export-html';
import {stateFromHTML} from 'draft-js-import-html';
import styles from './ResolutionEditor.css'


const styleMap = {
  'HIGHLIGHT': {
    'backgroundColor': '#faed27',
  }
};

class StyleButton extends React.Component {
	constructor() {
		super();
		this.onToggle = (e) => {
			e.preventDefault();
			this.props.onToggle(this.props.style);
		};
	}
	render() {
		let className = 'RichEditor-styleButton';
		if (this.props.active) {
			className += ' RichEditor-activeButton';
		}
		return (
			<button className={styles.button} onMouseDown={this.onToggle}>
				<span className={styles['icon-' + this.props.label]} />
			</button>
		);
	}
}

const BLOCK_TYPES = [
	{label: 'Quote', style: 'blockquote'},
	{label: 'UL', style: 'unordered-list-item'},
	{label: 'OL', style: 'ordered-list-item'},
	{label: 'Code', style: 'code-block'},
];
const BlockStyleControls = (props) => {
	const {editorState} = props;
	const selection = editorState.getSelection();
	const blockType = editorState
		.getCurrentContent()
		.getBlockForKey(selection.getStartKey())
		.getType();
	return (
		//<div className="RichEditor-controls">
		<div className={cx(styles.buttonGroup)}>
			{BLOCK_TYPES.map((type) =>
				<StyleButton
					key={type.label}
					active={type.style === blockType}
					label={type.label}
					onToggle={props.onToggle}
					style={type.style}
				/>
			)}
		</div>
	);
};

var INLINE_STYLES = [
	{label: 'Bold', style: 'BOLD', title: 'Ctrl-b'},
	{label: 'Italic', style: 'ITALIC', title: 'Ctrl-i'},
	{label: 'Underline', style: 'UNDERLINE', title: 'Ctrl-u'},
	{label: 'Strikethrough', style: 'STRIKETHROUGH', title: 'Ctrl-/'},
	{label: 'Highlight', style: 'HIGHLIGHT'},
	{label: 'Monospace', style: 'CODE'},
];
const InlineStyleControls = (props) => {
	const currentStyle = props.editorState.getCurrentInlineStyle();
        
	return (
		//<div className="RichEditor-controls">
		<div className={cx([styles.buttonGroup]: true)}>
			{INLINE_STYLES.map((type) =>
				<StyleButton
					key={type.label}
					active={currentStyle.has(type.style)}
					label={type.label}
					onToggle={props.onToggle}
					style={type.style}
					title={type.title}
				/>
			)}
		</div>
	);
};

const options = {
	inlineStyles: {
		BOLD: {element: 'b'},
		ITALIC: {element: 'i'},
		UNDERLINE: {element: 'ins'},
		STRIKETHROUGH: {element: 'del'},
		HIGHLIGHT: {style: {color: '#ccc'}},
	},
	//defaultBlockTag: ' '
}

export class ResolutionEditor extends React.Component {
	constructor(props) {
		super(props);
		this.state = {editorState: EditorState.createEmpty()};
		console.log(styles)
	}
	static getDerivedStateFromProps(props, state) {
		let newState = {}
		if (props.value !== state.value) {
			newState.value = props.value
			let contentState = stateFromHTML(props.value, options)
			newState.editorState = EditorState.createWithContent(contentState)
		}
		return newState
	}
	onChange = editorState => {
		this.setState({editorState})
	}
	emitChange = e => {
		const {onChange, name} = this.props
		if (onChange) {
			let html = stateToHTML(this.state.editorState.getCurrentContent(), options)
			console.log(html)
			onChange({
				target: {
					name: name,
					value: html
				}
			})
		}
	}
	mapKeyToEditorCommand = e => {
		if (e.keyCode === 9 /* TAB */) {
			e.preventDefault();
			console.log('TAB')
			const newEditorState = RichUtils.onTab(
					e,
					this.state.editorState,
					4, /* maxDepth */
				);
			if (newEditorState !== this.state.editorState) {
				this.onChange(newEditorState);
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
	handleKeyCommand = (command, editorState) => {
		var newState = RichUtils.handleKeyCommand(editorState, command);
		if (!newState && command === 'strikethrough') {
			newState = RichUtils.toggleInlineStyle(this.state.editorState, 'STRIKETHROUGH');
		}
		if (!newState && command === 'highlight') {
			newState = RichUtils.toggleInlineStyle(this.state.editorState, 'HIGHLIGHT');
		}
		if (newState) {
			this.onChange(newState);
			return 'handled';
		}
		return 'not-handled';
	}
	toggleBlockType = (blockType) => {
		this.onChange(
			RichUtils.toggleBlockType(
				this.state.editorState,
				blockType
			)
		);
	}
	toggleInlineStyle = (inlineStyle) => {
		this.onChange(
			RichUtils.toggleInlineStyle(
				this.state.editorState,
				inlineStyle
			)
		);
	}
	handlePastedText = (text, html) => {
		console.log(html)
		return false;
	}
	render() {
		const {editorState} = this.state;
		// If the user changes block type before entering any text, we can
		// either style the placeholder or hide it. Let's just hide it now.
		let className = 'RichEditor-editor';
		var contentState = editorState.getCurrentContent();
		if (!contentState.hasText()) {
			if (contentState.getBlockMap().first().getType() !== 'unstyled') {
				className += ' RichEditor-hidePlaceholder';
			}
		}

		return (
			<div>
				<BlockStyleControls
					editorState={editorState}
					onToggle={this.toggleBlockType}
				/>
				<InlineStyleControls
					editorState={editorState}
					onToggle={this.toggleInlineStyle}
				/>
				<Editor
					className={className}
					customStyleMap={styleMap}
					editorState={this.state.editorState}
					handleKeyCommand={this.handleKeyCommand}
					keyBindingFn={this.mapKeyToEditorCommand}
					handlePastedText={this.handlePastedText}
					placeholder='Enter some text...'
					onChange={this.onChange}
					onBlur={this.emitChange}
					spellCheck={true}
				/>
			</div>
		);
	}
	
}
