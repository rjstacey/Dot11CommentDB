import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {shallowDiff, recursivelyDiffObjects, isMultiple, debounce} from 'dot11-components/lib'
import {Row, Field, Checkbox, Input, InputDates, InputTime} from 'dot11-components/form'
import {loadTelecons, updateTelecons} from './store/telecons'

const MULTIPLE_STR = '(Multiple)';

const toTimeObj = (t) => ({HH: t.getHours(), MM: t.getMinutes()});

function TeleconUpdateEntry({
	multiple,
	entry,
	update,
	readOnly
}) {

	const handleDateChange = value => {
		if (value.length > 0)
			update({Start: value[0]})
	}

	return (
		<div>
			<Row>
				<Field label='Subgroup:'>
					<Input
						type='text'
						value={isMultiple(entry.Subgroup)? '': entry.Subgroup}
						onChange={e => update({Subgroup: e.target.value})}
						placeholder={isMultiple(entry.Subgroup)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Date:'>
					<InputDates
						disablePast
						value={isMultiple(entry.Start)? []: [entry.Start]}
						onChange={handleDateChange}
						placeholder={isMultiple(entry.Start)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Time:'>
					<InputTime
						defaultValue={isMultiple(entry.Start)? '': toTimeObj(entry.Start)}
						onChange={value => update({Start: value})}
						placeholder={isMultiple(entry.Start)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Duration:'>
					<Input
						type='search'
						value={isMultiple(entry.Duration)? '': entry.Duration}
						onChange={e => update({Duration: e.target.value})}
						placeholder={isMultiple(entry.Duration)? MULTIPLE_STR: undefined}
						disabled={readOnly}
					/>
				</Field>
			</Row>
		</div>
	)
}

const NotAvaialble = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1em;
	color: #bdbdbd;
`;

class _TeleconUpdate extends React.Component {
	constructor(props) {
		super(props)
		this.state = this.initState(props);
		this.triggerSave = debounce(this.save, 500);
	}

	componentWillUnmount() {
		this.triggerSave.flush();
	}

	initState = (props) => {
		const {entities, selected} = props;
		console.log(selected)
		let diff = {}, originals = [];
		for (const id of selected) {
			const entry = entities[id];
			if (entry) {
				diff = recursivelyDiffObjects(diff, entry);
				originals.push(entry);
			}
		}
		return {
			saved: diff,
			edited: diff,
			originals: originals
		};
	}

	update = (changes) => {
		if (this.props.readOnly) {
			console.warn("Update when read-only")
			return;
		}
		// merge in the edits and trigger a debounced save
		this.setState(
			state => ({...state, edited: {...state.edited, ...changes}}),
			this.triggerSave
		);
	}

	save = () => {
		const {edited, saved, originals} = this.state;
		const d = shallowDiff(saved, edited);
		const updates = [];
		for (const o of originals) {
			if (Object.keys(d).length > 0)
				updates.push({...d, id: o.id});
		}
		console.log(updates)
		if (updates.length > 0)
			updates.forEach(u => this.props.updateTelecon(u.id, u));
		this.setState(state => ({...state, saved: edited}));
	}

	render() {
		const {loading, readOnly} = this.props;

		let notAvailableStr;
		if (loading)
			notAvailableStr = 'Loading...';
		else if (this.state.originals.length === 0)
			notAvailableStr = 'Nothing selected';

		return notAvailableStr?
			<NotAvaialble>
				<span>{notAvailableStr}</span>
		 	</NotAvaialble>:
			<TeleconUpdateEntry
				multiple={this.state.originals.length > 1}
				entry={this.state.edited}
				update={this.update}
				readOnly={readOnly}
			/>
	}

	static propTypes = {
		valid: PropTypes.bool.isRequired,
		loading: PropTypes.bool.isRequired,
		entities: PropTypes.object.isRequired,
		selected: PropTypes.array.isRequired,
		updateTelecons: PropTypes.func.isRequired,
	}
}

const dataSet = 'telecons';

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
	{updateTelecons}
)(_TeleconUpdate);

export default TeleconUpdate;