import PropTypes from 'prop-types'
import React from 'react'
import {useDispatch} from 'react-redux'
import {Form, Row, Field, Checkbox, Input, InputDates, InputTime} from 'dot11-components/form'
import {ConfirmModal} from 'dot11-components/modals'
import {addTelecons} from './store/telecons'
import WebexAccountSelector from './WebexAccountSelector'
import {convertFromLocal} from './TeleconUpdate'

const defaultEntry = {
	group: '802.11',
	dates: [],
	time: null,
	duration: 1,
	hasMotions: false,
	timezone: 'America/New_York'
}

function toTeleconEntries(entry) {
	const {dates, ...rest} = entry;
	return dates.map(date => convertFromLocal({date, ...rest}));
}

function TeleconAdd({
	close
}) {
	const [entry, setEntry] = React.useState(defaultEntry);

	const dispatch = useDispatch();

	const handleAddEntry = React.useCallback(async () => {
		let errMsg = '';
		if (entry.dates.length === 0)
			errMsg = 'Date(s) not set';
		else if (!entry.time)
			errMsg = 'Start time not set'
		else if (!entry.duration)
			errMsg = 'Duration not set';
		else if (!entry.webex_id)
			errMsg = 'Webex account not selected';
		if (errMsg)
			ConfirmModal.show(errMsg, false);
		else {
			await dispatch(addTelecons(toTeleconEntries(entry)));
			close();
		}
	}, [dispatch, close, entry]);

	return (
		<Form
			title='Add telecons'
			submitLabel='Add'
			submit={handleAddEntry}
			cancel={close}
		>
			<Row>
				<Row>
					<Field label='Subgroup:'>
						<Input
							type='text'
							value={entry.subgroup}
							onChange={e => setEntry({subgroup: e.target.value})}
						/>
					</Field>
				</Row>
				<Field label='Dates:'>
					<InputDates
						multi
						value={entry.dates}
						onChange={value => setEntry(state => ({...state, dates: value}))}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Start time:'>
					<InputTime
						defaultValue={entry.time}
						onChange={value => setEntry(state => ({...state, time: value}))}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Duration:'>
					<Input type='search'
						value={entry.duration || ''}
						onChange={e => setEntry(state => ({...state, duration: e.target.value}))}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Motions:'>
					<Checkbox
						checked={entry.hasMotions}
						onClick={() => setEntry(state => ({...state, hasMotions: !state.HasMotions}))}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Webex:'>
					<WebexAccountSelector
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