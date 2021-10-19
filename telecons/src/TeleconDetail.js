import PropTypes from 'prop-types'
import React from 'react'
import {connect, useDispatch, useSelector} from 'react-redux'
import styled from '@emotion/styled'
import {DateTime} from 'luxon'
import {ConfirmModal} from 'dot11-components/modals'
import {ActionButton} from 'dot11-components/icons'
import {shallowDiff, recursivelyDiffObjects, isMultiple} from 'dot11-components/lib'
import {Form, Row, Field, Input, InputDates, InputTime} from 'dot11-components/form'
import {addTelecons, updateTelecons, deleteTelecons, setUiProperty, setSelected, dataSet} from './store/telecons'
import WebexAccountSelector from './WebexAccountSelector'

const MULTIPLE_STR = '(Multiple)';

const defaultLocalEntry = {
	group: '802.11',
	dates: [],
	time: null,
	duration: 1,
	hasMotions: false,
	timezone: 'America/New_York'
}

export function convertFromLocal(entry) {
	const {dates, time, duration, ...rest} = entry;
	const [date] = dates;
	const start = DateTime.fromJSDate(date, {zone: entry.timezone}).set({hour: time.HH, minute: time.MM});
	const end = start.plus({hours: duration});
	return {
		start: start.toISO(),
		end: end.toISO(),
		...rest
	}
}

function convertFromLocalMultipleDates(entry) {
	const {dates, ...rest} = entry;
	return dates.map(date => convertFromLocal({date, ...rest}));
}

function convertToLocal(entry) {
	const {start, end, ...rest} = entry;
	const date = DateTime.fromISO(start);
	const duration = DateTime.fromISO(end).diff(DateTime.fromISO(start), 'hours').hours;
	return {
		dates: [date.toJSDate({zone: entry.timezone})],
		time: {HH: date.hour, MM: date.minute},
		duration,
		...rest
	}
}

