import React from 'react';
import {
	Button, Row, FieldLeft,
	ConfirmModal,
	isMultiple, MULTIPLE
} from 'dot11-components';

import { renderResultsSummary } from './Ballots';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { importResults, uploadEpollResults, uploadMyProjectResults, deleteResults } from '../store/results';
import { BallotType, selectBallot } from '../store/ballots';

const MULTIPLE_STR = "(Multiple)";

function ResultsActions({
	ballot_id,
	setBusy,
	readOnly
}: {
	ballot_id: number | typeof MULTIPLE;
	setBusy: (busy: boolean) => void;
	readOnly?: boolean
}) {
	const dispatch = useAppDispatch();
	const fileRef = React.useRef<HTMLInputElement>(null);
	const [inputValue, setInputValue] = React.useState('');
	const ballot = useAppSelector(state => selectBallot(state, isMultiple(ballot_id)? 0: ballot_id));
	console.log(ballot)

	async function handleDeleteResults() {
		const ok = await ConfirmModal.show(`Are you sure you want to delete results for ${ballot!.BallotID}?`)
		if (!ok)
			return;
		setBusy(true);
		await dispatch(deleteResults(ballot_id as number));
		setBusy(false);
	}

	async function handleImportResults() {
		setBusy(true);
		await dispatch(importResults(ballot_id as number, ballot!.EpollNum!));
		setBusy(false);
	}

	const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
		setInputValue(e.target.value);
		const {files} = e.target;
		if (files && files.length > 0) {
			setBusy(true);
			await dispatch(ballot!.Type === BallotType.SA?
				uploadMyProjectResults(ballot_id as number, files[0]):
				uploadEpollResults(ballot_id as number, files[0])
			);
			setBusy(false);
			setInputValue('');
		}
	}

	return (
		<>
			<Row>
				<FieldLeft label='Results:'>
					{isMultiple(ballot_id)? MULTIPLE_STR: renderResultsSummary({rowData: ballot!})}
				</FieldLeft>
			</Row>
			{!readOnly &&
				<Row style={{justifyContent: 'flex-start'}}>
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

export default ResultsActions;
