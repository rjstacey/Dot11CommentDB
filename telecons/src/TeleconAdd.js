import PropTypes from 'prop-types'
import React from 'react'
import {useDispatch} from 'react-redux'
import {Form, Row, Field, Checkbox, Input, InputDates, InputTime} from 'dot11-components/form'
import {ConfirmModal} from 'dot11-components/modals'
import {addTelecons} from './store/telecons'
import WebexAccountSelector from './WebexAccountSelector'

const defaultEntry = {
	Dates: [],
	StartTime: null,
	Duration: 1,
	Motions: false,
}

function TeleconAdd({
	close
}) {
	const [entry, setEntry] = React.useState(defaultEntry);

	const dispatch = useDispatch();

	const handleAddEntry = React.useCallback(async () => {
		let errMsg = '';
		if (entry.Dates.length === 0)
			errMsg = 'Date(s) not set';
		else if (!entry.StartTime)
			errMsg = 'Start time not set'
		else if (!entry.Duration)
			errMsg = 'Duration not set';
		else if (!entry.webex_id)
			errMsg = 'Webex account not selected';
		if (errMsg)
			ConfirmModal.show(errMsg, false);
		else {
			await dispatch(addTelecons([entry]));
			close();
		}
	}, [dispatch, close, entry]);

	return (
		<Form
			title='Add telecon'
			submitLabel='Add'
			submit={handleAddEntry}
			cancel={close}
		>
			<Row>
				<Field label='Dates:'>
					<InputDates
						value={entry.Dates}
						onChange={value => setEntry(state => ({...state, Dates: value}))}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Start time:'>
					<InputTime
						defaultValue={entry.StartTime}
						onChange={value => setEntry(state => ({...state, StartTime: value}))}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Duration:'>
					<Input type='search'
						value={entry.Duration || ''}
						onChange={e => setEntry(state => ({...state, Duration: e.target.value}))}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Motions:'>
					<Checkbox
						checked={entry.HasMotions}
						onClick={() => setEntry(state => ({...state, HasMotions: !state.HasMotions}))}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Webex:'>
					<WebexAccountSelector
						type='search'
						value={entry.webex_id || ''}
						onChange={value => setEntry(state => ({...state, webex_id: value}))}
					/>
				</Field>
			</Row>
		</Form>
	)
}

TeleconAdd.propTypes = {
	close: PropTypes.func.isRequired
}

export default TeleconAdd;