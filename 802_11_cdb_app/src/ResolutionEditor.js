import React from 'react'
import cx from 'classnames'
import {Editor, EditorState, RichUtils, ContentState, getDefaultKeyBinding, KeyBindingUtil, convertFromHTML} from 'draft-js';
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

export class ResolutionEditor extends React.Component {
	constructor(props) {
		super(props);
		this.state = {editorState: EditorState.createEmpty()};
	}
	static getDerivedStateFromProps(props, state) {
		let newState = {}
		if (props.value !== state.value) {
			newState.value = props.value
			let contentState = stateFromHTML(props.value, options)
			/*const blocksFromHTML = convertFromHTML(props.value);
			const contentState = ContentState.createFromBlockArray(
			  blocksFromHTML.contentBlocks,
			  blocksFromHTML.entityMap
			);*/
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
	handlePastedText = (text, html) => {
		console.log(html)
		return false;
	}
	shouldHidePlaceholder = () => {
		// If the user changes block type before entering any text, we can
		// either style the placeholder or hide it. Let's just hide it now.
		let {editorState} = this.state;
		let contentState = editorState.getCurrentContent();
		if (!contentState.hasText()) {
			if (contentState.getBlockMap().first().getType() !== 'unstyled') {
				return true;
			}
		}
		return false;
	}
	render() {
		const {editorState} = this.state;

		let className = cx({
			[styles.editor]: true,
			[styles.hidePlaceholder]: this.shouldHidePlaceholder(),
		});

		return (
			<div className={styles.root}>
				<BlockStyleControls
					editorState={editorState}
					onChange={this.onChange}
				/>
				<InlineStyleControls
					editorState={editorState}
					onChange={this.onChange}
				/>
				<ActionControls
					editorState={editorState}
					onChange={this.onChange}
				/>
				<Editor
					className={className}
					customStyleMap={styleMap}
					editorState={this.state.editorState}
					handleKeyCommand={this.handleKeyCommand}
					keyBindingFn={this.mapKeyToEditorCommand}
					handlePastedText={this.handlePastedText}
					blockStyleFn={blockStyleFn}
					placeholder='Enter some text...'
					onChange={this.onChange}
					onBlur={this.emitChange}
					spellCheck={true}
				/>
			</div>
		);
	}
	
}
