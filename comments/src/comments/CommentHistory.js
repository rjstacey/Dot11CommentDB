import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {AppModal} from 'dot11-components/modals'
import {Comment} from './CommentDetail'
import HorizontalTimeline from './HorizontalTimeline'
import {loadCommentsHistory} from '../store/commentsHistory'
import {getEntities} from 'dot11-components/store/dataSelectors'
import {getSelected} from 'dot11-components/store/selected'

const Container = styled.div`
	width: 80vw;
	height: 800px;
	overflow: auto;
	.action {
		font-weight: bold;
		text-transform: capitalize;
	}
	.name {
		font-weight: bold;
		font-style: italic;
	}
`;

const NotAvaialble = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;
`;

function _CommentHistory({isOpen, selected, comments, commentsHistory, loading, valid, loadCommentsHistory}) {

	React.useEffect(() => {
		if (isOpen && selected.length) {
			const id = selected[0];
			const c = comments[id];
			if (c)
				loadCommentsHistory(c.comment_id);
		}
	}, [isOpen, comments, selected, loadCommentsHistory]);

	const [index, setIndex] = React.useState(0);
	const events = commentsHistory.map(c => ({timestamp: c.Timestamp, type: c.Action, threadId: c.resolution_id, threadLabel: c.resolution_id? c.Changes.ResolutionID: ''}));

	const log = commentsHistory[index];
	let changeBody;
	if (log) {
		const changeTo = log.resolution_id? 'resolution': 'comment';
		changeBody = 
			<>
				<div>
					<span className='action'>{log.Action}</span> {changeTo} by <span className='name'>{log.UserName || log.UserID}</span> on {(new Date(log.Timestamp)).toLocaleString()}
				</div>
				<Comment 
					cids={[log.Changes.CID]}
					resolution={log.Changes}
					readOnly
					showEditing
					showNotes
				/>
			</>
	}
	else {
		changeBody = <NotAvaialble>No history</NotAvaialble>
	}

	return (
		<Container>
			<HorizontalTimeline
				index={index}
				indexClick={(index) => setIndex(index)}
				events={events}
			/>

			{changeBody}

		</Container>
	)
}

const CommentHistory = connect(
	(state) => ({
		selected: getSelected(state, 'comments'),
		comments: getEntities(state, 'comments'),
		commentsHistory: state.commentsHistory.commentsHistory,
		loading: state.commentsHistory.loading,
		valid: state.commentsHistory.selected,
	}),
	{loadCommentsHistory}
)(_CommentHistory);

function CommentHistoryModal({
	isOpen,
	close
}) {
	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<CommentHistory 
				isOpen={isOpen}
				close={close}
			/>
		</AppModal>
	)
}

export default CommentHistoryModal;