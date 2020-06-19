import React from 'react'
import {connect} from 'react-redux'
//import ContentEditable from 'react-contenteditable'
import {Editor, EditorState, ContentState, SelectionState, Modifier, CompositeDecorator} from 'draft-js'
import 'draft-js/dist/Draft.css'
import {Cross} from '../general/Icons'
import debounce from 'lodash/debounce'
import {setCommentsSelected, setCommentsFilter} from '../actions/comments'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'


function CommentIdList({cids, cidValid, onChange, focusOnMount, ...otherProps}) {
	const debounceChange = React.useRef()
	const [editorState, setEditorState] = React.useState(initState)

	React.useEffect(() => {
		// On mount, create a debounce update handler...
		debounceChange.current = debounce(handleChange, 500)
		// ...end ensure that debounce is flushed on unmount
		return debounceChange.current.flush
	}, [])

	function initState() {
		const decorator = new CompositeDecorator([
			{
				strategy: findInvalidCIDs,
				component: props => <span style={{color: "red"}}>{props.children}</span>,
			}
		]);
		let editorState
		editorState = EditorState.createWithContent(ContentState.createFromText(cids.join(', ')), decorator)
		if (focusOnMount) {
			editorState = EditorState.moveFocusToEnd(editorState)
		}
		return editorState
	}

	function findInvalidCIDs(contentBlock, callback, contentState) {
		const regex = /\d+\.\d+|\d+/g
		const text = contentBlock.getText();
		let matchArr, start;
		while ((matchArr = regex.exec(text)) !== null) {
			start = matchArr.index;
			if (!cidValid(matchArr[0])) {
				callback(start, start + matchArr[0].length);
			}
		}
	}

	function handleChange(currentCids, updatedCids, onChange) {
		if (updatedCids.join() !== currentCids.join()) {
			onChange(updatedCids)
		}
	}

	function clear() {
		//setEditorState(EditorState.push(editorState, ContentState.createFromText('')))
		let contentState = editorState.getCurrentContent();
		const firstBlock = contentState.getFirstBlock();
		const lastBlock = contentState.getLastBlock();
		const allSelected = new SelectionState({
			anchorKey: firstBlock.getKey(),
			anchorOffset: 0,
			focusKey: lastBlock.getKey(),
			focusOffset: lastBlock.getLength(),
			hasFocus: true
		});
		contentState = Modifier.removeRange(contentState, allSelected, 'backward');
		let state = EditorState.push(editorState, contentState, 'remove-range');
		//console.log('clear', state.getCurrentContent().getPlainText())
		//newState = EditorState.forceSelection(newState, contentState.getSelectionAfter());
		setEditorState(state)
		debounceChange.current(cids, [], onChange)
	}

	function editorStateChange(state) {
		setEditorState(state)
		const s = state.getCurrentContent().getPlainText()
		const updatedCids = s.match(/\d+\.\d+|\d+/g) || []	// just the numbers
		//console.log('onChange', state.getCurrentContent().getPlainText())
		debounceChange.current(cids, updatedCids, onChange)
	}

	const containerCss = css`
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		border: 1px solid #ddd;
		width: 100%;
		.DraftEditor-root {
			cursor: text;
			max-height: 20vh;
			width: 100%;
			overflow-y: auto;
			padding: 4px 16px 4px 4px;
			margin: 5px;
		}
		:hover {
			border-color: #0074D9
		}
		:focus-within {
			outline: -webkit-focus-ring-color auto 1px;
		}`

	return (
		<div css={containerCss} {...otherProps} onClick={e => e.stopPropagation()} >
			<Editor
				editorState={editorState}
				onChange={editorStateChange}
			/>
			{editorState.getCurrentContent().hasText() && <Cross onClick={clear} />}
		</div>
	)
}

function cidValid(comments, cid) {
	return comments.filter(c => c.CommentID.toString() === cid || `${c.CommentID}.${c.ResolutionID}` === cid).length > 0
}

export const CommentIdFilter = connect(
	(state, ownProps) => {
		const s = state.comments
		return {
			cids: s.filters['CID'].values || [],
			cidValid: (cid) => cidValid(s.comments, cid)
		}
	},
	(dispatch, ownProps) => {
		return {
			onChange: cids => dispatch(setCommentsFilter('CID', cids))
		}
	}
)(CommentIdList)

export const CommentIdSelector = connect(
	(state, ownProps) => {
		const s = state.comments
		return {
			cids: s.selected || [],
			cidValid: (cid) => cidValid(s.comments, cid)
		}
	},
	(dispatch, ownProps) => {
		return {
			onChange: cids => dispatch(setCommentsSelected(cids))
		}
	}
)(CommentIdList)