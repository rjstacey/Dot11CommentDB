import React from 'react';
import {
	Button, Row, FieldLeft,
	ConfirmModal,
	isMultiple, MULTIPLE
} from 'dot11-components';

import {renderResultsSummary} from './Ballots';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { importResults, uploadEpollResults, uploadMyProjectResults, deleteResults } from '../store/results';
import { BallotType, selectBallot } from '../store/ballots';

const MULTIPLE_STR = "(Multiple)";

function ResultsActions({
	ballot_id,
	readOnly
}: {
	ballot_id: number | typeof MULTIPLE;
	readOnly?: boolean
}) {
	const dispatch = useAppDispatch();
	const fileRef = React.useRef<HTMLInputElement>(null);
	const ballot = useAppSelector(state => selectBallot(state, isMultiple(ballot_id)? 0: ballot_id));

	async function handleDeleteResults() {
		const ok = await ConfirmModal.show(`Are you sure you want to delete results for ${ballot!.BallotID}?`)
		if (!ok)
			return;
		await dispatch(deleteResults(ballot_id as number));
	}

	async function handleImportResults() {
		await dispatch(importResults(ballot_id as number, ballot!.EpollNum!));
	}

	async function handleUploadResults(file) {
		if (ballot!.Type === BallotType.SA)
			await dispatch(uploadMyProjectResults(ballot_id as number, file));
		else
			await dispatch(uploadEpollResults(ballot_id as number, file));
	}

	return (
		<>
			<Row>
				<FieldLeft label='Results:'>
					{isMultiple(ballot_id)? MULTIPLE_STR: renderResultsSummary({rowData: ballot!})}
				</FieldLeft>
			</Row>
			{!readOnly &&
				<Row style={{justifyContent: 'flex-left'}}>
					<Button
						onClick={handleDeleteResults}
						disabled={isMultiple(ballot_id)}
					>
						Delete
					</Button>
					{ballot?.EpollNum &&
						<Button
							onClick={handleImportResults}
							disabled={isMultiple(ballot_id)}
						>
							{(ballot.Results? 'Reimport': 'Import') + ' from ePoll'}
						</Button>}
					<Button
						onClick={() => fileRef.current?.click()}
						disabled={isMultiple(ballot_id)}
					>
						Upload results
					</Button>
					<input
						type='file'
						accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						ref={fileRef}
						onChange={e => {
							if (e.target.files) {
								handleUploadResults(e.target.files[0]);
							}
						}}
						style={{display: "none"}}
					/>
				</Row>}
		</>
	)
}

export default ResultsActions;
