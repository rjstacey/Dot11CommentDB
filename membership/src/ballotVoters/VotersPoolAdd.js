import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import {Form, Row, Col, Field, List, ListItem, Input, Checkbox} from 'dot11-components/general/Form'

import {AppModal} from 'dot11-components/modals'
import {votersFromSpreadsheet, votersFromMembersSnapshot} from '../store/voters'

function VotersPoolAddModal({
	isOpen,
	close,
	onSubmit,
	votersFromSpreadsheet,
	votersFromMembersSnapshot
}) {
	const [votingPoolId, setVotingPoolId] = React.useState('');
	const [source, setSource] = React.useState('members');
	const [snapshotDate, setSnapshotDate] = React.useState(new Date().toISOString().substr(0,10));
	const [errMsg, setErrMsg] = React.useState('');
	const fileRef = React.useRef();
	const file = (fileRef.current && fileRef.current.files)? fileRef.current.files[0]: '';
	console.log(snapshotDate)

	// Reset votingPool data to default on each open
	const onOpen = () => setVotingPoolId('');

	async function submit() {
		if (!votingPoolId) {
			setErrMsg('Voter pool must have a name');
			return
		}
		if (source === 'members')
			await votersFromMembersSnapshot(votingPoolId, snapshotDate);
		else if (source === 'spreadsheet')
			await votersFromSpreadsheet(votingPoolId, file);
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
								onChange={e => {if (source !== 'spreadsheet') fileRef.current.click()}}
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

VotersPoolAddModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	onSubmit: PropTypes.func.isRequired,
	votersFromSpreadsheet: PropTypes.func.isRequired,
	votersFromMembersSnapshot: PropTypes.func.isRequired,
}

export default connect(
	null,
	{votersFromSpreadsheet, votersFromMembersSnapshot}
)(VotersPoolAddModal)