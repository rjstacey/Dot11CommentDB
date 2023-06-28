import React from 'react';
import styled from '@emotion/styled';

import { ActionButtonModal } from 'dot11-components';

import CommentEdit from './CommentEdit';
import ResolutionEdit from './ResolutionEdit';
import EditingEdit from './EditingEdit';
import HorizontalTimeline from './HorizontalTimeline';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCommentsState } from '../store/comments';
import { loadCommentsHistory, selectCommentsHistoryState } from '../store/commentsHistory';

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

const CommentContainer = styled.div`
	label {
		font-weight: bold;
	}
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
				<CommentContainer>
					<CommentEdit 
						cids={[log.Changes.CID]}
						comment={log.Changes}
						updateComment={() => {}}
						showNotes
						readOnly
					/>
					{log.ResolutionID !== null &&
						<>
							<ResolutionEdit
								resolution={log.Changes}
								updateResolution={() => {}}
								readOnly
							/>
							<EditingEdit
								resolution={log.Changes}
								updateResolution={() => {}}
								showEditing
								readOnly
							/>
						</>}
				</CommentContainer>
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

function CommentHistory() {

	const dispatch = useAppDispatch();
	const {selected, entities} = useAppSelector(selectCommentsState);
	const {loading, commentsHistory} = useAppSelector(selectCommentsHistoryState);

	const onOpen = () => {
		if (selected.length) {
			const id = selected[0];
			const c = entities[id];
			if (c)
				dispatch(loadCommentsHistory(c.comment_id));
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

export default CommentHistory;
