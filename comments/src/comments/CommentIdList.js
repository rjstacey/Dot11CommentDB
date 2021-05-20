import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {Editor, EditorState, ContentState, CompositeDecorator} from 'draft-js'
import 'draft-js/dist/Draft.css'
import {Cross} from 'dot11-common/lib/icons'
import {setSelected} from 'dot11-common/store/selected'
import {setFilter} from 'dot11-common/store/filters'

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
`;

const idRegex = /[^\s,]+/g; // /\d+\.\d+|\d+/g

function IdList({style, className, ids, idValid, onChange, focusOnMount, close}) {
	const editorRef = React.useRef();
	const [editorState, setEditorState] = React.useState(initState);

	/*React.useEffect(() => {
		// Close the dropdown if the user scrolls
		// (we don't track position changes during scrolling)
		window.addEventListener('scroll', close, true);
		return () => window.removeEventListener('scroll', close);
	}, [close])*/

	React.useEffect(() => {
		if (!editorState.getSelection().hasFocus) {
			let state = EditorState.push(editorState, ContentState.createFromText(ids.join(', ')), 'remove-range')
			state = EditorState.moveSelectionToEnd(state)
			setEditorState(state)
		}
	}, [ids])

	function initState() {
		const decorator = new CompositeDecorator([
			{
				strategy: findInvalidIds,
				component: props => <span style={{color: "red"}}>{props.children}</span>,
			}
		]);
		let state = EditorState.createWithContent(ContentState.createFromText(ids.join(', ')), decorator)
		if (focusOnMount)
			state = EditorState.moveFocusToEnd(state)
		return state
	}

	function findInvalidIds(contentBlock, callback, contentState) {
		const text = contentBlock.getText();
		let matchArr, start;
		while ((matchArr = idRegex.exec(text)) !== null) {
			start = matchArr.index;
			if (!idValid(matchArr[0]))
				callback(start, start + matchArr[0].length);
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
		const s = state.getCurrentContent().getPlainText();
		const updatedIds = s.match(idRegex) || [];
		if (updatedIds.join() !== ids.join())
			onChange(updatedIds);
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
				handleReturn={() => (emitChange(editorState) || 'handled')}	// return 'handled' to prevent default handler
				onBlur={() => emitChange(editorState)}
				placeholder={'Enter list...'}
			/>
			{editorState.getCurrentContent().hasText() && <Cross onClick={clear} />}
		</Container>
	)
}

const idValid = (ids, id) => ids.includes(id);

const IdFilter = connect(
	(state, ownProps) => {
		const {dataSet, dataKey} = ownProps;
		const {ids, filters} = state[dataSet];
		return {
			ids: filters[dataKey].values.map(v => v.value) || [],
			idValid: (id) => idValid(ids, id)
		}
	},
	(dispatch, ownProps) => {
		const {dataSet, dataKey} = ownProps;
		return {
			onChange: ids => dispatch(setFilter(dataSet, dataKey, ids))
		}
	}
)(IdList)

IdFilter.propTypes = {
	dataSet: PropTypes.string.isRequired,
	dataKey: PropTypes.string.isRequired
}

const IdSelector = connect(
	(state, ownProps) => {
		const {dataSet} = ownProps;
		const {ids, selected} = state[dataSet];
		return {
			ids: selected,
			idValid: (id) => idValid(ids, id)
		}
	},
	(dispatch, ownProps) => {
		const {dataSet} = ownProps;
		return {
			onChange: ids => dispatch(setSelected(dataSet, ids))
		}
	}
)(IdList)

IdSelector.propTypes = {
	dataSet: PropTypes.string.isRequired
}

export {IdFilter, IdSelector}