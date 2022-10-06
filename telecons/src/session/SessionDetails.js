import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {Form, Row, Field, Input, Select, InputDate} from 'dot11-components/form';
import TimeZoneSelector from '../components/TimeZoneSelector';

import {selectSession, setSession, updateSession} from '../store/sessionPrep';

const sessionTypeOptions = [
	{value: 'g', label: 'General'},
	{value: 'i', label: 'Interim'},
	{value: 'p', label: 'Plenary'},
	{value: 'o', label: 'Other'}
];

function SessionTypeSelector({value, onChange, ...otherProps}) {
	const values = sessionTypeOptions.filter(o => o.value === value);
	const handleChange = (values) => onChange(values.length > 0? values[0].value: null);
	return (
		<Select
			values={values}
			options={sessionTypeOptions}
			onChange={handleChange}
			{...otherProps}
		/>
	)
}

function SessionDetails() {
	const dispatch = useDispatch();
	const session = useSelector(selectSession);

	function handleChange(changes) {
		dispatch(updateSession(changes));
	}

	return (
		<Form
		>
			<Row>
				<Field label='Name:'>
					<Input
						type='search'
						value={session.name}
						onChange={(e) => handleChange({name: e.target.value})}
						placeholder='(Blank)'
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Type:'>
					<SessionTypeSelector
						value={session.type}
						onChange={(type) => handleChange({type})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Start date:'>
					<Input
						type='date'
						value={session.start}
						onChange={(e) => handleChange({start: e.target.value})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='End date:'>
					<Input
						type='date'
						value={session.end}
						onChange={(e) => handleChange({end: e.target.value})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Timezone:'>
					<TimeZoneSelector
						value={session.timezone}
						onChange={(timezone) => handleChange({timezone})}
					/>
				</Field>
			</Row>
		</Form>
	)
}

export default SessionDetails;
