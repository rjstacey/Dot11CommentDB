import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {ActionButtonModal} from 'dot11-components/modals'
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

function CommentHistoryBody({commentsHistory, loading}) {

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
		changeBody = <NotAvaialble>{loading? 'Loading...': 'No history'}</NotAvaialble>
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

const _CommentHistory = ({selected, comments, commentsHistory, loading, loadCommentsHistory}) => {

	const onOpen = () => {
		if (selected.length) {
			const id = selected[0];
			const c = comments[id];
			if (c)
				loadCommentsHistory(c.comment_id);
		}
	}

	return (
		<ActionButtonModal
			name='history'
			title='Comment history'
			disabled={selected.length === 0}
			onRequestOpen={onOpen}
		>
			<CommentHistoryBody 
				loading={loading}
				commentsHistory={commentsHistory}
			/>
		</ActionButtonModal>
	)
}

_CommentHistory.propTypes = {
	selected: PropTypes.array.isRequired,
	comments: PropTypes.object.isRequired,
	commentsHistory: PropTypes.array.isRequired,
	loading: PropTypes.bool.isRequired,
}

const CommentHistory = connect(
	(state) => ({
		selected: getSelected(state, 'comments'),
		comments: getEntities(state, 'comments'),
		commentsHistory: state.commentsHistory.commentsHistory,
		loading: state.commentsHistory.loading,
	}),
	{loadCommentsHistory}
)(_CommentHistory);

export default CommentHistory;