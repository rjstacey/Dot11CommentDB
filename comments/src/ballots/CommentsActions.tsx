import React from 'react';

import {
	Button, Form, Row, FieldLeft, Input,
	ConfirmModal, ActionButtonModal,
	isMultiple,
	MULTIPLE,
	Field,
} from 'dot11-components';

import { renderCommentsSummary } from './Ballots';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { importComments, uploadComments, deleteComments, setStartCommentId } from '../store/comments';
import { selectBallot, Ballot } from '../store/ballots';

const MULTIPLE_STR = "(Multiple)";

function ChangeStartCID({
	ballot,
	close = () => {}
}: {
	ballot: Ballot;
	close?: () => void;
}) {
	const dispatch = useAppDispatch();
	const [startCID, setStartCID] = React.useState<string>('' + (ballot.Comments?.CommentIDMin || 1));
	const [errorText, setErrorText] = React.useState('');
	const [busy, setBusy] = React.useState(false);
	console.log(ballot, startCID)

	const submit = async () => {
		setBusy(true);
		await dispatch(setStartCommentId(ballot.id, Number(startCID)));
		setBusy(false);
		close();
	}

	const change: React.ChangeEventHandler<HTMLInputElement> = (e) => {
		const {value} = e.target;
		setErrorText(/\d*/.test(value)? '': 'Must be a number');
		setStartCID(value);
	}

	return (
		<Form
			style={{minWidth: 300}}
			title='Change starting CID'
			submit={submit}
			errorText={errorText}
			cancel={close}
			busy={busy}
		>
			<Row style={{marginBottom: 20}}>
				<Field
					label="Start CID:"
				>
					<Input
						type='search'
						width={6}
						value={startCID}
						onChange={change}
					/>
				</Field>
			</Row>
		</Form>
	)
}

const CommentsActions = ({
	ballot_id,
	setBusy,
	readOnly
}: {
	ballot_id: number | typeof MULTIPLE;
	setBusy: (busy: boolean) => void;
	readOnly?: boolean;
}) => {
	const dispatch = useAppDispatch();
	const fileRef = React.useRef<HTMLInputElement>(null);
	const [inputValue, setInputValue] = React.useState('');
	const ballot = useAppSelector(state => selectBallot(state, isMultiple(ballot_id)? 0: ballot_id));

	async function handleDeleteComments() {
		const ok = await ConfirmModal.show(`Are you sure you want to delete comments for ${ballot!.BallotID}?`)
		if (!ok)
			return;
		setBusy(true);
		await dispatch(deleteComments(ballot_id as number));
		setBusy(false);
	}

	const handleImportComments = async () => {
		setBusy(true);
		await dispatch(importComments(ballot_id as number, ballot!.EpollNum!, 1));
		setBusy(false);
	}

	const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
		setInputValue(e.target.value);
		const {files} = e.target;
		if (files && files.length > 0) {
			setBusy(true);
			await dispatch(uploadComments(ballot_id as number, ballot!.Type, files[0]));
			setBusy(false);
			setInputValue('');
		}
	}

	return (
		<>
			<Row>
				<FieldLeft label='Comments:'>
					{isMultiple(ballot_id)? MULTIPLE_STR: renderCommentsSummary({rowData: ballot!})}
				</FieldLeft>
			</Row>
			{!readOnly &&
				<Row style={{justifyContent: 'flex-start'}}>
					<Button
						onClick={handleDeleteComments}
						disabled={isMultiple(ballot_id) || !ballot || (ballot.Comments && ballot.Comments.Count === 0)}
					>
						Delete
					</Button>
					<ActionButtonModal 
						label='Change starting CID'
						disabled={isMultiple(ballot_id) || !ballot || (ballot.Comments && ballot.Comments.Count === 0)}
					>
						<ChangeStartCID ballot={ballot!} />
					</ActionButtonModal>
					{ballot?.EpollNum &&
						<Button
							onClick={handleImportComments}
							disabled={isMultiple(ballot_id)}
						>
							{(ballot.Comments?.Count? 'Reimport': 'Import') + ' from ePoll'}
						</Button>}
					<Button
						onClick={() => fileRef.current?.click()}
						disabled={isMultiple(ballot_id)}
					>
						Upload comments
					</Button>
					<input
						ref={fileRef}
						type='file'
						style={{display: "none"}}
						accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						value={inputValue} // necessary otherwise with the same file selected there is no onChange call
						onChange={handleFileChange}
					/>
				</Row>}
		</>
	)
}

export default CommentsActions;
