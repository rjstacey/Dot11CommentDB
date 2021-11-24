import PropTypes from 'prop-types'
import React from 'react'
import {useDispatch, useSelector} from 'react-redux';
import {Form, Row, Col, Field, FieldLeft, List, ListItem, Checkbox, Input, Select, TextArea} from 'dot11-components/form';
import {ConfirmModal} from 'dot11-components/modals';
import {Button} from 'dot11-components/icons';
import {isMultiple, MULTIPLE_STR} from 'dot11-components/lib';

import {renderResultsSummary} from './Ballots'
import {importResults, uploadEpollResults, uploadMyProjectResults, deleteResults} from '../store/results'
import {BallotType, getBallot} from '../store/ballots'

function ResultsActions({ballot_id, readOnly}) {
	const dispatch = useDispatch();
	const fileRef = React.useRef();
	const ballot = useSelector(state => getBallot(state, ballot_id));

	async function handleDeleteResults() {
		const ok = await ConfirmModal.show(`Are you sure you want to delete results for ${ballot.BallotID}?`)
		if (!ok)
			return;
		await dispatch(deleteResults(ballot_id));
	}

	async function handleImportResults() {
		await dispatch(importResults(ballot_id, ballot.EpollNum));
	}

	async function handleUploadResults(file) {
		if (ballot.Type === BallotType.SA)
			await dispatch(uploadMyProjectResults(ballot_id, file));
		else
			await dispatch(uploadEpollResults(ballot_id, file));
	}

	return (
		<>
			<Row>
				<FieldLeft label='Results:'>
					{isMultiple(ballot_id)? MULTIPLE_STR: renderResultsSummary({rowData: ballot, dataKey: 'Results'})}
				</FieldLeft>
			</Row>
			{!readOnly && <Row style={{justifyContent: 'flex-left'}}>
				<Button
					onClick={handleDeleteResults}
					disabled={isMultiple(ballot_id)}
				>
					Delete
				</Button>
				{ballot.EpollNum &&
					<Button
						onClick={handleImportResults}
						disabled={isMultiple(ballot_id)}
					>
						{(ballot.Results? 'Reimport': 'Import') + ' from ePoll'}
					</Button>}
				<Button
					onClick={() => fileRef.current.click()}
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

ResultsActions.propTypes = {
	ballot_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
	readOnly: PropTypes.bool
}

export default ResultsActions;
