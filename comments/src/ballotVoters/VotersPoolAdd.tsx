import React from 'react';

import { Form, Row, Field, List, ListItem, Input, Checkbox, AppModal } from 'dot11-components';

import { useAppDispatch } from '../store/hooks';
import { votersFromSpreadsheet, votersFromMembersSnapshot } from '../store/voters';

function VotersPoolAddModal({
	isOpen,
	close,
	onSubmit,
}) {
	const [votingPoolId, setVotingPoolId] = React.useState('');
	const [source, setSource] = React.useState('members');
	const [snapshotDate, setSnapshotDate] = React.useState(new Date().toISOString().substr(0,10));
	const [errMsg, setErrMsg] = React.useState('');
	const fileRef = React.useRef<HTMLInputElement>(null);
	const file = (fileRef.current && fileRef.current.files)? fileRef.current.files[0]: '';

	const dispatch = useAppDispatch();

	// Reset votingPool data to default on each open
	const onOpen = () => setVotingPoolId('');

	async function submit() {
		if (!votingPoolId) {
			setErrMsg('Voter pool must have a name');
			return;
		}
		await dispatch(source === 'members'?
			votersFromMembersSnapshot(votingPoolId, snapshotDate)
			:votersFromSpreadsheet(votingPoolId, file)
		);
		onSubmit(votingPoolId);
	}

	return (
		<AppModal
			isOpen={isOpen}
			onAfterOpen={onOpen}
			onRequestClose={close}
		>
			<Form
				title='Add voter pool'
				errorText={errMsg}
				submit={submit}
				cancel={close}
			>
				<Row>
					<Field label='Pool name:'>
						<Input type='text' 
							value={votingPoolId}
							onChange={e => setVotingPoolId(e.target.value)}
						/>
					</Field>
				</Row>
				<Row>
					<List>
						<ListItem>
							<Checkbox 
								checked={source === 'members'}
								onChange={() => setSource('members')}
							/>
							<Field label='Member snapshot:'>
								<Input type='date' 
									value={snapshotDate}
									onChange={e => setSnapshotDate(e.target.value)}
								/>
							</Field>
						</ListItem>
						<ListItem>
							<Checkbox 
								checked={source === 'spreadsheet'}
								onChange={e => {if (source !== 'spreadsheet') fileRef.current?.click()}}
							/>
							<label htmlFor='fromFile'>{'Upload from ' + (file? file.name: 'file')}</label>
							<input
								id='fromFile'
								type='file'
								hidden
								accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
								ref={fileRef}
								onChange={e => {if (e.target.files) setSource('spreadsheet')}}
							/>
						</ListItem>
						<ListItem>
							<Checkbox 
								checked={source === ''}
								onChange={() => setSource('')}
							/>
							<label>Empty</label>
						</ListItem>
					</List>
				</Row>
			</Form>
		</AppModal>
	)
}

export default VotersPoolAddModal;
