import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {Button, Form, Row, Col, Field, FieldLeft, List, ListItem, Checkbox, Input, Select, TextArea} from 'dot11-components/form';
import {ConfirmModal, ActionButtonModal} from 'dot11-components/modals';
import {isMultiple, MULTIPLE_STR} from 'dot11-components/lib';

import {renderCommentsSummary} from './Ballots';
import {importComments, uploadComments, deleteComments, setStartCommentId} from '../store/comments';
import {selectBallot} from '../store/ballots';

const ChangeStartCID = ({close, ballot}) => {
	const dispatch = useDispatch();
	const [startCID, setStartCID] = React.useState(ballot.Comments? ballot.Comments.CommentIDMin: 1);
	const [busy, setBusy] = React.useState(false);

	const handleSetStartCID = async () => {
		setBusy(true);
		await dispatch(setStartCommentId(ballot.id, startCID));
		setBusy(false);
		close();
	}

	return (
		<Form
			title='Change starting CID'
			submit={handleSetStartCID}
			cancel={close}
			busy={busy}
		>
			<Input
				type='search'
				width={80}
				value={startCID}
				onChange={e => setStartCID(e.target.value)}
			/>
		</Form>
	)
}

const CommentsActions = ({ballot_id, readOnly}) => {
	const dispatch = useDispatch();
	const fileRef = React.useRef();
	const ballot = useSelector(state => selectBallot(state, ballot_id));

	async function handleDeleteComments() {
		const ok = await ConfirmModal.show(`Are you sure you want to delete comments for ${ballot.BallotID}?`)
		if (!ok)
			return;
		await dispatch(deleteComments(ballot_id));
	}

	async function handleImportComments() {
		await dispatch(importComments(ballot_id, ballot.EpollNum, 1));
	}

	async function handleUploadComments(file) {
		await dispatch(uploadComments(ballot_id, ballot.Type, file));
	}

	return <>
		<Row>
			<FieldLeft label='Comments:'>
				{isMultiple(ballot_id)? MULTIPLE_STR: renderCommentsSummary({rowData: ballot, dataKey: 'Comments'})}
			</FieldLeft>
		</Row>
		{!readOnly && <Row style={{justifyContent: 'flex-left'}}>
			<ActionButtonModal 
				label='Change starting CID'
				disabled={isMultiple(ballot_id)}
			>
				<ChangeStartCID ballot={ballot} />
			</ActionButtonModal>
			{ballot.Comments &&
				<Button
					onClick={handleDeleteComments}
					disabled={isMultiple(ballot_id)}
				>
					Delete
				</Button>}
			{ballot.EpollNum &&
				<Button
					onClick={handleImportComments}
					disabled={isMultiple(ballot_id)}
				>
					{(ballot.Comments? 'Reimport': 'Import') + ' from ePoll'}
				</Button>}
			<Button
				onClick={() => fileRef.current.click()}
				disabled={isMultiple(ballot_id)}
			>
				Upload comments
			</Button>
			<input
				type='file'
				accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				ref={fileRef}
				onChange={e => {if (e.target.files) handleUploadComments(e.target.files[0])}}
				style={{display: "none"}}
			/>
		</Row>}
	</>
}

CommentsActions.propTypes = {
	ballot_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
	readOnly: PropTypes.bool
}

export default CommentsActions;
