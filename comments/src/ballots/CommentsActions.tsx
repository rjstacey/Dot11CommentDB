import React from 'react';

import {
	Button, Form, Row, FieldLeft, Input,
	ConfirmModal, ActionButtonModal,
	isMultiple,
	MULTIPLE,
} from 'dot11-components';

import { renderCommentsSummary } from './Ballots';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { importComments, uploadComments, deleteComments, setStartCommentId } from '../store/comments';
import { selectBallot, Ballot } from '../store/ballots';

const MULTIPLE_STR = "(Multiple)";

const ChangeStartCID = ({close = () => {}, ballot}: {close?: () => void; ballot: Ballot}) => {
	const dispatch = useAppDispatch();
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
				onChange={e => setStartCID(Number(e.target.value))}
			/>
		</Form>
	)
}

const CommentsActions = ({
	ballot_id,
	readOnly
}: {
	ballot_id: number | typeof MULTIPLE;
	readOnly?: boolean;
}) => {
	const dispatch = useAppDispatch();
	const fileRef = React.useRef<HTMLInputElement>(null);
	const ballot = useAppSelector(state => selectBallot(state, isMultiple(ballot_id)? 0: ballot_id));

	async function handleDeleteComments() {
		const ok = await ConfirmModal.show(`Are you sure you want to delete comments for ${ballot!.BallotID}?`)
		if (!ok)
			return;
		dispatch(deleteComments(ballot_id as number));
	}

	const handleImportComments = () => dispatch(importComments(ballot_id as number, ballot!.EpollNum!, 1));

	const handleUploadComments = (file) => dispatch(uploadComments(ballot_id as number, ballot!.Type, file));

	return (
		<>
			<Row>
				<FieldLeft label='Comments:'>
					{isMultiple(ballot_id)? MULTIPLE_STR: renderCommentsSummary({rowData: ballot!})}
				</FieldLeft>
			</Row>
			{!readOnly &&
				<Row style={{justifyContent: 'flex-left'}}>
					<ActionButtonModal 
						label='Change starting CID'
						disabled={isMultiple(ballot_id)}
					>
						<ChangeStartCID ballot={ballot!} />
					</ActionButtonModal>
					{ballot?.Comments &&
						<Button
							onClick={handleDeleteComments}
							disabled={isMultiple(ballot_id)}
						>
							Delete
						</Button>}
					{ballot?.EpollNum &&
						<Button
							onClick={handleImportComments}
							disabled={isMultiple(ballot_id)}
						>
							{(ballot.Comments? 'Reimport': 'Import') + ' from ePoll'}
						</Button>}
					<Button
						onClick={() => fileRef.current!.click()}
						disabled={isMultiple(ballot_id)}
					>
						Upload comments
					</Button>
					<input
						ref={fileRef}
						type='file'
						style={{display: "none"}}
						accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						onChange={e => {if (e.target.files) handleUploadComments(e.target.files[0])}}
						//onClick={e => e.target.value = null}	// necessary otherwise with the same file selected there is no onChange call
					/>
				</Row>}
		</>
	)
}

export default CommentsActions;