function TeleconEntry({
	entry,
	changeEntry,
	action,
	actionOk,
	actionCancel,
	readOnly,
}) {
	return (
		<Form
			title={(action === 'add'? 'Add': 'Update') + ' telecons'}
			submitLabel={action === 'add'? 'Add': 'Update'}
			submit={actionOk}
			cancel={actionCancel}
		>
			<Row>
				<Field label='Subgroup:'>
					<Input
						type='text'
						value={isMultiple(entry.subgroup)? '': entry.subgroup}
						onChange={e => changeEntry({subgroup: e.target.value})}
						placeholder={isMultiple(entry.subgroup)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Date:'>
					<InputDates
						disablePast
						multi={action === 'add'}
						value={isMultiple(entry.dates)? []: entry.dates}
						onChange={dates => changeEntry({dates})}
						placeholder={isMultiple(entry.date)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Time:'>
					<InputTime
						value={isMultiple(entry.time)? undefined: entry.time}
						onChange={value => changeEntry({time: value})}
						placeholder={isMultiple(entry.time)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Duration:'>
					<Input
						type='search'
						value={isMultiple(entry.duration)? '': entry.duration}
						onChange={e => changeEntry({duration: e.target.value})}
						placeholder={isMultiple(entry.duration)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Webex:'>
					<WebexAccountSelector
						value={isMultiple(entry.webex_id)? null: entry.webex_id}
						onChange={value => changeEntry({webex_id: value})}
						placeholder={isMultiple(entry.webex_id)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
		</Form>
	)
}

class _TeleconUpdate extends React.Component {
	constructor(props) {
		super(props)
		this.state = this.initState(props);
		console.log(props, this.state)
	}

	componentDidUpdate(prevProps) {
		const {selected, action} = this.props;
		if (selected !== prevProps.selected || action !== prevProps.action) {
			this.setState(this.initState(this.props));
		}
	}

	initState = (props) => {
		const {entities, selected, action} = props;
		if (action === 'add') {
			return {action, edited: defaultLocalEntry}
		}
		let diff = {}, originals = [];
		for (const id of selected) {
			const entry = convertToLocal(entities[id]);
			diff = recursivelyDiffObjects(diff, entry);
			originals.push(entry);
		}
		return {
			action,
			saved: diff,
			edited: diff,
			originals: originals
		};
	}

	changeEntry = (changes) => {
		if (this.props.readOnly) {
			console.warn("Update when read-only")
			return;
		}
		// merge in the edits and trigger a debounced save
		this.setState(
			state => ({...state, edited: {...state.edited, ...changes}})
		);
	}

	add = async () => {
		const entry = this.state.edited;
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
			const ids = await this.props.addTelecons(convertFromLocalMultipleDates(entry));
			this.props.setSelected(ids);
		}
	}

	update = () => {
		const {edited, saved, originals} = this.state;
		const dd = shallowDiff(saved, edited);
		const updates = [];
		for (const o of originals) {
			const oo = convertToLocal(o);
			const nn = {...oo, ...dd};
			const n = convertFromLocal(nn);
			const d = shallowDiff(o, n);
			if (Object.keys(d).length > 0)
				updates.push({id: o.id, changes: d});
		}
		console.log(updates);
		this.props.updateTelecons(updates);
		this.setState(state => ({...state, saved: edited}));
	}

	render() {
		const {action, readOnly} = this.props;

		return (
			<TeleconEntry
				action={action}
				entry={this.state.edited}
				changeEntry={this.changeEntry}
				actionOk={action === 'add'? this.add: this.update}
				readOnly={readOnly}
			/>
		)
	}

	static propTypes = {
		valid: PropTypes.bool.isRequired,
		loading: PropTypes.bool.isRequired,
		entities: PropTypes.object.isRequired,
		selected: PropTypes.array.isRequired,
		updateTelecons: PropTypes.func.isRequired,
	}
}

const TeleconUpdate = connect(
	(state) => {
		const data = state[dataSet];
		return {
			valid: data.valid,
			loading: data.loading,
			entities: data.entities,
			selected: data.selected,
		}
	},
	{updateTelecons, addTelecons, setSelected}
)(_TeleconUpdate);


const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

const Container = styled.div`
	padding: 10px;
`;

const NotAvailable = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;
`;

function TeleconDetail() {
	const [action, setAction] = React.useState('update');
	const dispatch = useDispatch();
	const {loading, selected, ui: uiProperties} = useSelector(state => state[dataSet]);

	React.useEffect(() => {
		if (action === 'add' && selected.length !== 0)
			setAction('update')
	}, [action, setAction, selected]);

	const handleRemoveSelected = React.useCallback(async () => {
		const ok = await ConfirmModal.show(`Are you sure you want to delete ${selected}?`);
		if (!ok)
			return;
		await dispatch(deleteTelecons(selected));
	}, [dispatch, selected]);

	const handleAdd = async () => {
		if (action !== 'add') {
			dispatch(setSelected([]));
			setAction('add');
		}
		else {
			setAction('update');
		}
	}

	let notAvailableStr = '';
	if (loading)
		notAvailableStr = 'Loading...';
	else if (action !== 'add' && selected.length === 0)
		notAvailableStr = 'Nothing selected'

	return (
		<Container>
			<TopRow>
				<span>
					<ActionButton
						name='add'
						title='Add telecon'
						disabled={loading}
						isActive={action === 'add'}
						onClick={handleAdd}
					/>
					<ActionButton
						name='edit'
						title='Edit telecon'
						disabled={loading || selected.length === 0}
						isActive={uiProperties.edit}
						onClick={() => dispatch(setUiProperty({property: 'edit', value: !uiProperties.edit}))}
					/>
					<ActionButton
						name='delete'
						title='Delete telecon'
						disabled={loading || selected.length === 0}
						onClick={handleRemoveSelected}
					/>
				</span>
			</TopRow>
			{notAvailableStr?
				<NotAvailable>{notAvailableStr}</NotAvailable>:
				<TeleconUpdate
					action={action}
					readOnly={!uiProperties.edit}
				/>
			}
		</Container>
	)
}

export default TeleconDetail;
