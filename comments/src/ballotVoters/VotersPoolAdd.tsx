import React from 'react';

import { Form, Row, Field, List, ListItem, Input, Checkbox, AppModal } from 'dot11-components';

import { useAppDispatch } from '../store/hooks';
import { votersFromSpreadsheet, votersFromMembersSnapshot } from '../store/voters';

function votingPoolNameFromDate(isoDate: string) {
	return 'members-' + isoDate;
}

type Source = 'members' | 'spreadsheet' | 'empty';

type State = {
	source: Source;
	votingPoolId: string;
	date: string;
	file: File | null;
}

function initState(): State {
	const date = new Date().toISOString().slice(0,10);
	return {
		source: 'members',
		date,
		votingPoolId: votingPoolNameFromDate(date),
		file: null
	}
}

function getErrorText(state: State) {
	if (!state.votingPoolId)
		return 'Voting pool must have a name';
	if (state.source === 'members' && !state.date)
		return 'Select date for members snapshot';
	if (state.source === 'spreadsheet' && !state.file)
		return 'Select file for spreadsheet upload';
}

function VotersPoolAddModal({
	isOpen,
	close,
	onSubmit,
}) {
	const [state, setState] = React.useState<State>(initState);

	//const [votingPoolId, setVotingPoolId] = React.useState('');
	//const [source, setSource] = React.useState<Source>('members');
	//const [snapshotDate, setSnapshotDate] = React.useState(new Date().toISOString().substr(0,10));
	const fileRef = React.useRef<HTMLInputElement>(null);
	//const file = (fileRef.current && fileRef.current.files)? fileRef.current.files[0]: '';
	console.log(state)

	const dispatch = useAppDispatch();

	// Reset state to default on each open
	const onOpen = () => setState(initState());

	const errorText = getErrorText(state);

	async function submit() {
		if (errorText)
			return;
		if (state.source === 'members')
			await dispatch(votersFromMembersSnapshot(state.votingPoolId, state.date));
		else if (state.source === 'spreadsheet')
			await dispatch(votersFromSpreadsheet(state.votingPoolId, state.file))
		onSubmit(state.votingPoolId);
	}

	function changeState(changes: Partial<State>) {
		if (changes.source && state.source === 'members' && changes.source !== state.source)
			changes = {...changes, votingPoolId: ''};
		if (changes.date && state.source === 'members')
			changes = {...changes, votingPoolId: votingPoolNameFromDate(changes.date)};
		if (changes.source === 'members')
			changes = {...changes, votingPoolId: votingPoolNameFromDate(state.date)}
		setState({...state, ...changes});
	}

	return (
		<AppModal
			isOpen={isOpen}
			onAfterOpen={onOpen}
			onRequestClose={close}
		>
			<Form
				title='Add voter pool'
				errorText={errorText}
				submit={submit}
				cancel={close}
			>
				<Row>
					<Field label='Pool name:'>
						<Input type='text' 
							value={state.votingPoolId}
							onChange={e => changeState({votingPoolId: e.target.value})}
						/>
					</Field>
				</Row>
				<Row>
					<List>
						<ListItem>
							<Checkbox 
								checked={state.source === 'members'}
								onChange={() => changeState({source: 'members'})}
							/>
							<Field label='Member snapshot:'>
								<Input type='date' 
									value={state.date}
									onChange={e => changeState({date: e.target.value})}
								/>
							</Field>
						</ListItem>
						<ListItem>
							<Checkbox 
								checked={state.source === 'spreadsheet'}
								onChange={e => {
									changeState({source: 'spreadsheet'})
									fileRef.current?.click()
								}}
							/>
							<label htmlFor='fromFile'>{'Upload from ' + (state.file? state.file.name: 'file')}</label>
							<input
								id='fromFile'
								type='file'
								hidden
								accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
								ref={fileRef}
								onChange={e => changeState({file: e.target.files? e.target.files[0]: null})}
							/>
						</ListItem>
						<ListItem>
							<Checkbox 
								checked={state.source === 'empty'}
								onChange={() => changeState({source: 'empty'})}
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
