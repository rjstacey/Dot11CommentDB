import React from 'react'
import {connect} from 'react-redux'
import {Editor, EditorState, ContentState, CompositeDecorator} from 'draft-js'
import 'draft-js/dist/Draft.css'
import {Cross} from '../general/Icons'
import {setSelected} from '../actions/select'
import {setFilter} from '../actions/filter'
import styled from '@emotion/styled'

const Container = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	.DraftEditor-root {
		width: 100%;
		cursor: text;
	}
	:hover {
		border-color: #0074D9
	}
	/*:focus-within {
		outline: -webkit-focus-ring-color auto 1px;
	}*/
`;

function CommentIdList({style, className, cids, cidValid, onChange, focusOnMount, close, ...otherProps}) {
	const editorRef = React.useRef();
	const [editorState, setEditorState] = React.useState(initState);

	React.useEffect(() => {
		// Close the dropdown if the user scrolls
		// (we don't track position changes during scrolling)
		window.addEventListener('scroll', close, true);
		return () => window.removeEventListener('scroll', close);
	}, [])

	React.useEffect(() => {
		if (!editorState.getSelection().hasFocus) {
			let state = EditorState.push(editorState, ContentState.createFromText(cids.join(', ')), 'remove-range')
			state = EditorState.moveSelectionToEnd(state)
			setEditorState(state)
		}
	}, [cids])

	function initState() {
		const decorator = new CompositeDecorator([
			{
				strategy: findInvalidCIDs,
				component: props => <span style={{color: "red"}}>{props.children}</span>,
			}
		]);
		let state = EditorState.createWithContent(ContentState.createFromText(cids.join(', ')), decorator)
		if (focusOnMount) {
			state = EditorState.moveFocusToEnd(state)
		}
		return state
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

	function clear(e) {
		e.stopPropagation();	// don't take focus from editor

		//setEditorState(EditorState.push(editorState, ContentState.createFromText('')))
		/*let contentState = editorState.getCurrentContent();
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
		const state = EditorState.push(editorState, contentState, 'remove-range');
		setEditorState(state);*/
		onChange([]);
	}

	function emitChange(state) {
		const s = state.getCurrentContent().getPlainText()
		const updatedCids = s.match(/\d+\.\d+|\d+/g) || []	// just the numbers
		if (updatedCids.join() !== cids.join())
			onChange(updatedCids)
	}

	return (
		<Container
			style={style}
			className={className}
			onClick={e => editorRef.current.focus()}
		>
			<Editor
				ref={editorRef}
				editorState={editorState}
				onChange={setEditorState}
				onFocus={() => console.log('focus')}
				handleReturn={() => (emitChange(editorState) || 'handled')}	// return 'handled' to prevent default handler
				onBlur={() => emitChange(editorState)}
				placeholder={'List of CIDs...'}
			/>
			{editorState.getCurrentContent().hasText() && <Cross onClick={clear} />}
		</Container>
	)
}

function cidValid(comments, cid) {
	return comments.filter(c => c.CommentID.toString() === cid || `${c.CommentID}.${c.ResolutionID}` === cid).length > 0
}

export const CommentIdFilter = connect(
	(state, ownProps) => {
		const s = state.comments
		return {
			cids: s.filters['CID'].values.map(v => v.value) || [],
			cidValid: (cid) => cidValid(s.comments, cid)
		}
	},
	(dispatch, ownProps) => {
		return {
			onChange: cids => dispatch(setFilter('comments', 'CID', cids))
		}
	}
)(CommentIdList)

export const CommentIdSelector = connect(
	(state, ownProps) => {
		const s = state.comments
		return {
			cids: s.selected,
			cidValid: (cid) => cidValid(s.comments, cid)
		}
	},
	(dispatch, ownProps) => {
		return {
			onChange: cids => dispatch(setSelected('comments', cids))
		}
	}
)(CommentIdList)