import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
//import HorizontalTimeline from '../timeline/HorizontalTimeline.js'
import HorizontalTimeline from 'react-horizontal-timeline'
import AppModal from '../modals/AppModal'
import {Comment} from './CommentDetail'
import {getCommentsHistory} from '../store/actions/commentsHistory'

const Container = styled.div`
	width: 1000px;
	height: 800px;
`;

function _CommentTimeline({isOpen, selected, comments, commentsHistory, loading, valid, getCommentsHistory}) {

	const [index, setIndex] = React.useState(0);
	const log = commentsHistory[index];

	React.useEffect(() => {
		if (isOpen && selected.length) {
			const s = selected[0]
			const c = comments.find(c => c.CID === s)
			console.log(c)
			if (c)
				getCommentsHistory(c)
		}
	}, [isOpen]);

	if (log)
		console.log(log.Changes)
	return (
		<Container>
			<div style={{width: '100%', height: 100}}>
				<HorizontalTimeline
					index={index}
					indexClick={(index) => setIndex(index)}
					values={ commentsHistory.map(c => c.Timestamp) }
				/>
			</div>
			{log &&
				<Comment 
					cids={[log.Changes.CID]}
					resolution={log.Changes}
					readOnly
				/>}
			<p>Action: {log && log.Action}</p>
			<p>UserID: {log && log.UserID}</p>
			<p>Changes: {log && JSON.stringify(log.Changes)}</p>
		</Container>
	)
}

const CommentTimeline = connect(
	(state, ownProps) => ({
		selected: state.comments.selected,
		comments: state.comments.comments,
		commentsHistory: state.commentsHistory.commentsHistory,
		loading: state.commentsHistory.loading,
		valid: state.commentsHistory.selected,
	}),
	(dispatch, ownProps) => ({
		getCommentsHistory: (comment) => dispatch(getCommentsHistory(comment)),
	})
)(_CommentTimeline);

function CommentTimelineModal({
	isOpen,
	close
}) {
	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<CommentTimeline 
				isOpen={isOpen}
				close={close}
			/>
		</AppModal>
	)
}

export default CommentTimelineModal;